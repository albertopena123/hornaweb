"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/server";

class Denied extends Error {}

async function authorizeVerifier() {
  const me = await getCurrentUser();
  if (!me || (!me.permissions.has("actas.verify") && !me.permissions.has("users.write"))) {
    throw new Denied();
  }
  return me;
}

export async function approveActa(actaId: string) {
  try {
    const me = await authorizeVerifier();

    const acta = await prisma.actaElectoral.update({
      where: { id: actaId },
      data: {
        status: "aprobada",
        observationReason: null,
        reviewedById: me.id,
        reviewedAt: new Date(),
      },
      include: {
        local: true,
        personero: true,
        votos: {
          include: { candidate: true },
        },
      },
    });

    revalidatePath("/verificacion");
    revalidatePath("/visor-envivo");
    revalidatePath("/computo");

    return { ok: true, acta };
  } catch (err: any) {
    if (err instanceof Denied) {
      return { ok: false, error: "No tienes permiso para verificar o aprobar actas." };
    }
    console.error("Error approving acta:", err);
    return { ok: false, error: "Error al aprobar el acta." };
  }
}

export async function observeActa(actaId: string, reason: string) {
  try {
    const me = await authorizeVerifier();
    const cleanReason = (reason || "").trim();

    if (!cleanReason) {
      return { ok: false, error: "Debes especificar el motivo de la observación." };
    }

    const acta = await prisma.actaElectoral.update({
      where: { id: actaId },
      data: {
        status: "observada",
        observationReason: cleanReason,
        reviewedById: me.id,
        reviewedAt: new Date(),
      },
    });

    revalidatePath("/verificacion");
    revalidatePath("/visor-envivo");
    revalidatePath("/computo");

    return { ok: true, acta };
  } catch (err: any) {
    if (err instanceof Denied) {
      return { ok: false, error: "No tienes permiso para observar actas." };
    }
    console.error("Error observing acta:", err);
    return { ok: false, error: "Error al observar el acta." };
  }
}

export async function getActasQueue() {
  try {
    await authorizeVerifier();

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

    return { ok: true, actas };
  } catch (err: any) {
    if (err instanceof Denied) {
      return { ok: false, error: "Acceso denegado a la verificación de actas." };
    }
    return { ok: false, error: err.message };
  }
}
