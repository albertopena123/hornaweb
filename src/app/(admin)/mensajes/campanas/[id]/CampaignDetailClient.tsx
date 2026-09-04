"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/admin/Icon";
import { ConfirmDialog } from "../../../usuarios/ConfirmDialog";
import { Toasts, type Toast } from "../../../usuarios/Toasts";
import { downloadCsv } from "@/lib/ui/csv";
import {
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  retryFailed,
  getCampaignProgress,
  getCampaignRecipients,
  addCampaignSession,
  removeCampaignSession,
  setRotationBatch,
} from "../actions";
import { getSessionsAction } from "../../conexion/actions";
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
  type SessionRow,
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
const SESSION_BADGE: Record<string, string> = {
  WORKING: "badge--green",
  SCAN_QR_CODE: "badge--amber",
  STARTING: "badge--amber",
  STOPPED: "badge--neutral",
  FAILED: "badge--red",
  UNKNOWN: "badge--red",
};
const SESSION_STATE_TEXT: Record<string, string> = {
  WORKING: "conectado",
  SCAN_QR_CODE: "esperando QR",
  STARTING: "iniciando",
  STOPPED: "desconectado",
  FAILED: "con error",
  UNKNOWN: "estado desconocido",
};
const STATUS_FILTERS: (RecipientStatusKey | "all")[] = ["all", "pending", "sent", "delivered", "read", "failed", "no_whatsapp", "opted_out", "skipped"];

