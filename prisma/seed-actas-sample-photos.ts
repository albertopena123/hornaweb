// Sube 2 actas reales (fotos en /public) a la mesa 067412 SIN registrar conteo:
// quedan en status "enviada", con 0 votos y sin filas en ActaVoto, listas para
// que el módulo de conteo por IA (en desarrollo) las procese.
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const MESA = "067412";

const ACTAS: { electionType: "gobernador" | "provincial"; photoUrl: string }[] = [
  { electionType: "gobernador", photoUrl: "/acta2.jpeg" }, // lista de 14 partidos = candidatos a gobernador
  { electionType: "provincial", photoUrl: "/acta1.jpeg" }, // lista de 12 partidos = candidatos provinciales
];

async function main() {
  const mesa = await prisma.electoralMesa.findUnique({ where: { number: MESA } });
  if (!mesa) throw new Error(`Mesa ${MESA} no existe en el padrón`);

  const personero = await prisma.personero.findFirst({ where: { mesa: MESA, active: true } });

  for (const item of ACTAS) {
    const acta = await prisma.actaElectoral.upsert({
      where: { mesaNumber_electionType: { mesaNumber: MESA, electionType: item.electionType } },
      update: {
        localId: mesa.localId,
        personeroId: personero?.id ?? null,
        photoUrl: item.photoUrl,
        source: "manual",
        status: "enviada",
        observationReason: null,
        reviewedById: null,
        reviewedAt: null,
        votosBlancos: 0,
        votosNulos: 0,
        votosImpugnados: 0,
        totalVotos: 0,
        submittedAt: new Date(),
      },
      create: {
        mesaNumber: MESA,
        electionType: item.electionType,
        localId: mesa.localId,
        personeroId: personero?.id ?? null,
        photoUrl: item.photoUrl,
        source: "manual",
        status: "enviada",
        votosBlancos: 0,
        votosNulos: 0,
        votosImpugnados: 0,
        totalVotos: 0,
      },
    });

    // Sin conteo todavía: no se crean filas en ActaVoto.
    await prisma.actaVoto.deleteMany({ where: { actaId: acta.id } });

    console.log(`✓ mesa ${MESA} (${item.electionType}) → ${item.photoUrl} — pendiente de conteo`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
