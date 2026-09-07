import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { PersoneroActaClient } from "./PersoneroActaClient";

export const metadata: Metadata = {
  title: "Subir Acta de Escrutinio · Ahora Nación",
};
export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mesa?: string }>;
}) {
  const me = await getCurrentUser();
  const params = await searchParams;

  // Buscar si el usuario actual es un personero por su DNI
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

  // Obtener información de la mesa si está seleccionada
  let mesaData = null;
  if (selectedMesaNumber) {
    mesaData = await prisma.electoralMesa.findUnique({
      where: { number: selectedMesaNumber.padStart(6, "0") },
      include: { local: true },
    });
  }

  // Obtener candidatos activos (gobernador y alcaldía provincial)
  const candidates = await prisma.candidate.findMany({
    where: { active: true },
    orderBy: [{ cargo: "asc" }, { order: "asc" }],
  });

  // Si ya existen actas para esta mesa, cargarlas
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
    <PersoneroActaClient
      user={me}
      personero={personero}
      initialMesa={selectedMesaNumber}
      mesaData={mesaData}
      candidates={candidates}
      existingActas={existingActas}
    />
  );
}
