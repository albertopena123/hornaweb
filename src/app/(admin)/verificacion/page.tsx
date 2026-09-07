import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { VerificacionClient } from "./VerificacionClient";

export const metadata: Metadata = {
  title: "Filtro y Verificación de Actas · Ahora Nación",
};
export const dynamic = "force-dynamic";

export default async function Page() {
  const me = await requirePermission("actas.verify");

  const actas = await prisma.actaElectoral.findMany({
    orderBy: { submittedAt: "desc" },
    include: {
      local: true,
      personero: true,
      reviewedBy: { select: { name: true, email: true } },
      votos: {
        include: { candidate: true },
        orderBy: { candidate: { order: "asc" } },
      },
    },
  });

  const candidates = await prisma.candidate.findMany({
    where: { active: true },
    orderBy: [{ cargo: "asc" }, { order: "asc" }],
  });

  return (
    <VerificacionClient
      user={me}
      initialActas={actas}
      candidates={candidates}
    />
  );
}
