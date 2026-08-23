"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/admin/Icon";
import { useEscClose } from "@/lib/ui/useEscClose";
import { DISTRICTS } from "@/lib/districts";
import { downloadCsv } from "@/lib/ui/csv";
import {
  detectColumns,
  normalizeRows,
  IMPORT_BATCH_SIZE,
  type CellLike,
  type ColumnMapping,
} from "@/lib/messaging/normalize";
import { createImport, importContactsBatch, finishImport } from "./actions";
import type { ImportSummary } from "../types";

type Step = "file" | "map" | "importing" | "done";

const MAP_FIELDS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: "dni", label: "DNI", required: true },
  { key: "name", label: "Nombre(s)", required: true },
  { key: "paterno", label: "Apellido paterno (opcional)", required: false },
  { key: "materno", label: "Apellido materno (opcional)", required: false },
  { key: "phone", label: "Celular", required: true },
];

const EMPTY_MAPPING: ColumnMapping = { dni: null, name: null, phone: null, paterno: null, materno: null };

export function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: (s: ImportSummary, error: string | null) => void }) {
  const [step, setStep] = useState<Step>("file");
  const [reading, setReading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CellLike[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [district, setDistrict] = useState("");
  const [source, setSource] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const busy = reading || step === "importing";
  useEscClose(true, onClose, busy);

  const normalized = useMemo(
    () => (step === "file" ? null : normalizeRows(rows, mapping, district || undefined)),
    [rows, mapping, district, step],
  );

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setReading(true);
    try {
      const { readSheet } = await import("read-excel-file/browser");
      const data = await readSheet(file);
      if (data.length < 2) {
        setError("El archivo no tiene filas de datos (se espera una fila de cabecera y al menos una de datos).");
        return;
      }
      const hdr = data[0].map((c) => (c === null || c === undefined ? "" : String(c)));
      setHeaders(hdr);
      setRows(data.slice(1) as unknown as CellLike[][]);
      setMapping(detectColumns(hdr));
      setFileName(file.name);
      setStep("map");
    } catch {
      setError("No se pudo leer el archivo. ¿Es un .xlsx válido?");
    } finally {
      setReading(false);
    }
  }

  async function runImport() {
    if (!normalized) return;
    setError(null);
    setFieldErrors({});
    const fe: Record<string, string> = {};
    if (mapping.dni === null) fe.dni = "Elige la columna del DNI.";
    if (mapping.name === null) fe.name = "Elige la columna del nombre.";
    if (mapping.phone === null) fe.phone = "Elige la columna del celular.";
    if (source.trim().length < 3) fe.source = "Indica el origen de la lista.";
    if (!consent) fe.consentConfirmed = "Debes confirmar el consentimiento.";
    if (Object.keys(fe).length) {
      setFieldErrors(fe);
      return;
    }
    if (normalized.valid.length === 0) {
      setError("No hay filas válidas para importar.");
      return;
    }
    setStep("importing");
    setProgress({ done: 0, total: normalized.valid.length });
    const created = await createImport({
      fileName,
      source: source.trim(),
      consentConfirmed: consent,
      totalRows: normalized.totalRows,
      invalid: normalized.invalid.length,
      duplicatedInFile: normalized.duplicatedInFile,
    });
    if (!created.ok) {
      setError(created.error);
      setFieldErrors(created.fieldErrors ?? {});
      setStep("map");
      return;
    }
    const importId = created.data!.importId;
    const total = normalized.valid.length;
    let done = 0;
    let failed: string | null = null;
    for (let i = 0; i < total; i += IMPORT_BATCH_SIZE) {
      const batch = normalized.valid.slice(i, i + IMPORT_BATCH_SIZE);
      const res = await importContactsBatch(importId, batch);
      if (!res.ok) {
        failed = `${res.error} Se importaron ${done} de ${total} filas.`;
        break;
      }
      done += batch.length;
      setProgress({ done, total });
    }
    // Cerrar siempre la importación (aunque un lote haya fallado) para no dejar ContactImport abiertos.
    const fin = await finishImport(importId);
    if (!fin.ok) {
      setError(fin.error);
      setStep("map");
      return;
    }
    setSummary(fin.data!);
    setStep("done");
    if (failed) setError(failed);
    onDone(fin.data!, failed);
  }

  function exportInvalid() {
    if (!normalized) return;
    downloadCsv(
      `filas-invalidas-${fileName.replace(/\.xlsx$/i, "")}.csv`,
      ["Fila", "DNI", "Nombre", "Celular", "Motivo"],
      normalized.invalid.map((r) => [r.row, r.docNumber, r.name, r.phone, r.reason]),
    );
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div className="modal mensajes__modal--wide" onClick={(e) => e.stopPropagation()}>
        <header className="modal__head">
          <h2>Importar contactos desde Excel</h2>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Cerrar" disabled={busy}>
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="modal__body">
          <div className="mensajes__steps">
            <span className={step === "file" ? "is-active" : ""}>1. Archivo</span>
            <span>›</span>
            <span className={step === "map" ? "is-active" : ""}>2. Columnas y revisión</span>
            <span>›</span>
            <span className={step === "importing" || step === "done" ? "is-active" : ""}>3. Importar</span>
          </div>

          {error && (
            <div className="login__error" role="alert" style={{ marginBottom: 12 }}>
              <Icon name="info" size={16} />
              <span>{error}</span>
            </div>
          )}

          {step === "file" && (
            <label className="mensajes__dropzone">
              <input type="file" accept=".xlsx" onChange={(e) => onFile(e.target.files?.[0])} disabled={reading} />
              <Icon name="download" size={22} />
              <div style={{ marginTop: 8 }}>{reading ? "Leyendo archivo…" : "Haz clic para elegir un archivo .xlsx"}</div>
              <div className="mensajes__hint">
                La primera fila debe ser la cabecera (DNI, Nombre, Celular…). El archivo no se sube: se procesa en tu navegador.
              </div>
            </label>
          )}

          {step === "map" && normalized && (
            <>
              <p className="mensajes__hint" style={{ marginTop: 0 }}>
                <strong>{fileName}</strong> · {normalized.totalRows} filas con datos
              </p>
              <div className="mensajes__row mensajes__row--3">
                {MAP_FIELDS.map((f) => (
                  <label className="field" key={f.key}>
                    <span className="field__label">
                      {f.label}
                      {f.required && <span className="field__req">*</span>}
                    </span>
                    <select
                      value={mapping[f.key] === null ? "" : String(mapping[f.key])}
                      onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value === "" ? null : Number(e.target.value) })}
                      aria-invalid={!!fieldErrors[f.key]}
                    >
                      <option value="">— No usar —</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Columna ${i + 1}`}
                        </option>
                      ))}
                    </select>
                    {fieldErrors[f.key] && <span className="mensajes__err">{fieldErrors[f.key]}</span>}
                  </label>
                ))}
                <label className="field">
                  <span className="field__label">Distrito (para todo el archivo)</span>
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

              <div className="mensajes__stats" style={{ margin: "12px 0" }}>
                <div className="mensajes__statcard stat"><div className="stat__v">{normalized.valid.length}</div><div className="stat__l">Válidas</div></div>
                <div className="mensajes__statcard stat"><div className="stat__v">{normalized.invalid.length}</div><div className="stat__l">Inválidas</div></div>
                <div className="mensajes__statcard stat"><div className="stat__v">{normalized.duplicatedInFile}</div><div className="stat__l">DNI repetidos</div></div>
              </div>

              <div className="tablewrap density-compact">
                <div className="tablewrap__scroll">
                  <table className="dtable mensajes__table-sm">
                    <thead>
                      <tr><th>DNI</th><th>Nombre</th><th>Celular</th><th>Estado</th></tr>
                    </thead>
                    <tbody>
                      {normalized.valid.slice(0, 8).map((r) => (
                        <tr key={`v-${r.docNumber}`}>
                          <td className="mensajes__mono">{r.docNumber}</td>
                          <td>{r.name}</td>
                          <td className="mensajes__mono">{r.phone}</td>
                          <td><span className="badge badge--green">OK</span></td>
                        </tr>
                      ))}
                      {normalized.invalid.slice(0, 8).map((r) => (
                        <tr key={`i-${r.row}`}>
                          <td className="mensajes__mono">{r.docNumber || "—"}</td>
                          <td>{r.name || "—"}</td>
                          <td className="mensajes__mono">{r.phone || "—"}</td>
                          <td><span className="badge badge--red">Fila {r.row}: {r.reason}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="tablefoot">
                  <span>Vista previa (hasta 8 válidas y 8 inválidas)</span>
                  {normalized.invalid.length > 0 && (
                    <button className="linkbtn" type="button" onClick={exportInvalid}>Descargar inválidas (CSV)</button>
                  )}
                </div>
              </div>

              <label className="field" style={{ marginTop: 12 }}>
                <span className="field__label">Origen de la lista<span className="field__req">*</span></span>
                <input
                  type="text"
                  maxLength={120}
                  placeholder="Ej. Inscritos en la feria de Puerto Maldonado, 10/08/2026"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  aria-invalid={!!fieldErrors.source}
                />
                {fieldErrors.source && <span className="mensajes__err">{fieldErrors.source}</span>}
              </label>
              <label className="field field--check">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>Confirmo que estas personas autorizaron recibir mensajes de la campaña (Ley 29733).</span>
              </label>
              {fieldErrors.consentConfirmed && <span className="mensajes__err">{fieldErrors.consentConfirmed}</span>}
            </>
          )}

          {step === "importing" && (
            <div>
              <p>Importando {progress.done} de {progress.total} contactos…</p>
              <div className="mensajes__progress">
                <span className="is-delivered" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          {step === "done" && summary && (
            <div className="mensajes__stats">
              <div className="mensajes__statcard stat"><div className="stat__v">{summary.inserted}</div><div className="stat__l">Nuevos</div></div>
              <div className="mensajes__statcard stat"><div className="stat__v">{summary.updated}</div><div className="stat__l">Actualizados</div></div>
              <div className="mensajes__statcard stat"><div className="stat__v">{summary.invalid}</div><div className="stat__l">Inválidos</div></div>
              <div className="mensajes__statcard stat"><div className="stat__v">{summary.duplicatedInFile}</div><div className="stat__l">Repetidos</div></div>
            </div>
          )}
        </div>
        <footer className="modal__foot">
          {step === "map" && (
            <button type="button" className="btn btn--ghost" onClick={() => { setStep("file"); setError(null); }}>
              Cambiar archivo
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            {step === "done" ? "Cerrar" : "Cancelar"}
          </button>
          {step === "map" && (
            <button type="button" className="btn btn--primary" onClick={runImport} disabled={busy || !normalized || normalized.valid.length === 0}>
              Importar {normalized?.valid.length ?? 0} contactos
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
