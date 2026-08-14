// Carga los locales educativos de Madre de Dios (padrón MINEDU/ESCALE,
// Padron_web al 31-07-2026, deduplicado por CODLOCAL) en la tabla Local.
// Ejecutar: npx tsx prisma/seed-locales.ts
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { District } from "../src/generated/prisma/enums";
import locales from "./data/locales-mdd.json";

type LocalRow = {
  code: string;
  name: string;
  address: string | null;
  locality: string | null;
  district: District;
  latitude: number | null;
  longitude: number | null;
  levels: string | null;
};

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  console.log(`→ Cargando ${locales.length} locales educativos…`);
  let created = 0;
  let updated = 0;
  for (const l of locales as LocalRow[]) {
    const data = {
      name: l.name,
      address: l.address,
      locality: l.locality,
      district: l.district,
      latitude: l.latitude,
      longitude: l.longitude,
      levels: l.levels,
    };
    const existing = await prisma.local.findUnique({ where: { code: l.code } });
    if (existing) {
      await prisma.local.update({ where: { code: l.code }, data });
      updated++;
    } else {
      await prisma.local.create({ data: { code: l.code, ...data } });
      created++;
    }
  }
  console.log(`✓ Locales: ${created} creados, ${updated} actualizados.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
