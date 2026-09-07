"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/server";

class Denied extends Error {}

async function authorizeReader() {
  const me = await getCurrentUser();
  if (
    !me ||
    (!me.permissions.has("candidatos.read") &&
      !me.permissions.has("candidatos.write") &&
      !me.permissions.has("users.read"))
  ) {
    throw new Denied();
  }
  return me;
}

async function authorizeWriter() {
  const me = await getCurrentUser();
  if (
    !me ||
    (!me.permissions.has("candidatos.write") && !me.permissions.has("users.write"))
  ) {
    throw new Denied();
  }
  return me;
}

export type CandidateInput = {
  name: string;
  party: string;
  partyLogo?: string;
  photoUrl?: string;
  cargo: "gobernador" | "provincial" | "distrital";
  province?: string;
  order: number;
  color: string;
  active: boolean;
};

export async function getCandidates() {
  await authorizeReader();
  return prisma.candidate.findMany({
    orderBy: [{ cargo: "asc" }, { province: "asc" }, { order: "asc" }],
  });
}

export async function createCandidate(data: CandidateInput) {
  try {
    await authorizeWriter();

    if (!data.name.trim()) return { ok: false, error: "El nombre del candidato es obligatorio." };
    if (!data.party.trim()) return { ok: false, error: "El partido político es obligatorio." };

    const candidate = await prisma.candidate.create({
      data: {
        name: data.name.trim().toUpperCase(),
        party: data.party.trim().toUpperCase(),
        partyLogo: data.partyLogo?.trim() || null,
        photoUrl: data.photoUrl?.trim() || null,
        cargo: data.cargo,
        province: data.cargo === "provincial" ? data.province?.trim() || "Tambopata" : null,
        order: Math.max(1, data.order || 1),
        color: data.color?.trim() || "#dc2626",
        active: data.active ?? true,
      },
    });

    revalidatePath("/candidatos");
    revalidatePath("/visor-envivo");
    revalidatePath("/personero/acta");
    revalidatePath("/verificacion");

    return { ok: true, candidate };
  } catch (err) {
    if (err instanceof Denied) return { ok: false, error: "No tienes permiso para crear candidatos." };
    console.error("Error creating candidate:", err);
    return { ok: false, error: "Error al crear candidato." };
  }
}

export async function updateCandidate(id: string, data: Partial<CandidateInput>) {
  try {
    await authorizeWriter();

    const existing = await prisma.candidate.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "Candidato no encontrado." };

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim().toUpperCase();
    if (data.party !== undefined) updateData.party = data.party.trim().toUpperCase();
    if (data.partyLogo !== undefined) updateData.partyLogo = data.partyLogo.trim() || null;
    if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl.trim() || null;
    if (data.cargo !== undefined) updateData.cargo = data.cargo;
    if (data.province !== undefined) updateData.province = data.province?.trim() || null;
    if (data.order !== undefined) updateData.order = Math.max(1, data.order);
    if (data.color !== undefined) updateData.color = data.color.trim();
    if (data.active !== undefined) updateData.active = data.active;

    const candidate = await prisma.candidate.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/candidatos");
    revalidatePath("/visor-envivo");
    revalidatePath("/personero/acta");
    revalidatePath("/verificacion");

    return { ok: true, candidate };
  } catch (err) {
    if (err instanceof Denied) return { ok: false, error: "No tienes permiso para editar candidatos." };
    console.error("Error updating candidate:", err);
    return { ok: false, error: "Error al actualizar candidato." };
  }
}

export async function toggleCandidateActive(id: string) {
  try {
    await authorizeWriter();

    const c = await prisma.candidate.findUnique({ where: { id } });
    if (!c) return { ok: false, error: "Candidato no encontrado." };

    const updated = await prisma.candidate.update({
      where: { id },
      data: { active: !c.active },
    });

    revalidatePath("/candidatos");
    revalidatePath("/visor-envivo");
    revalidatePath("/personero/acta");

    return { ok: true, active: updated.active };
  } catch (err) {
    if (err instanceof Denied) return { ok: false, error: "No tienes permiso para modificar candidatos." };
    console.error("Error toggling candidate:", err);
    return { ok: false, error: "Error al modificar candidato." };
  }
}

export async function deleteCandidate(id: string) {
  try {
    await authorizeWriter();

    await prisma.candidate.delete({ where: { id } });

    revalidatePath("/candidatos");
    revalidatePath("/visor-envivo");
    revalidatePath("/personero/acta");

    return { ok: true };
  } catch (err) {
    if (err instanceof Denied) return { ok: false, error: "No tienes permiso para eliminar candidatos." };
    console.error("Error deleting candidate:", err);
    return { ok: false, error: "No se puede eliminar el candidato porque tiene votos asociados." };
  }
}
