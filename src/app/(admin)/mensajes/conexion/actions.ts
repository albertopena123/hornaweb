"use server";

import { getCurrentUser, type CurrentUser } from "@/lib/auth/server";
import { getSession, getQr, startSession, logoutSession, describeWahaError } from "@/lib/messaging/waha";
import type { ActionResult, SessionInfo } from "../types";

class Denied extends Error {}

async function authorize(perm: "mensajes.read" | "mensajes.write"): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me || !me.permissions.has(perm)) throw new Denied();
  return me;
}

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export async function getSessionAction(): Promise<SessionInfo> {
  try {
    await authorize("mensajes.read");
    const s = await getSession();
    return { status: s.status, me: s.me, error: null };
  } catch (e) {
    if (e instanceof Denied) return { status: "UNKNOWN", me: null, error: "Sin permiso." };
    return { status: "UNKNOWN", me: null, error: describeWahaError(e) };
  }
}

export async function getQrAction(): Promise<ActionResult<{ dataUrl: string | null }>> {
  try {
    await authorize("mensajes.read");
    const qr = await getQr();
    return { ok: true, data: { dataUrl: qr ? `data:${qr.mimetype};base64,${qr.data}` : null } };
  } catch (e) {
    if (e instanceof Denied) return fail("Sin permiso.");
    return fail(describeWahaError(e));
  }
}

export async function startSessionAction(): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    await startSession();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar la conexión.");
    console.error("startSessionAction", e);
    return fail(describeWahaError(e));
  }
}

export async function logoutSessionAction(): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    await logoutSession();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar la conexión.");
    console.error("logoutSessionAction", e);
    return fail(describeWahaError(e));
  }
}
