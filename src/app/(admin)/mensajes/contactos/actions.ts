"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/server";
import { isDistrictId, type DistrictId } from "@/lib/districts";
import {
  IMPORT_BATCH_SIZE,
  normalizeDni,
  normalizeName,
  normalizePeruPhone,
  type ImportRowInput,
} from "@/lib/messaging/normalize";
import type { ActionResult, ImportSummary } from "../types";

class Denied extends Error {}

async function authorize(perm: "mensajes.read" | "mensajes.write"): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me || !me.permissions.has(perm)) throw new Denied();
  return me;
}

function fail(error: string, fieldErrors?: Partial<Record<string, string>>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

function refresh() {
  revalidatePath("/mensajes/contactos");
}

const NO_PERM = "No tienes permiso para gestionar contactos.";
// Prisma cierra las transacciones interactivas a los 5 s por defecto; un lote de 500 updates
// secuenciales contra un Postgres remoto supera ese límite. Presupuesto proporcional al lote.
const IMPORT_TX_OPTIONS = { timeout: 60_000, maxWait: 10_000 } as const;

export async function createImport(input: {
  fileName: string;
  source: string;
  consentConfirmed: boolean;
  totalRows: number;
  invalid: number;
  duplicatedInFile: number;
}): Promise<ActionResult<{ importId: string }>> {
  try {
    const me = await authorize("mensajes.write");
    const fe: Record<string, string> = {};
    const source = (input.source ?? "").trim();
    if (source.length < 3 || source.length > 120) fe.source = "Indica el origen de la lista (3 a 120 caracteres).";
    if (!input.consentConfirmed) fe.consentConfirmed = "Debes confirmar el consentimiento de las personas.";
    if (Object.keys(fe).length) return fail("Revisa los campos marcados.", fe);
    const imp = await prisma.contactImport.create({
      data: {
        fileName: (input.fileName ?? "archivo.xlsx").slice(0, 200),
        source,
        consentConfirmed: true,
        totalRows: Math.max(0, Math.floor(input.totalRows || 0)),
        invalid: Math.max(0, Math.floor(input.invalid || 0)),
        duplicatedInFile: Math.max(0, Math.floor(input.duplicatedInFile || 0)),
        createdById: me.id,
      },
    });
    return { ok: true, data: { importId: imp.id } };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("createImport", e);
    return fail("Error inesperado al iniciar la importación.");
  }
}

export async function importContactsBatch(
  importId: string,
  rows: ImportRowInput[],
): Promise<ActionResult<{ inserted: number; updated: number }>> {
  try {
    const me = await authorize("mensajes.write");
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > IMPORT_BATCH_SIZE) return fail("Lote inválido.");
    const imp = await prisma.contactImport.findUnique({ where: { id: importId } });
    if (!imp || imp.finishedAt) return fail("Importación no encontrada o ya cerrada.");

    // Re-validación en servidor: nunca confiamos en lo que normalizó el navegador.
    const byDoc = new Map<string, { docNumber: string; name: string; phone: string; district?: DistrictId }>();
    for (const r of rows) {
      const docNumber = normalizeDni(r?.docNumber);
      const phone = normalizePeruPhone(r?.phone);
      const name = normalizeName(r?.name);
      if (!docNumber || !phone || !name) continue;
      const district = r.district && isDistrictId(r.district) ? r.district : undefined;
      byDoc.set(docNumber, { docNumber, name, phone, district });
    }
    if (byDoc.size === 0) return { ok: true, data: { inserted: 0, updated: 0 } };

    const existing = await prisma.contact.findMany({
      where: { docType: "dni", docNumber: { in: [...byDoc.keys()] } },
      select: { id: true, docNumber: true, phone: true },
    });
    const existingByDoc = new Map(existing.map((e) => [e.docNumber, e]));
    const all = [...byDoc.values()];
    const toCreate = all.filter((c) => !existingByDoc.has(c.docNumber));
    const toUpdate = all
      .filter((c) => existingByDoc.has(c.docNumber))
      .map((c) => ({ c, ex: existingByDoc.get(c.docNumber)! }));

    await prisma.$transaction(async (tx) => {
      if (toCreate.length) {
        await tx.contact.createMany({
          data: toCreate.map((c) => ({
            docType: "dni" as const,
            docNumber: c.docNumber,
            name: c.name,
            phone: c.phone,
            district: c.district ?? null,
            source: imp.source,
            importId,
            createdById: me.id,
          })),
          skipDuplicates: true,
        });
      }
      for (const { c, ex } of toUpdate) {
        await tx.contact.update({
          where: { id: ex.id },
          data: {
            name: c.name,
            phone: c.phone,
            ...(c.district ? { district: c.district } : {}),
            source: imp.source,
            importId,
            ...(ex.phone !== c.phone ? { whatsappStatus: "unknown" as const, checkedAt: null } : {}),
          },
        });
      }
      await tx.contactImport.update({
        where: { id: importId },
        data: { inserted: { increment: toCreate.length }, updated: { increment: toUpdate.length } },
      });
    }, IMPORT_TX_OPTIONS);

    return { ok: true, data: { inserted: toCreate.length, updated: toUpdate.length } };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("importContactsBatch", e);
    return fail("Error inesperado al importar un lote.");
  }
}

export async function finishImport(importId: string): Promise<ActionResult<ImportSummary>> {
  try {
    await authorize("mensajes.write");
    const imp = await prisma.contactImport.update({
      where: { id: importId },
      data: { finishedAt: new Date() },
    });
    refresh();
    return {
      ok: true,
      data: {
        inserted: imp.inserted,
        updated: imp.updated,
        invalid: imp.invalid,
        duplicatedInFile: imp.duplicatedInFile,
        totalRows: imp.totalRows,
      },
    };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("finishImport", e);
    return fail("Error inesperado al cerrar la importación.");
  }
}

export async function setContactOptedOut(id: string, optedOut: boolean): Promise<ActionResult> {
  try {
    const me = await authorize("mensajes.write");
    await prisma.$transaction(async (tx) => {
      await tx.contact.update({
        where: { id },
        data: optedOut
          ? { optedOut: true, optedOutAt: new Date(), optedOutReason: `manual:${me.id}` }
          : { optedOut: false, optedOutAt: null, optedOutReason: null },
      });
      if (optedOut) {
        await tx.campaignRecipient.updateMany({
          where: { contactId: id, status: "pending" },
          data: { status: "opted_out" },
        });
      }
    });
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("setContactOptedOut", e);
    return fail("Error inesperado al cambiar la baja.");
  }
}

export async function deleteContact(id: string): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    await prisma.contact.delete({ where: { id } });
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("deleteContact", e);
    return fail("Error inesperado al eliminar.");
  }
}
