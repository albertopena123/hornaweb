"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/server";
import { isDistrictId, type DistrictId } from "@/lib/districts";
import { listSessions, logoutSession, describeWahaError, type WahaSessionInfo } from "@/lib/messaging/waha";
import { TEMPLATE_MAX } from "@/lib/messaging/normalize";
import { isElectoralSilence, limaDayKey } from "@/lib/messaging/lima-time";
import { getSchedulerSnapshot, configuredElectionDate, footerFor, pauseCampaign as enginePause } from "@/lib/messaging/scheduler";
import { chatIdToPhone } from "@/lib/messaging/normalize";
import type {
  ActionResult,
  AudienceKey,
  CampaignInput,
  CampaignProgress,
  RecipientRow,
  RecipientStatusKey,
  CampaignSessionRow,
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
): Promise<ActionResult<{ count: number; sample: { name: string; docNumber: string | null } | null; footer: string }>> {
  try {
    await authorize("mensajes.read");
    if (!AUDIENCES.includes(audience)) return fail("Audiencia inválida.");
    const d = audience === "district" && district && isDistrictId(district) ? district : null;
    if (audience === "district" && !d) return { ok: true, data: { count: 0, sample: null, footer: footerFor("preview") } };
    const where = audienceWhere(audience, d);
    const [count, sample] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findFirst({ where, orderBy: { createdAt: "asc" }, select: { name: true, docNumber: true } }),
    ]);
    return { ok: true, data: { count, sample, footer: footerFor("preview") } };
  } catch (e) {
    if (e instanceof Denied) return fail("Sin permiso.");
    console.error("previewAudience", e);
    return fail("Error inesperado.");
  }
}

type Validated = {
  name: string;
  sessionIds: string[];
  rotationBatch: number;
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
  const sessionIds = Array.isArray(input.sessionIds) ? [...new Set(input.sessionIds.map((x) => String(x).trim()).filter(Boolean))] : [];
  if (sessionIds.length === 0) fe.sessionIds = "Elige al menos un número desde el que enviar.";
  const rotationBatch = int(input.rotationBatch);
  if (!(rotationBatch >= 0 && rotationBatch <= 500)) fe.rotationBatch = "Lote de rotación entre 0 (todos a la vez) y 500.";
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
  return { data: { sessionIds, rotationBatch, name, messageTemplate, audience: audience!, district, dailyCap, minDelaySec, maxDelaySec, windowStart, windowEnd } };
}

