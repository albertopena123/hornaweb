"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/admin/Icon";
import { ConfirmDialog } from "../../../usuarios/ConfirmDialog";
import { Toasts, type Toast } from "../../../usuarios/Toasts";
import { downloadCsv } from "@/lib/ui/csv";
import { startCampaign, pauseCampaign, resumeCampaign, cancelCampaign, retryFailed, getCampaignProgress, getCampaignRecipients } from "../actions";
import {
  CAMPAIGN_STATUS_LABEL,
  PAUSED_REASON_LABEL,
  RECIPIENT_STATUS_LABEL,
  type ActionResult,
  type CampaignDetail,
  type CampaignProgress,
  type PermFlags,
  type RecipientRow,
  type RecipientStatusKey,
} from "../../types";

const PAGE_SIZE = 100;
const STATUS_BADGE: Record<CampaignDetail["status"], string> = {
  draft: "badge--neutral",
  running: "badge--green",
  paused: "badge--amber",
  finished: "badge--neutral",
  cancelled: "badge--red",
};
const RECIPIENT_BADGE: Record<RecipientStatusKey, string> = {
  pending: "badge--neutral",
  sent: "badge--amber",
  delivered: "badge--green",
  read: "badge--green",
  failed: "badge--red",
  no_whatsapp: "badge--red",
  opted_out: "badge--amber",
  skipped: "badge--neutral",
};
const STATUS_FILTERS: (RecipientStatusKey | "all")[] = ["all", "pending", "sent", "delivered", "read", "failed", "no_whatsapp", "opted_out", "skipped"];

