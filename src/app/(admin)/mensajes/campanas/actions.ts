"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/server";
import { isDistrictId, type DistrictId } from "@/lib/districts";
import { getSession, describeWahaError } from "@/lib/messaging/waha";
import { TEMPLATE_MAX } from "@/lib/messaging/normalize";
import { isElectoralSilence, limaDayKey } from "@/lib/messaging/lima-time";
import { getSchedulerSnapshot, configuredElectionDate, senderFooter, pauseCampaign as enginePause } from "@/lib/messaging/scheduler";
import type {
  ActionResult,
  AudienceKey,
  CampaignInput,
  CampaignProgress,
  RecipientRow,
  RecipientStatusKey,
} from "../types";

class Denied extends Error {}

async function authorize(perm: "mensajes.read" | "mensajes.write"): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me || !me.permissions.has(perm)) throw new Denied();
  return me;
}

function fail(error: string, fieldErrors?: Partial<Record<string, string>>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

function refresh(id?: string) {
  revalidatePath("/mensajes/campanas");
  if (id) revalidatePath(`/mensajes/campanas/${id}`);
}

const NO_PERM = "No tienes permiso para gestionar campañas.";
const AUDIENCES: AudienceKey[] = ["all", "not_contacted", "district"];
const RECIPIENT_STATUSES: RecipientStatusKey[] = ["pending", "sent", "delivered", "read", "failed", "no_whatsapp", "opted_out", "skipped"];

function audienceWhere(audience: AudienceKey, district: DistrictId | null): Prisma.ContactWhereInput {
  return {
    optedOut: false,
    whatsappStatus: { not: "no" },
    ...(audience === "not_contacted" ? { lastMessagedAt: null } : {}),
    ...(audience === "district" && district ? { district } : {}),
  };
}

export async function previewAudience(
  audience: AudienceKey,
  district?: string,
): Promise<ActionResult<{ count: number; sample: { name: string; docNumber: string } | null; footer: string }>> {
  try {
    await authorize("mensajes.read");
    if (!AUDIENCES.includes(audience)) return fail("Audiencia inválida.");
    const d = audience === "district" && district && isDistrictId(district) ? district : null;
    if (audience === "district" && !d) return { ok: true, data: { count: 0, sample: null, footer: senderFooter() } };
    const where = audienceWhere(audience, d);
    const [count, sample] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findFirst({ where, orderBy: { createdAt: "asc" }, select: { name: true, docNumber: true } }),
    ]);
    return { ok: true, data: { count, sample, footer: senderFooter() } };
  } catch (e) {
    if (e instanceof Denied) return fail("Sin permiso.");
    console.error("previewAudience", e);
    return fail("Error inesperado.");
  }
}

type Validated = {
  name: string;
  messageTemplate: string;
  audience: AudienceKey;
  district: DistrictId | null;
  dailyCap: number;
  minDelaySec: number;
  maxDelaySec: number;
  windowStart: number;
  windowEnd: number;
};

function int(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.floor(n) : NaN;
}

function validate(input: CampaignInput): { data?: Validated; fieldErrors?: Record<string, string> } {
  const fe: Record<string, string> = {};
  const name = (input.name ?? "").trim();
  if (name.length < 3 || name.length > 80) fe.name = "Nombre de 3 a 80 caracteres.";
  const messageTemplate = (input.messageTemplate ?? "").trim();
  if (messageTemplate.length < 10 || messageTemplate.length > TEMPLATE_MAX) fe.messageTemplate = `Mensaje de 10 a ${TEMPLATE_MAX} caracteres.`;
  const audience = AUDIENCES.includes(input.audience) ? input.audience : null;
  if (!audience) fe.audience = "Audiencia inválida.";
  let district: DistrictId | null = null;
  if (audience === "district") {
    if (input.district && isDistrictId(input.district)) district = input.district;
    else fe.district = "Elige un distrito.";
  }
  const dailyCap = int(input.dailyCap);
  if (!(dailyCap >= 10 && dailyCap <= 500)) fe.dailyCap = "Tope diario entre 10 y 500.";
  const minDelaySec = int(input.minDelaySec);
  const maxDelaySec = int(input.maxDelaySec);
  if (!(minDelaySec >= 20 && minDelaySec <= 600)) fe.minDelaySec = "Pausa mínima entre 20 y 600 s.";
  if (!(maxDelaySec >= 20 && maxDelaySec <= 600)) fe.maxDelaySec = "Pausa máxima entre 20 y 600 s.";
  if (!fe.minDelaySec && !fe.maxDelaySec && maxDelaySec < minDelaySec) fe.maxDelaySec = "La pausa máxima debe ser ≥ la mínima.";
  const windowStart = int(input.windowStart);
  const windowEnd = int(input.windowEnd);
  if (!(windowStart >= 0 && windowStart <= 23)) fe.windowStart = "Hora de inicio entre 0 y 23.";
  if (!(windowEnd >= 1 && windowEnd <= 24)) fe.windowEnd = "Hora de fin entre 1 y 24.";
  if (!fe.windowStart && !fe.windowEnd && windowEnd <= windowStart) fe.windowEnd = "La hora de fin debe ser mayor que la de inicio.";
  if (Object.keys(fe).length) return { fieldErrors: fe };
  return { data: { name, messageTemplate, audience: audience!, district, dailyCap, minDelaySec, maxDelaySec, windowStart, windowEnd } };
}

