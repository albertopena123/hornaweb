"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { foldText } from "@/lib/text";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/server";
import {
  getQr,
  startSession,
  logoutSession,
  deleteSession,
  listSessions,
  describeWahaError,
  type WahaSessionInfo,
} from "@/lib/messaging/waha";
import { pauseCampaign } from "@/lib/messaging/scheduler";
import { handleSessionDown, handleSessionUp, phoneFromMeId, AUTO_LABEL, DEFAULT_DAILY_CAP } from "@/lib/messaging/sessions";
import type { ActionResult, SessionInput, SessionRow, SessionsView } from "../types";

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
  revalidatePath("/mensajes/conexion");
  revalidatePath("/mensajes/campanas");
}

const NO_PERM = "No tienes permiso para gestionar los números.";
const MAX_SESSIONS = 10; // tope de números registrados (ojo: el VPS tiene 2 GB; cada sesión WAHA suma RAM)

/** "Número Tambopata" → "numero-tambopata" (WAHA solo acepta [a-zA-Z0-9-_]). */
function slugify(label: string): string {
  const base = foldText(label)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return base || "numero";
}

async function uniqueSessionName(label: string): Promise<string> {
  const base = label === AUTO_LABEL ? "numero" : slugify(label);
  const taken = new Set((await prisma.whatsappSession.findMany({ select: { name: true } })).map((s) => s.name));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function validate(input: SessionInput): { data?: { label: string; dailyCap: number }; fieldErrors?: Record<string, string> } {
  const fe: Record<string, string> = {};
  const label = (input.label ?? "").trim();
  if (label.length < 3 || label.length > 40) fe.label = "Nombre de 3 a 40 caracteres.";
  const dailyCap = Math.floor(Number(input.dailyCap));
  if (!(dailyCap >= 10 && dailyCap <= 500)) fe.dailyCap = "Tope diario entre 10 y 500.";
  if (Object.keys(fe).length) return { fieldErrors: fe };
  return { data: { label, dailyCap } };
}

/** Un número por id, o error si no existe. */
async function requireSession(id: string) {
  const s = await prisma.whatsappSession.findUnique({ where: { id } });
  if (!s) throw new Error("NOT_FOUND");
  return s;
}

/**
 * Lista los números con su estado en vivo. Una sola llamada a WAHA para todos:
 * si WAHA no responde, se devuelven igualmente las filas de la BD con estado UNKNOWN.
 */
export async function getSessionsAction(): Promise<SessionsView> {
  try {
    await authorize("mensajes.read");
    const rows = await prisma.whatsappSession.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { campaignSessions: true } } },
    });
    const running = await prisma.campaignSession.groupBy({
      by: ["sessionId"],
      where: { campaign: { status: "running" } },
      _count: { _all: true },
    });
    const runningBy = new Map(running.map((g) => [g.sessionId, g._count._all]));

    let live: Map<string, WahaSessionInfo> | null = null;
    let error: string | null = null;
    try {
      live = await listSessions();
    } catch (e) {
      error = describeWahaError(e);
    }

    // Reconciliación con lo que WAHA reporta (por si el webhook se perdió): un número vinculado
    // recibe teléfono/etiqueta/activación automáticas; uno caído se limpia y se aparta solo.
    const tareas: Promise<unknown>[] = [];
    const out: SessionRow[] = rows.map((r) => {
      const info = live?.get(r.name);
      const phone = phoneFromMeId(info?.me?.id);
      let active = r.active;
      let label = r.label;
      let status: SessionRow["status"] = live ? (info?.status ?? "STOPPED") : "UNKNOWN";
      if (info?.status === "WORKING") {
        active = true;
        if (phone && (label === AUTO_LABEL || /^\d{9}$/.test(label))) label = phone.replace(/^\+51/, "");
        tareas.push(handleSessionUp(r.id, info.me?.id).catch((e) => console.error("handleSessionUp", e)));
      } else if (info?.status === "FAILED") {
        active = false;
        status = "STOPPED"; // tras la limpieza queda listo para escanear de nuevo
        tareas.push(handleSessionDown(r.id).catch((e) => console.error("handleSessionDown", e)));
      }
      return {
        id: r.id,
        name: r.name,
        label,
        phone: phone ?? r.phone,
        active,
        dailyCap: r.dailyCap,
        status,
        me: info?.me ?? null,
        runningCampaigns: runningBy.get(r.id) ?? 0,
        campaigns: r._count.campaignSessions,
      };
    });
    if (tareas.length) await Promise.allSettled(tareas);
    return { rows: out, error };
  } catch (e) {
    if (e instanceof Denied) return { rows: [], error: "Sin permiso." };
    console.error("getSessionsAction", e);
    return { rows: [], error: describeWahaError(e) };
  }
}

/**
 * Añade un número con un clic: no pide datos. La etiqueta y el teléfono se rellenan solos al
 * escanear el QR (WAHA reporta el número real) y el tope diario arranca en DEFAULT_DAILY_CAP.
 * Arranca la sesión enseguida para que la tarjeta muestre el QR sin más pasos.
 */
