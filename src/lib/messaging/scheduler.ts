import "server-only";

// Motor de envío. Vive en el proceso de Next (arrancado desde src/instrumentation.ts).
// Cada TICK_MS mira en la BD si hay una campaña en curso y, si toca, envía UN mensaje
// por WAHA y programa una pausa aleatoria. Todo el estado persistente está en Postgres;
// en memoria solo quedan la pausa en curso y el diagnóstico para la UI.

import { prisma } from "@/lib/prisma";
import { getSession, checkExists, sendText, WahaError } from "./waha";
import { renderTemplate, phoneToChatId } from "./normalize";
import {
  isElectoralSilence,
  isWithinWindow,
  limaDayKey,
  limaHour,
  nextWindowStart,
  randomBetween,
} from "./lima-time";
import type { SchedulerReason, SchedulerSnapshot } from "./types";

const TICK_MS = 5_000;
export const MAX_ATTEMPTS = 3;
const DEFAULT_FOOTER = "— Equipo Simón Horna · Responde BAJA para no recibir más mensajes";

type State = {
  started: boolean;
  reason: SchedulerReason;
  campaignId: string | null;
  nextAllowedAt: number; // epoch ms
  sessionStatus: string | null;
  lastTickAt: number;
  consecutiveWahaErrors: number;
  ticking: boolean;
};

declare global {
  var __messagingScheduler: State | undefined;
  var __messagingSchedulerTimer: ReturnType<typeof setTimeout> | undefined;
}

function state(): State {
  if (!globalThis.__messagingScheduler) {
    globalThis.__messagingScheduler = {
      started: false,
      reason: "disabled",
      campaignId: null,
      nextAllowedAt: 0,
      sessionStatus: null,
      lastTickAt: 0,
      consecutiveWahaErrors: 0,
      ticking: false,
    };
  }
  return globalThis.__messagingScheduler;
}

export function configuredElectionDate(): string {
  return process.env.ELECTION_DATE?.trim() || "2026-10-04";
}

export function senderFooter(): string {
  return process.env.MESSAGING_SENDER_FOOTER?.trim() || DEFAULT_FOOTER;
}

export function getSchedulerSnapshot(): SchedulerSnapshot {
  const s = state();
  return {
    active: s.started,
    reason: s.started ? s.reason : "disabled",
    campaignId: s.campaignId,
    nextSendAt: s.reason === "waiting" && s.nextAllowedAt > Date.now() ? new Date(s.nextAllowedAt).toISOString() : null,
    sessionStatus: s.sessionStatus,
    lastTickAt: s.lastTickAt ? new Date(s.lastTickAt).toISOString() : null,
  };
}

export function startScheduler(): void {
  const s = state();
  if (s.started) return;
  s.started = true;
  s.reason = "idle";
  console.log("[mensajes] scheduler iniciado");
  repairInterrupted().catch((e) => console.error("[mensajes] repair", e));
  schedule(TICK_MS);
}

function schedule(ms: number): void {
  if (globalThis.__messagingSchedulerTimer) clearTimeout(globalThis.__messagingSchedulerTimer);
  const t = setTimeout(() => {
    tick()
      .catch((e) => console.error("[mensajes] tick", e))
      .finally(() => schedule(TICK_MS));
  }, ms);
  // No mantener vivo el proceso solo por el timer (permite apagado limpio).
  t.unref?.();
  globalThis.__messagingSchedulerTimer = t;
}

/** Destinatarios reclamados (status sent) cuyo envío se interrumpió (sin id de mensaje) vuelven a pending. */
async function repairInterrupted(): Promise<void> {
  const r = await prisma.campaignRecipient.updateMany({
    where: { status: "sent", wahaMessageId: null, sentAt: null },
    data: { status: "pending" },
  });
  if (r.count) console.log(`[mensajes] ${r.count} envíos interrumpidos devueltos a pendiente`);
}

export async function pauseCampaign(campaignId: string, reason: string, lastError?: string): Promise<void> {
  await prisma.campaign.updateMany({
    where: { id: campaignId, status: "running" },
    data: { status: "paused", pausedReason: reason, ...(lastError ? { lastError } : {}) },
  });
}

type Claimed = { id: string; contactId: string; attempts: number };

