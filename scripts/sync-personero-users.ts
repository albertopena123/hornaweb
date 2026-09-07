import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSIONS, ROLE_DEFS } from "../src/lib/auth/permissions";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL no configurada");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  console.log("=== SINCRONIZANDO ROLES Y USUARIOS PARA PERSONEROS ===");

  // 1. Asegurar roles
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

  const personeroRole = await prisma.role.findUnique({ where: { key: "personero" } });
  if (!personeroRole) throw new Error("Rol personero no encontrado");

  // 2. Crear usuarios para personeros
  const personeros = await prisma.personero.findMany({
    where: { active: true },
  });

  console.log(`Creando/actualizando cuentas de usuario para ${personeros.length} personeros...`);
  let createdCount = 0;

  for (const p of personeros) {
    const dni = p.docNumber.trim();
    if (!dni || dni.length < 6) continue;

    const email = `${dni}@personeros.ahoranacion.pe`;
    // Por defecto la clave es su propio DNI
    const pwHash = await hashPassword(dni);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: p.name,
        active: true,
      },
      create: {
        email,
        name: p.name,
        passwordHash: pwHash,
        active: true,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: personeroRole.id } },
      update: {},
      create: { userId: user.id, roleId: personeroRole.id },
    });

    createdCount++;
  }

  console.log(`✓ ${createdCount} cuentas de usuario de personeros creadas.`);
  console.log(`→ Acceso personero: Usuario: [DNI] | Clave: [DNI]`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error sincronizando usuarios:", err);
  process.exit(1);
});