// Fijado a Lima y con espacios ICU normalizados para que SSR y navegador coincidan.
const SHORT_DT: Intl.DateTimeFormatOptions = { timeZone: "America/Lima", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" };
function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PE", SHORT_DT).replace(/[\u00A0\u202F]/g, " ");
}
/** Para el CSV: misma zona horaria que la tabla, legible por Excel; vacío si no hay fecha. */
function fmtCsv(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-PE", { timeZone: "America/Lima", hour12: false }).replace(/[\u00A0\u202F]/g, " ");
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
  const [adding, setAdding] = useState(false); // selector "añadir número" abierto
  const [candidates, setCandidates] = useState<SessionRow[] | null>(null);
  const [addId, setAddId] = useState("");
  const [batchDraft, setBatchDraft] = useState<number | null>(null); // edición del lote de rotación
  const [toRemove, setToRemove] = useState<{ id: string; label: string; disable: boolean } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState<number | null>(null); // null en SSR; el reloj arranca al montar

  function toast(kind: Toast["kind"], message: string) {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), kind, message }]);
  }

  const seqRef = useRef(0); // nº de la última petición de destinatarios: las anteriores se descartan
  const loadRecipients = useCallback(async (f: RecipientStatusKey | "all", p: number) => {
    const mySeq = ++seqRef.current;
    const res = await getCampaignRecipients(campaign.id, { status: f, page: p, pageSize: PAGE_SIZE });
    if (mySeq !== seqRef.current || !res.ok || !res.data) return;
    const last = Math.max(1, Math.ceil(res.data.total / PAGE_SIZE));
    if (p > last) {
      // El total bajó (p. ej. filtro "pendientes" mientras se envía): saltar a la última página real.
      const again = await getCampaignRecipients(campaign.id, { status: f, page: last, pageSize: PAGE_SIZE });
      if (mySeq !== seqRef.current) return;
      setPage(last);
      if (again.ok && again.data) setRecipients(again.data);
      return;
    }
    setRecipients(res.data);
  }, [campaign.id]);

  // Sondeo de progreso: 5 s en curso, 30 s en otro estado. Refresca destinatarios si cambian los conteos.
  const [pollTick, setPollTick] = useState(0); // cambia en cada intento: reprograma el sondeo aunque falle
  useEffect(() => {
    let cancelled = false;
    const delay = progress.status === "running" ? 5_000 : 30_000;
    const t = setTimeout(async () => {
      try {
        const res = await getCampaignProgress(campaign.id);
        if (cancelled || !res.ok || !res.data) return;
        const changed = JSON.stringify(res.data.counts) !== JSON.stringify(progress.counts);
        setProgress(res.data);
        if (changed) await loadRecipients(filter, page);
      } catch {
        // Sin red o servidor reiniciando: se vuelve a intentar en el siguiente ciclo.
      } finally {
        if (!cancelled) setPollTick((n) => n + 1);
      }
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [progress, pollTick, campaign.id, filter, page, loadRecipients]);

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

  const openAdd = useCallback(async () => {
    setAdding(true);
    setCandidates(null);
    const v = await getSessionsAction();
    if (v.error && v.rows.length === 0) {
      toast("error", v.error);
      setAdding(false);
      return;
    }
    const inPool = new Set(progress.sessions.map((m) => m.id));
    const rows = v.rows.filter((r) => !inPool.has(r.id) && r.active);
    setCandidates(rows);
    // Preseleccionamos el primero que de verdad puede enviar ahora mismo.
    setAddId(rows.find((r) => r.status === "WORKING")?.id ?? rows[0]?.id ?? "");
  }, [progress.sessions]);

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
      all.map((r) => [r.docNumber ?? "", r.name, r.phone, RECIPIENT_STATUS_LABEL[r.status], r.attempts, fmtCsv(r.sentAt), fmtCsv(r.deliveredAt), fmtCsv(r.readAt), r.error]),
    );
  }

  const c = progress.counts;
  const total = Math.max(progress.totalRecipients, 1);
  const pct = (n: number) => `${(n / total) * 100}%`;
  const done = c.sent + c.delivered + c.read + c.failed + c.no_whatsapp + c.opted_out + c.skipped;
  const pages = Math.max(1, Math.ceil(recipients.total / PAGE_SIZE));
  // Pausada porque ningún número quedó respondiendo (desvinculado, bloqueado o WAHA caído).
  const caido = progress.status === "paused" && (progress.pausedReason === "session_down" || progress.pausedReason === "waha_error");
  const editable = progress.status === "draft" || progress.status === "paused" || progress.status === "running";

  // Qué está haciendo el motor con cada número de la campaña.
  function memberText(m: (typeof progress.sessions)[number]): string {
    if (progress.status !== "running") return "—";
    if (!m.active) return "fuera del reparto";
    switch (m.reason) {
      case "waiting":
        return m.nextSendAt && now !== null ? `próximo en ~${Math.max(0, Math.round((new Date(m.nextSendAt).getTime() - now) / 1000))} s` : "esperando…";
      case "waiting_turn":
        return "espera su turno";
      case "daily_cap":
        return "tope de hoy alcanzado";
      case "session_down":
        return "no conectado: se lo saltan";
      case "out_of_window":
        return "fuera de horario";
      case "idle":
        return "libre";
      default:
        return "…";
    }
  }

  // Texto del banner a partir de lo que hace CADA número del pool (no de uno solo: con dos
  // números en estados distintos, un único diagnóstico mentía y cambiaba a cada sondeo).
  let schedulerText = "";
  const sch = progress.scheduler;
  if (progress.status === "running") {
    const activos = progress.sessions.filter((m) => m.active);
    const reasons = activos.map((m) => m.reason);
    const proximo = activos
      .filter((m) => m.reason === "waiting" && m.nextSendAt)
      .sort((a, b) => (a.nextSendAt! < b.nextSendAt! ? -1 : 1))[0];
    const todos = (pred: (r: (typeof reasons)[number]) => boolean) => reasons.length > 0 && reasons.every(pred);
    if (!sch.active) schedulerText = "El motor de envío no está activo en este servidor (MESSAGING_SCHEDULER=off o proceso sin arrancar).";
    else if (activos.length === 0) schedulerText = "Ningún número activo en la campaña: añade o activa uno.";
    else if (reasons.some((r) => r === "out_of_window")) schedulerText = `Fuera de horario (${hh(campaign.windowStart)}–${hh(campaign.windowEnd)} Lima). Reanuda sola a las ${hh(campaign.windowStart)}.`;
    else if (reasons.some((r) => r === "veda")) schedulerText = "Veda electoral.";
    else if (proximo)
      schedulerText =
        now === null
          ? "Esperando el próximo envío…"
          : `Próximo envío en ~${Math.max(0, Math.round((new Date(proximo.nextSendAt!).getTime() - now) / 1000))} s (${proximo.label}).`;
    else if (todos((r) => r === "daily_cap")) schedulerText = `Tope diario alcanzado en todos los números (${progress.todayCount}/${progress.dailyCap}). Continúa mañana.`;
    else if (todos((r) => r === "session_down")) schedulerText = "Ningún número de la campaña está conectado.";
    else if (todos((r) => r === "daily_cap" || r === "session_down")) schedulerText = "Los números conectados ya llegaron a su tope de hoy; el resto no está conectado.";
    else if (todos((r) => r === null || r === "idle"))
      schedulerText = sch.campaignId && sch.campaignId !== campaign.id ? "Otra campaña más antigua ocupa estos números; esta espera su turno." : "Esperando al motor…";
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
            {progress.sessions.length} número{progress.sessions.length === 1 ? "" : "s"} · {campaign.totalRecipients} destinatarios · hasta{" "}
            {progress.dailyCap}/día en total · pausas {campaign.minDelaySec}–{campaign.maxDelaySec} s · {hh(campaign.windowStart)}–
            {hh(campaign.windowEnd)} Lima
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
        <div className="banner"><p>{schedulerText} Hoy: {progress.todayCount}/{progress.dailyCap} entre todos los números.</p></div>
      )}

      <div className="mensajes__card">
        <div className="mensajes__status">
          <strong>Números de envío</strong>
          <span className="mensajes__muted">
            {progress.sessions.length > 1
              ? progress.rotationBatch > 0
                ? `por turnos de ${progress.rotationBatch} mensaje${progress.rotationBatch === 1 ? "" : "s"}`
                : "todos a la vez"
              : "un solo número"}
          </span>
          {perms.canWrite && editable && (
            <span style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              {progress.sessions.length > 1 && batchDraft === null && (
                <button className="btn btn--ghost btn--sm" disabled={pending} onClick={() => setBatchDraft(progress.rotationBatch)}>
                  Cambiar turnos
                </button>
              )}
              {!adding && (
                <button className="btn btn--ghost btn--sm" disabled={pending} onClick={openAdd}>
                  <Icon name="plus" size={14} /> Añadir número
                </button>
              )}
            </span>
          )}
        </div>

        {caido && (
          <p className="mensajes__muted" style={{ margin: 0 }}>
            La campaña se detuvo porque ningún número quedó enviando. Si a alguno lo bloquearon o lo desvincularon, quítalo aquí (con
            «cerrar su sesión») y añade otro: los {c.pending} pendientes salen desde los que queden, sin perder lo ya enviado.
          </p>
        )}

        <div className="tablewrap density-comfy">
          <div className="tablewrap__scroll">
            <table className="dtable">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Estado</th>
                  <th>Enviados</th>
                  <th>Hoy</th>
                  <th>Motor</th>
                  {perms.canWrite && editable && <th></th>}
                </tr>
              </thead>
              <tbody>
                {progress.sessions.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="mensajes__name">
                        {m.label}
                        {m.isCursor && progress.status === "running" && <span className="badge badge--green" style={{ marginLeft: 6 }}>su turno</span>}
                        {!m.active && <span className="badge badge--neutral" style={{ marginLeft: 6 }}>desactivado</span>}
                      </div>
                      {m.phone && <div className="mensajes__muted">{m.phone}</div>}
                    </td>
                    <td><span className={`badge ${SESSION_BADGE[m.status]}`}>{SESSION_STATE_TEXT[m.status] ?? m.status}</span></td>
                    <td className="mensajes__mono">{m.sentCount}</td>
                    <td className="mensajes__mono">{m.todayCount}/{m.dailyCap}</td>
                    <td className="mensajes__muted">{memberText(m)}</td>
                    {perms.canWrite && editable && (
                      <td>
                        <div className="mensajes__rowactions">
                          <button
                            className="btn btn--ghost btn--sm"
                            disabled={pending || !progress.sessions.some((x) => x.active && x.id !== m.id)}
                            title={!progress.sessions.some((x) => x.active && x.id !== m.id) ? "Añade o activa otro número antes de quitar este" : undefined}
                            onClick={() => setToRemove({ id: m.id, label: m.label, disable: m.status !== "WORKING" })}
                          >
                            Quitar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {batchDraft !== null && (
          <div className="mensajes__actions">
            <label className="field" style={{ margin: 0 }}>
              <span className="field__label">Mensajes por turno (0 = todos a la vez)</span>
              <input type="number" min={0} max={500} value={batchDraft} onChange={(e) => setBatchDraft(Number(e.target.value))} />
            </label>
            <button
              className="btn btn--primary btn--sm"
              disabled={pending}
              onClick={() => {
                run(() => setRotationBatch(campaign.id, batchDraft), "Rotación actualizada.");
                setBatchDraft(null);
              }}
            >
              Guardar
            </button>
            <button className="btn btn--ghost btn--sm" disabled={pending} onClick={() => setBatchDraft(null)}>Cancelar</button>
          </div>
        )}

        {adding && (
          <div className="mensajes__actions">
            {candidates === null ? (
              <span className="mensajes__muted">Cargando números…</span>
            ) : candidates.length === 0 ? (
              <span className="mensajes__muted">No hay más números activos: añade uno en la pestaña Conexión.</span>
            ) : (
              <>
                <select className="mensajes__select" value={addId} onChange={(e) => setAddId(e.target.value)}>
                  {candidates.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                      {r.phone ? ` · ${r.phone}` : ""} · {SESSION_STATE_TEXT[r.status] ?? r.status} · {r.dailyCap}/día
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn--primary btn--sm"
                  disabled={pending || !addId}
                  onClick={() => {
                    run(() => addCampaignSession(campaign.id, addId), "Número añadido a la campaña.");
                    setAdding(false);
                  }}
                >
                  Añadir
                </button>
              </>
            )}
            <button className="btn btn--ghost btn--sm" disabled={pending} onClick={() => setAdding(false)}>Cancelar</button>
          </div>
        )}
      </div>

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
                  <td className="mensajes__mono">{r.docNumber ?? "—"}</td>
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

      {toRemove && (
        <ConfirmDialog
          title="Quitar número de la campaña"
          description={
            <>
              <p style={{ marginTop: 0 }}>
                <strong>{toRemove.label}</strong> dejará de enviar en esta campaña. Lo que ya mandó se conserva; los pendientes siguen
                desde los demás números.
              </p>
              <label className="field field--check">
                <input type="checkbox" checked={toRemove.disable} onChange={(e) => setToRemove({ ...toRemove, disable: e.target.checked })} />
                <span>Cerrar también su sesión de WhatsApp y desactivarlo (recomendado si lo bloquearon: así ninguna campaña vuelve a usarlo).</span>
              </label>
            </>
          }
          confirmLabel="Quitar"
          tone="danger"
          busy={pending}
          onConfirm={async () => {
            const { id, disable } = toRemove;
            setToRemove(null);
            run(() => removeCampaignSession(campaign.id, id, { disable }), disable ? "Número quitado y desactivado." : "Número quitado de la campaña.");
          }}
          onClose={() => setToRemove(null)}
        />
      )}

      <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