export async function createSessionAction(): Promise<ActionResult<{ id: string }>> {
  try {
    await authorize("mensajes.write");
    const total = await prisma.whatsappSession.count();
    if (total >= MAX_SESSIONS) return fail(`Máximo ${MAX_SESSIONS} números. Elimina alguno antes de añadir otro.`);
    const name = await uniqueSessionName(AUTO_LABEL);
    const s = await prisma.whatsappSession.create({
      data: { name, label: AUTO_LABEL, dailyCap: DEFAULT_DAILY_CAP },
    });
    try {
      await startSession(name);
    } catch (e) {
      // Queda creado en «Desconectado»; el admin puede pulsar Conectar cuando WAHA responda.
      refresh();
      return fail(`Número añadido, pero no se pudo iniciar la sesión: ${describeWahaError(e)}`);
    }
    refresh();
    return { ok: true, data: { id: s.id } };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("createSessionAction", e);
    return fail("Error inesperado al añadir el número.");
  }
}

export async function updateSessionAction(id: string, input: SessionInput): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    const v = validate(input);
    if (!v.data) return fail("Revisa los campos marcados.", v.fieldErrors);
    await requireSession(id);
    await prisma.whatsappSession.update({ where: { id }, data: { label: v.data.label, dailyCap: v.data.dailyCap } });
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    if (e instanceof Error && e.message === "NOT_FOUND") return fail("Número no encontrado.");
    console.error("updateSessionAction", e);
    return fail("Error inesperado al guardar.");
  }
}

/** Desactivar un número lo saca del motor de envío y pausa sus campañas en curso. */
export async function setSessionActiveAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    await requireSession(id);
    await prisma.whatsappSession.update({ where: { id }, data: { active } });
    if (!active) {
      // Sus campañas siguen con el resto del pool; solo se pausan las que se quedan sin ningún número.
      const running = await prisma.campaign.findMany({
        where: { status: "running", sessions: { some: { sessionId: id } } },
        select: { id: true, sessions: { select: { session: { select: { id: true, active: true } } } } },
      });
      for (const c of running) {
        if (!c.sessions.some((m) => m.session.id !== id && m.session.active)) await pauseCampaign(c.id, "manual");
      }
    }
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    if (e instanceof Error && e.message === "NOT_FOUND") return fail("Número no encontrado.");
    console.error("setSessionActiveAction", e);
    return fail("Error inesperado.");
  }
}

export async function getQrAction(id: string): Promise<ActionResult<{ dataUrl: string | null }>> {
  try {
    await authorize("mensajes.read");
    const s = await requireSession(id);
    const qr = await getQr(s.name);
    return { ok: true, data: { dataUrl: qr ? `data:${qr.mimetype};base64,${qr.data}` : null } };
  } catch (e) {
    if (e instanceof Denied) return fail("Sin permiso.");
    if (e instanceof Error && e.message === "NOT_FOUND") return fail("Número no encontrado.");
    return fail(describeWahaError(e));
  }
}

export async function startSessionAction(id: string): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    const s = await requireSession(id);
    await startSession(s.name);
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    if (e instanceof Error && e.message === "NOT_FOUND") return fail("Número no encontrado.");
    console.error("startSessionAction", e);
    return fail(describeWahaError(e));
  }
}

export async function logoutSessionAction(id: string): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    const s = await requireSession(id);
    await logoutSession(s.name);
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    if (e instanceof Error && e.message === "NOT_FOUND") return fail("Número no encontrado.");
    console.error("logoutSessionAction", e);
    return fail(describeWahaError(e));
  }
}

/**
 * Vuelve a vincular desde cero: descarta las credenciales guardadas y arranca la sesión
 * para obtener un QR nuevo. Es la salida cuando WhatsApp rechaza las credenciales
 * (estado FAILED tras un "conflict" o una desvinculación desde el celular): en ese
 * caso "Conectar" solo repite el fallo porque reutiliza las mismas credenciales.
 */
export async function relinkSessionAction(id: string): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    const s = await requireSession(id);
    try {
      await logoutSession(s.name);
    } catch (e) {
      // Si no había sesión que cerrar (404) seguimos: lo que importa es arrancar limpio.
      console.warn("relinkSessionAction: logout", describeWahaError(e));
    }
    await startSession(s.name);
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    if (e instanceof Error && e.message === "NOT_FOUND") return fail("Número no encontrado.");
    console.error("relinkSessionAction", e);
    return fail(describeWahaError(e));
  }
}

/** Elimina el número: solo si ninguna campaña lo usa (su historial se perdería). */
export async function deleteSessionAction(id: string): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    const s = await requireSession(id);
    const used = await prisma.campaignSession.count({ where: { sessionId: id } });
    if (used > 0) {
      return fail(`No se puede eliminar: ${used} campaña${used === 1 ? "" : "s"} usa${used === 1 ? "" : "n"} este número. Desactívalo en su lugar.`);
    }
    try {
      await deleteSession(s.name);
    } catch (e) {
      // WAHA caído o sesión inexistente: igual quitamos la fila, la sesión huérfana no estorba.
      console.warn("deleteSessionAction: WAHA", describeWahaError(e));
    }
    await prisma.whatsappSession.delete({ where: { id } });
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    if (e instanceof Error && e.message === "NOT_FOUND") return fail("Número no encontrado.");
    console.error("deleteSessionAction", e);
    return fail("Error inesperado al eliminar.");
  }
}
