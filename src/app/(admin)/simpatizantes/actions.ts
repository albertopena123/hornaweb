"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/server";
import { isDistrictId, type DistrictId } from "@/lib/districts";
import type { ActionResult, SupporterInput } from "./types";

class Denied extends Error {}

async function authorize(perm: "supporters.read" | "supporters.write"): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me || !me.permissions.has(perm)) throw new Denied();
  return me;
}

function fail(error: string, fieldErrors?: Partial<Record<string, string>>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

function refresh() {
  revalidatePath("/simpatizantes");
}

type Validated = { name: string; district: DistrictId; phone: string | null; notes: string | null };

function validate(input: SupporterInput): {
  data?: Validated;
  fieldErrors?: Record<string, string>;
} {
  const fieldErrors: Record<string, string> = {};
  const name = (input.name ?? "").trim();
  if (name.length < 2 || name.length > 120) fieldErrors.name = "Nombre de 2 a 120 caracteres.";
  if (!isDistrictId(input.district)) fieldErrors.district = "Distrito inválido.";
  let phone: string | null = null;
  if (input.phone && input.phone.trim() !== "") {
    const p = input.phone.trim();
    if (!/^[0-9+\s-]{6,15}$/.test(p)) fieldErrors.phone = "Teléfono inválido.";
    else phone = p;
  }
  const notes = input.notes && input.notes.trim() !== "" ? input.notes.trim().slice(0, 500) : null;
  if (Object.keys(fieldErrors).length > 0 || !isDistrictId(input.district)) {
    return { fieldErrors };
  }
  return { data: { name, district: input.district, phone, notes } };
}

export async function createSupporter(
  input: SupporterInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await authorize("supporters.write");
    const v = validate(input);
    if (!v.data) return fail("Revisa los campos marcados.", v.fieldErrors);
    const s = await prisma.supporter.create({
      data: {
        name: v.data.name,
        district: v.data.district,
        phone: v.data.phone,
        notes: v.data.notes,
        source: "admin",
        status: "approved",
        createdById: me.id,
        reviewedById: me.id,
        reviewedAt: new Date(),
      },
    });
    refresh();
    return { ok: true, data: { id: s.id } };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar simpatizantes.");
    console.error("createSupporter", e);
    return fail("Error inesperado al registrar.");
  }
}

export async function updateSupporter(id: string, input: SupporterInput): Promise<ActionResult> {
  try {
    await authorize("supporters.write");
    const v = validate(input);
    if (!v.data) return fail("Revisa los campos marcados.", v.fieldErrors);
    await prisma.supporter.update({
      where: { id },
      data: {
        name: v.data.name,
        district: v.data.district,
        phone: v.data.phone,
        notes: v.data.notes,
      },
    });
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar simpatizantes.");
    console.error("updateSupporter", e);
    return fail("Error inesperado al guardar.");
  }
}

export async function setSupporterStatus(
  id: string,
  status: "approved" | "rejected",
): Promise<ActionResult> {
  try {
    const me = await authorize("supporters.write");
    await prisma.supporter.update({
      where: { id },
      data: { status, reviewedById: me.id, reviewedAt: new Date() },
    });
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar simpatizantes.");
    console.error("setSupporterStatus", e);
    return fail("Error inesperado al cambiar el estado.");
  }
}

export async function deleteSupporter(id: string): Promise<ActionResult> {
  try {
    await authorize("supporters.write");
    await prisma.supporter.delete({ where: { id } });
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar simpatizantes.");
    console.error("deleteSupporter", e);
    return fail("Error inesperado al eliminar.");
  }
}
