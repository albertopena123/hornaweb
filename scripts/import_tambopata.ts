import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { toTitleCase } from "../src/lib/text";

function buildPrisma(): PrismaClient {
  const raw = process.env.DATABASE_URL || "";
  const url = new URL(raw);
  const adapter = new PrismaPg({
    host: url.hostname,
    port: parseInt(url.port || "5432", 10),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
  });
  return new PrismaClient({ adapter });
}

const prisma = buildPrisma();

// Lista de los 23 coordinadores de colegio con DNI de la Hoja 1
const COLEGIOS_EXCEL = [
  { item: 1, dni: "76928222", cel: "982791261", excelName: "KEYLA LUZ NIETO PEREZ", localQuery: "315 huerto infantil", slot: 1 },
  { item: 2, dni: "01123246", cel: "997370435", excelName: "MIGUEL CHAVEZ PINCHI", localQuery: "dos de mayo", slot: 1 },
  { item: 3, dni: "10383823", cel: "980728935", excelName: "WILLIAMS WILFREDO MICHE MERINO", localQuery: "dos de mayo", slot: 2 },
  { item: 4, dni: "42816428", cel: "921513845", excelName: "LUIS CARLOS POMPILLA SALAS", localQuery: "pedagogico", slot: 1 },
  { item: 5, dni: "44410565", cel: "984357937", excelName: "MARIELA GONZALES CAÑARI", localQuery: "296 las palmeras", slot: 1 },
  { item: 6, dni: "28297881", cel: "950740862", excelName: "JUAN WILFREDO FERNANDEZ GARAMENDI", localQuery: "pastora", slot: 1 },
  // Piero Terrasas (sin DNI) excluido
  { item: 8, dni: "01022660", cel: "949834730", excelName: "GUSTAVO PEREYRA PANDURO", localQuery: "billinghurst", slot: 1 },
  { item: 9, dni: "02846909", cel: "919032342", excelName: "SERGIO ROLANDO NAVARRO AVENDAÑO", localQuery: "santa cruz", slot: 1 },
  { item: 10, dni: "42847252", cel: "951251496", excelName: "ETNA CATHERINE EGOAVIL ESCOBAR", localQuery: "amazonica", slot: 1 },
  { item: 11, dni: "40395424", cel: "982736965", excelName: "CESAR ARQUE MEZA", localQuery: "amazonica", slot: 2 },
  { item: 12, dni: "44607424", cel: "993630302", excelName: "JULIO MARWIN HAGLERS CHICATA HIDALGO", localQuery: "vela valles", slot: 1 },
  { item: 13, dni: "43872160", cel: "953085403", excelName: "DAVID MARLON YUCRA CHAMBI", localQuery: "quiñones", slot: 1 },
  { item: 14, dni: "45647172", cel: "957229829", excelName: "IRVING GABRIEL MACEDO TELLO", localQuery: "bouroncle", slot: 1 },
  { item: 15, dni: "45559557", cel: "94952299", excelName: "ALICIA ELIANA COTALUQUE TERRAZAS", localQuery: "bouroncle", slot: 2 },
  { item: 16, dni: "47194470", cel: "913801036", excelName: "RODOLFO ALFONSO MIYASHIRO RODRIGUEZ", localQuery: "fitzcarrald", slot: 1 },
  { item: 17, dni: "24696311", cel: "", excelName: "MARIO CCAHUANTICO CCAHUANTICO", localQuery: "esperanza", slot: 1 },
  { item: 18, dni: "43635878", cel: "942551002", excelName: "JUAN CARLOS CATUNTA CORAHUA", localQuery: "andina", slot: 1 },
  { item: 19, dni: "60439069", cel: "905516639", excelName: "KATZUMY KETTY CONDOR TRAVEZAÑO", localQuery: "santa rosa", slot: 1 },
  { item: 20, dni: "41618095", cel: "922074597", excelName: "MANUEL ALEJANDRO REINOSO MONDOÑEDO", localQuery: "milagros", slot: 1 },
  { item: 21, dni: "80238057", cel: "907139506", excelName: "PAULO MANAYAY ASALDE", localQuery: "jaime white", slot: 1 },
  { item: 22, dni: "04822748", cel: "943743288", excelName: "EDGAR PIZANGO AGUILAR", localQuery: "alipio ponce", slot: 1 },
  { item: 23, dni: "04812906", cel: "982746770", excelName: "MARIA BARRA", localQuery: "faustino", slot: 1 },
  { item: 24, dni: "47066888", cel: "", excelName: "VANIA ELISABETH PEÑA BARRA", localQuery: "faustino", slot: 2 },
  // Cesar Agusto (sin DNI) excluido
];