// Fijado a Lima y con espacios ICU normalizados para que SSR y navegador coincidan.
const SHORT_DT: Intl.DateTimeFormatOptions = { timeZone: "America/Lima", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" };
function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PE", SHORT_DT).replace(/[\u00A0\u202F]/g, " ");
}
function hh(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

export function CampaignDetailClient({
  campaign,
  initialProgress,
  initialRecipients,
  perms,
}: {
  campaign: CampaignDetail;
  initialProgress: CampaignProgress;
  initialRecipients: { rows: RecipientRow[]; total: number };
  perms: PermFlags;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState<CampaignProgress>(initialProgress);
  const [recipients, setRecipients] = useState(initialRecipients);
  const [filter, setFilter] = useState<RecipientStatusKey | "all">("all");
  const [page, setPage] = useState(1);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState<number | null>(null); // null en SSR; el reloj arranca al montar

  function toast(kind: Toast["kind"], message: string) {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), kind, message }]);
  }

  const loadRecipients = useCallback(async (f: RecipientStatusKey | "all", p: number) => {
    const res = await getCampaignRecipients(campaign.id, { status: f, page: p, pageSize: PAGE_SIZE });
    if (res.ok && res.data) setRecipients(res.data);
  }, [campaign.id]);

  // Sondeo de progreso: 5 s en curso, 30 s en otro estado. Refresca destinatarios si cambian los conteos.
  useEffect(() => {
    let cancelled = false;
    const delay = progress.status === "running" ? 5_000 : 30_000;
    const t = setTimeout(async () => {
      const res = await getCampaignProgress(campaign.id);
      if (cancelled || !res.ok || !res.data) return;
      const changed = JSON.stringify(res.data.counts) !== JSON.stringify(progress.counts);
      setProgress(res.data);
      if (changed) await loadRecipients(filter, page);
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [progress, campaign.id, filter, page, loadRecipients]);

  // Reloj para la cuenta atrás del próximo envío.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- valor inicial solo-cliente (evita mismatch de hidratación)
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  function run(action: () => Promise<ActionResult<unknown>>, okMsg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) toast("success", okMsg);
      else toast("error", res.error);
      const p = await getCampaignProgress(campaign.id);
      if (p.ok && p.data) setProgress(p.data);
      await loadRecipients(filter, page);
      router.refresh();
    });
  }

  async function exportCsv() {
    const all: RecipientRow[] = [];
    for (let p = 1; ; p++) {
      const res = await getCampaignRecipients(campaign.id, { status: "all", page: p, pageSize: 1000 });
      if (!res.ok || !res.data) break;
      all.push(...res.data.rows);
      if (all.length >= res.data.total || res.data.rows.length === 0) break;
    }
    downloadCsv(
      `campana-${campaign.name.replace(/[^\w-]+/g, "_")}.csv`,
      ["DNI", "Nombre", "Celular", "Estado", "Intentos", "Enviado", "Entregado", "Leído", "Error"],
      all.map((r) => [r.docNumber, r.name, r.phone, RECIPIENT_STATUS_LABEL[r.status], r.attempts, r.sentAt, r.deliveredAt, r.readAt, r.error]),
    );
  }

  const c = progress.counts;
  const total = Math.max(progress.totalRecipients, 1);
  const pct = (n: number) => `${(n / total) * 100}%`;
  const done = c.sent + c.delivered + c.read + c.failed + c.no_whatsapp + c.opted_out + c.skipped;
  const pages = Math.max(1, Math.ceil(recipients.total / PAGE_SIZE));

  let schedulerText = "";
  const sch = progress.scheduler;
  const isMine = sch.campaignId === campaign.id;
  if (progress.status === "running") {
    if (!sch.active) schedulerText = "El motor de envío no está activo en este servidor (MESSAGING_SCHEDULER=off o proceso sin arrancar).";
    else if (!isMine && sch.campaignId) schedulerText = "Otra campaña está en curso; esta espera su turno.";
    else if (sch.reason === "waiting" && sch.nextSendAt)
      schedulerText = now === null ? "Esperando el próximo envío…" : `Próximo envío en ~${Math.max(0, Math.round((new Date(sch.nextSendAt).getTime() - now) / 1000))} s.`;
    else if (sch.reason === "out_of_window") schedulerText = `Fuera de horario (${hh(campaign.windowStart)}–${hh(campaign.windowEnd)} Lima). Reanuda sola a las ${hh(campaign.windowStart)}.`;
    else if (sch.reason === "daily_cap") schedulerText = `Tope diario alcanzado (${progress.todayCount}/${progress.dailyCap}). Continúa mañana.`;
    else if (sch.reason === "session_down") schedulerText = "WhatsApp no está conectado.";
    else if (sch.reason === "veda") schedulerText = "Veda electoral.";
    else schedulerText = "Enviando…";
  }

  return (
    <div className="mensajes__section">
      <p className="mensajes__muted" style={{ marginTop: 0 }}>
        <Link href="/mensajes/campanas">‹ Campañas</Link>
      </p>
      <header className="mensajes__head">
        <div>
          <h2>
            {campaign.name} <span className={`badge ${STATUS_BADGE[progress.status]}`}>{CAMPAIGN_STATUS_LABEL[progress.status]}</span>
          </h2>
          <p className="mensajes__sub">
            {campaign.totalRecipients} destinatarios · tope {campaign.dailyCap}/día · pausas {campaign.minDelaySec}–{campaign.maxDelaySec} s · {hh(campaign.windowStart)}–{hh(campaign.windowEnd)} Lima
          </p>
        </div>
        {perms.canWrite && (
          <div className="mensajes__actions">
            {progress.status === "draft" && (
              <button className="btn btn--primary" disabled={pending} onClick={() => run(() => startCampaign(campaign.id), "Campaña iniciada.")}>Iniciar</button>
            )}
            {progress.status === "running" && (
              <button className="btn btn--ghost" disabled={pending} onClick={() => run(() => pauseCampaign(campaign.id), "Campaña pausada.")}>Pausar</button>
            )}
            {progress.status === "paused" && (
              <button className="btn btn--primary" disabled={pending} onClick={() => run(() => resumeCampaign(campaign.id), "Campaña reanudada.")}>Reanudar</button>
            )}
            {(progress.status === "draft" || progress.status === "running" || progress.status === "paused") && (
              <button className="btn btn--ghost" disabled={pending} onClick={() => setConfirmCancel(true)}>Cancelar</button>
            )}
            {c.failed > 0 && (progress.status === "paused" || progress.status === "finished") && (
              <button className="btn btn--ghost" disabled={pending} onClick={() => run(() => retryFailed(campaign.id), "Fallidos devueltos a pendiente.")}>Reintentar fallidos ({c.failed})</button>
            )}
            <button className="btn btn--ghost" onClick={exportCsv}><Icon name="download" size={16} /> CSV</button>
          </div>
        )}
      </header>

      {progress.status === "paused" && progress.pausedReason && (
        <div className="banner"><p>{PAUSED_REASON_LABEL[progress.pausedReason] ?? progress.pausedReason}{progress.lastError ? ` — ${progress.lastError}` : ""}</p></div>
      )}
      {progress.status === "running" && schedulerText && (
        <div className="banner"><p>{schedulerText} Hoy: {progress.todayCount}/{progress.dailyCap}.</p></div>
      )}

      <div className="mensajes__progress" title={`${done} de ${progress.totalRecipients}`}>
        <span className="is-read" style={{ width: pct(c.read) }} />
        <span className="is-delivered" style={{ width: pct(c.delivered) }} />
        <span className="is-sent" style={{ width: pct(c.sent) }} />
        <span className="is-failed" style={{ width: pct(c.failed + c.no_whatsapp) }} />
      </div>

      <div className="mensajes__stats">
        {(["pending", "sent", "delivered", "read", "failed", "no_whatsapp", "opted_out"] as RecipientStatusKey[]).map((k) => (
          <div className="mensajes__statcard stat" key={k}>
            <div className="stat__v">{c[k]}</div>
            <div className="stat__l">{RECIPIENT_STATUS_LABEL[k]}</div>
          </div>
        ))}
      </div>

      <div className="mensajes__card">
        <strong>Mensaje</strong>
        <div className="mensajes__preview">{campaign.messageTemplate}</div>
      </div>

      <div className="mensajes__filters">
        <select className="mensajes__select" value={filter} onChange={(e) => { const f = e.target.value as RecipientStatusKey | "all"; setFilter(f); setPage(1); loadRecipients(f, 1); }}>
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === "all" ? "Todos los estados" : RECIPIENT_STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      <div className="tablewrap density-comfy">
        <div className="tablewrap__scroll">
          <table className="dtable">
            <thead>
              <tr><th>DNI</th><th>Nombre</th><th>Celular</th><th>Estado</th><th>Enviado</th><th>Entregado</th><th>Leído</th><th>Error</th></tr>
            </thead>
            <tbody>
              {recipients.rows.length === 0 && (
                <tr><td colSpan={8} className="mensajes__empty"><span>Sin destinatarios en este estado.</span></td></tr>
              )}
              {recipients.rows.map((r) => (
                <tr key={r.id}>
                  <td className="mensajes__mono">{r.docNumber}</td>
                  <td><div className="mensajes__name">{r.name}</div></td>
                  <td className="mensajes__mono">{r.phone}</td>
                  <td><span className={`badge ${RECIPIENT_BADGE[r.status]}`}>{RECIPIENT_STATUS_LABEL[r.status]}</span></td>
                  <td>{fmt(r.sentAt)}</td>
                  <td>{fmt(r.deliveredAt)}</td>
                  <td>{fmt(r.readAt)}</td>
                  <td><span className="mensajes__muted">{r.error ?? ""}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tablefoot">
          <span>{recipients.total} destinatario{recipients.total === 1 ? "" : "s"}</span>
          <div className="mensajes__pager">
            <button className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); loadRecipients(filter, p); }}>‹</button>
            <span className="mensajes__muted">Página {page} de {pages}</span>
            <button className="btn btn--ghost btn--sm" disabled={page >= pages} onClick={() => { const p = page + 1; setPage(p); loadRecipients(filter, p); }}>›</button>
          </div>
        </div>
      </div>

      {confirmCancel && (
        <ConfirmDialog
          title="Cancelar campaña"
          description="Los destinatarios pendientes quedarán como omitidos. No se puede deshacer."
          confirmLabel="Cancelar campaña"
          tone="danger"
          busy={pending}
          onConfirm={async () => {
            setConfirmCancel(false);
            run(() => cancelCampaign(campaign.id), "Campaña cancelada.");
          }}
          onClose={() => setConfirmCancel(false)}
        />
      )}

      <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
