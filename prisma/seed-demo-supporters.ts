// Datos de demo para el mapa (SOLO desarrollo): reparte apoyos aprobados
// entre distritos. Correr con: npx tsx prisma/seed-demo-supporters.ts
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const COUNTS: Record<string, number> = {
  tambopata: 34,
  inambari: 12,
  las_piedras: 9,
  laberinto: 7,
  manu: 5,
  fitzcarrald: 2,
  madre_de_dios: 4,
  huepetuhe: 8,
  inapari: 3,
  iberia: 6,
  tahuamanu: 4,
};

async function main() {
  const existing = await prisma.supporter.count();
  if (existing > 20) {
    console.log(`Ya hay ${existing} simpatizantes; no se siembra de nuevo.`);
    return;
  }
  for (const [district, n] of Object.entries(COUNTS)) {
    for (let i = 1; i <= n; i++) {
      await prisma.supporter.create({
        data: {
          name: `Demo ${district} ${i}`,
          district: district as never,
          source: "admin",
          status: "approved",
          notes: "seed demo",
        },
      });
    }
  }
  console.log("Seed demo de simpatizantes listo.");
}

main().finally(() => process.exit(0));
