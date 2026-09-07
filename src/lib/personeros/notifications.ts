import "server-only";

import { prisma } from "@/lib/prisma";
import { sendText, WahaError, listSessions } from "@/lib/messaging/waha";
import { phoneToChatId } from "@/lib/messaging/normalize";

export type NotificationResult = {
  ok: boolean;
  error?: string;
  wahaMessageId?: string;
};

export async function sendPersoneroAssignmentWhatsApp(
  personeroId: string,
  originUrl?: string,
): Promise<NotificationResult> {
  const p = await prisma.personero.findUnique({
    where: { id: personeroId },
  });

  if (!p) return { ok: false, error: "Personero no encontrado." };
  if (!p.phone) return { ok: false, error: "El personero no tiene número de celular registrado." };

  const baseUrl = originUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const token = p.credentialToken || p.id;
  const credentialUrl = `${baseUrl.replace(/\/+$/, "")}/credencial/${token}`;

  const roleLabel = p.role === "general" ? "PERSONERO GENERAL DE LOCAL" : "PERSONERO DE MESA";
  const aulaText = p.aula?.trim() ? p.aula.trim() : "Por verificar en el ingreso al local";
  const mesaText = p.mesa?.trim() ? p.mesa.trim() : "Por asignar";

  const message = `⭐ *PARTIDO AHORA NACIÓN - ASIGNACIÓN DE PERSONERO* ⭐

Estimado(a) *${p.name.toUpperCase()}*,
¡Gracias por tu valioso compromiso en defensa del voto y la democracia en Madre de Dios!

🗳️ *Tus datos de asignación electoral:*
🏛️ *Local / Colegio:* ${p.localName}
📋 *Mesa de Sufragio:* ${mesaText}
🚪 *Aula:* ${aulaText}
🎖️ *Cargo:* ${roleLabel}
${p.localAddress ? `📍 *Dirección:* ${p.localAddress}\n` : ""}👤 *Coordinación:* ${p.coordinatorName} (${p.coordinatorPhone})

🎫 *Tu Credencial Digital Oficial:*
👉 ${credentialUrl}

Guarda este mensaje. Puedes presentar tu credencial directamente desde tu celular el día de la elección. ¡Cuidemos cada voto! 🔴🇵🇪`;

  const chatId = phoneToChatId(p.phone);

  try {
    // Buscar sesión activa de WAHA disponible
    let sessionName = process.env.WAHA_SESSION || "default";
    try {
      const activeSessions = await listSessions();
      for (const [name, info] of activeSessions.entries()) {
        if (info.status === "WORKING") {
          sessionName = name;
          break;
        }
      }
    } catch {
      // Usar fallback de sesión
    }

    const res = await sendText(sessionName, chatId, message);

    await prisma.personero.update({
      where: { id: personeroId },
      data: { whatsappNotifiedAt: new Date() },
    });

    return { ok: true, wahaMessageId: res.id };
  } catch (err) {
    console.error("Error al enviar WhatsApp a personero:", err);
    const msg = err instanceof WahaError ? err.body : err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `No se pudo entregar por WhatsApp: ${msg}. Asegúrate de tener una sesión activa en WAHA.`,
    };
  }
}
