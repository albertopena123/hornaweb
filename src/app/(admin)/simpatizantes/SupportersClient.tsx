"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import "./simpatizantes.css";
import { Icon } from "@/components/admin/Icon";
import { ConfirmDialog } from "../usuarios/ConfirmDialog";
import { Toasts, type Toast } from "../usuarios/Toasts";
import { useEscClose } from "@/lib/ui/useEscClose";
import { formatFullDate } from "@/lib/ui/dates";
import { DISTRICTS, districtLabel, type DistrictId } from "@/lib/districts";
import {
  createSupporter,
  updateSupporter,
  setSupporterStatus,
  deleteSupporter,
} from "./actions";
import type { SupporterRow, SupporterInput, PermFlags, ActionResult } from "./types";

type Tab = "pending" | "approved" | "rejected";

const STATUS_BADGE: Record<Tab, string> = {
  pending: "badge badge--amber",
  approved: "badge badge--green",
  rejected: "badge badge--red",
};
const STATUS_LABEL: Record<Tab, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export function SupportersClient({ rows, perms }: { rows: SupporterRow[]; perms: PermFlags }) {
  const [tab, setTab] = useState<Tab>("pending");
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState<string>("");
  const [modal, setModal] = useState<null | { mode: "create" } | { mode: "edit"; row: SupporterRow }>(null);
  const [toDelete, setToDelete] = useState<SupporterRow | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, startTransition] = useTransition();

  function toast(kind: Toast["kind"], message: string) {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), kind, message }]);
  }

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.status === tab &&
        (district === "" || r.district === district) &&
        (term === "" || r.name.toLowerCase().includes(term)),
    );
  }, [rows, tab, q, district]);

  function run(action: () => Promise<ActionResult<unknown>>, okMsg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) toast("success", okMsg);
      else toast("error", res.error);
    });
  }

  return (
    <div className="supporters">
      <header className="supporters__head">
        <div>
          <h1>Simpatizantes</h1>
          <p className="supporters__sub">Apoyos registrados para el mapa por distrito</p>
        </div>
        {perms.canWrite && (
          <button className="btn btn--primary" onClick={() => setModal({ mode: "create" })}>
            <Icon name="plus" size={16} /> Registrar simpatizante
          </button>
        )}
      </header>

      <div className="supporters__tabs">
        {(["pending", "approved", "rejected"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`supporters__tab ${tab === t ? "is-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {STATUS_LABEL[t]} <span className="supporters__count">{counts[t]}</span>
          </button>
        ))}
      </div>

      <div className="supporters__filters">
        <input
          className="supporters__search"
          placeholder="Buscar por nombre…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="supporters__district"
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

      <div className="supporters__tablewrap">
        <table className="supporters__table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Distrito</th>
              <th>Teléfono</th>
              <th>Origen</th>
              <th>Registrado</th>
              <th>Estado</th>
              {perms.canWrite && <th></th>}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={perms.canWrite ? 7 : 6} className="supporters__empty">
                  Sin registros en esta vista.
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="supporters__name">{r.name}</div>
                  {r.notes && <div className="supporters__notes">{r.notes}</div>}
                </td>
                <td>{districtLabel(r.district as DistrictId)}</td>
                <td>{r.phone ?? "—"}</td>
                <td>
                  <span className="badge badge--neutral">
                    {r.source === "admin" ? "Equipo" : "Web"}
                  </span>
                </td>
                <td title={r.createdByName ?? undefined}>
                  {formatFullDate(new Date(r.createdAt))}
                </td>
                <td>
                  <span className={STATUS_BADGE[r.status]}>{STATUS_LABEL[r.status]}</span>
                </td>
                {perms.canWrite && (
                  <td>
                    <div className="supporters__actions">
                      {r.status === "pending" && (
                        <>
                          <button
                            className="btn btn--primary btn--sm"
                            disabled={pending}
                            onClick={() =>
                              run(() => setSupporterStatus(r.id, "approved"), "Apoyo aprobado.")
                            }
                          >
                            Aprobar
                          </button>
                          <button
                            className="btn btn--ghost btn--sm"
                            disabled={pending}
                            onClick={() =>
                              run(() => setSupporterStatus(r.id, "rejected"), "Apoyo rechazado.")
                            }
                          >
                            Rechazar
                          </button>
                        </>
                      )}
                      {r.status === "rejected" && (
                        <button
                          className="btn btn--ghost btn--sm"
                          disabled={pending}
                          onClick={() =>
                            run(() => setSupporterStatus(r.id, "approved"), "Apoyo aprobado.")
                          }
                        >
                          Aprobar
                        </button>
                      )}
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

      {modal && (
        <SupporterModal
          initial={modal.mode === "edit" ? modal.row : null}
          onClose={() => setModal(null)}
          onSubmit={async (input) => {
            const res =
              modal.mode === "edit"
                ? await updateSupporter(modal.row.id, input)
                : await createSupporter(input);
            if (res.ok) {
              toast(
                "success",
                modal.mode === "edit" ? "Simpatizante actualizado." : "Simpatizante registrado.",
              );
              setModal(null);
            }
            return res;
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Eliminar simpatizante"
          description={
            <>
              Se eliminará <strong>{toDelete.name}</strong>. Esta acción no se puede deshacer.
            </>
          }
          confirmLabel="Eliminar"
          tone="danger"
          busy={pending}
          onConfirm={async () => {
            await deleteSupporter(toDelete.id);
            toast("success", "Simpatizante eliminado.");
            setToDelete(null);
          }}
          onClose={() => setToDelete(null)}
        />
      )}

      <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}

function SupporterModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial: SupporterRow | null;
  onClose: () => void;
  onSubmit: (input: SupporterInput) => Promise<ActionResult<unknown>>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [district, setDistrict] = useState(initial?.district ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  useEscClose(true, onClose, busy);

  const errStyle = { color: "#b91c1c", fontSize: 12, marginTop: 4 } as const;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setTopError(null);
    setFieldErrors({});
    const res = await onSubmit({
      name,
      district,
      phone: phone || undefined,
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
          <h2>{initial ? "Editar simpatizante" : "Registrar simpatizante"}</h2>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="modal__body">
          {!initial && (
            <p className="modal__intro">
              Los registros del equipo nacen aprobados y suman de inmediato al mapa público.
            </p>
          )}

          {topError && (
            <div className="login__error" role="alert" style={{ marginBottom: 16 }}>
              <Icon name="info" size={16} />
              <span>{topError}</span>
            </div>
          )}

          <label className="field">
            <span className="field__label">
              Nombre completo<span className="field__req">*</span>
            </span>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name && <span style={errStyle}>{fieldErrors.name}</span>}
          </label>

          <label className="field">
            <span className="field__label">
              Distrito<span className="field__req">*</span>
            </span>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              aria-invalid={!!fieldErrors.district}
              required
            >
              <option value="" disabled>
                Elige un distrito…
              </option>
              {DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label} ({d.province})
                </option>
              ))}
            </select>
            {fieldErrors.district && <span style={errStyle}>{fieldErrors.district}</span>}
          </label>

          <label className="field">
            <span className="field__label">Teléfono (opcional)</span>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={15}
              aria-invalid={!!fieldErrors.phone}
            />
            {fieldErrors.phone && <span style={errStyle}>{fieldErrors.phone}</span>}
          </label>

          <label className="field">
            <span className="field__label">Notas (solo equipo)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </label>
        </div>
        <footer className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={busy || name.trim().length < 2 || district === ""}
          >
            {busy ? "Guardando…" : initial ? "Guardar cambios" : "Registrar"}
          </button>
        </footer>
      </form>
    </div>
  );
}