export async function createCampaign(input: CampaignInput): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await authorize("mensajes.write");
    const v = validate(input);
    if (!v.data) return fail("Revisa los campos marcados.", v.fieldErrors);
    const d = v.data;
    const contacts = await prisma.contact.findMany({ where: audienceWhere(d.audience, d.district), select: { id: true } });
    if (contacts.length === 0) return fail("La audiencia está vacía: no hay contactos activos que cumplan el criterio.");

    const id = await prisma.$transaction(async (tx) => {
      const c = await tx.campaign.create({
        data: {
          name: d.name,
          messageTemplate: d.messageTemplate,
          audience: d.audience,
          district: d.district,
          dailyCap: d.dailyCap,
          minDelaySec: d.minDelaySec,
          maxDelaySec: d.maxDelaySec,
          windowStart: d.windowStart,
          windowEnd: d.windowEnd,
          totalRecipients: contacts.length,
          createdById: me.id,
        },
      });
      await tx.campaignRecipient.createMany({
        data: contacts.map((k) => ({ campaignId: c.id, contactId: k.id })),
      });
      return c.id;
    });
    refresh();
    return { ok: true, data: { id } };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("createCampaign", e);
    return fail("Error inesperado al crear la campaña.");
  }
}

async function canSendNow(): Promise<string | null> {
  if (isElectoralSilence(new Date(), configuredElectionDate())) return "Estamos en veda electoral: no se pueden iniciar envíos.";
  try {
    const s = await getSession();
    if (s.status !== "WORKING") return "Conecta WhatsApp (pestaña Conexión) antes de iniciar.";
  } catch (e) {
    return describeWahaError(e);
  }
  return null;
}

export async function startCampaign(id: string): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    const c = await prisma.campaign.findUnique({ where: { id } });
    if (!c) return fail("Campaña no encontrada.");
    if (c.status !== "draft" && c.status !== "paused") return fail("Solo se puede iniciar una campaña en borrador o pausada.");
    const blocked = await canSendNow();
    if (blocked) return fail(blocked);
    await prisma.campaign.update({
      where: { id },
      data: { status: "running", startedAt: c.startedAt ?? new Date(), pausedReason: null, lastError: null },
    });
    refresh(id);
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("startCampaign", e);
    return fail("Error inesperado al iniciar.");
  }
}

export async function resumeCampaign(id: string): Promise<ActionResult> {
  return startCampaign(id);
}

export async function pauseCampaign(id: string): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    await enginePause(id, "manual");
    refresh(id);
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("pauseCampaign", e);
    return fail("Error inesperado al pausar.");
  }
}

export async function cancelCampaign(id: string): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    await prisma.$transaction([
      prisma.campaign.updateMany({
        where: { id, status: { in: ["draft", "running", "paused"] } },
        data: { status: "cancelled", finishedAt: new Date(), pausedReason: null },
      }),
      prisma.campaignRecipient.updateMany({ where: { campaignId: id, status: "pending" }, data: { status: "skipped" } }),
    ]);
    refresh(id);
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("cancelCampaign", e);
    return fail("Error inesperado al cancelar.");
  }
}

