import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { District } from "../src/generated/prisma/enums";
// @ts-ignore
import readXlsxFile from "read-excel-file/node";
import localesMinedu from "../prisma/data/locales-mdd.json";
import crypto from "node:crypto";

const DISTRICT_COORDS: Record<string, [number, number]> = {
  tambopata: [-12.5933, -69.1891],
  las_piedras: [-12.535, -69.2],
  inambari: [-12.9467, -69.7183],
  laberinto: [-12.7214, -69.5756],
  fitzcarrald: [-12.2667, -70.9167],
  manu: [-12.2611, -70.9],
  madre_de_dios: [-12.55, -70.4],
  huepetuhe: [-13.0033, -70.5283],
  iberia: [-11.3467, -69.585],
  inapari: [-10.95, -69.5667],
  tahuamanu: [-11.2, -69.4],
};

function normalizeDistrict(raw: string): District {
  const clean = String(raw || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");

  if (clean.includes("tambopata")) return "tambopata";
  if (clean.includes("inambari")) return "inambari";
  if (clean.includes("piedras")) return "las_piedras";
  if (clean.includes("laberinto")) return "laberinto";
  if (clean.includes("fitzcarrald")) return "fitzcarrald";
  if (clean.includes("madre")) return "madre_de_dios";
  if (clean.includes("manu")) return "manu";
  if (clean.includes("huepetuhe")) return "huepetuhe";
  if (clean.includes("inapari") || clean.includes("iñapari")) return "inapari";
  if (clean.includes("iberia")) return "iberia";
  if (clean.includes("tahuamanu")) return "tahuamanu";
  return "tambopata";
}

function normalizeDni(raw: unknown): string {
  let s = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  // Reemplazar O o o inicial o por ceros en DNIs mal tipeados
  s = s.replace(/^O+/i, (m) => "0".repeat(m.length));
  // Si tiene menos de 8 dígitos pero son números, pad con ceros
  if (/^\d+$/.test(s) && s.length < 8) {
    s = s.padStart(8, "0");
  }
  return s;
}

function normalizePhone(raw: unknown): string | null {
  if (!raw) return null;
  const s = String(raw).replace(/\D/g, "");
  return s.length >= 6 ? s : null;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL no configurada");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  console.log("=== INICIANDO IMPORTACIÓN ELECTORAL COMPLETA ===");

  // 1. Cargar hojas de '1. TAMBOPATA Y MAS 2.xlsx'
  console.log("→ Leyendo '1. TAMBOPATA Y MAS 2.xlsx'...");
  const sheets = await readXlsxFile("1. TAMBOPATA Y MAS 2.xlsx");

  const lvSheet = sheets.find((s: any) => s.sheet === "LV_ERM 2026")?.data ?? [];
  const mesasSheet = sheets.find((s: any) => s.sheet === "MESAS_LV ERM")?.data ?? [];
  const mmSheet = sheets.find((s: any) => s.sheet === "MM_erm")?.data ?? [];
  const anPersonerosSheet = sheets.find((s: any) => s.sheet === "AN_Personeros")?.data ?? [];

  // Mapear miembros de mesa por número de mesa
  const mmByMesa = new Map<string, { presidente?: string; secretario?: string; suplentes: string[] }>();
  for (let i = 1; i < mmSheet.length; i++) {
    const row = mmSheet[i];
    const mesaNum = String(row[2] ?? "").padStart(6, "0");
    if (!mesaNum || mesaNum === "000000") continue;
    const nombre = String(row[4] ?? "").trim();
    const cargo = String(row[5] ?? "").toUpperCase();

    if (!mmByMesa.has(mesaNum)) {
      mmByMesa.set(mesaNum, { suplentes: [] });
    }
    const entry = mmByMesa.get(mesaNum)!;
    if (cargo.includes("PRESIDENTE")) entry.presidente = nombre;
    else if (cargo.includes("SECRETARIO")) entry.secretario = nombre;
    else if (nombre) entry.suplentes.push(nombre);
  }

  // 2. Procesar Locales de Votación
  console.log("→ Procesando locales de votación...");
  const localMap = new Map<string, string>(); // clave normalizada -> ID

  // Primero obtener todos los locales únicos de la hoja de mesas para no dejar ninguno fuera
  const uniqueLocalNamesInMesas = new Map<string, { prov: string; dist: string }>();
  for (let i = 1; i < mesasSheet.length; i++) {
    const row = mesasSheet[i];
    const prov = String(row[0] || "TAMBOPATA").trim().toUpperCase();
    const dist = String(row[1] || "TAMBOPATA").trim();
    const lName = String(row[3] || "").trim();
    if (lName && !uniqueLocalNamesInMesas.has(lName.toUpperCase())) {
      uniqueLocalNamesInMesas.set(lName.toUpperCase(), { prov, dist });
    }
  }

  // Mapa de datos de LV_ERM 2026 por nombre simplificado
  const lvInfo = new Map<string, { address: string | null; code: string }>();
  for (let i = 1; i < lvSheet.length; i++) {
    const row = lvSheet[i];
    if (!row[4]) continue;
    const code = `LV-${String(row[0] || i).padStart(3, "0")}`;
    const name = String(row[4]).trim().toUpperCase();
    const address = row[5] ? String(row[5]).trim() : null;
    lvInfo.set(name, { address, code });
  }

  let localIndex = 1;
  for (const [rawName, meta] of uniqueLocalNamesInMesas.entries()) {
    const district = normalizeDistrict(meta.dist);
    const province = meta.prov;

    // Buscar coincidencia en lvInfo
    let address: string | null = null;
    let code = `LV-${String(localIndex).padStart(3, "0")}`;

    if (lvInfo.has(rawName)) {
      const info = lvInfo.get(rawName)!;
      address = info.address;
      code = info.code;
    } else {
      // Búsqueda flexible
      for (const [lvName, info] of lvInfo.entries()) {
        const cleanA = rawName.replace(/[^A-Z0-9]/g, "");
        const cleanB = lvName.replace(/[^A-Z0-9]/g, "");
        if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) {
          address = info.address;
          code = info.code;
          break;
        }
      }
    }

    // Coordenadas: buscar en localesMinedu
    const cleanRaw = rawName.replace(/[^A-Z0-9]/g, "");
    const matchedMinedu = localesMinedu.find((m: any) => {
      const cleanM = m.name.toUpperCase().replace(/[^A-Z0-9]/g, "");
      return (cleanRaw.includes(cleanM) || cleanM.includes(cleanRaw)) && m.district.toLowerCase().includes(district.toLowerCase());
    });

    let lat = matchedMinedu?.latitude ?? null;
    let lng = matchedMinedu?.longitude ?? null;
    if (!address && matchedMinedu?.address) address = matchedMinedu.address;

    if (!lat || !lng) {
      const [fallbackLat, fallbackLng] = DISTRICT_COORDS[district] ?? [-12.5933, -69.1891];
      lat = fallbackLat + (Math.random() - 0.5) * 0.012;
      lng = fallbackLng + (Math.random() - 0.5) * 0.012;
    }

    const localRecord = await prisma.electoralLocal.upsert({
      where: { code },
      update: {
        name: rawName,
        address,
        district,
        province,
        latitude: lat,
        longitude: lng,
      },
      create: {
        code,
        name: rawName,
        address,
        district,
        province,
        latitude: lat,
        longitude: lng,
      },
    });

    localMap.set(rawName, localRecord.id);
    localIndex++;
  }
  console.log(`✓ ${localMap.size} locales de votación sincronizados.`);

  // 3. Procesar Mesas de Sufragio (511 mesas)
  console.log("→ Procesando 511 mesas de sufragio...");
  let mesasCreadas = 0;
  const localMesasCount = new Map<string, number>();

  for (let i = 1; i < mesasSheet.length; i++) {
    const row = mesasSheet[i];
    const mesaRaw = row[2];
    const localName = String(row[3] ?? "").trim().toUpperCase();
    if (!mesaRaw || !localName) continue;

    const mesaNum = String(mesaRaw).trim().padStart(6, "0");
    const localId = localMap.get(localName);

    if (!localId) {
      console.warn(`Local no encontrado para mesa ${mesaNum}: "${localName}"`);
      continue;
    }

    localMesasCount.set(localId, (localMesasCount.get(localId) ?? 0) + 1);
    const mm = mmByMesa.get(mesaNum);

    await prisma.electoralMesa.upsert({
      where: { number: mesaNum },
      update: {
        localId,
        onpePresidente: mm?.presidente ?? null,
        onpeSecretario: mm?.secretario ?? null,
        onpeSuplentes: mm?.suplentes?.slice(0, 3)?.join(", ") ?? null,
      },
      create: {
        number: mesaNum,
        localId,
        onpePresidente: mm?.presidente ?? null,
        onpeSecretario: mm?.secretario ?? null,
        onpeSuplentes: mm?.suplentes?.slice(0, 3)?.join(", ") ?? null,
      },
    });
    mesasCreadas++;
  }

  // Actualizar conteo de mesas en cada local
  for (const [localId, count] of localMesasCount.entries()) {
    await prisma.electoralLocal.update({
      where: { id: localId },
      data: { totalMesas: count },
    });
  }
  console.log(`✓ ${mesasCreadas} mesas de sufragio creadas y vinculadas.`);

  // 4. Procesar Personeros de '1. TAMBOPATA Y MAS 2.xlsx' (AN_Personeros)
  console.log("→ Importando personeros de 'AN_Personeros'...");
  let personerosAN = 0;
  for (let i = 1; i < anPersonerosSheet.length; i++) {
    const row = anPersonerosSheet[i];
    const name = String(row[1] ?? "").trim();
    const dni = normalizeDni(row[2]);
    if (!name || dni.length !== 8) continue;

    const localName = String(row[3] ?? "").trim() || "LOCAL POR ASIGNAR";
    const phone = normalizePhone(row[4]);
    const isMesaMember = String(row[5] ?? "").toUpperCase().includes("SI");
    const mesaMemberRole = row[6] ? String(row[6]).trim() : null;
    const mesa = row[7] ? String(row[7]).trim().padStart(6, "0") : "";

    await prisma.personero.upsert({
      where: { docType_docNumber: { docType: "dni", docNumber: dni } },
      update: {
        name,
        phone,
        localName,
        mesa,
        isMesaMember,
        mesaMemberRole,
        role: "mesa",
        active: true,
      },
      create: {
        name,
        docType: "dni",
        docNumber: dni,
        phone,
        localName,
        mesa,
        isMesaMember,
        mesaMemberRole,
        role: "mesa",
        coordinatorName: "Coordinación Central Ahora Nación",
        coordinatorPhone: "982136949",
        credentialToken: crypto.randomUUID(),
        active: true,
      },
    });
    personerosAN++;
  }
  console.log(`✓ ${personerosAN} personeros importados de AN_Personeros.`);

  // 5. Procesar Personeros de 'PERSONEROS AHORA NACION.xlsx'
  console.log("→ Importando personeros de 'PERSONEROS AHORA NACION.xlsx'...");
  const panSheets = await readXlsxFile("PERSONEROS AHORA NACION.xlsx");
  const panRows = panSheets[0]?.data ?? [];
  let personerosPan = 0;

  for (let i = 5; i < panRows.length; i++) {
    const row = panRows[i];
    const name = String(row[2] ?? "").trim();
    const dni = normalizeDni(row[4]);
    if (!name || dni.length !== 8) continue;

    const experience = String(row[3] ?? "").toUpperCase().includes("SI");
    const phone = normalizePhone(row[5]);
    const rawLocal = String(row[6] ?? "").trim();
    const localName = rawLocal.replace(/^TAMBOPATA[- ]*/i, "").trim() || "LOCAL POR CONFIRMAR";
    const cargoRaw = String(row[7] ?? "").toLowerCase();
    const role = cargoRaw.includes("general") ? "general" : "mesa";

    // Revisar si ya existe
    const existing = await prisma.personero.findUnique({
      where: { docType_docNumber: { docType: "dni", docNumber: dni } },
    });

    if (existing) {
      await prisma.personero.update({
        where: { id: existing.id },
        data: {
          phone: phone || existing.phone,
          experience: experience ?? existing.experience,
        },
      });
    } else {
      await prisma.personero.create({
        data: {
          name,
          docType: "dni",
          docNumber: dni,
          phone,
          localName,
          mesa: "", // Mesa vacía pendiente de asignación
          role,
          experience,
          coordinatorName: "Coordinación Central Ahora Nación",
          coordinatorPhone: "982136949",
          credentialToken: crypto.randomUUID(),
          active: true,
        },
      });
    }
    personerosPan++;
  }
  console.log(`✓ ${personerosPan} personeros procesados de PERSONEROS AHORA NACION.xlsx.`);

  const totalPersoneros = await prisma.personero.count();
  const totalLocales = await prisma.electoralLocal.count();
  const totalMesas = await prisma.electoralMesa.count();

  console.log("\n=============================================");
  console.log(`🎉 RESUMEN DE IMPORTACIÓN:`);
  console.log(`📍 Locales de Votación ONPE: ${totalLocales}`);
  console.log(`🗳️  Mesas de Sufragio ONPE:   ${totalMesas}`);
  console.log(`👥 Personeros Registrados:   ${totalPersoneros}`);
  console.log("=============================================\n");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error en importación:", err);
  process.exit(1);
});
