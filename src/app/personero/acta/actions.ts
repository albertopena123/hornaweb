"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/server";

export type SubmitActaInput = {
  mesaNumber: string;
  photoUrl: string;
  source: "manual" | "ia";
  electionType?: "gobernador" | "provincial";
  province?: string;
  votes: Record<string, number>; // candidateId -> votes
  votosBlancos: number;
  votosNulos: number;
  votosImpugnados: number;
  totalVotos: number;
};

export async function submitActa(input: SubmitActaInput) {
  try {
    const mesaNum = input.mesaNumber.trim().padStart(6, "0");
    const electionType = input.electionType || "gobernador";

    if (!/^\d{6}$/.test(mesaNum)) {
      return { ok: false, error: "El número de mesa debe tener 6 dígitos." };
    }

    if (!input.photoUrl) {
      return { ok: false, error: "Debes adjuntar la fotografía del acta de escrutinio." };
    }

    // Buscar la mesa en el padrón electoral ONPE
    const mesa = await prisma.electoralMesa.findUnique({
      where: { number: mesaNum },
      include: { local: true },
    });

    if (!mesa) {
      return { ok: false, error: `La mesa N° ${mesaNum} no existe en el padrón oficial de Madre de Dios.` };
    }

    // Buscar personero asignado a esta mesa o usuario actual
    const me = await getCurrentUser();
    let personero = await prisma.personero.findFirst({
      where: { mesa: mesaNum, active: true },
    });

    if (!personero && me) {
      personero = await prisma.personero.findFirst({
        where: {
          docNumber: me.email.replace(/@.*$/, ""),
        },
      });
    }

    // Crear o actualizar el Acta Electoral para esta mesa y tipo de elección
    const existing = await prisma.actaElectoral.findFirst({
      where: { mesaNumber: mesaNum, electionType },
    });

    let actaId = existing?.id;

    if (existing) {
      const updated = await prisma.actaElectoral.update({
        where: { id: existing.id },
        data: {
          photoUrl: input.photoUrl,
          source: input.source,
          electionType,
          status: "enviada",
          observationReason: null,
          votosBlancos: Math.max(0, input.votosBlancos || 0),
          votosNulos: Math.max(0, input.votosNulos || 0),
          votosImpugnados: Math.max(0, input.votosImpugnados || 0),
          totalVotos: Math.max(0, input.totalVotos || 0),
          submittedAt: new Date(),
          localId: mesa.localId,
          personeroId: personero?.id || existing.personeroId,
        },
      });
      actaId = updated.id;
    } else {
      const created = await prisma.actaElectoral.create({
        data: {
          mesaNumber: mesaNum,
          electionType,
          localId: mesa.localId,
          personeroId: personero?.id || null,
          photoUrl: input.photoUrl,
          source: input.source,
          status: "enviada",
          votosBlancos: Math.max(0, input.votosBlancos || 0),
          votosNulos: Math.max(0, input.votosNulos || 0),
          votosImpugnados: Math.max(0, input.votosImpugnados || 0),
          totalVotos: Math.max(0, input.totalVotos || 0),
          submittedAt: new Date(),
        },
      });
      actaId = created.id;
    }

    // Guardar votos por candidato
    if (actaId) {
      await prisma.actaVoto.deleteMany({ where: { actaId } });

      const voteEntries = Object.entries(input.votes || {}).map(([candId, count]) => ({
        actaId,
        candidateId: candId,
        votes: Math.max(0, count || 0),
      }));

      if (voteEntries.length > 0) {
        await prisma.actaVoto.createMany({ data: voteEntries });
      }
    }

    revalidatePath("/personero/acta");
    revalidatePath("/verificacion");
    revalidatePath("/visor-envivo");
    revalidatePath("/computo");

    return { ok: true, actaId };
  } catch (err: any) {
    console.error("Error al enviar acta:", err);
    return { ok: false, error: "Ocurrió un error al registrar el acta." };
  }
}

export async function getActaStatusByMesa(mesaNumber: string, electionType: string = "gobernador") {
  try {
    const cleanMesa = mesaNumber.trim().padStart(6, "0");
    const acta = await prisma.actaElectoral.findFirst({
      where: { mesaNumber: cleanMesa, electionType },
      include: {
        votos: {
          include: { candidate: true },
        },
        local: true,
        personero: true,
      },
    });
    return { ok: true, acta };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
