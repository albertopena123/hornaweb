import "server-only";

// Ciclo de vida automático de los números de WhatsApp.
//
// - Al vincular (WORKING): se guarda el teléfono real que reporta WAHA, la etiqueta se pone sola
//   con ese número (si el admin no le puso un nombre propio) y el número se reactiva.
// - Al caer (FAILED: WhatsApp lo desvinculó/bloqueó o el QR caducó): se limpian las credenciales
//   en WAHA (queda STOPPED, listo para escanear otra vez), se desactiva y se quita de las
//   campañas vivas para que no estorbe en el reparto. Las campañas que se quedan sin ningún
//   número activo se pausan.
//
// Lo llaman el webhook (al instante), el listado de Conexión (por si el webhook se perdió) y el
// motor (cuando se topa con un número FAILED en pleno envío). Es idempotente.

import { prisma } from "@/lib/prisma";
import { logoutSession, describeWahaError } from "./waha";
import { chatIdToPhone } from "./normalize";

export const AUTO_LABEL = "Nuevo número";
export const DEFAULT_DAILY_CAP = 500;

/** Etiqueta que puso el sistema (no el admin): se puede sobrescribir con el teléfono real. */
export function isAutoLabel(label: string): boolean {
  const l = label.trim();
  return l === "" || l === AUTO_LABEL || /^\d{9}$/.test(l) || /^\+?51\d{9}$/.test(l);
}

/** "+51987654321" → "987654321" (como las etiquetas que ya usa el admin). */
export function labelFromPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.length === 11 && d.startsWith("51") ? d.slice(2) : d;
}

/** JID de WAHA ("519…@c.us" o "519…@s.whatsapp.net") → "+519…". */
export function phoneFromMeId(meId: string | null | undefined): string | null {
  if (!meId) return null;
  return chatIdToPhone(meId.replace(/@s\.whatsapp\.net$/, "@c.us"));
}

/** Número vinculado: teléfono real, etiqueta automática y reactivación. */
export async function handleSessionUp(sessionId: string, meId: string | null | undefined): Promise<void> {
  const s = await prisma.whatsappSession.findUnique({ where: { id: sessionId } });
  if (!s) return;
  const phone = phoneFromMeId(meId);
  const data: { active?: boolean; phone?: string; label?: string } = {};
  if (!s.active) data.active = true;
  if (phone && phone !== s.phone) data.phone = phone;
  if (phone && isAutoLabel(s.label)) {
    const label = labelFromPhone(phone);
    if (label !== s.label) data.label = label;
  }
  if (Object.keys(data).length === 0) return;
  await prisma.whatsappSession.update({ where: { id: sessionId }, data });
  if (data.active) console.log(`[mensajes] número ${data.label ?? s.label} vinculado: reactivado`);
}

/** Número caído: limpia credenciales, desactiva y lo saca de las campañas vivas. */
export async function handleSessionDown(sessionId: string): Promise<void> {
  const s = await prisma.whatsappSession.findUnique({
    where: { id: sessionId },
    include: { campaignSessions: { include: { campaign: { select: { id: true, status: true } } } } },
  });
  if (!s) return;

  // Credenciales fuera: WhatsApp ya las rechazó y reintentar con ellas solo repite el fallo.
  // Tras esto la sesión queda STOPPED y el botón «Conectar» genera un QR nuevo.
  try {
    await logoutSession(s.name);
  } catch (e) {
    console.warn(`[mensajes] logout de ${s.name} al caer:`, describeWahaError(e));
  }

  if (s.active) await prisma.whatsappSession.update({ where: { id: sessionId }, data: { active: false } });

  const vivas = s.campaignSessions.filter((m) => m.campaign.status === "draft" || m.campaign.status === "running" || m.campaign.status === "paused");
  for (const m of vivas) {
    await prisma.$transaction([
      prisma.campaignSession.deleteMany({ where: { campaignId: m.campaignId, sessionId } }),
      // Si tenía el turno, el motor se lo da al primero que quede en el siguiente tick.
      prisma.campaign.updateMany({ where: { id: m.campaignId, cursorSessionId: sessionId }, data: { cursorSessionId: null, cursorSent: 0 } }),
    ]);
    const restantes = await prisma.campaignSession.count({ where: { campaignId: m.campaignId, session: { active: true } } });
    if (restantes === 0) {
      await prisma.campaign.updateMany({
        where: { id: m.campaignId, status: "running" },
        data: { status: "paused", pausedReason: "session_down", lastError: `El número «${s.label}» se desvinculó y era el último activo.` },
      });
    }
  }
  console.log(`[mensajes] número ${s.label} caído: sesión limpiada, desactivado y quitado de ${vivas.length} campaña(s)`);
}
