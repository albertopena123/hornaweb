import "server-only";

// Cliente mínimo de WAHA (https://waha.devlike.pro). Todas las llamadas llevan
// X-Api-Key y un timeout de 15 s. Los errores HTTP se devuelven como WahaError;
// los de red/timeout como Error normal (TypeError/AbortError).

export type WahaSessionStatus = "STOPPED" | "STARTING" | "SCAN_QR_CODE" | "WORKING" | "FAILED" | "UNKNOWN";
export type WahaSessionInfo = { status: WahaSessionStatus; me: { id: string; pushName: string } | null };

export class WahaError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`WAHA ${status}: ${body.slice(0, 300)}`);
    this.name = "WahaError";
    this.status = status;
    this.body = body;
  }
}

/** Configuración incompleta (variables de entorno). */
export class WahaConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WahaConfigError";
  }
}

/** Mensaje legible para la UI a partir de cualquier error del cliente WAHA. */
export function describeWahaError(e: unknown): string {
  if (e instanceof WahaConfigError) return e.message;
  if (e instanceof WahaError) {
    if (e.status === 401) return "API key de WAHA inválida (revisa WAHA_API_KEY).";
    return `WAHA respondió ${e.status}.`;
  }
  if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) return "WAHA no responde (timeout).";
  return "WAHA no responde. ¿Está levantado el contenedor?";
}

const TIMEOUT_MS = 15_000;

export function wahaConfig() {
  return {
    url: (process.env.WAHA_URL ?? "http://127.0.0.1:3001").replace(/\/+$/, ""),
    apiKey: process.env.WAHA_API_KEY ?? "",
    session: process.env.WAHA_SESSION ?? "default",
    webhookUrl: process.env.WAHA_WEBHOOK_URL ?? "http://host.docker.internal:3000/api/waha/webhook",
    webhookSecret: process.env.WAHA_WEBHOOK_SECRET ?? "",
  };
}