/** Reclama atómicamente el siguiente pendiente (FOR UPDATE SKIP LOCKED) y lo marca como sent. */
async function claimNext(campaignId: string): Promise<Claimed | null> {
  const rows = await prisma.$queryRaw<Claimed[]>`
    UPDATE "CampaignRecipient"
    SET status = 'sent', attempts = attempts + 1, "updatedAt" = NOW()
    WHERE id = (
      SELECT id FROM "CampaignRecipient"
      WHERE "campaignId" = ${campaignId} AND status = 'pending'
      ORDER BY id
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "contactId", attempts`;
  return rows[0] ?? null;
}

async function tick(): Promise<void> {
  const s = state();
  if (s.ticking) return; // un tick anterior sigue esperando a WAHA
  s.ticking = true;
  try {
    await tickInner(s);
  } finally {
    s.ticking = false;
  }
}

async function tickInner(s: State): Promise<void> {
  const now = new Date();
  s.lastTickAt = now.getTime();

  if (s.nextAllowedAt > now.getTime()) {
    if (s.reason !== "out_of_window") s.reason = "waiting";
    return;
  }

  const campaign = await prisma.campaign.findFirst({
    where: { status: "running" },
    orderBy: { startedAt: "asc" },
  });
  if (!campaign) {
    s.reason = "idle";
    s.campaignId = null;
    s.consecutiveWahaErrors = 0;
    return;
  }
  s.campaignId = campaign.id;

  if (isElectoralSilence(now, configuredElectionDate())) {
    await pauseCampaign(campaign.id, "veda");
    s.reason = "veda";
    return;
  }

  if (!isWithinWindow(limaHour(now), campaign.windowStart, campaign.windowEnd)) {
    s.reason = "out_of_window";
    // Dormimos hasta la próxima apertura de ventana (como mucho 1 h, por si cambian la campaña).
    s.nextAllowedAt = Math.min(nextWindowStart(now, campaign.windowStart).getTime(), now.getTime() + 3_600_000);
    return;
  }

  const day = limaDayKey(now);
  const counter = await prisma.messagingDailyCounter.findUnique({ where: { day } });
  if ((counter?.count ?? 0) >= campaign.dailyCap) {
    s.reason = "daily_cap";
    return;
  }

  let sessionStatus: string;
  try {
    sessionStatus = (await getSession()).status;
  } catch (e) {
    sessionStatus = "UNREACHABLE";
    s.consecutiveWahaErrors += 1;
    if (s.consecutiveWahaErrors >= 3) {
      await pauseCampaign(campaign.id, "waha_error", e instanceof Error ? e.message : String(e));
      s.consecutiveWahaErrors = 0;
    }
  }
  s.sessionStatus = sessionStatus;
  if (sessionStatus !== "WORKING") {
    if (sessionStatus === "STARTING") {
      // WAHA arrancando (reinicio del contenedor): toleramos ~1 min (12 ticks de 5 s) antes de pausar.
      s.consecutiveWahaErrors += 1;
      if (s.consecutiveWahaErrors >= 12) {
        await pauseCampaign(campaign.id, "session_down", "WAHA lleva demasiado tiempo en STARTING");
        s.consecutiveWahaErrors = 0;
      }
    } else if (sessionStatus !== "UNREACHABLE") {
      await pauseCampaign(campaign.id, "session_down");
    }
    s.reason = "session_down";
    return;
  }
  s.consecutiveWahaErrors = 0;

  const claimed = await claimNext(campaign.id);
  if (!claimed) {
    await prisma.campaign.updateMany({
      where: { id: campaign.id, status: "running" },
      data: { status: "finished", finishedAt: now, pausedReason: null },
    });
    s.reason = "idle";
    return;
  }

  const contact = await prisma.contact.findUnique({ where: { id: claimed.contactId } });
  if (!contact) {
    await prisma.campaignRecipient.update({ where: { id: claimed.id }, data: { status: "failed", error: "Contacto eliminado" } });
    await prisma.campaign.update({ where: { id: campaign.id }, data: { failedCount: { increment: 1 } } });
    return;
  }
  if (contact.optedOut) {
    await prisma.campaignRecipient.update({ where: { id: claimed.id }, data: { status: "opted_out" } });
    return;
  }
  if (contact.whatsappStatus === "no") {
    // Marcado sin WhatsApp por otra campaña después de materializar esta audiencia: no llamar a WAHA.
    await prisma.campaignRecipient.update({ where: { id: claimed.id }, data: { status: "no_whatsapp", error: "El número no tiene WhatsApp" } });
    await prisma.campaign.update({ where: { id: campaign.id }, data: { failedCount: { increment: 1 } } });
    return;
  }

  let chatId = phoneToChatId(contact.phone);
  let sent: { id: string };
  try {
    if (contact.whatsappStatus === "unknown") {
      const r = await checkExists(contact.phone);
      await prisma.contact.update({
        where: { id: contact.id },
        data: { whatsappStatus: r.exists ? "yes" : "no", checkedAt: now },
      });
      if (!r.exists) {
        await prisma.campaignRecipient.update({ where: { id: claimed.id }, data: { status: "no_whatsapp", error: "El número no tiene WhatsApp" } });
        await prisma.campaign.update({ where: { id: campaign.id }, data: { failedCount: { increment: 1 } } });
        s.nextAllowedAt = Date.now() + randomBetween(3, 8) * 1000;
        s.reason = "waiting";
        return;
      }
      if (r.chatId) chatId = r.chatId;
    }

    const text = renderTemplate(campaign.messageTemplate, contact, senderFooter());
    sent = await sendText(chatId, text);
  } catch (e) {
    // Todavía no se envió nada: reencolar es seguro.
    await handleSendError(s, campaign.id, claimed, e);
    return;
  }

  // A partir de aquí WAHA ya aceptó el mensaje: pase lo que pase con la BD, NUNCA reencolar
  // (el ciudadano recibiría el mensaje repetido).
  s.consecutiveWahaErrors = 0;
  try {
    await prisma.$transaction([
      prisma.campaignRecipient.update({
        where: { id: claimed.id },
        data: { status: "sent", wahaMessageId: sent.id, sentAt: new Date(), error: null },
      }),
      prisma.contact.update({ where: { id: contact.id }, data: { lastMessagedAt: new Date() } }),
      prisma.campaign.update({ where: { id: campaign.id }, data: { sentCount: { increment: 1 } } }),
      prisma.messagingDailyCounter.upsert({
        where: { day },
        create: { day, count: 1 },
        update: { count: { increment: 1 } },
      }),
    ]);
  } catch (e) {
    // Enviado pero no registrado del todo: dejamos el destinatario en "sent" con el error anotado.
    console.error("[mensajes] enviado pero no persistido", e);
    await prisma.campaignRecipient
      .update({ where: { id: claimed.id }, data: { status: "sent", wahaMessageId: sent.id, sentAt: new Date(), error: "Enviado; fallo al registrar contadores" } })
      .catch(() => undefined);
  }
  s.nextAllowedAt = Date.now() + randomBetween(campaign.minDelaySec, campaign.maxDelaySec) * 1000;
  s.reason = "waiting";
}