const REGIONAL_LEADERS = [
  {
    email: "jorge.blanco@ahoranacion.pe",
    name: "Jorge A. Blanco García",
    phone: "951329084",
    cargo: "Coordinador General MDD",
    scopeType: "departamental",
    roleKey: "admin",
    defaultPass: "951329084"
  },
  {
    email: "bladimir.lipa@ahoranacion.pe",
    name: "Bladimir Lipa",
    cargo: "Personero Legal",
    scopeType: "departamental",
    roleKey: "admin",
    defaultPass: "bladimir2026"
  },
  {
    email: "19963793@ahoranacion.pe",
    name: "Guillermo Cóndor Paucar",
    phone: "915008611",
    cargo: "Coordinador Adjunto",
    scopeType: "departamental",
    roleKey: "admin",
    defaultPass: "19963793"
  },
  {
    email: "60973331@ahoranacion.pe",
    name: "Boris Manuel Callo Lipa",
    cargo: "Secretario de Grupo",
    scopeType: "departamental",
    roleKey: "coordinador",
    defaultPass: "60973331"
  },
  {
    email: "roy.gutierrez@ahoranacion.pe",
    name: "Roy Gutiérrez",
    phone: "913933709",
    cargo: "Coordinador Delegado Prov. Tambopata",
    scopeType: "provincial",
    assignedProvince: "Tambopata",
    roleKey: "coordinador",
    defaultPass: "913933709"
  },
  {
    email: "abelino@ahoranacion.pe",
    name: "Abelino",
    phone: "989412131",
    cargo: "Coordinador Delegado Prov. Tambopata",
    scopeType: "provincial",
    assignedProvince: "Tambopata",
    roleKey: "coordinador",
    defaultPass: "989412131"
  },
  {
    email: "41774094@ahoranacion.pe",
    name: "Cliffod Dixson Gutiérrez Machaca",
    phone: "997075261",
    cargo: "Coordinador Delegado Prov. Tahuamanu",
    scopeType: "provincial",
    assignedProvince: "Tahuamanu",
    roleKey: "coordinador",
    defaultPass: "41774094"
  },
  {
    email: "lujan@ahoranacion.pe",
    name: "Prof. Luján",
    phone: "965248836",
    cargo: "Coordinador Delegado Prov. Manu",
    scopeType: "provincial",
    assignedProvince: "Manu",
    roleKey: "coordinador",
    defaultPass: "965248836"
  },
  {
    email: "bibiana.lara@ahoranacion.pe",
    name: "Bibiana Lara",
    phone: "982760254",
    cargo: "Delegada Distrital (Inambari, Las Piedras, Laberinto)",
    scopeType: "distrital",
    assignedDistrict: "inambari",
    roleKey: "coordinador",
    defaultPass: "982760254"
  },
  {
    email: "40455993@ahoranacion.pe",
    name: "José Carlos Navarro Vega",
    phone: "987787010",
    cargo: "Área de Sistemas e Informática",
    scopeType: "departamental",
    roleKey: "admin",
    defaultPass: "40455993"
  },
  {
    email: "angel.quijandria@ahoranacion.pe",
    name: "Ángel Quijandría",
    cargo: "Apoyo Legal",
    scopeType: "departamental",
    roleKey: "viewer",
    defaultPass: "quijandria2026"
  },
  {
    email: "guadalupe.nalvarte@ahoranacion.pe",
    name: "Guadalupe Nalvarte",
    phone: "978341497",
    cargo: "Capacitadora Personeros",
    scopeType: "departamental",
    roleKey: "coordinador",
    defaultPass: "978341497"
  },
  {
    email: "karol.paredes@ahoranacion.pe",
    name: "Karol M. Paredes Torrez",
    phone: "955721347",
    cargo: "Capacitadora Personeros",
    scopeType: "departamental",
    roleKey: "coordinador",
    defaultPass: "955721347"
  }
];

