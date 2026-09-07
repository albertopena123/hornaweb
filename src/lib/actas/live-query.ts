import { prisma } from "@/lib/prisma";

export async function getLiveResultsData(
  electionType: string = "gobernador",
  province?: string
) {
  const isProvincial = electionType === "provincial";
  let targetProvince = "Tambopata";
  if (province) {
    const p = province.toLowerCase();
    if (p.includes("manu")) targetProvince = "Manu";
    else if (p.includes("tahuamanu")) targetProvince = "Tahuamanu";
    else targetProvince = "Tambopata";
  }

  // 1. Total Mesas esperadas
  let totalMesasExpected = 511;
  if (isProvincial) {
    const count = await prisma.electoralMesa.count({
      where: {
        local: {
          province: { equals: targetProvince, mode: "insensitive" },
        },
      },
    });
    totalMesasExpected = Math.max(1, count);
  }

  // 2. Filtro de Actas por Tipo y Provincia
  const baseWhereActa: any = {
    electionType: isProvincial ? "provincial" : "gobernador",
  };
  if (isProvincial) {
    baseWhereActa.local = {
      province: { equals: targetProvince, mode: "insensitive" },
    };
  }

  // 3. Conteo de Actas por Estado
  const [
    totalRecibidas,
    totalAprobadas,
    totalPendientes,
    totalObservadas,
  ] = await Promise.all([
    prisma.actaElectoral.count({ where: baseWhereActa }),
    prisma.actaElectoral.count({ where: { ...baseWhereActa, status: "aprobada" } }),
    prisma.actaElectoral.count({
      where: { ...baseWhereActa, status: { in: ["enviada", "en_revision"] } },
    }),
    prisma.actaElectoral.count({ where: { ...baseWhereActa, status: "observada" } }),
  ]);

  // 4. Obtener Candidatos
  const candidates = await prisma.candidate.findMany({
    where: {
      cargo: isProvincial ? "provincial" : "gobernador",
      ...(isProvincial
        ? { province: { equals: targetProvince, mode: "insensitive" } }
        : {}),
      active: true,
    },
    orderBy: { order: "asc" },
  });

  // 5. Actas Aprobadas
  const actasAprobadas = await prisma.actaElectoral.findMany({
    where: { ...baseWhereActa, status: "aprobada" },
    include: {
      local: true,
      votos: true,
    },
  });

  // Sumar votos por candidato
  const votesByCandidate: Record<string, number> = {};
  let totalVotosValidos = 0;
  let totalBlancos = 0;
  let totalNulos = 0;
  let totalImpugnados = 0;

  for (const c of candidates) {
    votesByCandidate[c.id] = 0;
  }

  const votosPorProvincia: Record<string, { aprobadas: number; totalVotos: number }> = {
    Tambopata: { aprobadas: 0, totalVotos: 0 },
    Manu: { aprobadas: 0, totalVotos: 0 },
    Tahuamanu: { aprobadas: 0, totalVotos: 0 },
  };

  for (const a of actasAprobadas) {
    totalBlancos += a.votosBlancos;
    totalNulos += a.votosNulos;
    totalImpugnados += a.votosImpugnados;

    const provRaw = a.local.province || "Tambopata";
    let prov = "Tambopata";
    if (/manu/i.test(provRaw)) prov = "Manu";
    else if (/tahuamanu/i.test(provRaw)) prov = "Tahuamanu";
    else prov = "Tambopata";

    if (!votosPorProvincia[prov]) {
      votosPorProvincia[prov] = { aprobadas: 0, totalVotos: 0 };
    }
    votosPorProvincia[prov].aprobadas++;

    for (const v of a.votos) {
      votesByCandidate[v.candidateId] = (votesByCandidate[v.candidateId] || 0) + v.votes;
      totalVotosValidos += v.votes;
      votosPorProvincia[prov].totalVotos += v.votes;
    }
  }

  const totalVotosEmitidos = totalVotosValidos + totalBlancos + totalNulos + totalImpugnados;

  // Generar ranking ordenado de mayor a menor votos
  const ranking = candidates
    .map((c) => {
      const votes = votesByCandidate[c.id] || 0;
      const pctValidos = totalVotosValidos > 0 ? (votes / totalVotosValidos) * 100 : 0;
      const pctEmitidos = totalVotosEmitidos > 0 ? (votes / totalVotosEmitidos) * 100 : 0;
      return {
        id: c.id,
        name: c.name,
        party: c.party,
        partyLogo: c.partyLogo,
        photoUrl: c.photoUrl,
        color: c.color,
        order: c.order,
        votes,
        pctValidos: Number(pctValidos.toFixed(2)),
        pctEmitidos: Number(pctEmitidos.toFixed(2)),
      };
    })
    .sort((a, b) => b.votes - a.votes);

  // Últimas actas aprobadas
  const ultimasActas = await prisma.actaElectoral.findMany({
    where: { ...baseWhereActa, status: "aprobada" },
    orderBy: { reviewedAt: "desc" },
    take: 6,
    include: {
      local: true,
      votos: {
        include: { candidate: true },
        orderBy: { votes: "desc" },
      },
    },
  });

  const pctAvance = Number(((totalAprobadas / totalMesasExpected) * 100).toFixed(1));

  return {
    ok: true,
    timestamp: new Date().toISOString(),
    electionType: isProvincial ? "provincial" : "gobernador",
    province: isProvincial ? targetProvince : "Madre de Dios",
    stats: {
      totalMesas: totalMesasExpected,
      esperadas: totalMesasExpected,
      recibidas: totalRecibidas,
      aprobadas: totalAprobadas,
      pendientes: totalPendientes,
      observadas: totalObservadas,
      pctAvance,
      totalVotosValidos,
      totalBlancos,
      totalNulos,
      totalImpugnados,
      totalVotosEmitidos,
    },
    ranking,
    votosPorProvincia,
    ultimasActas: ultimasActas.map((a) => ({
      id: a.id,
      mesaNumber: a.mesaNumber,
      localName: a.local.name,
      district: a.local.district,
      province: a.local.province,
      totalVotos: a.totalVotos,
      reviewedAt: a.reviewedAt?.toISOString() || null,
      photoUrl: a.photoUrl,
      topCandidate: a.votos[0]
        ? {
            party: a.votos[0].candidate.party,
            votes: a.votos[0].votes,
          }
        : null,
    })),
    ultimaAprobada: ultimasActas[0]
      ? {
          id: ultimasActas[0].id,
          mesaNumber: ultimasActas[0].mesaNumber,
          localName: ultimasActas[0].local.name,
          district: ultimasActas[0].local.district,
          province: ultimasActas[0].local.province,
          totalVotos: ultimasActas[0].totalVotos,
          reviewedAt: ultimasActas[0].reviewedAt?.toISOString() || null,
          photoUrl: ultimasActas[0].photoUrl,
        }
      : null,
  };
}
