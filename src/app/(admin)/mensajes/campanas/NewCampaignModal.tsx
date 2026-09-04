"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/admin/Icon";
import { useEscClose } from "@/lib/ui/useEscClose";
import { DISTRICTS } from "@/lib/districts";
import { renderTemplate, splitUrls, TEMPLATE_MAX } from "@/lib/messaging/normalize";
import { previewAudience } from "./actions";
import type { ActionResult, AudienceKey, CampaignInput, SessionOption } from "../types";

const HOURS = Array.from({ length: 25 }, (_, i) => i);

export function NewCampaignModal({
  sessions,
  onClose,
  onSubmit,
}: {
  sessions: SessionOption[];
  onClose: () => void;
  onSubmit: (input: CampaignInput) => Promise<ActionResult<unknown>>;
}) {
  // Por defecto entran todos los números disponibles: es lo que reparte la carga.
  const [sessionIds, setSessionIds] = useState<string[]>(sessions.map((s) => s.id));
  const [rotationBatch, setRotationBatch] = useState(20);
  const [name, setName] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("Hola {nombre}, te saluda el equipo de Simón Horna. ");
  const [audience, setAudience] = useState<AudienceKey>("not_contacted");
  const [district, setDistrict] = useState("");
  const [dailyCap, setDailyCap] = useState(150);
  const [minDelaySec, setMinDelaySec] = useState(45);
  const [maxDelaySec, setMaxDelaySec] = useState(120);
  const [windowStart, setWindowStart] = useState(8);
  const [windowEnd, setWindowEnd] = useState(20);
  const [preview, setPreview] = useState<{ count: number; sample: { name: string; docNumber: string | null } | null; footer: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEscClose(true, onClose, busy);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await previewAudience(audience, district || undefined);
      if (!cancelled) setPreview(res.ok ? (res.data ?? null) : null);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [audience, district]);

  function toggleSession(id: string) {
    setSessionIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function insertToken(token: string) {
    const el = textareaRef.current;
    if (!el) {
      setMessageTemplate((m) => m + token);
      return;
    }
    const start = el.selectionStart ?? messageTemplate.length;
    const end = el.selectionEnd ?? start;
    const next = messageTemplate.slice(0, start) + token + messageTemplate.slice(end);
    setMessageTemplate(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setTopError(null);
    setFieldErrors({});
    const res = await onSubmit({
      sessionIds,
      rotationBatch,
      name,
      messageTemplate,
      audience,
      district: audience === "district" ? district || undefined : undefined,
      dailyCap,
      minDelaySec,
      maxDelaySec,
      windowStart,
      windowEnd,
    });
    if (!res.ok) {
      setTopError(res.error);
      setFieldErrors(res.fieldErrors ?? {});
    }
    setBusy(false);
  }

  const sample = preview?.sample ?? { name: "Juan Perez Gomez", docNumber: "12345678" };
  const rendered = messageTemplate.trim() ? renderTemplate(messageTemplate, sample, preview?.footer ?? "") : "";
  // Cada número manda como mucho min(tope campaña, tope número) al día; entre todos, la suma.
  const chosen = sessions.filter((s) => sessionIds.includes(s.id));
  const effectiveCap = chosen.reduce((a, s) => a + Math.min(dailyCap, s.dailyCap), 0);
  const days = preview && preview.count > 0 && effectiveCap > 0 ? Math.ceil(preview.count / effectiveCap) : 0;

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <form className="modal mensajes__modal--wide" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <header className="modal__head">
          <h2>Nueva campaña</h2>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="modal__body">
          {topError && (
            <div className="login__error" role="alert" style={{ marginBottom: 16 }}>
              <Icon name="info" size={16} />
              <span>{topError}</span>
            </div>
          )}

          <div className="field">
            <span className="field__label">Enviar desde<span className="field__req">*</span></span>
            {sessions.length === 0 && <span className="mensajes__err">No hay números disponibles: añade y conecta uno en Conexión.</span>}
            {sessions.map((s) => (
              <label key={s.id} className="field field--check" style={{ marginBottom: 4 }}>
                <input type="checkbox" checked={sessionIds.includes(s.id)} onChange={() => toggleSession(s.id)} />
                <span>
                  {s.label}
                  {s.phone ? ` · ${s.phone}` : ""} · {s.dailyCap}/día
                </span>
              </label>
            ))}
            <span className="mensajes__hint">
              Con varios números marcados, la campaña se reparte entre ellos por turnos: cada número lleva su propio ritmo y su propio tope
              diario, y si uno se cae o llega al tope, los demás siguen solos.
            </span>
            {fieldErrors.sessionIds && <span className="mensajes__err">{fieldErrors.sessionIds}</span>}
          </div>

          {sessionIds.length > 1 && (
            <label className="field">
              <span className="field__label">Mensajes por turno</span>
              <input
                type="number"
                min={0}
                max={500}
                value={rotationBatch}
                onChange={(e) => setRotationBatch(Number(e.target.value))}
                aria-invalid={!!fieldErrors.rotationBatch}
              />
              <span className="mensajes__hint">
                Cuántos mensajes seguidos manda un número antes de pasar el turno al siguiente. 0 = sin turnos, todos envían a la vez
                (más rápido; cada uno respeta igual sus pausas y su tope).
              </span>
              {fieldErrors.rotationBatch && <span className="mensajes__err">{fieldErrors.rotationBatch}</span>}
            </label>
          )}

          <label className="field">
            <span className="field__label">Nombre de la campaña<span className="field__req">*</span></span>
            <input type="text" autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} aria-invalid={!!fieldErrors.name} />
            {fieldErrors.name && <span className="mensajes__err">{fieldErrors.name}</span>}
          </label>

          <div className="mensajes__row">
            <div className="field">
              <span className="field__label">Mensaje<span className="field__req">*</span></span>
              <div className="mensajes__tpl-btns">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => insertToken("{saludo}")}>+ {"{saludo}"}</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => insertToken("{nombre}")}>+ {"{nombre}"}</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => insertToken("{dni}")}>+ {"{dni}"}</button>
              </div>
              <textarea
                ref={textareaRef}
                rows={8}
                maxLength={TEMPLATE_MAX}
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                aria-invalid={!!fieldErrors.messageTemplate}
              />
              <span className="mensajes__hint">
                {messageTemplate.length}/{TEMPLATE_MAX} · Para que no salgan cientos de mensajes idénticos, en cada envío rotan el saludo
                inicial ({"{saludo}"}, o el «Hola» con que empiece el texto: Buenas, Buen día, Qué tal…), el emoji del pie y su
                posición. La vista previa muestra una sola variante.
              </span>
              <span className="mensajes__hint">
                Enlaces: pégalos completos (con <code>https://</code>) y separados por espacios; se envían con previsualización. WhatsApp solo los
                muestra clicables si el ciudadano tiene guardado el número o ya te respondió alguna vez.
              </span>
              {fieldErrors.messageTemplate && <span className="mensajes__err">{fieldErrors.messageTemplate}</span>}
            </div>
            <div className="field">
              <span className="field__label">Vista previa ({preview?.sample ? "contacto real" : "ejemplo"})</span>
              <div className={`mensajes__preview ${rendered ? "" : "mensajes__preview--empty"}`}>
                {rendered
                  ? splitUrls(rendered).map((p, i) =>
                      p.type === "url" ? (
                        <a key={i} href={p.value.startsWith("http") ? p.value : `https://${p.value}`} target="_blank" rel="noopener noreferrer">
                          {p.value}
                        </a>
                      ) : (
                        <span key={i}>{p.value}</span>
                      ),
                    )
                  : "Escribe el mensaje para ver la vista previa."}
              </div>
            </div>
          </div>

          <div className="mensajes__row">
            <label className="field">
              <span className="field__label">Audiencia</span>
              <select value={audience} onChange={(e) => setAudience(e.target.value as AudienceKey)} aria-invalid={!!fieldErrors.audience}>
                <option value="not_contacted">Solo contactos nunca contactados</option>
                <option value="all">Todos los contactos activos</option>
                <option value="district">Contactos de un distrito</option>
              </select>
              <span className="mensajes__hint">Se excluyen siempre las bajas y los números sin WhatsApp.</span>
            </label>
            {audience === "district" && (
              <label className="field">
                <span className="field__label">Distrito<span className="field__req">*</span></span>
                <select value={district} onChange={(e) => setDistrict(e.target.value)} aria-invalid={!!fieldErrors.district}>
                  <option value="">Elige…</option>
                  {DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
                {fieldErrors.district && <span className="mensajes__err">{fieldErrors.district}</span>}
              </label>
            )}
          </div>

          <div className="mensajes__row mensajes__row--3">
            <label className="field">
              <span className="field__label">Tope diario por número</span>
              <input type="number" min={10} max={500} value={dailyCap} onChange={(e) => setDailyCap(Number(e.target.value))} aria-invalid={!!fieldErrors.dailyCap} />
              {fieldErrors.dailyCap && <span className="mensajes__err">{fieldErrors.dailyCap}</span>}
            </label>
            <label className="field">
              <span className="field__label">Pausa mínima (s)</span>
              <input type="number" min={20} max={600} value={minDelaySec} onChange={(e) => setMinDelaySec(Number(e.target.value))} aria-invalid={!!fieldErrors.minDelaySec} />
              {fieldErrors.minDelaySec && <span className="mensajes__err">{fieldErrors.minDelaySec}</span>}
            </label>
            <label className="field">
              <span className="field__label">Pausa máxima (s)</span>
              <input type="number" min={20} max={600} value={maxDelaySec} onChange={(e) => setMaxDelaySec(Number(e.target.value))} aria-invalid={!!fieldErrors.maxDelaySec} />
              {fieldErrors.maxDelaySec && <span className="mensajes__err">{fieldErrors.maxDelaySec}</span>}
            </label>
          </div>
          <div className="mensajes__row">
            <label className="field">
              <span className="field__label">Enviar desde (hora Lima)</span>
              <select value={windowStart} onChange={(e) => setWindowStart(Number(e.target.value))} aria-invalid={!!fieldErrors.windowStart}>
                {HOURS.slice(0, 24).map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
              </select>
              {fieldErrors.windowStart && <span className="mensajes__err">{fieldErrors.windowStart}</span>}
            </label>
            <label className="field">
              <span className="field__label">Hasta (hora Lima)</span>
              <select value={windowEnd} onChange={(e) => setWindowEnd(Number(e.target.value))} aria-invalid={!!fieldErrors.windowEnd}>
                {HOURS.slice(1).map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
              </select>
              {fieldErrors.windowEnd && <span className="mensajes__err">{fieldErrors.windowEnd}</span>}
            </label>
          </div>

          <div className="banner" style={{ marginTop: 4 }}>
            <p>
              {preview === null
                ? "Calculando destinatarios…"
                : preview.count === 0
                  ? "No hay contactos para esta audiencia."
                  : chosen.length === 0
                    ? `${preview.count} destinatario${preview.count === 1 ? "" : "s"} · marca al menos un número.`
                    : `${preview.count} destinatario${preview.count === 1 ? "" : "s"} · ≈ ${days} día${days === 1 ? "" : "s"} al ritmo de ${effectiveCap}/día entre ${chosen.length} número${chosen.length === 1 ? "" : "s"}.`}
            </p>
          </div>
        </div>
        <footer className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy || sessionIds.length === 0 || name.trim().length < 3 || messageTemplate.trim().length < 10 || (preview?.count ?? 0) === 0}>
            {busy ? "Creando…" : "Crear campaña (borrador)"}
          </button>
        </footer>
      </form>
    </div>
  );
}