async function fetchOfficialDniName(dni: string, fallbackName: string): Promise<string> {
  const token = process.env.DNI_API_TOKEN;
  if (!token) return toTitleCase(fallbackName);

  try {
    const res = await fetch(`https://apidatos.unamad.edu.pe/api/consulta/${dni}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.NOMBRES && data.AP_PAT) {
        const full = `${data.NOMBRES} ${data.AP_PAT} ${data.AP_MAT || ""}`.trim();
        return toTitleCase(full);
      }
    }
  } catch (e) {
    // ignore
  }
  return toTitleCase(fallbackName);
}

async function main() {
  console.log("==================================================");
  console.log("IMPORTACIÓN DE COORDINADORES Y ESTRUCTURA REGIONAL");
  console.log("==================================================\n");

  // 1. Asegurar que existe el Rol "coordinador"
  let roleCoordinador = await prisma.role.findUnique({ where: { key: "coordinador" } });
  if (!roleCoordinador) {
    console.log("Creando rol 'coordinador' (Coordinador Territorial)...");
    roleCoordinador = await prisma.role.create({
      data: {
        key: "coordinador",
        name: "Coordinador Territorial",
        description: "Acceso territorial para delegados y coordinadores: gestiona personeros, consulta mesas y monitorea actas.",
        system: true,
      },
    });
  }

  // Asignar permisos clave al rol coordinador
  const permsCoordinador = [
    "personeros.read", "personeros.write",
    "mesas.read", "locales.read", "actas.read",
    "supporters.read", "candidatos.read", "anuncios.read",
  ];
  for (const pKey of permsCoordinador) {
    const perm = await prisma.permission.findUnique({ where: { key: pKey } });
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: roleCoordinador.id, permissionId: perm.id } },
        update: {},
        create: { roleId: roleCoordinador.id, permissionId: perm.id },
      });
    }
  }
  console.log("✓ Rol 'coordinador' configurado con permisos territoriales.\n");

  // 2. Obtener todos los locales de Tambopata
  const dbLocales = await prisma.electoralLocal.findMany({
    where: { province: { equals: "Tambopata", mode: "insensitive" } },
    orderBy: { name: "asc" },
  });
  console.log(`Locales en Tambopata en BD: ${dbLocales.length}`);

  // 3. Procesar los 23 coordinadores de la Hoja 1
  console.log("\n--- ACTUALIZANDO COORDINADORES POR COLEGIO (HOJA 1) ---");
  for (const item of COLEGIOS_EXCEL) {
    // Buscar local por query
    const targetLocal = dbLocales.find((l) => l.name.toLowerCase().includes(item.localQuery.toLowerCase()));
    if (!targetLocal) {
      console.warn(`[!] No se encontró local para query: '${item.localQuery}' (${item.excelName})`);
      continue;
    }

    // Consultar DNI para obtener nombres oficiales
    const officialName = await fetchOfficialDniName(item.dni, item.excelName);
    console.log(`[Item ${item.item}] DNI ${item.dni}: ${item.excelName} -> RENIEC: ${officialName}`);

    // Actualizar ElectoralLocal
    if (item.slot === 2) {
      await prisma.electoralLocal.update({
        where: { id: targetLocal.id },
        data: {
          coordinator2Name: officialName,
          coordinator2Dni: item.dni,
          coordinator2Phone: item.cel || null,
        },
      });
      console.log(`   -> Asignado como COORDINADOR 2 en: ${targetLocal.name}`);
    } else {
      await prisma.electoralLocal.update({
        where: { id: targetLocal.id },
        data: {
          coordinatorName: officialName,
          coordinatorDni: item.dni,
          coordinatorPhone: item.cel || null,
        },
      });
      console.log(`   -> Asignado como COORDINADOR 1 en: ${targetLocal.name}`);
    }
  }

  // 4. Procesar la Plana Mayor y Delegados Provinciales (Hoja 2)
  console.log("\n--- CREANDO / ACTUALIZANDO USUARIOS REGIONALES Y DELEGADOS (HOJA 2) ---");
  const allRoles = await prisma.role.findMany();

  for (const leader of REGIONAL_LEADERS) {
    const targetRole = allRoles.find((r) => r.key === leader.roleKey) || roleCoordinador;
    const passHash = await hashPassword(leader.defaultPass);

    // Buscar si ya existe por email
    const existing = await prisma.user.findUnique({
      where: { email: leader.email },
      include: { roles: true },
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: leader.name,
          scopeType: leader.scopeType,
          assignedProvince: (leader as any).assignedProvince || null,
          assignedDistrict: (leader as any).assignedDistrict || null,
          active: true,
        },
      });
      // Asegurar rol
      if (!existing.roles.some((r) => r.roleId === targetRole.id)) {
        await prisma.userRole.create({
          data: { userId: existing.id, roleId: targetRole.id },
        });
      }
      console.log(`✓ Usuario actualizado: ${leader.name} (${leader.email}) | Ámbito: ${leader.scopeType} | Rol: ${targetRole.name}`);
    } else {
      const newUser = await prisma.user.create({
        data: {
          email: leader.email,
          name: leader.name,
          passwordHash: passHash,
          active: true,
          scopeType: leader.scopeType,
          assignedProvince: (leader as any).assignedProvince || null,
          assignedDistrict: (leader as any).assignedDistrict || null,
          roles: {
            create: { roleId: targetRole.id },
          },
        },
      });
      console.log(`+ Usuario CREADO: ${leader.name} (${leader.email}) | Pass: ${leader.defaultPass} | Ámbito: ${leader.scopeType}`);
    }
  }

  console.log("\n==================================================");
  console.log("¡IMPORTACIÓN Y CONFIGURACIÓN COMPLETADA CON ÉXITO!");
  console.log("==================================================");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error durante la importación:", err);
  process.exit(1);
});
