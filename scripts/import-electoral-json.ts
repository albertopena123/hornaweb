import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL no configurada");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const seedPath = path.resolve(__dirname, "../prisma/data/electoral-seed.json");
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Archivo ${seedPath} no encontrado.`);
  }

  const raw = fs.readFileSync(seedPath, "utf8");
  const data = JSON.parse(raw);

  console.log(`=== IMPORTANDO DATOS ELECTORALES SEGUROS (UPSERT NO DESTRUCTIVO) ===`);
  console.log(`Locales a sincronizar: ${data.locales.length}`);
  console.log(`Mesas a sincronizar: ${data.mesas.length}`);
  console.log(`Personeros a sincronizar: ${data.personeros.length}`);

  // 1. Locales
  console.log("→ Sincronizando Locales Electorales...");
  for (const l of data.locales) {
    const { id, createdAt, updatedAt, ...rest } = l;
    await prisma.electoralLocal.upsert({
      where: { id },
      update: rest,
      create: { id, ...rest },
    });
  }
  console.log(`✓ ${data.locales.length} locales sincronizados.`);

  // 2. Mesas
  console.log("→ Sincronizando Mesas Electorales...");
  for (const m of data.mesas) {
    const { id, createdAt, updatedAt, ...rest } = m;
    await prisma.electoralMesa.upsert({
      where: { id },
      update: rest,
      create: { id, ...rest },
    });
  }
  console.log(`✓ ${data.mesas.length} mesas sincronizadas.`);

  // 3. Personeros
  console.log("→ Sincronizando Personeros...");
  for (const p of data.personeros) {
    const { id, createdAt, updatedAt, ...rest } = p;
    await prisma.personero.upsert({
      where: { id },
      update: rest,
      create: { id, ...rest },
    });
  }
  console.log(`✓ ${data.personeros.length} personeros sincronizados.`);

  // 4. Crear usuarios para todos los personeros con rol personero
  console.log("→ Sincronizando accesos de usuario para personeros...");
  const personeroRole = await prisma.role.findUnique({ where: { key: "personero" } });
  if (personeroRole) {
    for (const p of data.personeros) {
      if (!p.docNumber) continue;
      const dni = String(p.docNumber).trim();
      const pwHash = await hashPassword(dni);
      const user = await prisma.user.upsert({
        where: { email: `${dni}@personero.ahoranacion.pe` },
        update: {
          name: p.name,
          active: true,
        },
        create: {
          email: `${dni}@personero.ahoranacion.pe`,
          name: p.name,
          passwordHash: pwHash,
          active: true,
        }
      });

      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: personeroRole.id,
          }
        },
        update: {},
        create: {
          userId: user.id,
          roleId: personeroRole.id,
        }
      });
    }
  }

  console.log("=== SINCRONIZACIÓN ELECTORAL COMPLETADA CON ÉXITO ===");
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
