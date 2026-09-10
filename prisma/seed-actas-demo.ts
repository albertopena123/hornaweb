// Seed de datos simulados para probar el flujo de verificación de actas (/verificacion).
// No destructivo: usa upsert por (mesaNumber, electionType), igual que submitActa().
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const GOB_CANDIDATE_IDS = Array.from({ length: 14 }, (_, i) => `gob-${i + 1}`);
const FAVORITE_ID = "gob-1"; // SIMON PEDRO HORNA ALPACA

// Mesa, status y (si aplica) motivo de observación.
const PLAN: { mesa: string; status: "enviada" | "en_revision" | "aprobada" | "observada"; reason?: string }[] = [
  { mesa: "067377", status: "enviada" },
  { mesa: "067381", status: "enviada" },
  { mesa: "067385", status: "en_revision" },
  { mesa: "067390", status: "aprobada" },
  { mesa: "067435", status: "enviada" },
  { mesa: "067439", status: "en_revision" },
  { mesa: "067443", status: "observada", reason: "La foto del acta está borrosa en la fila de votos preferenciales; favor volver a subir." },
  { mesa: "067448", status: "aprobada" },
  { mesa: "066994", status: "enviada" },
  { mesa: "066998", status: "en_revision" },
  { mesa: "067002", status: "observada", reason: "El total de votos no coincide con la suma de blancos, nulos e impugnados." },
  { mesa: "067007", status: "enviada" },
];

function placeholderPhoto(mesa: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200">
    <rect width="100%" height="100%" fill="#f4f1e8"/>
    <rect x="24" y="24" width="852" height="1152" fill="none" stroke="#111" stroke-width="4"/>
    <text x="450" y="90" font-family="Arial" font-size="34" font-weight="bold" text-anchor="middle">ACTA ELECTORAL (SIMULADA)</text>
    <text x="450" y="140" font-family="Arial" font-size="26" text-anchor="middle">Mesa de Sufragio N° ${mesa}</text>
    <text x="450" y="180" font-family="Arial" font-size="18" text-anchor="middle" fill="#666">Elecciones Regionales y Municipales 2026 — Madre de Dios</text>
    <text x="450" y="640" font-family="Arial" font-size="16" text-anchor="middle" fill="#999">Imagen de prueba generada para QA de /verificacion</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function randomVotes(total: number, ids: string[], favoriteId: string) {
  const weights = ids.map((id) => (id === favoriteId ? 2.6 : 0.5 + Math.random()));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => Math.floor((w / weightSum) * total));
  const diff = total - raw.reduce((a, b) => a + b, 0);
  raw[0] += diff; // ajusta el residuo por redondeo en el primer candidato
  const votes: Record<string, number> = {};
  ids.forEach((id, i) => (votes[id] = Math.max(0, raw[i])));
  return votes;
}

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: "admin@gmail.com" } });

  console.log(`→ Sembrando ${PLAN.length} actas de prueba (electionType=gobernador)…`);

  for (const item of PLAN) {
    const mesa = await prisma.electoralMesa.findUnique({ where: { number: item.mesa } });
    if (!mesa) {
      console.warn(`  ⚠ mesa ${item.mesa} no existe en el padrón, saltando`);
      continue;
    }

    const personero = await prisma.personero.findFirst({
      where: { mesa: item.mesa, active: true },
    });

    const totalVotantes = 180 + Math.floor(Math.random() * 140); // 180–320
    const votosBlancos = Math.floor(Math.random() * 8);
    const votosNulos = Math.floor(Math.random() * 6);
    const votosImpugnados = Math.floor(Math.random() * 3);
    const votesByCandidate = randomVotes(
      totalVotantes - votosBlancos - votosNulos - votosImpugnados,
      GOB_CANDIDATE_IDS,
      FAVORITE_ID,
    );
    const totalVotos = totalVotantes;

    const isReviewed = item.status === "aprobada" || item.status === "observada";

    const acta = await prisma.actaElectoral.upsert({
      where: { mesaNumber_electionType: { mesaNumber: item.mesa, electionType: "gobernador" } },
      update: {
        localId: mesa.localId,
        personeroId: personero?.id ?? null,
        photoUrl: placeholderPhoto(item.mesa),
        source: "manual",
        status: item.status,
        observationReason: item.reason ?? null,
        reviewedById: isReviewed ? admin?.id ?? null : null,
        reviewedAt: isReviewed ? new Date() : null,
        votosBlancos,
        votosNulos,
        votosImpugnados,
        totalVotos,
        submittedAt: new Date(),
      },
      create: {
        mesaNumber: item.mesa,
        electionType: "gobernador",
        localId: mesa.localId,
        personeroId: personero?.id ?? null,
        photoUrl: placeholderPhoto(item.mesa),
        source: "manual",
        status: item.status,
        observationReason: item.reason ?? null,
        reviewedById: isReviewed ? admin?.id ?? null : null,
        reviewedAt: isReviewed ? new Date() : null,
        votosBlancos,
        votosNulos,
        votosImpugnados,
        totalVotos,
      },
    });

    await prisma.actaVoto.deleteMany({ where: { actaId: acta.id } });
    await prisma.actaVoto.createMany({
      data: Object.entries(votesByCandidate).map(([candidateId, votes]) => ({
        actaId: acta.id,
        candidateId,
        votes,
      })),
    });

    console.log(`  ✓ mesa ${item.mesa} (${item.status}) — ${totalVotos} votantes, personero: ${personero?.name ?? "sin asignar"}`);
  }

  console.log("✓ Actas de prueba listas.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
