import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  console.log("Seeding demo actas...");

  const candidates = await prisma.candidate.findMany({
    where: { cargo: "gobernador", active: true },
    orderBy: { order: "asc" },
  });

  if (candidates.length === 0) {
    console.error("No candidates found.");
    return;
  }

  // Buscar mesas
  const mesas = await prisma.electoralMesa.findMany({
    take: 4,
    include: { local: true },
  });

  if (mesas.length === 0) {
    console.error("No mesas found in DB.");
    return;
  }

  const personeros = await prisma.personero.findMany({
    take: 4,
  });

  // 1. Acta Aprobada (Mesa 1)
  const mesa1 = mesas[0];
  const p1 = personeros[0];

  const acta1 = await prisma.actaElectoral.upsert({
    where: { mesaNumber_electionType: { mesaNumber: mesa1.number, electionType: "gobernador" } },
    update: {
      status: "aprobada",
      reviewedAt: new Date(),
    },
    create: {
      mesaNumber: mesa1.number,
      electionType: "gobernador",
      localId: mesa1.localId,
      personeroId: p1?.id || null,
      photoUrl: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=800&q=80",
      status: "aprobada",
      source: "ia",
      votosBlancos: 5,
      votosNulos: 3,
      votosImpugnados: 0,
      totalVotos: 245,
      submittedAt: new Date(Date.now() - 3600000),
      reviewedAt: new Date(),
    },
  });

  // Votos para acta 1
  await prisma.actaVoto.deleteMany({ where: { actaId: acta1.id } });
  for (const [idx, c] of candidates.entries()) {
    let votes = 8;
    if (c.party.includes("AHORA NACION")) {
      votes = 95; // Ahora Nación ganando la mesa
    } else if (idx === 1) {
      votes = 52;
    } else if (idx === 2) {
      votes = 34;
    } else {
      votes = Math.floor(Math.random() * 8) + 2;
    }

    await prisma.actaVoto.create({
      data: {
        actaId: acta1.id,
        candidateId: c.id,
        votes,
      },
    });
  }

  // 2. Acta Enviada (Pendiente para el operador en /verificacion)
  if (mesas.length > 1) {
    const mesa2 = mesas[1];
    const p2 = personeros[1] || personeros[0];

    const acta2 = await prisma.actaElectoral.upsert({
      where: { mesaNumber_electionType: { mesaNumber: mesa2.number, electionType: "gobernador" } },
      update: {
        status: "enviada",
      },
      create: {
        mesaNumber: mesa2.number,
        electionType: "gobernador",
        localId: mesa2.localId,
        personeroId: p2?.id || null,
        photoUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80",
        status: "enviada",
        source: "manual",
        votosBlancos: 4,
        votosNulos: 2,
        votosImpugnados: 1,
        totalVotos: 218,
        submittedAt: new Date(Date.now() - 600000),
      },
    });

    await prisma.actaVoto.deleteMany({ where: { actaId: acta2.id } });
    for (const [idx, c] of candidates.entries()) {
      let votes = 6;
      if (c.party.includes("AHORA NACION")) {
        votes = 88;
      } else if (idx === 1) {
        votes = 45;
      } else if (idx === 3) {
        votes = 30;
      } else {
        votes = Math.floor(Math.random() * 6) + 1;
      }

      await prisma.actaVoto.create({
        data: {
          actaId: acta2.id,
          candidateId: c.id,
          votes,
        },
      });
    }
  }

  console.log("Demo actas seeded successfully!");
  await prisma.$disconnect();
}

main().catch(console.error);
