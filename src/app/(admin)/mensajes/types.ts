import type { SchedulerReason, SchedulerSnapshot } from "@/lib/messaging/types";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> };

export type PermFlags = { canRead: boolean; canWrite: boolean };

// ── Conexión (multi-número) ──
export type SessionStatus = "STOPPED" | "STARTING" | "SCAN_QR_CODE" | "WORKING" | "FAILED" | "UNKNOWN";

/** Un número de WhatsApp: lo que guarda la BD + su estado en vivo en WAHA. */
export type SessionRow = {
  id: string;
  name: string; // nombre técnico de la sesión en WAHA
  label: string; // nombre visible
  phone: string | null; // +51…, conocido tras vincular
  active: boolean;
  dailyCap: number;
  status: SessionStatus;
  me: { id: string; pushName: string } | null;
  runningCampaigns: number; // campañas en curso que dependen de este número
  campaigns: number; // campañas (en cualquier estado) que lo usan: mientras haya, no se puede eliminar
};

export type SessionsView = {
  rows: SessionRow[];
  error: string | null; // error global (WAHA caído, sin permiso…)
};

export type SessionInput = { label: string; dailyCap: number };

/** Número elegible al crear una campaña. */
export type SessionOption = { id: string; label: string; phone: string | null; dailyCap: number };

/** Un número dentro del pool de una campaña, con su estado en vivo y lo que lleva enviado. */
export type CampaignSessionRow = {
  id: string;
  label: string;
  phone: string | null;
  active: boolean;
  dailyCap: number;
  status: SessionStatus;
  sentCount: number;
  todayCount: number;
  isCursor: boolean; // le toca enviar (solo con rotación por turnos)
  reason: SchedulerReason | null; // diagnóstico del motor para este número
  nextSendAt: string | null;
};

// ── Contactos ──
export type WhatsappStatusKey = "unknown" | "yes" | "no";
export type ContactRow = {
  id: string;
  docNumber: string | null; // opcional
  name: string; // puede ir vacío
  phone: string; // +519XXXXXXXX
  district: string | null;
  source: string;
  whatsappStatus: WhatsappStatusKey;
  optedOut: boolean;
  optedOutAt: string | null;
  lastMessagedAt: string | null;
  createdAt: string;
};
export type ImportSummary = {
  inserted: number;
  updated: number;
  invalid: number;
  duplicatedInFile: number;
  totalRows: number;
};

// ── Campañas ──
export type CampaignStatusKey = "draft" | "running" | "paused" | "finished" | "cancelled";
export type AudienceKey = "all" | "not_contacted" | "district";
export type RecipientStatusKey =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "no_whatsapp"
  | "opted_out"
  | "skipped";

export type CampaignRow = {
  id: string;
  name: string;
  sessions: { id: string; label: string; phone: string | null; sentCount: number }[]; // pool de números
  rotationBatch: number; // 0 = todos a la vez
  status: CampaignStatusKey;
  audience: AudienceKey;
  district: string | null;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  dailyCap: number;
  pausedReason: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdByName: string | null;
};

export type CampaignDetail = CampaignRow & {
  messageTemplate: string;
  minDelaySec: number;
  maxDelaySec: number;
  windowStart: number;
  windowEnd: number;
  lastError: string | null;
};

export type CampaignInput = {
  name: string;
  sessionIds: string[]; // pool de números, en orden de turno
  rotationBatch: number;
  messageTemplate: string;
  audience: AudienceKey;
  district?: string;
  dailyCap: number;
  minDelaySec: number;
  maxDelaySec: number;
  windowStart: number;
  windowEnd: number;
};

export type RecipientRow = {
  id: string;
  docNumber: string | null;
  name: string;
  phone: string;
  status: RecipientStatusKey;
  attempts: number;
  error: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
};

export type CampaignProgress = {
  status: CampaignStatusKey;
  pausedReason: string | null;
  lastError: string | null;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  counts: Record<RecipientStatusKey, number>;
  todayCount: number; // suma de hoy en todos los números del pool
  dailyCap: number; // suma de topes efectivos del pool (lo que como mucho sale hoy)
  rotationBatch: number;
  sessions: CampaignSessionRow[];
  scheduler: SchedulerSnapshot; // del número que tiene el turno (o el primero)
};

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatusKey, string> = {
  draft: "Borrador",
  running: "En curso",
  paused: "Pausada",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

export const AUDIENCE_LABEL: Record<AudienceKey, string> = {
  all: "Todos los contactos",
  not_contacted: "Solo no contactados",
  district: "Por distrito",
};

export const RECIPIENT_STATUS_LABEL: Record<RecipientStatusKey, string> = {
  pending: "Pendiente",
  sent: "Enviado",
  delivered: "Entregado",
  read: "Leído",
  failed: "Fallido",
  no_whatsapp: "Sin WhatsApp",
  opted_out: "Baja",
  skipped: "Omitido",
};

export const PAUSED_REASON_LABEL: Record<string, string> = {
  manual: "Pausada manualmente",
  session_down: "El número se desconectó: reconéctalo en Conexión y reanuda",
  waha_error: "WAHA no responde: revisa el contenedor y reanuda",
  veda: "Veda electoral: no se permiten envíos",
};
