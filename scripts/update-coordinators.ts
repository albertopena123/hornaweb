import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function check() {
  const connectionString = process.env.DATABASE_URL;
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: connectionString! }) });

  const locales = await prisma.electoralLocal.findMany({
    select: { id: true, code: true, name: true, coordinatorName: true, coordinatorPhone: true, totalMesas: true },
    orderBy: { name: "asc" }
  });

  console.log(`Total locales: ${locales.length}`);
  const withCoord = locales.filter(l => l.coordinatorName);
  console.log(`Locales with coordinator: ${withCoord.length}`);

  // Specifically check IEBR LA PASTORA
  const laPastora = locales.find(l => l.name.includes("PASTORA"));
  console.log("LA PASTORA:", laPastora);

  if (laPastora) {
    await prisma.electoralLocal.update({
      where: { id: laPastora.id },
      data: {
        coordinatorName: "Piero Terras",
        coordinatorPhone: "982136949",
      }
    });
    console.log("Updated La Pastora coordinator to Piero Terras");
  }

  await prisma.$disconnect();
}
check();
