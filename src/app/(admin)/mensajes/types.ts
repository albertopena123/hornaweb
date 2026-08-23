import type { SchedulerSnapshot } from "@/lib/messaging/types";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> };

export type PermFlags = { canRead: boolean; canWrite: boolean };

// ── Conexión ──
export type SessionStatus = "STOPPED" | "STARTING" | "SCAN_QR_CODE" | "WORKING" | "FAILED" | "UNKNOWN";
export type SessionInfo = {
  status: SessionStatus;
  me: { id: string; pushName: string } | null;
  error: string | null;
};

// ── Contactos ──
export type WhatsappStatusKey = "unknown" | "yes" | "no";
export type ContactRow = {
  id: string;
  docNumber: string;
  name: string;
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
  docNumber: string;
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
  todayCount: number;
  dailyCap: number;
  scheduler: SchedulerSnapshot;
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
  session_down: "WhatsApp se desconectó: reconecta en Conexión y reanuda",
  waha_error: "WAHA no responde: revisa el contenedor y reanuda",
  veda: "Veda electoral: no se permiten envíos",
};
