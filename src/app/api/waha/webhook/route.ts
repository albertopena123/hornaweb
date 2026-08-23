import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWahaSignature } from "@/lib/messaging/webhook-signature";
import { isOptOutText, jidToPhone } from "@/lib/messaging/normalize";
import { sendText, wahaConfig } from "@/lib/messaging/waha";

export const dynamic = "force-dynamic";

// POST /api/waha/webhook — eventos de WAHA (message.ack, message, session.status).
// Público pero verificado por HMAC; responde siempre 200 tras procesar para que WAHA no reintente.

type WahaEvent = { id?: string; event?: string; session?: string; payload?: unknown };
type AckPayload = { id?: string; ack?: number; ackName?: string };
type MessagePayload = { id?: string; from?: string; fromMe?: boolean; body?: string; _data?: { key?: { remoteJidAlt?: string; senderPn?: string } } };
type SessionPayload = { status?: string };

const OPT_OUT_REPLY = "Listo, no recibirás más mensajes de la campaña de Simón Horna. Gracias.";

// Idempotencia simple en memoria (WAHA reintenta si no respondemos 200 a tiempo).
const seen = new Set<string>();
const seenOrder: string[] = [];
function remember(id: string): boolean {
  if (seen.has(id)) return false;
  seen.add(id);
  seenOrder.push(id);
  if (seenOrder.length > 1000) seen.delete(seenOrder.shift()!);
  return true;
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWahaSignature(raw, req.headers.get("x-webhook-hmac"), wahaConfig().webhookSecret)) {
    return Response.json({ ok: false, error: "Firma inválida." }, { status: 401 });
  }
  let evt: WahaEvent;
  try {
    evt = JSON.parse(raw) as WahaEvent;
  } catch {
    return Response.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }
  if (evt.session && evt.session !== wahaConfig().session) return Response.json({ ok: true, ignored: true });
  if (evt.id && !remember(evt.id)) return Response.json({ ok: true, duplicate: true });

  try {
    switch (evt.event) {
      case "message.ack":
        await onAck((evt.payload ?? {}) as AckPayload);
        break;
      case "message":
        await onMessage((evt.payload ?? {}) as MessagePayload);
        break;
      case "session.status":
        await onSessionStatus((evt.payload ?? {}) as SessionPayload);
        break;
    }
  } catch (e) {
    console.error("[waha webhook]", evt.event, e);
  }
  return Response.json({ ok: true });
}

// ack: -1 ERROR, 0 PENDING, 1 SERVER, 2 DEVICE, 3 READ, 4 PLAYED. Nunca retrocede de estado.
async function onAck(p: AckPayload): Promise<void> {
  if (!p.id || typeof p.ack !== "number") return;
  const r = await prisma.campaignRecipient.findFirst({ where: { wahaMessageId: p.id } });
  if (!r) return;
  const now = new Date();
  if (p.ack === -1) {
    if (r.status === "sent" || r.status === "delivered") {
      await prisma.$transaction([
        prisma.campaignRecipient.update({ where: { id: r.id }, data: { status: "failed", error: "WhatsApp reportó error de entrega (ack ERROR)" } }),
        prisma.campaign.update({ where: { id: r.campaignId }, data: { failedCount: { increment: 1 }, sentCount: { decrement: 1 } } }),
      ]);
    }
    return;
  }
  if (p.ack >= 3 && r.status !== "read") {
    await prisma.campaignRecipient.update({
      where: { id: r.id },
      data: { status: "read", readAt: now, deliveredAt: r.deliveredAt ?? now },
    });
  } else if (p.ack === 2 && r.status === "sent") {
    await prisma.campaignRecipient.update({ where: { id: r.id }, data: { status: "delivered", deliveredAt: now } });
  }
}

async function onMessage(p: MessagePayload): Promise<void> {
  if (p.fromMe || !p.from) return;
  const key = p._data?.key;
  // Chats con LID: `from` llega como `NNN@lid`; el número real viene en `_data.key.remoteJidAlt` (formato Baileys).
  const phone = jidToPhone(p.from) ?? jidToPhone(key?.remoteJidAlt) ?? jidToPhone(key?.senderPn);
  if (!phone) return;
  const body = typeof p.body === "string" ? p.body : "";
  if (!isOptOutText(body)) return;
  // Varios DNI pueden compartir celular: la baja aplica a todos los contactos de ese número.
  const contacts = await prisma.contact.findMany({ where: { phone }, select: { id: true, optedOut: true } });
  if (contacts.length === 0) return;
  if (contacts.every((c) => c.optedOut)) return; // ya dados de baja: no repetir la respuesta
  const ids = contacts.map((c) => c.id);
  await prisma.$transaction([
    prisma.contact.updateMany({
      where: { id: { in: ids }, optedOut: false },
      data: { optedOut: true, optedOutAt: new Date(), optedOutReason: `reply:${body.trim().slice(0, 40)}` },
    }),
    prisma.campaignRecipient.updateMany({ where: { contactId: { in: ids }, status: "pending" }, data: { status: "opted_out" } }),
  ]);
  try {
    await sendText(p.from, OPT_OUT_REPLY);
  } catch (e) {
    console.error("[waha webhook] respuesta BAJA", e);
  }
}

// STARTING es transitorio (reinicio del contenedor con WHATSAPP_RESTART_ALL_SESSIONS, reconexión):
// no pausa. Todo lo demás (STOPPED, SCAN_QR_CODE, FAILED, PASSKEY_*) requiere intervención humana.
const TRANSIENT_STATUSES = new Set(["WORKING", "STARTING"]);

async function onSessionStatus(p: SessionPayload): Promise<void> {
  if (!p.status || TRANSIENT_STATUSES.has(p.status)) return;
  await prisma.campaign.updateMany({
    where: { status: "running" },
    data: { status: "paused", pausedReason: "session_down" },
  });
}
