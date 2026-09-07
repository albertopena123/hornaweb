import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { CandidatosClient } from "./CandidatosClient";

export const metadata: Metadata = {
  title: "Gestión de Candidatos · Cómputo Electoral Ahora Nación",
  description: "Administración, edición de nombres, partidos, logotipos y cargos de los candidatos oficiales.",
};

export const dynamic = "force-dynamic";

export default async function CandidatosPage() {
  const me = await getCurrentUser();
  if (!me) {
    redirect("/login");
  }

  const canRead =
    me.permissions.has("candidatos.read") ||
    me.permissions.has("candidatos.write") ||
    me.permissions.has("users.read");

  if (!canRead) {
    redirect("/403");
  }

  const canWrite = me.permissions.has("candidatos.write") || me.permissions.has("users.write");

  const candidates = await prisma.candidate.findMany({
    orderBy: [{ cargo: "asc" }, { province: "asc" }, { order: "asc" }],
  });

  return (
    <CandidatosClient
      candidates={candidates.map((c) => ({
        id: c.id,
        name: c.name,
        party: c.party,
        partyLogo: c.partyLogo,
        photoUrl: c.photoUrl,
        cargo: c.cargo,
        province: c.province,
        order: c.order,
        color: c.color,
        active: c.active,
      }))}
      canWrite={canWrite}
    />
  );
}
