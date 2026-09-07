import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { CANDIDATOS, CANDIDATOS_PROVINCIALES } from "../src/data/votoData";
import { PERMISSIONS, ROLE_DEFS } from "../src/lib/auth/permissions";
import { hashPassword } from "../src/lib/auth/password";

const PARTY_COLORS: Record<string, string> = {
  "AHORA NACION - AN": "#dc2626", // Rojo patriótico
  "ALIANZA ELECTORAL VENCEREMOS": "#ea580c", // Naranja
  "ALIANZA LIBERTAD MADREDIOSENSE": "#16a34a", // Verde
  "ALIANZA PARA EL PROGRESO": "#2563eb", // Azul
  "AVANZA PAIS - PARTIDO DE INTEGRACION SOCIAL": "#0284c7", // Celeste
  "FRENTE POPULAR AGRICOLA FIA DEL PERU": "#0d9488", // Verde azulado
  "JUNTOS POR EL PERU": "#9333ea", // Morado
  "PARTIDO DEL BUEN GOBIERNO": "#ca8a04", // Ámbar / Dorado
  "PARTIDO DEMOCRATICO SOMOS PERU": "#e11d48", // Rosa oscuro
  "PARTIDO PAIS PARA TODOS": "#4f46e5", // Índigo
  "PARTIDO POLITICO PERU PRIMERO": "#059669", // Esmeralda
  "PARTIDO POPULAR CRISTIANO - PPC": "#15803d", // Verde PPC
  "PROGRESEMOS": "#d97706", // Naranja dorado
  "RENOVACION POPULAR PERU": "#0284c7", // Celeste
};

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL no configurada");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  console.log("=== SINCRONIZANDO PERMISOS, ROLES Y CANDIDATOS ===");

  // 1. Permisos
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { name: p.name, description: p.description, category: p.category },
      create: p,
    });
  }

  // 2. Roles
  const permByKey = new Map((await prisma.permission.findMany()).map((p) => [p.key, p.id]));
  for (const r of ROLE_DEFS) {
    const roleRecord = await prisma.role.upsert({
      where: { key: r.key },
      update: { name: r.name, description: r.description, system: r.system },
      create: { key: r.key, name: r.name, description: r.description, system: r.system },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: roleRecord.id } });
    for (const pKey of r.permissions) {
      const pId = permByKey.get(pKey);
      if (pId) {
        await prisma.rolePermission.create({ data: { roleId: roleRecord.id, permissionId: pId } });
      }
    }
  }

  // 3. Usuario Verificador / Operador
  const verifRole = await prisma.role.findUnique({ where: { key: "verificador" } });
  if (verifRole) {
    const pwHash = await hashPassword("operador123");
    const opUser = await prisma.user.upsert({
      where: { email: "operador@ahoranacion.pe" },
      update: { name: "Operador de Cómputo", passwordHash: pwHash, active: true },
      create: { email: "operador@ahoranacion.pe", name: "Operador de Cómputo", passwordHash: pwHash, active: true },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: opUser.id, roleId: verifRole.id } },
      update: {},
      create: { userId: opUser.id, roleId: verifRole.id },
    });
    console.log("✓ Operador de cómputo listo: operador@ahoranacion.pe / operador123");
  }

  // 4. Candidatos a Gobernador Regional
  console.log("→ Sembrando candidatos a Gobernador Regional...");
  let orderIndex = 1;
  for (const c of CANDIDATOS) {
    const color = PARTY_COLORS[c.partido] || "#b91c1c";
    await prisma.candidate.upsert({
      where: { id: c.id },
      update: {
        name: c.nombre,
        party: c.partido,
        partyLogo: c.partidoLogo,
        photoUrl: c.fotoUrl,
        cargo: "gobernador",
        order: orderIndex,
        color,
        active: true,
      },
      create: {
        id: c.id,
        name: c.nombre,
        party: c.partido,
        partyLogo: c.partidoLogo,
        photoUrl: c.fotoUrl,
        cargo: "gobernador",
        order: orderIndex,
        color,
        active: true,
      },
    });
    orderIndex++;
  }
  console.log(`✓ ${CANDIDATOS.length} candidatos regionales sembrados.`);

  // 5. Candidatos Provinciales
  for (const [prov, candList] of Object.entries(CANDIDATOS_PROVINCIALES)) {
    let pOrder = 1;
    for (const c of candList) {
      const color = PARTY_COLORS[c.partido] || "#3b82f6";
      await prisma.candidate.upsert({
        where: { id: c.id },
        update: {
          name: c.nombre,
          party: c.partido,
          partyLogo: c.partidoLogo,
          photoUrl: c.fotoUrl,
          cargo: "provincial",
          province: prov,
          order: pOrder,
          color,
          active: true,
        },
        create: {
          id: c.id,
          name: c.nombre,
          party: c.partido,
          partyLogo: c.partidoLogo,
          photoUrl: c.fotoUrl,
          cargo: "provincial",
          province: prov,
          order: pOrder,
          color,
          active: true,
        },
      });
      pOrder++;
    }
  }
  console.log("✓ Candidatos provinciales sembrados.");

  await prisma.$disconnect();
  console.log("=== SINCRONIZACIÓN EXITOSA ===");
}

main().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
