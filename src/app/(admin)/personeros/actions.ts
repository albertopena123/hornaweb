"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/server";
import { isDistrictId, type DistrictId } from "@/lib/districts";
import { setSettingBool, SETTING_PERSONEROS_PUBLIC } from "@/lib/settings";
import type { ActionResult, PersoneroInput } from "./types";

class Denied extends Error {}

async function authorize(perm: "personeros.read" | "personeros.write"): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me || !me.permissions.has(perm)) throw new Denied();
  return me;
}

function fail(error: string, fieldErrors?: Partial<Record<string, string>>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

function refresh() {
  revalidatePath("/personeros");
}

function isUniqueViolation(e: unknown): boolean {
  return !!e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002";
}

type Validated = {
  docType: "dni" | "ce" | "passport";
  docNumber: string;
  name: string;
  phone: string | null;
  district: DistrictId | null;
  localName: string;
  localAddress: string | null;
  mesa: string;
  coordinatorName: string;
  coordinatorPhone: string;
  active: boolean;
  notes: string | null;
};

function validate(input: PersoneroInput): { data?: Validated; fieldErrors?: Record<string, string> } {
  const fe: Record<string, string> = {};

  const docType =
    input.docType === "ce" || input.docType === "passport" ? input.docType : "dni";
  const docNumber = (input.docNumber ?? "").trim().toUpperCase();
  if (docType === "dni") {
    if (!/^\d{8}$/.test(docNumber)) fe.docNumber = "El DNI debe tener 8 dígitos.";
  } else if (!/^[A-Z0-9]{6,12}$/.test(docNumber)) {
    fe.docNumber = "Documento inválido (6 a 12 letras o números).";
  }

  const name = (input.name ?? "").trim();
  if (name.length < 2 || name.length > 120) fe.name = "Nombre de 2 a 120 caracteres.";

  const localName = (input.localName ?? "").trim();
  if (localName.length < 2 || localName.length > 120) fe.localName = "Local de 2 a 120 caracteres.";

  const mesa = (input.mesa ?? "").trim();
  if (mesa.length < 1 || mesa.length > 10) fe.mesa = "Número de mesa requerido (máx. 10).";

  const coordinatorName = (input.coordinatorName ?? "").trim();
  if (coordinatorName.length < 2 || coordinatorName.length > 120)
    fe.coordinatorName = "Coordinador de 2 a 120 caracteres.";

  const coordinatorPhone = (input.coordinatorPhone ?? "").trim();
  if (!/^[0-9+\s-]{6,15}$/.test(coordinatorPhone))
    fe.coordinatorPhone = "Teléfono del coordinador inválido.";

  let phone: string | null = null;
  if (input.phone && input.phone.trim() !== "") {
    const p = input.phone.trim();
    if (!/^[0-9+\s-]{6,15}$/.test(p)) fe.phone = "Celular inválido.";
    else phone = p;
  }

  let district: DistrictId | null = null;
  if (input.district && input.district.trim() !== "") {
    if (!isDistrictId(input.district)) fe.district = "Distrito inválido.";
    else district = input.district;
  }

  const localAddress =
    input.localAddress && input.localAddress.trim() !== ""
      ? input.localAddress.trim().slice(0, 200)
      : null;
  const notes =
    input.notes && input.notes.trim() !== "" ? input.notes.trim().slice(0, 500) : null;

  if (Object.keys(fe).length > 0) return { fieldErrors: fe };
  return {
    data: {
      docType,
      docNumber,
      name,
      phone,
      district,
      localName,
      localAddress,
      mesa,
      coordinatorName,
      coordinatorPhone,
      active: !!input.active,
      notes,
    },
  };
}

export async function createPersonero(
  input: PersoneroInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await authorize("personeros.write");
    const v = validate(input);
    if (!v.data) return fail("Revisa los campos marcados.", v.fieldErrors);
    const p = await prisma.personero.create({
      data: { ...v.data, createdById: me.id, updatedById: me.id },
    });
    refresh();
    return { ok: true, data: { id: p.id } };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar personeros.");
    if (isUniqueViolation(e))
      return fail("Ya existe un personero con ese documento.", {
        docNumber: "Documento ya registrado.",
      });
    console.error("createPersonero", e);
    return fail("Error inesperado al registrar.");
  }
}

export async function updatePersonero(id: string, input: PersoneroInput): Promise<ActionResult> {
  try {
    const me = await authorize("personeros.write");
    const v = validate(input);
    if (!v.data) return fail("Revisa los campos marcados.", v.fieldErrors);
    await prisma.personero.update({
      where: { id },
      data: { ...v.data, updatedById: me.id },
    });
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar personeros.");
    if (isUniqueViolation(e))
      return fail("Ya existe un personero con ese documento.", {
        docNumber: "Documento ya registrado.",
      });
    console.error("updatePersonero", e);
    return fail("Error inesperado al guardar.");
  }
}

export async function setPersoneroActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    const me = await authorize("personeros.write");
    await prisma.personero.update({ where: { id }, data: { active, updatedById: me.id } });
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar personeros.");
    console.error("setPersoneroActive", e);
    return fail("Error inesperado al cambiar el estado.");
  }
}

export async function deletePersonero(id: string): Promise<ActionResult> {
  try {
    await authorize("personeros.write");
    await prisma.personero.delete({ where: { id } });
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar personeros.");
    console.error("deletePersonero", e);
    return fail("Error inesperado al eliminar.");
  }
}

/** Switch de Admin → Personeros: abre/cierra la inscripción pública desde el landing. */
export async function setPublicRegistration(enabled: boolean): Promise<ActionResult> {
  try {
    await authorize("personeros.write");
    await setSettingBool(SETTING_PERSONEROS_PUBLIC, !!enabled);
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar personeros.");
    console.error("setPublicRegistration", e);
    return fail("Error inesperado al guardar el ajuste.");
  }
}
