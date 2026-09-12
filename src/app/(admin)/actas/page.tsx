import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { PersoneroActaClient } from "@/app/personero/acta/PersoneroActaClient";

export const metadata: Metadata = {
  title: "Subir Acta de Escrutinio · Ahora Nación",
};
export const dynamic = "force-dynamic";

export default async function SubirActaAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ mesa?: string }>;
}) {
  const me = await getCurrentUser();
  const params = await searchParams;

  let personero = null;
  if (me) {
    const dniFromEmail = me.email.replace(/@.*$/, "");
    personero = await prisma.personero.findFirst({
      where: {
        OR: [{ docNumber: dniFromEmail }, { docNumber: me.email }],
        active: true,
      },
    });
  }

  const selectedMesaNumber = params.mesa || personero?.mesa || "";

  let mesaData = null;
  if (selectedMesaNumber) {
    mesaData = await prisma.electoralMesa.findUnique({
      where: { number: selectedMesaNumber.padStart(6, "0") },
      include: { local: true },
    });
  }

  const candidates = await prisma.candidate.findMany({
    where: { active: true },
    orderBy: [{ cargo: "asc" }, { order: "asc" }],
  });

  let existingActas: any[] = [];
  if (selectedMesaNumber) {
    existingActas = await prisma.actaElectoral.findMany({
      where: { mesaNumber: selectedMesaNumber.padStart(6, "0") },
      include: {
        votos: true,
        local: true,
      },
    });
  }

  return (
    <div className="subir-acta-standalone-view" style={{ maxWidth: 1200, margin: "0 auto", padding: "8px 16px 48px" }}>
      <PersoneroActaClient
        user={me}
        personero={personero}
        initialMesa={selectedMesaNumber}
        mesaData={mesaData}
        candidates={candidates}
        existingActas={existingActas}
      />
    </div>
  );
}
