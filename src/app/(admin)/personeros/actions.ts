"use server";

import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/server";
import { isDistrictId, type DistrictId } from "@/lib/districts";
import { setSettingBool, SETTING_PERSONEROS_PUBLIC } from "@/lib/settings";
import { sendPersoneroAssignmentWhatsApp } from "@/lib/personeros/notifications";
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
  aula: string | null;
  role: string;
  isSuplente: boolean;
  coordinatorName: string;
  coordinatorPhone: string;
  active: boolean;
  notes: string | null;
};

function validate(input: PersoneroInput): { data?: Validated; fieldErrors?: Record<string, string> } {
  const fe: Record<string, string> = {};

  const docType = input.docType === "ce" || input.docType === "passport" ? input.docType : "dni";
  let docNumber = (input.docNumber ?? "").trim().toUpperCase().replace(/\s+/g, "");
  docNumber = docNumber.replace(/^O+/i, (m) => "0".repeat(m.length));

  if (docType === "dni") {
    if (!/^\d{8}$/.test(docNumber)) fe.docNumber = "El DNI debe tener 8 dígitos numéricos.";
  } else if (!/^[A-Z0-9]{6,12}$/.test(docNumber)) {
    fe.docNumber = "Documento inválido (6 a 12 letras o números).";
  }

  const name = (input.name ?? "").trim();
  if (name.length < 2 || name.length > 120) fe.name = "Nombre de 2 a 120 caracteres.";

  const localName = (input.localName ?? "").trim();
  if (localName.length < 2 || localName.length > 120) fe.localName = "Local requerido (mínimo 2 letras).";

  const mesa = (input.mesa ?? "").trim();
  const aula = input.aula && input.aula.trim() !== "" ? input.aula.trim().slice(0, 80) : null;
  const role = input.role === "general" ? "general" : input.role === "suplente" || input.isSuplente ? "suplente" : "titular";
  const isSuplente = !!input.isSuplente || role === "suplente";

  const coordinatorName = (input.coordinatorName ?? "").trim() || "Coordinación Central Ahora Nación";
  const coordinatorPhone = (input.coordinatorPhone ?? "").trim() || "982136949";

  let phone: string | null = null;
  if (input.phone && input.phone.trim() !== "") {
    const p = input.phone.trim().replace(/\D/g, "");
    if (p.length < 6 || p.length > 15) fe.phone = "Celular inválido (6 a 15 dígitos).";
    else phone = p;
  }

  let district: DistrictId | null = null;
  if (input.district && input.district.trim() !== "") {
    if (!isDistrictId(input.district)) fe.district = "Distrito inválido.";
    else district = input.district;
  }

  const localAddress = input.localAddress && input.localAddress.trim() !== "" ? input.localAddress.trim().slice(0, 200) : null;
  const notes = input.notes && input.notes.trim() !== "" ? input.notes.trim().slice(0, 500) : null;

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
      aula,
      role,
      isSuplente,
      coordinatorName,
      coordinatorPhone,
      active: !!input.active,
      notes,
    },
  };
}

