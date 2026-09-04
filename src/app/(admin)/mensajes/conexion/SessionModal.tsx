"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/admin/Icon";
import { useEscClose } from "@/lib/ui/useEscClose";
import type { ActionResult, SessionInput, SessionRow } from "../types";

/** Alta y edición de un número. El vínculo con WhatsApp (QR) se hace luego, desde la tarjeta. */
export function SessionModal({
  session,
  onClose,
  onSubmit,
}: {
  session: SessionRow | null; // null = alta
  onClose: () => void;
  onSubmit: (input: SessionInput) => Promise<ActionResult<unknown>>;
}) {
  const [label, setLabel] = useState(session?.label ?? "");
  const [dailyCap, setDailyCap] = useState(session?.dailyCap ?? 150);
  const [busy, setBusy] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  useEscClose(true, onClose, busy);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setTopError(null);
    setFieldErrors({});
    const res = await onSubmit({ label, dailyCap });
    if (!res.ok) {
      setTopError(res.error);
      setFieldErrors(res.fieldErrors ?? {});
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <header className="modal__head">
          <h2>{session ? "Editar número" : "Añadir número de WhatsApp"}</h2>
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

          <label className="field">
            <span className="field__label">Nombre visible<span className="field__req">*</span></span>
            <input
              type="text"
              autoFocus
              value={label}
              maxLength={40}
              placeholder="Número principal"
              onChange={(e) => setLabel(e.target.value)}
              aria-invalid={!!fieldErrors.label}
            />
            <span className="mensajes__hint">Para reconocerlo en la lista y al crear campañas. El número real aparece al vincularlo.</span>
            {fieldErrors.label && <span className="mensajes__err">{fieldErrors.label}</span>}
          </label>

          <label className="field">
            <span className="field__label">Tope diario de este número</span>
            <input
              type="number"
              min={10}
              max={500}
              value={dailyCap}
              onChange={(e) => setDailyCap(Number(e.target.value))}
              aria-invalid={!!fieldErrors.dailyCap}
            />
            <span className="mensajes__hint">
              Cada número lleva su propia cuenta diaria. Manda el tope más bajo entre este y el de la campaña.
            </span>
            {fieldErrors.dailyCap && <span className="mensajes__err">{fieldErrors.dailyCap}</span>}
          </label>

          {!session && (
            <div className="banner" style={{ marginTop: 4 }}>
              <p>Al guardar, el número aparece como «Desconectado». Pulsa <strong>Conectar</strong> en su tarjeta para escanear el QR.</p>
            </div>
          )}
        </div>
        <footer className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy || label.trim().length < 3}>
            {busy ? "Guardando…" : session ? "Guardar cambios" : "Añadir número"}
          </button>
        </footer>
      </form>
    </div>
  );
}