async function handleSendError(s: State, campaignId: string, claimed: Claimed, e: unknown): Promise<void> {
  const msg = e instanceof Error ? e.message : String(e);
  // Solo un 4xx es error "del cliente" (número/petición inválida) y no cuenta para pausar la campaña.
  // Red/timeout, 5xx y respuestas 2xx malformadas (sin id) son fallos de WAHA y sí cuentan.
  const isClientError = e instanceof WahaError && e.status >= 400 && e.status < 500;
  console.error(`[mensajes] envío fallido (intento ${claimed.attempts})`, msg);

  if (claimed.attempts < MAX_ATTEMPTS) {
    await prisma.campaignRecipient.update({ where: { id: claimed.id }, data: { status: "pending", error: msg.slice(0, 300) } });
    s.nextAllowedAt = Date.now() + 60_000 * claimed.attempts;
  } else {
    await prisma.campaignRecipient.update({ where: { id: claimed.id }, data: { status: "failed", error: msg.slice(0, 300) } });
    await prisma.campaign.update({ where: { id: campaignId }, data: { failedCount: { increment: 1 }, lastError: msg.slice(0, 300) } });
    s.nextAllowedAt = Date.now() + randomBetween(5, 15) * 1000;
  }
  s.reason = "waiting";

  if (!isClientError) {
    s.consecutiveWahaErrors += 1;
    if (s.consecutiveWahaErrors >= 3) {
      await pauseCampaign(campaignId, "waha_error", msg.slice(0, 300));
      s.consecutiveWahaErrors = 0;
    }
  } else {
    s.consecutiveWahaErrors = 0;
  }
}