export async function deleteCampaign(id: string): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    const r = await prisma.campaign.deleteMany({ where: { id, status: { in: ["draft", "cancelled", "finished"] } } });
    if (r.count === 0) return fail("Solo se pueden eliminar campañas en borrador, canceladas o finalizadas.");
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("deleteCampaign", e);
    return fail("Error inesperado al eliminar.");
  }
}

export async function retryFailed(id: string): Promise<ActionResult<{ retried: number }>> {
  try {
    await authorize("mensajes.write");
    const c = await prisma.campaign.findUnique({ where: { id }, select: { status: true } });
    if (!c) return fail("Campaña no encontrada.");
    if (c.status !== "paused" && c.status !== "finished") {
      return fail("Solo se pueden reintentar fallidos en campañas pausadas o finalizadas.");
    }
    const retried = await prisma.$transaction(async (tx) => {
      const r = await tx.campaignRecipient.updateMany({
        where: { campaignId: id, status: "failed" },
        data: { status: "pending", attempts: 0, error: null, wahaMessageId: null },
      });
      if (r.count > 0) {
        await tx.campaign.update({
          where: { id },
          data: { failedCount: { decrement: r.count }, lastError: null },
        });
        // Una campaña finalizada vuelve a "pausada" para que el usuario la reanude conscientemente.
        await tx.campaign.updateMany({ where: { id, status: "finished" }, data: { status: "paused", pausedReason: "manual", finishedAt: null } });
      }
      return r.count;
    });
    refresh(id);
    return { ok: true, data: { retried } };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("retryFailed", e);
    return fail("Error inesperado al reintentar.");
  }
}

export async function getCampaignProgress(id: string): Promise<ActionResult<CampaignProgress>> {
  try {
    await authorize("mensajes.read");
    const c = await prisma.campaign.findUnique({ where: { id } });
    if (!c) return fail("Campaña no encontrada.");
    const [grouped, counter] = await Promise.all([
      prisma.campaignRecipient.groupBy({ by: ["status"], where: { campaignId: id }, _count: { _all: true } }),
      prisma.messagingDailyCounter.findUnique({ where: { day: limaDayKey(new Date()) } }),
    ]);
    const counts = Object.fromEntries(RECIPIENT_STATUSES.map((s) => [s, 0])) as Record<RecipientStatusKey, number>;
    for (const g of grouped) counts[g.status] = g._count._all;
    return {
      ok: true,
      data: {
        status: c.status,
        pausedReason: c.pausedReason,
        lastError: c.lastError,
        totalRecipients: c.totalRecipients,
        sentCount: c.sentCount,
        failedCount: c.failedCount,
        counts,
        todayCount: counter?.count ?? 0,
        dailyCap: c.dailyCap,
        scheduler: getSchedulerSnapshot(),
      },
    };
  } catch (e) {
    if (e instanceof Denied) return fail("Sin permiso.");
    console.error("getCampaignProgress", e);
    return fail("Error inesperado.");
  }
}

export async function getCampaignRecipients(
  id: string,
  opts: { status: RecipientStatusKey | "all"; page: number; pageSize: number },
): Promise<ActionResult<{ rows: RecipientRow[]; total: number }>> {
  try {
    await authorize("mensajes.read");
    const pageSize = Math.min(Math.max(int(opts.pageSize) || 100, 1), 1000);
    const page = Math.max(int(opts.page) || 1, 1);
    const where: Prisma.CampaignRecipientWhereInput = {
      campaignId: id,
      ...(opts.status !== "all" && RECIPIENT_STATUSES.includes(opts.status) ? { status: opts.status } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.campaignRecipient.count({ where }),
      prisma.campaignRecipient.findMany({
        where,
        orderBy: { id: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { contact: { select: { docNumber: true, name: true, phone: true } } },
      }),
    ]);
    const rows: RecipientRow[] = items.map((r) => ({
      id: r.id,
      docNumber: r.contact.docNumber,
      name: r.contact.name,
      phone: r.contact.phone,
      status: r.status,
      attempts: r.attempts,
      error: r.error,
      sentAt: r.sentAt?.toISOString() ?? null,
      deliveredAt: r.deliveredAt?.toISOString() ?? null,
      readAt: r.readAt?.toISOString() ?? null,
    }));
    return { ok: true, data: { rows, total } };
  } catch (e) {
    if (e instanceof Denied) return fail("Sin permiso.");
    console.error("getCampaignRecipients", e);
    return fail("Error inesperado.");
  }
}