export async function createPersonero(
  input: PersoneroInput,
  originUrl?: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await authorize("personeros.write");
    const v = validate(input);
    if (!v.data) return fail("Revisa los campos marcados.", v.fieldErrors);

    const credentialToken = crypto.randomUUID();
    const p = await prisma.personero.create({
      data: {
        ...v.data,
        credentialToken,
        createdById: me.id,
        updatedById: me.id,
      },
    });

    if (input.sendWhatsAppImmediately && p.phone && p.mesa) {
      await sendPersoneroAssignmentWhatsApp(p.id, originUrl);
    }

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

export async function updatePersonero(
  id: string,
  input: PersoneroInput,
  originUrl?: string,
): Promise<ActionResult> {
  try {
    const me = await authorize("personeros.write");
    const v = validate(input);
    if (!v.data) return fail("Revisa los campos marcados.", v.fieldErrors);

    const current = await prisma.personero.findUnique({ where: { id } });
    const credentialToken = current?.credentialToken || crypto.randomUUID();

    await prisma.personero.update({
      where: { id },
      data: {
        ...v.data,
        credentialToken,
        updatedById: me.id,
      },
    });

    if (input.sendWhatsAppImmediately && v.data.phone && v.data.mesa) {
      await sendPersoneroAssignmentWhatsApp(id, originUrl);
    }

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

/** Asignar un personero existente directamente a una mesa y aula específica (como Titular o Suplente) */
export async function assignPersoneroToMesa(
  personeroId: string,
  mesaNumber: string,
  aula?: string,
  localName?: string,
  originUrl?: string,
  role?: "titular" | "suplente",
): Promise<ActionResult> {
  try {
    const me = await authorize("personeros.write");

    const mesaRecord = await prisma.electoralMesa.findUnique({
      where: { number: mesaNumber },
      include: { local: true },
    });

    const targetLocalName = mesaRecord?.local.name || localName || "Local de Votación";
    const targetAddress = mesaRecord?.local.address || null;
    const targetDistrict = mesaRecord?.local.district || null;
    const coordinatorName = mesaRecord?.local.coordinatorName || undefined;
    const coordinatorPhone = mesaRecord?.local.coordinatorPhone || undefined;
    const isSuplente = role === "suplente";

    await prisma.personero.update({
      where: { id: personeroId },
      data: {
        mesa: mesaNumber,
        aula: aula?.trim() || mesaRecord?.aula || null,
        localName: targetLocalName,
        localAddress: targetAddress,
        district: targetDistrict,
        role: isSuplente ? "suplente" : "titular",
        isSuplente,
        ...(coordinatorName ? { coordinatorName, coordinatorPhone: coordinatorPhone || "982136949" } : {}),
        updatedById: me.id,
      },
    });

    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar personeros.");
    console.error("assignPersoneroToMesa", e);
    return fail("Error al asignar personero a la mesa.");
  }
}

/** Desasignar un personero de su mesa */
export async function unassignPersoneroFromMesa(personeroId: string): Promise<ActionResult> {
  try {
    const me = await authorize("personeros.write");
    await prisma.personero.update({
      where: { id: personeroId },
      data: { mesa: "", aula: null, updatedById: me.id },
    });
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para desasignar personeros.");
    console.error("unassignPersoneroFromMesa", e);
    return fail("Error al desasignar personero.");
  }
}

export type UpdateLocalInput = {
  name: string;
  code?: string;
  address?: string | null;
  district?: string;
  province?: string;
  latitude?: number | null;
  longitude?: number | null;
  coordinatorName?: string | null;
  coordinatorPhone?: string | null;
};

/** Editar completamente los datos de un colegio / local de votación */
export async function updateLocal(localId: string, input: UpdateLocalInput): Promise<ActionResult> {
  try {
    const me = await getCurrentUser();
    if (
      !me ||
      (!me.permissions.has("locales.write") &&
        !me.permissions.has("personeros.write") &&
        !me.permissions.has("users.write"))
    ) {
      throw new Denied();
    }

    const current = await prisma.electoralLocal.findUnique({ where: { id: localId } });
    if (!current) return fail("Local de votación no encontrado.");

    const name = input.name.trim();
    if (!name) return fail("El nombre del colegio es obligatorio.");

    const updateData: any = {
      name,
      address: input.address?.trim() || null,
      coordinatorName: input.coordinatorName?.trim() || null,
      coordinatorPhone: input.coordinatorPhone?.trim() || null,
    };

    if (input.code) updateData.code = input.code.trim();
    if (input.district && isDistrictId(input.district)) updateData.district = input.district;
    if (input.province) updateData.province = input.province.trim();
    if (input.latitude !== undefined) updateData.latitude = input.latitude;
    if (input.longitude !== undefined) updateData.longitude = input.longitude;

    await prisma.electoralLocal.update({
      where: { id: localId },
      data: updateData,
    });

    // Si el nombre cambió, sincronizar con personeros asignados
    if (current.name !== name) {
      await prisma.personero.updateMany({
        where: { localName: current.name },
        data: { localName: name, updatedById: me.id },
      });
    }

    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para editar locales.");
    console.error("updateLocal", e);
    return fail("Error al actualizar datos del colegio.");
  }
}

/** Actualizar coordenadas GPS exactas de un colegio */
export async function updateLocalCoordinates(
  localId: string,
  latitude: number,
  longitude: number,
): Promise<ActionResult> {
  try {
    const me = await getCurrentUser();
    if (
      !me ||
      (!me.permissions.has("locales.write") &&
        !me.permissions.has("personeros.write") &&
        !me.permissions.has("users.write"))
    ) {
      throw new Denied();
    }

    await prisma.electoralLocal.update({
      where: { id: localId },
      data: { latitude, longitude },
    });

    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para actualizar coordenadas.");
    console.error("updateLocalCoordinates", e);
    return fail("Error al actualizar coordenadas del colegio.");
  }
}

/** Editar datos de una mesa (aula, miembros ONPE) */
export async function updateMesa(
  mesaNumber: string,
  data: {
    aula?: string | null;
    onpePresidente?: string | null;
    onpeSecretario?: string | null;
    onpeSuplentes?: string | null;
  },
): Promise<ActionResult> {
  try {
    const me = await getCurrentUser();
    if (
      !me ||
      (!me.permissions.has("mesas.write") &&
        !me.permissions.has("personeros.write") &&
        !me.permissions.has("users.write"))
    ) {
      throw new Denied();
    }

    await prisma.electoralMesa.update({
      where: { number: mesaNumber },
      data: {
        aula: data.aula?.trim() || null,
        onpePresidente: data.onpePresidente?.trim() || null,
        onpeSecretario: data.onpeSecretario?.trim() || null,
        onpeSuplentes: data.onpeSuplentes?.trim() || null,
      },
    });

    // Si se actualizó el aula, sincronizar con personeros de la mesa
    if (data.aula !== undefined) {
      await prisma.personero.updateMany({
        where: { mesa: mesaNumber },
        data: { aula: data.aula?.trim() || null, updatedById: me.id },
      });
    }

    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para editar mesas.");
    console.error("updateMesa", e);
    return fail("Error al actualizar mesa.");
  }
}

/** Asignar o actualizar el Coordinador de un Colegio de Votación */
export async function updateLocalCoordinator(
  localId: string,
  coordinatorName: string,
  coordinatorPhone: string,
  coordinatorDni?: string | null,
): Promise<ActionResult> {
  try {
    const me = await authorize("personeros.write");
    const name = coordinatorName.trim();
    if (name.length < 2 || name.length > 120) {
      return fail("El nombre del coordinador debe tener entre 2 y 120 caracteres.");
    }
    const phone = coordinatorPhone.trim().replace(/\D/g, "");
    if (phone.length < 6 || phone.length > 15) {
      return fail("El teléfono del coordinador debe tener entre 6 y 15 dígitos.");
    }

    const cleanDni = coordinatorDni ? coordinatorDni.trim().replace(/\D/g, "") : null;
    if (cleanDni && cleanDni.length !== 8) {
      return fail("El DNI del coordinador debe tener 8 dígitos numéricos.");
    }

    let local;
    try {
      local = await prisma.electoralLocal.update({
        where: { id: localId },
        data: {
          coordinatorName: name,
          coordinatorPhone: phone,
          coordinatorDni: cleanDni || null,
        } as any,
      });
    } catch (err: any) {
      if (
        err?.message?.includes("coordinatorDni") ||
        err?.name === "PrismaClientValidationError"
      ) {
        local = await prisma.electoralLocal.update({
          where: { id: localId },
          data: {
            coordinatorName: name,
            coordinatorPhone: phone,
          },
        });
        await prisma.$executeRaw`UPDATE "ElectoralLocal" SET "coordinatorDni" = ${cleanDni || null} WHERE id = ${localId}`;
      } else {
        throw err;
      }
    }

    // Sincronizar automáticamente con todos los personeros asignados a este local
    await prisma.personero.updateMany({
      where: { localName: local.name },
      data: {
        coordinatorName: name,
        coordinatorPhone: phone,
        updatedById: me.id,
      },
    });

    // Si tiene DNI, registrar o vincular al coordinador en la tabla de Personeros
    if (cleanDni) {
      const existing = await prisma.personero.findFirst({
        where: { docNumber: cleanDni },
      });

      if (existing) {
        await prisma.personero.update({
          where: { id: existing.id },
          data: {
            name,
            phone: phone || existing.phone,
            localName: local.name,
            role: existing.role === "titular" || existing.role === "suplente" ? existing.role : "coordinador",
            coordinatorName: name,
            coordinatorPhone: phone,
            updatedById: me.id,
          },
        });
      } else {
        await prisma.personero.create({
          data: {
            docType: "dni",
            docNumber: cleanDni,
            name,
            phone: phone || null,
            district: local.district,
            localName: local.name,
            localAddress: local.address,
            mesa: "-",
            role: "coordinador",
            isSuplente: false,
            coordinatorName: name,
            coordinatorPhone: phone,
            active: true,
            createdById: me.id,
          },
        });
      }
    }

    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para actualizar coordinadores.");
    console.error("updateLocalCoordinator", e);
    return fail("Error al actualizar el coordinador del colegio.");
  }
}

/** Desasignar / eliminar coordinador de un local */
export async function removeLocalCoordinator(localId: string): Promise<ActionResult> {
  try {
    const me = await authorize("personeros.write");
    let local;
    try {
      local = await prisma.electoralLocal.update({
        where: { id: localId },
        data: {
          coordinatorName: null,
          coordinatorPhone: null,
          coordinatorDni: null,
        } as any,
      });
    } catch (err: any) {
      if (
        err?.message?.includes("coordinatorDni") ||
        err?.name === "PrismaClientValidationError"
      ) {
        local = await prisma.electoralLocal.update({
          where: { id: localId },
          data: {
            coordinatorName: null,
            coordinatorPhone: null,
          },
        });
        await prisma.$executeRaw`UPDATE "ElectoralLocal" SET "coordinatorDni" = NULL WHERE id = ${localId}`;
      } else {
        throw err;
      }
    }

    // Restablecer coordinación central por defecto a los personeros de ese colegio
    await prisma.personero.updateMany({
      where: { localName: local.name },
      data: {
        coordinatorName: "Coordinación Central Ahora Nación",
        coordinatorPhone: "982136949",
        updatedById: me.id,
      },
    });

    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para desasignar coordinadores.");
    console.error("removeLocalCoordinator", e);
    return fail("Error al desasignar el coordinador del colegio.");
  }
}

/** Enviar notificación de asignación por WhatsApp */
export async function notifyPersoneroWhatsApp(
  id: string,
  originUrl?: string,
): Promise<ActionResult<{ wahaMessageId?: string }>> {
  try {
    await authorize("personeros.write");
    const res = await sendPersoneroAssignmentWhatsApp(id, originUrl);
    if (!res.ok) return fail(res.error || "No se pudo entregar por WhatsApp.");
    refresh();
    return { ok: true, data: { wahaMessageId: res.wahaMessageId } };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para enviar notificaciones.");
    console.error("notifyPersoneroWhatsApp", e);
    return fail("Error inesperado al enviar WhatsApp.");
  }
}

/** Notificación masiva a todos los personeros asignados con WhatsApp pendiente */
export async function notifyAllPendingWhatsApp(
  originUrl?: string,
): Promise<ActionResult<{ sentCount: number; failCount: number }>> {
  try {
    await authorize("personeros.write");
    const pending = await prisma.personero.findMany({
      where: {
        active: true,
        phone: { not: null },
        mesa: { not: "" },
        whatsappNotifiedAt: null,
      },
    });

    let sentCount = 0;
    let failCount = 0;

    for (const p of pending) {
      const res = await sendPersoneroAssignmentWhatsApp(p.id, originUrl);
      if (res.ok) sentCount++;
      else failCount++;
    }

    refresh();
    return { ok: true, data: { sentCount, failCount } };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para enviar notificaciones masivas.");
    console.error("notifyAllPendingWhatsApp", e);
    return fail("Error en notificación masiva.");
  }
}

/** Switch de Admin → Personeros: abre/cierra la inscripción pública desde el landing */
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