export async function createCampaign(input: CampaignInput): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await authorize("mensajes.write");
    const v = validate(input);
    if (!v.data) return fail("Revisa los campos marcados.", v.fieldErrors);
    const d = v.data;
    const pool = await prisma.whatsappSession.findMany({ where: { id: { in: d.sessionIds } } });
    if (pool.length !== d.sessionIds.length) return fail("Revisa los campos marcados.", { sessionIds: "Alguno de esos números ya no existe." });
    const inactivo = pool.find((x) => !x.active);
    if (inactivo) return fail("Revisa los campos marcados.", { sessionIds: `El número «${inactivo.label}» está desactivado.` });
    const contacts = await prisma.contact.findMany({ where: audienceWhere(d.audience, d.district), select: { id: true } });
    if (contacts.length === 0) return fail("La audiencia está vacía: no hay contactos activos que cumplan el criterio.");

    const id = await prisma.$transaction(async (tx) => {
      const c = await tx.campaign.create({
        data: {
          rotationBatch: d.rotationBatch,
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
      await tx.campaignSession.createMany({
        data: d.sessionIds.map((sessionId, position) => ({ campaignId: c.id, sessionId, position })),
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

type PoolInfo = { session: { id: string; name: string; label: string; active: boolean } }[];

/** Error si la campaña no puede arrancar ahora: veda, o ningún número del pool conectado. */
async function canSendNow(pool: PoolInfo): Promise<string | null> {
  if (isElectoralSilence(new Date(), configuredElectionDate())) return "Estamos en veda electoral: no se pueden iniciar envíos.";
  const activos = pool.filter((m) => m.session.active);
  if (activos.length === 0) return "Ningún número del pool está activo: activa alguno en Conexión o añade otro a la campaña.";
  let live: Map<string, WahaSessionInfo>;
  try {
    live = await listSessions();
  } catch (e) {
    return describeWahaError(e);
  }
  const conectados = activos.filter((m) => live.get(m.session.name)?.status === "WORKING");
  if (conectados.length === 0) {
    const nombres = activos.map((m) => `«${m.session.label}»`).join(", ");
    return `Ningún número de la campaña está conectado (${nombres}). Conéctalos en la pestaña Conexión o añade otro.`;
  }
  return null;
}

export async function startCampaign(id: string): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    const c = await prisma.campaign.findUnique({ where: { id }, include: { sessions: { include: { session: true } } } });
    if (!c) return fail("Campaña no encontrada.");
    if (c.status !== "draft" && c.status !== "paused") return fail("Solo se puede iniciar una campaña en borrador o pausada.");
    const blocked = await canSendNow(c.sessions);
    if (blocked) return fail(blocked);
    // Compare-and-set: entre leer el estado y escribir pasó una llamada a WAHA; si otro admin
    // canceló o pausó mientras tanto, no se pisa su decisión.
    const r = await prisma.campaign.updateMany({
      where: { id, status: { in: ["draft", "paused"] } },
      data: { status: "running", startedAt: c.startedAt ?? new Date(), pausedReason: null, lastError: null },
    });
    if (r.count === 0) return fail("La campaña cambió de estado mientras se iniciaba: recarga la página.");
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


const NO_POOL_EDIT = "Solo se puede cambiar el pool de una campaña en borrador, pausada o en curso.";

/** Añade un número al pool de la campaña (entra al final del turno). Vale en curso: empieza a enviar en su turno. */
export async function addCampaignSession(campaignId: string, sessionId: string): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    const c = await prisma.campaign.findUnique({ where: { id: campaignId }, include: { sessions: true } });
    if (!c) return fail("Campaña no encontrada.");
    if (c.status === "finished" || c.status === "cancelled") return fail(NO_POOL_EDIT);
    if (c.sessions.some((m) => m.sessionId === sessionId)) return fail("Ese número ya está en la campaña.");
    const target = await prisma.whatsappSession.findUnique({ where: { id: sessionId } });
    if (!target) return fail("Ese número ya no existe.");
    if (!target.active) return fail(`El número «${target.label}» está desactivado: actívalo en Conexión antes de añadirlo.`);
    const position = (Math.max(-1, ...c.sessions.map((m) => m.position)) ?? -1) + 1;
    await prisma.campaignSession.create({ data: { campaignId, sessionId, position } });
    refresh(campaignId);
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("addCampaignSession", e);
    return fail("Error inesperado al añadir el número.");
  }
}

/**
 * Quita un número del pool: lo ya enviado por él se conserva; los pendientes siguen con los demás.
 * Con `disable`, además cierra su sesión de WhatsApp y lo desactiva (para un número bloqueado).
 */
export async function removeCampaignSession(
  campaignId: string,
  sessionId: string,
  opts: { disable?: boolean } = {},
): Promise<ActionResult<{ disabled: boolean }>> {
  try {
    await authorize("mensajes.write");
    const c = await prisma.campaign.findUnique({ where: { id: campaignId }, include: { sessions: { include: { session: true } } } });
    if (!c) return fail("Campaña no encontrada.");
    if (c.status === "finished" || c.status === "cancelled") return fail(NO_POOL_EDIT);
    const member = c.sessions.find((m) => m.sessionId === sessionId);
    if (!member) return fail("Ese número no está en la campaña.");
    const otrosActivos = c.sessions.filter((m) => m.sessionId !== sessionId && m.session.active);
    if (otrosActivos.length === 0) return fail("Es el único número activo de la campaña: añade o activa otro antes de quitarlo.");

    await prisma.$transaction([
      prisma.campaignSession.delete({ where: { campaignId_sessionId: { campaignId, sessionId } } }),
      // Si tenía el turno, el motor se lo da al primero del pool en el siguiente tick.
      prisma.campaign.updateMany({ where: { id: campaignId, cursorSessionId: sessionId }, data: { cursorSessionId: null, cursorSent: 0 } }),
    ]);

    let disabled = false;
    if (opts.disable) {
      try {
        await logoutSession(member.session.name);
      } catch (e) {
        // Puede estar ya caída o bloqueada por WhatsApp: da igual, lo que importa es apartarla.
        console.warn("removeCampaignSession: logout", describeWahaError(e));
      }
      await prisma.whatsappSession.update({ where: { id: sessionId }, data: { active: false } });
      // Otras campañas que dependieran solo de este número se pausan.
      const otras = await prisma.campaign.findMany({
        where: { status: "running", sessions: { some: { sessionId } } },
        select: { id: true, sessions: { select: { session: { select: { id: true, active: true } } } } },
      });
      for (const o of otras) {
        if (!o.sessions.some((m) => m.session.id !== sessionId && m.session.active)) {
          await enginePause(o.id, "session_down", `Número «${member.session.label}» apartado.`);
        }
      }
      disabled = true;
    }
    refresh(campaignId);
    return { ok: true, data: { disabled } };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("removeCampaignSession", e);
    return fail("Error inesperado al quitar el número.");
  }
}

/** Cambia el tamaño del lote de rotación (0 = todos los números envían a la vez). */
export async function setRotationBatch(campaignId: string, rotationBatch: number): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    const n = int(rotationBatch);
    if (!(n >= 0 && n <= 500)) return fail("Lote de rotación entre 0 (todos a la vez) y 500.");
    const r = await prisma.campaign.updateMany({
      where: { id: campaignId, status: { in: ["draft", "paused", "running"] } },
      data: { rotationBatch: n, cursorSent: 0 },
    });
    if (r.count === 0) return fail(NO_POOL_EDIT);
    refresh(campaignId);
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("setRotationBatch", e);
    return fail("Error inesperado.");
  }
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
        where: { campaignId: id, status: "failed", campaign: { status: { in: ["paused", "finished"] } } },
        // sentAt/deliveredAt/readAt también a null: un fallido por ack de WhatsApp las conserva y
        // el motor distingue un reclamo interrumpido justamente por esas marcas.
        data: { status: "pending", attempts: 0, error: null, wahaMessageId: null, sentAt: null, deliveredAt: null, readAt: null },
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
    const c = await prisma.campaign.findUnique({
      where: { id },
      include: { sessions: { orderBy: { position: "asc" }, include: { session: true } } },
    });
    if (!c) return fail("Campaña no encontrada.");
    const day = limaDayKey(new Date());
    const sessionIds = c.sessions.map((m) => m.sessionId);
    const [grouped, counters] = await Promise.all([
      prisma.campaignRecipient.groupBy({ by: ["status"], where: { campaignId: id }, _count: { _all: true } }),
      // El tope diario se cuenta por número, no en global.
      prisma.messagingDailyCounter.findMany({ where: { day, sessionId: { in: sessionIds } } }),
    ]);
    const counts = Object.fromEntries(RECIPIENT_STATUSES.map((s) => [s, 0])) as Record<RecipientStatusKey, number>;
    for (const g of grouped) counts[g.status] = g._count._all;
    const todayBy = new Map(counters.map((k) => [k.sessionId, k.count]));

    // Estado en vivo de los números: una sola llamada a WAHA; si no responde, quedan en UNKNOWN.
    let live: Map<string, WahaSessionInfo> | null = null;
    try {
      live = await listSessions();
    } catch {
      live = null;
    }

    const cursorId = c.rotationBatch > 0 ? (c.cursorSessionId ?? c.sessions[0]?.sessionId ?? null) : null;
    const sessions: CampaignSessionRow[] = c.sessions.map((m) => {
      const info = live?.get(m.session.name);
      const snap = getSchedulerSnapshot(m.session.name);
      const phone = info?.me?.id ? chatIdToPhone(info.me.id.replace(/@s\.whatsapp\.net$/, "@c.us")) : null;
      return {
        id: m.sessionId,
        label: m.session.label,
        phone: phone ?? m.session.phone,
        active: m.session.active,
        dailyCap: Math.min(c.dailyCap, m.session.dailyCap),
        status: live ? (info?.status ?? "STOPPED") : "UNKNOWN",
        sentCount: m.sentCount,
        todayCount: todayBy.get(m.sessionId) ?? 0,
        isCursor: m.sessionId === cursorId,
        reason: snap.campaignId === id ? snap.reason : null,
        nextSendAt: snap.campaignId === id ? snap.nextSendAt : null,
      };
    });
    // Diagnóstico principal: el número del turno o, sin turnos, el que antes vaya a enviar.
    const principal =
      sessions.find((x) => x.isCursor) ??
      [...sessions].filter((x) => x.nextSendAt).sort((a, b) => (a.nextSendAt! < b.nextSendAt! ? -1 : 1))[0] ??
      sessions[0];
    const principalName = principal ? c.sessions.find((m) => m.sessionId === principal.id)!.session.name : "";
    const scheduler = getSchedulerSnapshot(principalName);
    if (scheduler.campaignId && scheduler.campaignId !== id) {
      // El motor recuerda la última campaña que atendió aunque ya no esté en curso.
      const otra = await prisma.campaign.findFirst({ where: { id: scheduler.campaignId, status: "running" }, select: { id: true } });
      if (!otra) scheduler.campaignId = null;
    }

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
        todayCount: sessions.reduce((a, x) => a + x.todayCount, 0),
        dailyCap: sessions.filter((x) => x.active).reduce((a, x) => a + x.dailyCap, 0),
        rotationBatch: c.rotationBatch,
        sessions,
        scheduler,
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
