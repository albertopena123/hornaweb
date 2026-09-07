import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL no configurada");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const [locales, mesas, personeros, candidatos, actas, usuarios, roles, permisos] = await Promise.all([
    prisma.electoralLocal.count(),
    prisma.electoralMesa.count(),
    prisma.personero.count(),
    prisma.candidate.count(),
    prisma.actaElectoral.count(),
    prisma.user.count(),
    prisma.role.count(),
    prisma.permission.count(),
  ]);

  console.log(JSON.stringify({
    locales,
    mesas,
    personeros,
    candidatos,
    actas,
    usuarios,
    roles,
    permisos,
  }, null, 2));

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
