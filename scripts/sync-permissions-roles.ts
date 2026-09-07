import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSIONS, ROLE_DEFS } from "../src/lib/auth/permissions";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  console.log("=== SINCRONIZANDO PERMISOS Y ROLES RBAC ===");

  // 1. Upsert permissions
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { name: p.name, description: p.description, category: p.category },
      create: p,
    });
  }
  console.log(`✓ ${PERMISSIONS.length} permisos sincronizados.`);

  // 2. Roles
  const permByKey = new Map((await prisma.permission.findMany()).map((p) => [p.key, p.id]));
  for (const r of ROLE_DEFS) {
    const roleRecord = await prisma.role.upsert({
      where: { key: r.key },
      update: { name: r.name, description: r.description, system: r.system },
      create: { key: r.key, name: r.name, description: r.description, system: r.system },
    });

    // For superadmin, assign all permissions
    const permKeys = r.key === "superadmin" ? Array.from(permByKey.keys()) : r.permissions;
    await prisma.rolePermission.deleteMany({ where: { roleId: roleRecord.id } });
    for (const pKey of permKeys) {
      const pId = permByKey.get(pKey);
      if (pId) {
        await prisma.rolePermission.create({ data: { roleId: roleRecord.id, permissionId: pId } });
      }
    }
  }
  console.log(`✓ Roles del sistema actualizados con permisos RBAC.`);

  await prisma.$disconnect();
}

main().catch(console.error);
