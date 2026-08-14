"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import "./personeros.css";
import { Icon } from "@/components/admin/Icon";
import { ConfirmDialog } from "../usuarios/ConfirmDialog";
import { Toasts, type Toast } from "../usuarios/Toasts";
import { useEscClose } from "@/lib/ui/useEscClose";
import { DISTRICTS, districtLabel, type DistrictId } from "@/lib/districts";
import {
  createPersonero,
  updatePersonero,
  deletePersonero,
  setPersoneroActive,
} from "./actions";
import type { PersoneroRow, PersoneroInput, PermFlags, ActionResult, LocalOption } from "./types";

const DOC_TYPES = [
  { id: "dni", label: "DNI" },
  { id: "ce", label: "Carné de Extranjería" },
  { id: "passport", label: "Pasaporte" },
] as const;

const DOC_LABEL: Record<PersoneroRow["docType"], string> = {
  dni: "DNI",
  ce: "CE",
  passport: "Pasaporte",
};

export function PersonerosClient({
  rows,
  perms,
  locales,
}: {
  rows: PersoneroRow[];
  perms: PermFlags;
  locales: LocalOption[];
}) {
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState<string>("");
  const [modal, setModal] = useState<null | { mode: "create" } | { mode: "edit"; row: PersoneroRow }>(null);
  const [toDelete, setToDelete] = useState<PersoneroRow | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, startTransition] = useTransition();

  function toast(kind: Toast["kind"], message: string) {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), kind, message }]);
  }

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (district === "" || r.district === district) &&
        (term === "" ||
          r.name.toLowerCase().includes(term) ||
          r.docNumber.toLowerCase().includes(term)),
    );
  }, [rows, q, district]);

  function run(action: () => Promise<ActionResult<unknown>>, okMsg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) toast("success", okMsg);
      else toast("error", res.error);
    });
  }

  return (
    <div className="personeros">
      <header className="personeros__head">
        <div>
          <h1>Personeros</h1>
          <p className="personeros__sub">Asignaciones de mesa para el día de la elección</p>
        </div>
        {perms.canWrite && (
          <button className="btn btn--primary" onClick={() => setModal({ mode: "create" })}>
            <Icon name="plus" size={16} /> Registrar personero
          </button>
        )}
      </header>

      <div className="personeros__filters">
        <input
          className="personeros__search"
          placeholder="Buscar por nombre o documento…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="personeros__district"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
        >
          <option value="">Todos los distritos</option>
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div className="tablewrap density-comfy">
        <div className="tablewrap__scroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Documento</th>
                <th>Distrito</th>
                <th>Local</th>
                <th>Mesa</th>
                <th>Coordinador</th>
                <th>Estado</th>
                {perms.canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={perms.canWrite ? 8 : 7} className="personeros__empty">
                    <Icon name="id-card" size={22} />
                    <span>No hay personeros con estos filtros.</span>
                  </td>
                </tr>
              )}
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="personeros__name">{r.name}</div>
                    {r.notes && <div className="personeros__notes">{r.notes}</div>}
                  </td>
                  <td>
                    <span className="personeros__doc">
                      <span className="badge badge--neutral">{DOC_LABEL[r.docType]}</span>
                      <span className="personeros__doc-num">{r.docNumber}</span>
                    </span>
                  </td>
                  <td>{r.district ? districtLabel(r.district as DistrictId) : <span className="dtable__muted">—</span>}</td>
                  <td>
                    <div>{r.localName}</div>
                    {r.localAddress && <div className="personeros__notes">{r.localAddress}</div>}
                  </td>
                  <td className="personeros__mesa">{r.mesa}</td>
                  <td>
                    <div>{r.coordinatorName}</div>
                    <div className="personeros__notes">{r.coordinatorPhone}</div>
                  </td>
                  <td>
                    <span className={`badge ${r.active ? "badge--green" : "badge--red"}`}>
                      {r.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  {perms.canWrite && (
                    <td>
                      <div className="personeros__actions">
                        <button
                          className="btn btn--ghost btn--sm"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () => setPersoneroActive(r.id, !r.active),
                              r.active ? "Personero desactivado." : "Personero activado.",
                            )
                          }
                        >
                          {r.active ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          className="iconbtn"
                          title="Editar"
                          onClick={() => setModal({ mode: "edit", row: r })}
                        >
                          <Icon name="settings" size={16} />
                        </button>
                        <button className="iconbtn" title="Eliminar" onClick={() => setToDelete(r)}>
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tablefoot">
          <span>
            {visible.length} de {rows.length} personero{rows.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {modal && (
        <PersoneroModal
          initial={modal.mode === "edit" ? modal.row : null}
          locales={locales}
          onClose={() => setModal(null)}
          onSubmit={async (input) => {
            const res =
              modal.mode === "edit"
                ? await updatePersonero(modal.row.id, input)
                : await createPersonero(input);
            if (res.ok) {
              toast("success", modal.mode === "edit" ? "Personero actualizado." : "Personero registrado.");
              setModal(null);
            }
            return res;
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Eliminar personero"
          description={
            <>
              Se eliminará <strong>{toDelete.name}</strong>. Esta acción no se puede deshacer.
            </>
          }
          confirmLabel="Eliminar"
          tone="danger"
          busy={pending}
          onConfirm={async () => {
            await deletePersonero(toDelete.id);
            toast("success", "Personero eliminado.");
            setToDelete(null);
          }}
          onClose={() => setToDelete(null)}
        />
      )}

      <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}

// Normaliza para buscar sin distinguir tildes/mayúsculas.
function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function PersoneroModal({
  initial,
  locales,
  onClose,
  onSubmit,
}: {
  initial: PersoneroRow | null;
  locales: LocalOption[];
  onClose: () => void;
  onSubmit: (input: PersoneroInput) => Promise<ActionResult<unknown>>;
}) {
  const [docType, setDocType] = useState<PersoneroInput["docType"]>(initial?.docType ?? "dni");
  const [docNumber, setDocNumber] = useState(initial?.docNumber ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [district, setDistrict] = useState(initial?.district ?? "");
  const [localName, setLocalName] = useState(initial?.localName ?? "");
  const [localAddress, setLocalAddress] = useState(initial?.localAddress ?? "");
  const [mesa, setMesa] = useState(initial?.mesa ?? "");
  const [coordinatorName, setCoordinatorName] = useState(initial?.coordinatorName ?? "");
  const [coordinatorPhone, setCoordinatorPhone] = useState(initial?.coordinatorPhone ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  useEscClose(true, onClose, busy);

  // Combobox de local: sugiere colegios del padrón MINEDU y autorrellena
  // dirección y distrito al elegir. Sigue aceptando texto libre.
  const [localOpen, setLocalOpen] = useState(false);
  const [localIdx, setLocalIdx] = useState(-1);

  const localSuggestions = useMemo(() => {
    const term = fold(localName.trim());
    if (term.length < 2) return [];
    const inDistrict = (l: LocalOption) => district === "" || l.district === district;
    return locales
      .filter((l) => inDistrict(l) && (fold(l.name).includes(term) || fold(l.locality ?? "").includes(term)))
      .slice(0, 8);
  }, [locales, localName, district]);

  function pickLocal(l: LocalOption) {
    setLocalName(l.name);
    if (l.address) setLocalAddress(l.address);
    setDistrict(l.district);
    setLocalOpen(false);
    setLocalIdx(-1);
  }

  const errStyle = { color: "#b91c1c", fontSize: 12, marginTop: 4 } as const;
  const hintMuted = { color: "#7a8699", fontSize: 12, marginTop: 4 } as const;
  const hintOk = { color: "#15803d", fontSize: 12, marginTop: 4 } as const;

  // Autorellenado por DNI (solo al registrar): al completar 8 dígitos consulta
  // /api/dni/:dni (proxy propio) y llena el nombre completo. No sobreescribe un
  // nombre escrito a mano; solo actualiza si está vacío o fue autorellenado.
  const [dniLookup, setDniLookup] = useState<
    "idle" | "loading" | "found" | "notfound" | "error"
  >("idle");
  const autoNameRef = useRef<string | null>(null);

  useEffect(() => {
    const doc = docNumber.trim();
    const eligible = !initial && docType === "dni" && /^\d{8}$/.test(doc);
    const ctrl = new AbortController();
    // Todas las actualizaciones de estado ocurren dentro del callback diferido
    // (nunca de forma síncrona en el cuerpo del efecto).
    const t = setTimeout(async () => {
      // Al cambiar el DNI, limpia el nombre si fue autorellenado antes (no toca
      // lo que el usuario escribió a mano), para no arrastrar datos del DNI
      // anterior cuando el nuevo no resuelva.
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
  }, [docType, docNumber, initial]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setTopError(null);
    setFieldErrors({});
    const res = await onSubmit({
      docType,
      docNumber,
      name,
      district: district || undefined,
      localName,
      localAddress: localAddress || undefined,
      mesa,
      coordinatorName,
      coordinatorPhone,
      active,
      notes: notes || undefined,
    });
    if (!res.ok) {
      setTopError(res.error);
      setFieldErrors(res.fieldErrors ?? {});
    }
    setBusy(false);
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <header className="modal__head">
          <h2>{initial ? "Editar personero" : "Registrar personero"}</h2>
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

          <div className="personeros__row">
            <label className="field">
              <span className="field__label">Tipo de documento</span>
              <select value={docType} onChange={(e) => setDocType(e.target.value as PersoneroInput["docType"])}>
                {DOC_TYPES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">
                N° de documento<span className="field__req">*</span>
              </span>
              <input
                type="text"
                inputMode={docType === "dni" ? "numeric" : "text"}
                maxLength={docType === "dni" ? 8 : 12}
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                aria-invalid={!!fieldErrors.docNumber}
              />
              {fieldErrors.docNumber && <span style={errStyle}>{fieldErrors.docNumber}</span>}
            </label>
          </div>

          <label className="field">
            <span className="field__label">
              Nombre completo<span className="field__req">*</span>
            </span>
            <input
              type="text"
              autoFocus
              value={name}
              maxLength={120}
              placeholder={dniLookup === "loading" ? "Buscando datos…" : undefined}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!fieldErrors.name}
            />
            {dniLookup === "loading" && <span style={hintMuted}>Consultando DNI…</span>}
            {dniLookup === "found" && <span style={hintOk}>✓ Datos encontrados con el DNI</span>}
            {dniLookup === "notfound" && (
              <span style={hintMuted}>No encontramos el DNI, escribe el nombre.</span>
            )}
            {dniLookup === "error" && (
              <span style={hintMuted}>No se pudo consultar el DNI, escribe el nombre.</span>
            )}
            {fieldErrors.name && <span style={errStyle}>{fieldErrors.name}</span>}
          </label>

          <label className="field">
            <span className="field__label">Distrito</span>
            <select value={district} onChange={(e) => setDistrict(e.target.value)} aria-invalid={!!fieldErrors.district}>
              <option value="">Sin distrito</option>
              {DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label} ({d.province})
                </option>
              ))}
            </select>
            {fieldErrors.district && <span style={errStyle}>{fieldErrors.district}</span>}
          </label>

          <div className="field">
            <span className="field__label">
              Local / Colegio<span className="field__req">*</span>
            </span>
            <div className="combo">
              <input
                type="text"
                role="combobox"
                aria-expanded={localOpen && localSuggestions.length > 0}
                aria-autocomplete="list"
                aria-controls="local-listbox"
                placeholder="Escribe para buscar en el padrón…"
                value={localName}
                maxLength={120}
                onChange={(e) => {
                  setLocalName(e.target.value);
                  setLocalOpen(true);
                  setLocalIdx(-1);
                }}
                onFocus={() => setLocalOpen(true)}
                onBlur={() => {
                  // Deja pasar el click en una opción antes de cerrar.
                  setTimeout(() => setLocalOpen(false), 150);
                }}
                onKeyDown={(e) => {
                  if (!localOpen || localSuggestions.length === 0) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setLocalIdx((i) => (i + 1) % localSuggestions.length);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setLocalIdx((i) => (i <= 0 ? localSuggestions.length - 1 : i - 1));
                  } else if (e.key === "Enter" && localIdx >= 0) {
                    e.preventDefault();
                    pickLocal(localSuggestions[localIdx]);
                  } else if (e.key === "Escape") {
                    setLocalOpen(false);
                  }
                }}
                aria-invalid={!!fieldErrors.localName}
              />
              {localOpen && localSuggestions.length > 0 && (
                <ul className="combo__list" id="local-listbox" role="listbox">
                  {localSuggestions.map((l, i) => (
                    <li
                      key={l.id}
                      role="option"
                      aria-selected={i === localIdx}
                      className={`combo__opt${i === localIdx ? " is-active" : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pickLocal(l);
                      }}
                      onMouseEnter={() => setLocalIdx(i)}
                    >
                      <span className="combo__name">{l.name}</span>
                      <span className="combo__meta">
                        {districtLabel(l.district as DistrictId)}
                        {l.locality ? ` · ${l.locality}` : ""}
                        {l.address ? ` · ${l.address}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <span style={hintMuted}>
              Elige un colegio del padrón (autorrellena dirección y distrito) o escribe otro local.
            </span>
            {fieldErrors.localName && <span style={errStyle}>{fieldErrors.localName}</span>}
          </div>

          <label className="field">
            <span className="field__label">Dirección del local</span>
            <input type="text" value={localAddress} maxLength={200} onChange={(e) => setLocalAddress(e.target.value)} />
          </label>

          <label className="field">
            <span className="field__label">
              Número de mesa<span className="field__req">*</span>
            </span>
            <input type="text" value={mesa} maxLength={10} onChange={(e) => setMesa(e.target.value)} aria-invalid={!!fieldErrors.mesa} />
            {fieldErrors.mesa && <span style={errStyle}>{fieldErrors.mesa}</span>}
          </label>

          <div className="personeros__row">
            <label className="field">
              <span className="field__label">
                Coordinador de local<span className="field__req">*</span>
              </span>
              <input type="text" value={coordinatorName} maxLength={120} onChange={(e) => setCoordinatorName(e.target.value)} aria-invalid={!!fieldErrors.coordinatorName} />
              {fieldErrors.coordinatorName && <span style={errStyle}>{fieldErrors.coordinatorName}</span>}
            </label>
            <label className="field">
              <span className="field__label">
                Teléfono coordinador<span className="field__req">*</span>
              </span>
              <input type="tel" inputMode="tel" value={coordinatorPhone} maxLength={15} onChange={(e) => setCoordinatorPhone(e.target.value)} aria-invalid={!!fieldErrors.coordinatorPhone} />
              {fieldErrors.coordinatorPhone && <span style={errStyle}>{fieldErrors.coordinatorPhone}</span>}
            </label>
          </div>

          <label className="field field--check">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span>Activo (visible en la consulta pública)</span>
          </label>

          <label className="field">
            <span className="field__label">Notas (internas)</span>
            <textarea value={notes} maxLength={500} rows={2} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        <footer className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={busy || name.trim().length < 2 || localName.trim().length < 2 || mesa.trim() === "" || coordinatorName.trim().length < 2 || coordinatorPhone.trim() === "" || docNumber.trim() === ""}
          >
            {busy ? "Guardando…" : initial ? "Guardar cambios" : "Registrar"}
          </button>
        </footer>
      </form>
    </div>
  );
}
