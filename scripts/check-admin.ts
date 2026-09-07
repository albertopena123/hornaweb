import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  // Ensure role superadmin and admin
  let superadminRole = await prisma.role.findUnique({ where: { key: "superadmin" } });
  if (!superadminRole) {
    superadminRole = await prisma.role.create({
      data: {
        key: "superadmin",
        name: "Superadministrador",
        description: "Acceso total",
        system: true
      }
    });
  }

  const pwHash = await hashPassword("admin123");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@ahoranacion.pe" },
    update: {
      name: "Administrador Ahora Nación",
      passwordHash: pwHash,
      active: true,
    },
    create: {
      email: "admin@ahoranacion.pe",
      name: "Administrador Ahora Nación",
      passwordHash: pwHash,
      active: true,
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: superadminRole.id,
      }
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: superadminRole.id,
    }
  });

  console.log("SUCCESS_ADMIN_READY: admin@ahoranacion.pe / admin123");

  const allUsers = await prisma.user.findMany({
    include: { roles: { include: { role: true } } }
  });
  for (const u of allUsers) {
    console.log("USER_IN_DB:", u.email, "| Active:", u.active, "| Roles:", u.roles.map(r => r.role.key).join(", "));
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("ERROR:", err);
  process.exit(1);
});
