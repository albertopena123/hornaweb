"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/admin/Icon";
import { useEscClose } from "@/lib/ui/useEscClose";
import { DISTRICTS } from "@/lib/districts";
import { SOURCE_MAX, validateManualContact } from "@/lib/messaging/normalize";
import { createContact } from "./actions";

export function ContactModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [docNumber, setDocNumber] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("");
  const [source, setSource] = useState("Alta manual");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  useEscClose(true, onClose, busy);

  // Autorellenado por DNI: al completar 8 digitos consulta /api/dni/:dni (proxy
  // propio, que es quien guarda el token) y llena el nombre. No sobreescribe un
  // nombre escrito a mano; solo actualiza si esta vacio o lo puso el autorelleno.
  const [dniLookup, setDniLookup] = useState<"idle" | "loading" | "found" | "notfound" | "error">("idle");
  const autoNameRef = useRef<string | null>(null);

  useEffect(() => {
    const doc = docNumber.trim();
    const eligible = /^\d{8}$/.test(doc);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      // Al cambiar el DNI, descarta el nombre que puso el autorrelleno anterior
      // para no arrastrar datos del DNI previo si el nuevo no resuelve.
      const auto = autoNameRef.current;
      setName((prev) => (auto !== null && prev === auto ? "" : prev));
      autoNameRef.current = null;

      if (!eligible) {
        setDniLookup("idle");
        return;
      }
      setDniLookup("loading");
      try {
        const res = await fetch(`/api/dni/${doc}`, { signal: ctrl.signal });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.ok && typeof json.name === "string" && json.name) {
          setName((prev) => (prev.trim() === "" ? json.name : prev));
          autoNameRef.current = json.name;
          setDniLookup("found");
        } else {
          setDniLookup(res.status === 404 ? "notfound" : "error");
        }
      } catch {
        if (!ctrl.signal.aborted) setDniLookup("error");
      }
    }, eligible ? 350 : 0);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [docNumber]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const input = { docNumber, name, phone, district: district || undefined, source, consentConfirmed: consent };
    // Validación local con las mismas reglas del servidor: evita un viaje si algo falta.
    const local = validateManualContact(input);
    if (!local.data) {
      setTopError("Revisa los campos marcados.");
      setFieldErrors(local.fieldErrors ?? {});
      return;
    }
    setBusy(true);
    setTopError(null);
    setFieldErrors({});
    const res = await createContact(input);
    setBusy(false);
    if (!res.ok) {
      setTopError(res.error);
      setFieldErrors(res.fieldErrors ?? {});
      return;
    }
    onCreated();
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <header className="modal__head">
          <h2>Nuevo contacto</h2>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Cerrar" disabled={busy}>
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
            <span className="field__label">DNI<span className="field__req">*</span></span>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={8}
              placeholder="12345678"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              aria-invalid={!!fieldErrors.docNumber}
            />
            {fieldErrors.docNumber && <span className="mensajes__err">{fieldErrors.docNumber}</span>}
          </label>

          <label className="field">
            <span className="field__label">Nombre completo<span className="field__req">*</span></span>
            <input
              type="text"
              maxLength={120}
              placeholder={dniLookup === "loading" ? "Buscando datos…" : "PEREZ GOMEZ JUAN CARLOS"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!fieldErrors.name}
            />
            {dniLookup === "loading" && <span className="mensajes__hint">Consultando DNI…</span>}
            {dniLookup === "found" && <span className="mensajes__hint mensajes__hint--ok">✓ Datos encontrados con el DNI</span>}
            {dniLookup === "notfound" && <span className="mensajes__hint">No encontramos el DNI, escribe el nombre.</span>}
            {dniLookup === "error" && <span className="mensajes__hint">No se pudo consultar el DNI, escribe el nombre.</span>}
            {fieldErrors.name && <span className="mensajes__err">{fieldErrors.name}</span>}
          </label>

          <div className="mensajes__row">
            <label className="field">
              <span className="field__label">Celular<span className="field__req">*</span></span>
              <input
                type="tel"
                inputMode="tel"
                maxLength={20}
                placeholder="987654321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={!!fieldErrors.phone}
              />
              <span className="mensajes__hint">Se guarda como +519XXXXXXXX.</span>
              {fieldErrors.phone && <span className="mensajes__err">{fieldErrors.phone}</span>}
            </label>
            <label className="field">
              <span className="field__label">Distrito</span>
              <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                <option value="">Sin distrito</option>
                {DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span className="field__label">Origen<span className="field__req">*</span></span>
            <input
              type="text"
              maxLength={SOURCE_MAX}
              placeholder="Ej. Ficha entregada en la feria, 10/08/2026"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              aria-invalid={!!fieldErrors.source}
            />
            {fieldErrors.source && <span className="mensajes__err">{fieldErrors.source}</span>}
          </label>

          <label className="field field--check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>Confirmo que esta persona autorizó recibir mensajes de la campaña (Ley 29733).</span>
          </label>
          {fieldErrors.consentConfirmed && <span className="mensajes__err">{fieldErrors.consentConfirmed}</span>}
        </div>
        <footer className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? "Guardando…" : "Guardar contacto"}
          </button>
        </footer>
      </form>
    </div>
  );
}
