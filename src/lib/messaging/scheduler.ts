import "server-only";

// Motor de envío. Vive en el proceso de Next (arrancado desde src/instrumentation.ts).
// Cada TICK_MS recorre los números de WhatsApp activos y, para cada uno, mira si tiene una
// campaña en curso en cuyo pool esté y si toca enviar: manda UN mensaje por WAHA y programa
// una pausa aleatoria. Cada número lleva su propio ritmo, su propio tope diario y su propio
// diagnóstico.
//
// Pool y turnos: una campaña puede salir desde varios números. Con rotationBatch > 0 el
// envío va por turnos (cursor): un número manda `rotationBatch` mensajes y pasa el turno al
// siguiente; si el del turno se cae, llega a su tope o se desactiva, los demás se lo saltan.
// Con rotationBatch = 0 no hay turnos: todos envían a la vez, cada uno a su ritmo.
// El reparto de destinatarios es atómico en Postgres (claimNext), así que varios números
// nunca cogen el mismo. Todo el estado persistente está en Postgres; en memoria solo quedan la
// pausa en curso y el diagnóstico para la UI.

import { prisma } from "@/lib/prisma";
import { getSession, checkExists, sendText, WahaError } from "./waha";
import { renderTemplate, phoneToChatId, composeFooter, pickFooterEmoji, pickGreeting, DEFAULT_FOOTER_EMOJIS, DEFAULT_GREETINGS } from "./normalize";
import {
  isElectoralSilence,
  isWithinWindow,
  limaDayKey,
  limaHour,
  nextWindowStart,
  randomBetween,
} from "./lima-time";
import { handleSessionDown } from "./sessions";
import type { SchedulerReason, SchedulerSnapshot } from "./types";

const TICK_MS = 5_000;
export const MAX_ATTEMPTS = 3;
const DEFAULT_FOOTER = "Equipo Simón Horna";
/** Un número que lleva más de esto sin hacer tick se considera caído a efectos de turno. */
const STALE_MS = 60_000;

/** Estado en memoria de UN número. */
type State = {
  reason: SchedulerReason;
  campaignId: string | null;
  nextAllowedAt: number; // epoch ms
  sessionStatus: string | null;
  lastTickAt: number;
  consecutiveWahaErrors: number;
  ticking: boolean;
};

/** Envío que WAHA ya aceptó pero que no se pudo escribir en la BD: se reintenta en cada tick. */
type Unsaved = { wahaMessageId: string; sentAt: Date };
type Engine = { started: boolean; states: Map<string, State>; unsaved: Map<string, Unsaved> };

declare global {
  var __messagingScheduler: Engine | undefined;
  var __messagingSchedulerTimer: ReturnType<typeof setTimeout> | undefined;
}

function engine(): Engine {
  if (!globalThis.__messagingScheduler) {
    globalThis.__messagingScheduler = { started: false, states: new Map(), unsaved: new Map() };
  }
  return globalThis.__messagingScheduler;
}

/** Estado de una sesión (se crea al vuelo la primera vez que se la mira). */
function state(sessionName: string): State {
  const e = engine();
  let s = e.states.get(sessionName);
  if (!s) {
    s = {
      reason: "idle",
      campaignId: null,
      nextAllowedAt: 0,
      sessionStatus: null,
      lastTickAt: 0,
      consecutiveWahaErrors: 0,
      ticking: false,
    };
    e.states.set(sessionName, s);
  }
  return s;
}

export function configuredElectionDate(): string {
  return process.env.ELECTION_DATE?.trim() || "2026-10-04";
}

export function senderFooter(): string {
  return process.env.MESSAGING_SENDER_FOOTER?.trim() || DEFAULT_FOOTER;
}