async function wahaFetch(path: string, init?: { method?: string; body?: unknown; accept?: string }): Promise<Response> {
  const cfg = wahaConfig();
  const res = await fetch(`${cfg.url}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      "X-Api-Key": cfg.apiKey,
      Accept: init?.accept ?? "application/json",
      ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  return res;
}

async function expectOk(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!res.ok) throw new WahaError(res.status, text);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const STATUSES: WahaSessionStatus[] = ["STOPPED", "STARTING", "SCAN_QR_CODE", "WORKING", "FAILED"];

export async function getSession(): Promise<WahaSessionInfo> {
  const { session } = wahaConfig();
  const res = await wahaFetch(`/api/sessions/${encodeURIComponent(session)}`);
  if (res.status === 404) {
    await res.text();
    return { status: "STOPPED", me: null };
  }
  const data = (await expectOk(res)) as { status?: string; me?: { id?: string; pushName?: string } | null } | null;
  const status = (STATUSES as string[]).includes(data?.status ?? "") ? (data!.status as WahaSessionStatus) : "UNKNOWN";
  const me = data?.me && data.me.id ? { id: data.me.id, pushName: data.me.pushName ?? "" } : null;
  return { status, me };
}

export async function startSession(): Promise<void> {
  const cfg = wahaConfig();
  if (!cfg.webhookSecret) {
    throw new WahaConfigError("WAHA_WEBHOOK_SECRET no está configurado: el webhook quedaría sin firma y se perderían acks y bajas.");
  }
  const webhooks = [
    {
      url: cfg.webhookUrl,
      events: ["message", "message.ack", "session.status"],
      hmac: { key: cfg.webhookSecret },
      retries: { policy: "constant", delaySeconds: 2, attempts: 15 },
    },
  ];
  const exists = await wahaFetch(`/api/sessions/${encodeURIComponent(cfg.session)}`);
  await exists.text();
  if (exists.status === 404) {
    const res = await wahaFetch(`/api/sessions`, { method: "POST", body: { name: cfg.session, start: true, config: { webhooks } } });
    await expectOk(res);
    return;
  }
  // Existe: actualizamos config (webhooks) y arrancamos.
  const upd = await wahaFetch(`/api/sessions/${encodeURIComponent(cfg.session)}`, { method: "PUT", body: { config: { webhooks } } });
  await upd.text(); // si el PUT no está soportado por la versión, seguimos igualmente
  const res = await wahaFetch(`/api/sessions/${encodeURIComponent(cfg.session)}/start`, { method: "POST" });
  if (res.status === 422) {
    await res.text(); // ya estaba iniciada
    return;
  }
  await expectOk(res);
}

export async function getQr(): Promise<{ mimetype: string; data: string } | null> {
  const { session } = wahaConfig();
  const res = await wahaFetch(`/api/${encodeURIComponent(session)}/auth/qr`, { accept: "application/json" });
  if (res.status === 422 || res.status === 404) {
    await res.text();
    return null;
  }
  const data = (await expectOk(res)) as { mimetype?: string; data?: string } | null;
  if (!data?.data) return null;
  return { mimetype: data.mimetype ?? "image/png", data: data.data };
}

export async function logoutSession(): Promise<void> {
  const { session } = wahaConfig();
  const res = await wahaFetch(`/api/sessions/${encodeURIComponent(session)}/logout`, { method: "POST" });
  await expectOk(res);
  // WAHA vuelve a arrancar la sesión tras el logout (queda en SCAN_QR_CODE). La detenemos para que
  // quede STOPPED ("Desconectado") y el usuario decida cuándo volver a vincular.
  await stopSession();
}

export async function stopSession(): Promise<void> {
  const { session } = wahaConfig();
  const res = await wahaFetch(`/api/sessions/${encodeURIComponent(session)}/stop`, { method: "POST" });
  await expectOk(res);
}

export async function checkExists(phoneE164: string): Promise<{ exists: boolean; chatId: string | null }> {
  const { session } = wahaConfig();
  const phone = phoneE164.replace(/\D/g, "");
  const res = await wahaFetch(`/api/contacts/check-exists?phone=${encodeURIComponent(phone)}&session=${encodeURIComponent(session)}`);
  const data = (await expectOk(res)) as { numberExists?: boolean; chatId?: string | null } | null;
  return { exists: !!data?.numberExists, chatId: data?.chatId ?? null };
}

// WAHA devuelve formatos distintos según engine:
//  - WEBJS/GOWS: { id: "true_519…@c.us_AAA" } o { id: { _serialized: "…" } }
//  - NOWEB: el WAMessage crudo de Baileys { key: { remoteJid, fromMe, id } } sin id de nivel superior.
// El evento message.ack siempre trae el id serializado `${fromMe}_${chatId}_${id}`; normalizamos
// aquí para que el webhook pueda hacer match por wahaMessageId.
function extractMessageId(data: unknown, fallbackChatId: string): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { id?: unknown; key?: { id?: unknown; remoteJid?: unknown; fromMe?: unknown } };
  if (typeof d.id === "string") return d.id;
  if (d.id && typeof d.id === "object" && typeof (d.id as { _serialized?: unknown })._serialized === "string") {
    return (d.id as { _serialized: string })._serialized;
  }
  if (d.key && typeof d.key.id === "string") {
    const remote =
      typeof d.key.remoteJid === "string" ? d.key.remoteJid.replace(/@s\.whatsapp\.net$/, "@c.us") : fallbackChatId;
    const fromMe = d.key.fromMe === undefined ? true : Boolean(d.key.fromMe);
    return `${fromMe}_${remote}_${d.key.id}`;
  }
  return null;
}

export async function sendText(chatId: string, text: string): Promise<{ id: string }> {
  const { session } = wahaConfig();
  const res = await wahaFetch(`/api/sendText`, { method: "POST", body: { session, chatId, text } });
  const data = await expectOk(res);
  const id = extractMessageId(data, chatId);
  if (!id) throw new WahaError(res.status, `Respuesta sin id de mensaje: ${JSON.stringify(data).slice(0, 200)}`);
  return { id };
}