/** Emojis que rotan en el pie, de MESSAGING_FOOTER_EMOJIS (separados por comas). */
export function footerEmojis(): string[] {
  const raw = process.env.MESSAGING_FOOTER_EMOJIS?.trim();
  if (!raw) return DEFAULT_FOOTER_EMOJIS;
  const list = raw.split(",").map((e) => e.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_FOOTER_EMOJIS;
}

/** Saludos que rotan al inicio del mensaje, de MESSAGING_GREETINGS (separados por "|"). */
export function greetings(): string[] {
  const raw = process.env.MESSAGING_GREETINGS?.trim();
  if (!raw) return DEFAULT_GREETINGS;
  const list = raw.split("|").map((g) => g.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_GREETINGS;
}

/** Pie de un envío concreto: emoji y posición rotan de forma estable según el destinatario. */
export function footerFor(seed: string): string {
  return composeFooter(senderFooter(), pickFooterEmoji(footerEmojis(), seed), seed);
}

/** Saludo de un envío concreto, estable por destinatario. */
export function greetingFor(seed: string): string {
  return pickGreeting(greetings(), seed);
}

function snapshot(sessionName: string, s: State | undefined): SchedulerSnapshot {
  const started = engine().started;
  if (!s) {
    return {
      active: started,
      reason: started ? "idle" : "disabled",
      campaignId: null,
      nextSendAt: null,
      sessionStatus: null,
      lastTickAt: null,
      sessionName,
    };
  }
  return {
    active: started,
    reason: started ? s.reason : "disabled",
    campaignId: s.campaignId,
    nextSendAt: s.reason === "waiting" && s.nextAllowedAt > Date.now() ? new Date(s.nextAllowedAt).toISOString() : null,
    sessionStatus: s.sessionStatus,
    lastTickAt: s.lastTickAt ? new Date(s.lastTickAt).toISOString() : null,
    sessionName,
  };
}

/** Diagnóstico de un número concreto. */
export function getSchedulerSnapshot(sessionName: string): SchedulerSnapshot {
  return snapshot(sessionName, engine().states.get(sessionName));
}

/** Diagnóstico de todos los números con actividad conocida, indexado por nombre de sesión. */
export function getAllSchedulerSnapshots(): Record<string, SchedulerSnapshot> {
  const out: Record<string, SchedulerSnapshot> = {};
  for (const [name, s] of engine().states) out[name] = snapshot(name, s);
  return out;
}

export function startScheduler(): void {
  const e = engine();
  if (e.started) return;
  e.started = true;
  console.log("[mensajes] scheduler iniciado");
  repairInterrupted().catch((err) => console.error("[mensajes] repair", err));
  schedule(TICK_MS);
}

function schedule(ms: number): void {
  if (globalThis.__messagingSchedulerTimer) clearTimeout(globalThis.__messagingSchedulerTimer);
  const t = setTimeout(() => {
    tickAll()
      .catch((e) => console.error("[mensajes] tick", e))
      .finally(() => schedule(TICK_MS));
  }, ms);
  // No mantener vivo el proceso solo por el timer (permite apagado limpio).
  t.unref?.();
  globalThis.__messagingSchedulerTimer = t;
}

/**
 * Destinatarios reclamados (status sent) cuyo envío se interrumpió vuelven a pending. El camino de
 * éxito siempre escribe wahaMessageId, así que "sent sin id" identifica un reclamo sin envío
 * confirmado. Si la campaña ya terminó o se canceló, se marcan como omitidos.
 */
async function repairInterrupted(): Promise<void> {
  const r = await prisma.campaignRecipient.updateMany({
    where: { status: "sent", wahaMessageId: null, campaign: { status: { in: ["running", "paused"] } } },
    data: { status: "pending", sentAt: null },
  });
  if (r.count) console.log(`[mensajes] ${r.count} envíos interrumpidos devueltos a pendiente`);
  const k = await prisma.campaignRecipient.updateMany({
    where: { status: "sent", wahaMessageId: null, campaign: { status: { in: ["cancelled", "finished"] } } },
    data: { status: "skipped" },
  });
  if (k.count) console.log(`[mensajes] ${k.count} reclamos huérfanos de campañas cerradas marcados como omitidos`);
}

/** Vuelca a la BD los envíos aceptados por WAHA que quedaron sin registrar (BD caída en ese momento). */
async function flushUnsaved(): Promise<void> {
  const u = engine().unsaved;
  for (const [id, v] of u) {
    try {
      await prisma.campaignRecipient.updateMany({
        where: { id },
        data: { status: "sent", wahaMessageId: v.wahaMessageId, sentAt: v.sentAt, error: "Enviado; fallo al registrar contadores" },
      });
      u.delete(id);
      console.log(`[mensajes] envío ${id} (waha ${v.wahaMessageId}) registrado con retraso`);
    } catch {
      // La BD sigue sin responder: se reintenta en el próximo tick.
    }
  }
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

type SessionRow = { id: string; name: string; dailyCap: number };
type PoolMember = { sessionId: string; position: number; session: { id: string; name: string; active: boolean; dailyCap: number } };

/** Un ciclo: cada número activo avanza su propia campaña, en paralelo. */
async function tickAll(): Promise<void> {
  if (engine().unsaved.size) await flushUnsaved();
  const sessions = await prisma.whatsappSession.findMany({
    where: { active: true },
    select: { id: true, name: true, dailyCap: true },
  });
  // Olvidamos el estado en memoria de números borrados o desactivados.
  const alive = new Set(sessions.map((s) => s.name));
  for (const name of engine().states.keys()) {
    if (!alive.has(name)) engine().states.delete(name);
  }
  await Promise.allSettled(sessions.map((s) => tickSession(s)));
}

async function tickSession(session: SessionRow): Promise<void> {
  const s = state(session.name);
  if (s.ticking) return; // un tick anterior sigue esperando a WAHA
  s.ticking = true;
  try {
    await tickInner(session, s);
  } catch (e) {
    console.error(`[mensajes] tick ${session.name}`, e);
  } finally {
    s.ticking = false;
  }
}

// ── Turnos ──

/** Número al que le toca: el cursor guardado o, si no hay, el primero del pool. */
function cursorOf(campaign: { cursorSessionId: string | null }, pool: PoolMember[]): string | null {
  if (campaign.cursorSessionId && pool.some((m) => m.sessionId === campaign.cursorSessionId)) return campaign.cursorSessionId;
  return pool[0]?.sessionId ?? null;
}

/**
 * Pasa el turno al siguiente número activo del pool (en orden, dando la vuelta). Es un
 * compare-and-set sobre el cursor leído: si otro número ya lo movió, no se mueve dos veces.
 */
async function advanceCursor(campaign: { id: string; cursorSessionId: string | null }, pool: PoolMember[], fromId: string | null): Promise<void> {
  const active = pool.filter((m) => m.session.active);
  if (active.length === 0) return;
  const idx = active.findIndex((m) => m.sessionId === fromId);
  const next = active[(idx + 1) % active.length];
  if (!next || next.sessionId === fromId) return;
  await prisma.campaign.updateMany({
    where: { id: campaign.id, cursorSessionId: campaign.cursorSessionId },
    data: { cursorSessionId: next.sessionId, cursorSent: 0 },
  });
}

/**
 * El número del turno no va a enviar por esta campaña: lo quitaron, está desactivado, reporta
 * no-WORKING, dejó de hacer tick, o está ocupado sirviendo otra campaña más antigua.
 */
function cursorStuck(cursorId: string, campaignId: string, pool: PoolMember[], now: number): boolean {
  const m = pool.find((x) => x.sessionId === cursorId);
  if (!m || !m.session.active) return true;
  const st = engine().states.get(m.session.name);
  if (!st) return false; // aún no ha hecho su primer tick: darle margen
  if (st.lastTickAt && now - st.lastTickAt > STALE_MS) return true;
  if (st.campaignId && st.campaignId !== campaignId) return true;
  return st.sessionStatus !== null && st.sessionStatus !== "WORKING";
}

/** ¿Queda algún número del pool que pueda estar enviando (o a punto)? */
function anyPossiblyUp(pool: PoolMember[]): boolean {
  return pool.some((m) => {
    if (!m.session.active) return false;
    const st = engine().states.get(m.session.name);
    if (!st || st.sessionStatus === null) return true; // sin diagnóstico todavía: no lo damos por caído
    return st.sessionStatus === "WORKING" || st.sessionStatus === "STARTING";
  });
}

async function tickInner(session: SessionRow, s: State): Promise<void> {
  const now = new Date();
  s.lastTickAt = now.getTime();

  if (s.nextAllowedAt > now.getTime()) {
    if (s.reason !== "out_of_window") s.reason = "waiting";
    return;
  }

  // La campaña en curso más antigua en cuyo pool esté este número.
  const member = await prisma.campaignSession.findFirst({
    where: { sessionId: session.id, campaign: { status: "running" } },
    orderBy: { campaign: { startedAt: "asc" } },
    include: {
      campaign: {
        include: {
          sessions: {
            orderBy: { position: "asc" },
            select: { sessionId: true, position: true, session: { select: { id: true, name: true, active: true, dailyCap: true } } },
          },
        },
      },
    },
  });
  if (!member) {
    s.reason = "idle";
    s.campaignId = null;
    s.sessionStatus = null; // lo que supiéramos de WAHA caduca: al reanudar se vuelve a preguntar
    s.consecutiveWahaErrors = 0;
    return;
  }
  const campaign = member.campaign;
  const pool: PoolMember[] = campaign.sessions;
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

  const byTurns = campaign.rotationBatch > 0;
  const cursorId = byTurns ? cursorOf(campaign, pool) : null;
  const myTurn = !byTurns || cursorId === session.id;

  // El tope efectivo es el más estricto de los dos: el de la campaña y el del número.
  const day = limaDayKey(now);
  const cap = Math.min(campaign.dailyCap, session.dailyCap);
  const counter = await prisma.messagingDailyCounter.findUnique({
    where: { day_sessionId: { day, sessionId: session.id } },
  });
  if ((counter?.count ?? 0) >= cap) {
    s.reason = "daily_cap";
    // Yo ya no puedo más hoy: que el turno pase a otro.
    if (myTurn && byTurns) await advanceCursor(campaign, pool, session.id);
    return;
  }

  let sessionStatus: string;
  try {
    sessionStatus = (await getSession(session.name)).status;
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
    // Caído, desvinculado o arrancando: suelto el turno para que sigan los demás.
    if (myTurn && byTurns && sessionStatus !== "STARTING") await advanceCursor(campaign, pool, session.id);
    if (sessionStatus === "FAILED") {
      // WhatsApp lo desvinculó: limpieza automática (credenciales fuera, desactivado, fuera del pool).
      await handleSessionDown(session.id);
      s.reason = "session_down";
      return;
    }
    if (sessionStatus === "STARTING") {
      // WAHA arrancando (reinicio del contenedor): toleramos ~1 min (12 ticks de 5 s) antes de darlo por caído.
      s.consecutiveWahaErrors += 1;
      if (s.consecutiveWahaErrors >= 12) {
        s.sessionStatus = "STOPPED";
        s.consecutiveWahaErrors = 0;
      }
    }
    // Solo se pausa la campaña si no queda NINGÚN número del pool en pie.
    if (sessionStatus !== "UNREACHABLE" && !anyPossiblyUp(pool)) {
      await pauseCampaign(campaign.id, "session_down");
    }
    s.reason = "session_down";
    return;
  }
  s.consecutiveWahaErrors = 0;

  if (!myTurn) {
    // No me toca. Si el del turno está atascado, le paso el turno al siguiente (puede que sea yo).
    if (cursorId && cursorStuck(cursorId, campaign.id, pool, now.getTime())) await advanceCursor(campaign, pool, cursorId);
    s.reason = "waiting_turn";
    return;
  }

  const claimed = await claimNext(campaign.id);
  if (!claimed) {
    // Nada pendiente. Solo termina si tampoco queda un envío en vuelo de otro número
    // (reclamado sin id): si ese envío falla, volverá a pending y hay que atenderlo.
    const enVuelo = await prisma.campaignRecipient.count({ where: { campaignId: campaign.id, status: "sent", wahaMessageId: null } });
    if (enVuelo === 0) {
      await prisma.campaign.updateMany({
        where: { id: campaign.id, status: "running" },
        data: { status: "finished", finishedAt: now, pausedReason: null },
      });
    }
    s.reason = "idle";
    return;
  }

  let contactId = "";
  let chatId = "";
  let sent: { id: string };
  try {
    // Todo lo que pasa antes de llamar a WAHA va dentro del try: si la BD falla aquí, el
    // destinatario ya reclamado se reencola (handleSendError) en vez de quedar colgado.
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
    contactId = contact.id;
    chatId = phoneToChatId(contact.phone);

    if (contact.whatsappStatus === "unknown") {
      const r = await checkExists(session.name, contact.phone);
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

    // Saludo, emoji y posición de la firma van ligados al destinatario: dos personas seguidas
    // reciben textos distintos y un reintento al mismo destinatario repite exactamente el mismo.
    const text = renderTemplate(campaign.messageTemplate, contact, footerFor(claimed.id), greetingFor(claimed.id));
    sent = await sendText(session.name, chatId, text);
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
      prisma.contact.update({ where: { id: contactId }, data: { lastMessagedAt: new Date() } }),
      prisma.campaign.update({ where: { id: campaign.id }, data: { sentCount: { increment: 1 }, cursorSent: { increment: 1 } } }),
      // updateMany: si el admin quitó este número del pool mientras se enviaba, no hay fila y
      // no pasa nada; lo importante (destinatario, contadores, lastMessagedAt) se persiste igual.
      prisma.campaignSession.updateMany({
        where: { campaignId: campaign.id, sessionId: session.id },
        data: { sentCount: { increment: 1 } },
      }),
      prisma.messagingDailyCounter.upsert({
        where: { day_sessionId: { day, sessionId: session.id } },
        create: { day, sessionId: session.id, count: 1 },
        update: { count: { increment: 1 } },
      }),
    ]);
  } catch (e) {
    // Enviado pero no registrado del todo: dejamos el destinatario en "sent" con el error anotado.
    console.error(`[mensajes] enviado pero no persistido (destinatario ${claimed.id}, waha ${sent.id})`, e);
    try {
      await prisma.campaignRecipient.update({
        where: { id: claimed.id },
        data: { status: "sent", wahaMessageId: sent.id, sentAt: new Date(), error: "Enviado; fallo al registrar contadores" },
      });
    } catch {
      // Ni eso: se guarda en memoria y tickAll lo reintenta cada 5 s. Sin esto, la fila quedaría
      // igual que un reclamo interrumpido y repairInterrupted la reenviaría tras un reinicio.
      engine().unsaved.set(claimed.id, { wahaMessageId: sent.id, sentAt: new Date() });
    }
  }

  // Lote completo: el turno pasa al siguiente número del pool.
  if (byTurns && campaign.cursorSent + 1 >= campaign.rotationBatch) {
    await advanceCursor(campaign, pool, session.id);
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
    const r = await prisma.campaignRecipient.updateMany({
      where: { id: claimed.id, campaign: { status: { in: ["running", "paused"] } } },
      data: { status: "pending", error: msg.slice(0, 300) },
    });
    // La campaña se canceló mientras tanto: no vuelve a la cola.
    if (r.count === 0) await prisma.campaignRecipient.updateMany({ where: { id: claimed.id, status: "sent", wahaMessageId: null }, data: { status: "skipped", error: msg.slice(0, 300) } });
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
