"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Icon } from "@/components/admin/Icon";
import { ConfirmDialog } from "../../usuarios/ConfirmDialog";
import { Toasts, type Toast } from "../../usuarios/Toasts";
import { useEscClose } from "@/lib/ui/useEscClose";
import { DISTRICTS } from "@/lib/districts";
import {
  createPersonero,
  updatePersonero,
  deletePersonero,
  notifyPersoneroWhatsApp,
  notifyAllPendingWhatsApp,
} from "../actions";
import type {
  PersoneroRow,
  PersoneroInput,
  PermFlags,
  ActionResult,
  LocalOption,
} from "../types";
import {
  Users,
  Send,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Download,
  X,
  Printer,
} from "lucide-react";
import { CredentialA4Modal } from "./CredentialA4Modal";

type Props = {
  rows: PersoneroRow[];
  perms: PermFlags;
  locales: LocalOption[];
};

const DOC_LABEL: Record<string, string> = {
  dni: "DNI",
  ce: "Carné Ext.",
  passport: "Pasaporte",
};

export function DirectorioView({ rows, perms, locales }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [personeroList, setPersoneroList] = useState<PersoneroRow[]>(rows);
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");

  const [modal, setModal] = useState<
    | { mode: "create"; prefillMesa?: string; prefillLocal?: string; prefillRole?: "titular" | "suplente" }
    | { mode: "edit"; row: PersoneroRow }
    | null
  >(null);
  const [selectedCredPersonero, setSelectedCredPersonero] = useState<PersoneroRow | null>(null);

  const [toDelete, setToDelete] = useState<PersoneroRow | null>(null);
  const [waModal, setWaModal] = useState(false);
  const [pending, startTransition] = useTransition();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);

  // Escuchar parámetros de URL como ?new=1 o ?wa=1
  useEffect(() => {
    if (searchParams.get("new") === "1" && perms.canWritePersoneros) {
      setModal({ mode: "create" });
    }
    if (searchParams.get("wa") === "1") {
      setWaModal(true);
    }
  }, [searchParams, perms.canWritePersoneros]);

  function toast(kind: Toast["kind"], message: string) {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, kind, message }]);
  }

  // Filtrar personeros
  const visible = useMemo(() => {
    const query = fold(q.trim());
    return personeroList.filter((r) => {
      if (district && r.district !== district) return false;
      if (roleFilter) {
        if (roleFilter === "titular" && (r.isSuplente || r.role === "suplente" || r.role === "general")) return false;
        if (roleFilter === "suplente" && !(r.isSuplente || r.role === "suplente")) return false;
        if (roleFilter === "general" && r.role !== "general") return false;
      }
      if (!query) return true;
      const haystack = fold(
        [r.name, r.docNumber, r.phone ?? "", r.localName, r.mesa ?? "", r.notes ?? ""].join(" ")
      );
      return haystack.includes(query);
    });
  }, [personeroList, q, district, roleFilter]);

  // Exportar a CSV
  function handleExportCSV() {
    const headers = [
      "DNI",
      "Nombres y Apellidos",
      "Celular",
      "Cargo",
      "Distrito",
      "Colegio",
      "Dirección Colegio",
      "Mesa",
      "Aula",
      "Coordinador Colegio",
      "Celular Coord",
      "Miembro Mesa ONPE",
      "Notificado WhatsApp",
    ];

    const csvRows = visible.map((p) => [
      `"${p.docNumber}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.phone || ""}"`,
      `"${p.role === "general" ? "General de Local" : p.isSuplente ? "Suplente" : "Titular"}"`,
      `"${p.district || ""}"`,
      `"${p.localName.replace(/"/g, '""')}"`,
      `"${(p.localAddress || "").replace(/"/g, '""')}"`,
      `"${p.mesa || ""}"`,
      `"${p.aula || ""}"`,
      `"${(p.coordinatorName || "").replace(/"/g, '""')}"`,
      `"${p.coordinatorPhone || ""}"`,
      `"${p.isMesaMember ? "SÍ" : "NO"}"`,
      `"${p.whatsappNotifiedAt ? "SÍ" : "NO"}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `personeros_ahora_nacion_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Notificar por WhatsApp a un personero individual
  async function handleSendWhatsApp(personeroId: string, personeroName: string) {
    setNotifyingId(personeroId);
    try {
      const origin = window.location.origin;
      const res = await notifyPersoneroWhatsApp(personeroId, origin);
      if (res.ok) {
        toast("success", `Notificación de credencial enviada a ${personeroName}`);
        setPersoneroList((prev) =>
          prev.map((p) => (p.id === personeroId ? { ...p, whatsappNotifiedAt: new Date().toISOString() } : p))
        );
      } else {
        toast("error", res.error || "No se pudo enviar el mensaje");
      }
    } finally {
      setNotifyingId(null);
    }
  }

  return (
    <div className="directorio-submodule" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Barra de Filtros y Búsqueda */}
      <div
        className="directorio-filter-bar"
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg, 12px)",
          padding: "12px 14px",
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
          <input
            className="personeros__search"
            placeholder="Buscar por nombre, DNI, mesa o colegio…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              width: "100%",
              background: "var(--bg-soft)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "8px 12px",
              fontSize: "13.5px",
            }}
          />
        </div>

        <select
          className="personeros__district"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            background: "var(--bg-soft)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "13.5px",
          }}
        >
          <option value="">Todos los cargos</option>
          <option value="titular">Personeros Titulares</option>
          <option value="suplente">Personeros Suplentes</option>
          <option value="general">Personeros Generales</option>
        </select>

        <select
          className="personeros__district"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          style={{
            background: "var(--bg-soft)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "13.5px",
          }}
        >
          <option value="">Todos los distritos</option>
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn btn--secondary"
          onClick={handleExportCSV}
          title="Descargar lista completa en formato CSV / Excel"
        >
          <Download size={14} />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Tabla de Personeros */}
      <div className="tablewrap density-comfy" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg, 12px)" }}>
        <div className="tablewrap__scroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>Nombre / DNI</th>
                <th>Cargo</th>
                <th>Colegio / Local</th>
                <th>Mesa de Sufragio</th>
                <th>Celular</th>
                <th>WhatsApp</th>
                <th>Credencial</th>
                {perms.canWritePersoneros && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={perms.canWritePersoneros ? 8 : 7} className="personeros__empty">
                    <Icon name="id-card" size={24} />
                    <span>No se encontraron personeros con los filtros seleccionados.</span>
                  </td>
                </tr>
              )}
              {visible.map((r) => {
                const credUrl = `/credencial/${r.credentialToken || r.id}`;
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="personeros__name-row">
                        <span className="personeros__name" style={{ fontWeight: 600, color: "var(--text)" }}>{r.name}</span>
                        {r.isMesaMember && (
                          <span className="badge badge--amber" title="Seleccionado por ONPE como miembro de mesa">
                            Miembro ONPE
                          </span>
                        )}
                      </div>
                      <span className="personeros__doc" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                        <span className="badge badge--neutral">{DOC_LABEL[r.docType]}</span>
                        <span className="personeros__doc-num" style={{ fontFamily: "monospace", color: "var(--text-muted)" }}>{r.docNumber}</span>
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          r.role === "general"
                            ? "badge--purple"
                            : r.isSuplente || r.role === "suplente"
                            ? "badge--amber"
                            : "badge--green"
                        }`}
                      >
                        {r.role === "general"
                          ? "General de Local"
                          : r.isSuplente || r.role === "suplente"
                          ? "Suplente de Mesa"
                          : "Titular de Mesa"}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{r.localName}</div>
                      {r.localAddress && <div className="personeros__notes" style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.localAddress}</div>}
                    </td>
                    <td>
                      {r.mesa ? (
                        <span className="personeros__mesa" style={{ fontWeight: 700, color: "var(--accent)" }}>Mesa {r.mesa}</span>
                      ) : (
                        <span className="badge badge--red">Sin mesa</span>
                      )}
                    </td>
                    <td>
                      {r.phone ? (
                        <span style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--text)" }}>{r.phone}</span>
                      ) : (
                        <span className="dtable__muted">—</span>
                      )}
                    </td>
                    <td>
                      {r.whatsappNotifiedAt ? (
                        <span className="wa-status-tag" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--st-resolved-fg, #10b981)", fontSize: 12, fontWeight: 600 }}>
                          <CheckCircle2 size={13} /> Notificado
                        </span>
                      ) : (
                        <span className="wa-status-tag wa-status-tag--pending" style={{ color: "var(--text-muted)", fontSize: 12 }}>Pendiente</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setSelectedCredPersonero(r)}
                        className="btn btn--xs btn--primary"
                        style={{ display: "inline-flex", alignItems: "center", gap: "5px", cursor: "pointer" }}
                        title="Ver y descargar credencial oficial A4 vertical en PDF (1 Hoja completa)"
                      >
                        <Download size={12} /> Credencial A4 (PDF)
                      </button>
                    </td>
                    {perms.canWritePersoneros && (
                      <td>
                        <div className="personeros__actions" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {r.phone && r.mesa && (
                            <button
                              type="button"
                              className="btn-wa-notify"
                              disabled={notifyingId === r.id}
                              onClick={() => handleSendWhatsApp(r.id, r.name)}
                              title="Enviar credencial y datos por WhatsApp"
                            >
                              <Send size={12} /> {notifyingId === r.id ? "..." : "WhatsApp"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="iconbtn"
                            title="Editar personero"
                            onClick={() => setModal({ mode: "edit", row: r })}
                          >
                            <Icon name="settings" size={16} />
                          </button>
                          <button
                            type="button"
                            className="iconbtn"
                            title="Eliminar personero"
                            onClick={() => setToDelete(r)}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="tablefoot" style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: 13, borderTop: "1px solid var(--border)" }}>
          <span>
            Mostrando <strong>{visible.length}</strong> de <strong>{personeroList.length}</strong> personeros registrados
          </span>
        </div>
      </div>

      {/* Modal de Registro / Edición */}
      {modal && (
        <PersoneroModal
          initial={modal.mode === "edit" ? modal.row : null}
          prefillMesa={modal.mode === "create" ? modal.prefillMesa : undefined}
          prefillLocal={modal.mode === "create" ? modal.prefillLocal : undefined}
          prefillRole={modal.mode === "create" ? modal.prefillRole : undefined}
          locales={locales}
          onClose={() => {
            setModal(null);
            if (searchParams.get("new")) {
              router.replace(pathname);
            }
          }}
          onSubmit={async (input) => {
            const origin = window.location.origin;
            const res =
              modal.mode === "edit"
                ? await updatePersonero(modal.row.id, input, origin)
                : await createPersonero(input, origin);
            if (res.ok) {
              toast("success", modal.mode === "edit" ? "Personero actualizado." : "Personero registrado.");
              setModal(null);
              if (searchParams.get("new")) {
                router.replace(pathname);
              }
              // Recargar lista local
              if (res.data) {
                if (modal.mode === "edit") {
                  setPersoneroList((prev) => prev.map((p) => (p.id === (res.data as any).id ? (res.data as any) : p)));
                } else {
                  setPersoneroList((prev) => [(res.data as any), ...prev]);
                }
              }
            }
            return res;
          }}
        />
      )}

      {/* Modal de Notificación Masiva por WhatsApp */}
      {waModal && (
        <WhatsAppBlastModal
          totalPersoneros={personeroList.length}
          notificados={personeroList.filter((p) => !!p.whatsappNotifiedAt).length}
          onClose={() => {
            setWaModal(false);
            if (searchParams.get("wa")) {
              router.replace(pathname);
            }
          }}
          onSuccess={(notifiedCount) => {
            toast("success", `Se enviaron ${notifiedCount} mensajes por WhatsApp con éxito.`);
            setWaModal(false);
            if (searchParams.get("wa")) {
              router.replace(pathname);
            }
          }}
        />
      )}

      {/* Diálogo de Confirmación para Eliminar */}
      {toDelete && (
        <ConfirmDialog
          title="Eliminar personero"
          description={
            <>
              Se eliminará a <strong>{toDelete.name}</strong> del padrón electoral. Esta acción no se puede deshacer.
            </>
          }
          confirmLabel="Eliminar"
          tone="danger"
          busy={pending}
          onConfirm={async () => {
            await deletePersonero(toDelete.id);
            setPersoneroList((prev) => prev.filter((p) => p.id !== toDelete.id));
            toast("success", "Personero eliminado.");
            setToDelete(null);
          }}
          onClose={() => setToDelete(null)}
        />
      )}

      {/* Modal de Credencial Oficial A4 Vertical (2 en 1: Original + Copia) */}
      {selectedCredPersonero && (
        <CredentialA4Modal
          personero={selectedCredPersonero}
          onClose={() => setSelectedCredPersonero(null)}
        />
      )}

      <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}

function fold(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function PersoneroModal({
  initial,
  prefillMesa,
  prefillLocal,
  prefillRole,
  locales,
  onClose,
  onSubmit,
}: {
  initial: PersoneroRow | null;
  prefillMesa?: string;
  prefillLocal?: string;
  prefillRole?: "titular" | "suplente";
  locales: LocalOption[];
  onClose: () => void;
  onSubmit: (input: PersoneroInput) => Promise<ActionResult<unknown>>;
}) {
  const [docType, setDocType] = useState<PersoneroInput["docType"]>(initial?.docType ?? "dni");
  const [docNumber, setDocNumber] = useState(initial?.docNumber ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [district, setDistrict] = useState(initial?.district ?? "");
  const [localName, setLocalName] = useState(initial?.localName ?? prefillLocal ?? "");
  const [localAddress, setLocalAddress] = useState(initial?.localAddress ?? "");
  const [mesa, setMesa] = useState(initial?.mesa ?? prefillMesa ?? "");
  const [aula, setAula] = useState(initial?.aula ?? "");
  const [role, setRole] = useState<string>(
    initial
      ? initial.role === "general"
        ? "general"
        : initial.isSuplente || initial.role === "suplente"
        ? "suplente"
        : "titular"
      : prefillRole || "titular"
  );
  const [coordinatorName, setCoordinatorName] = useState(initial?.coordinatorName ?? "Coordinación Central Ahora Nación");
  const [coordinatorPhone, setCoordinatorPhone] = useState(initial?.coordinatorPhone ?? "982136949");
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [active, setActive] = useState(initial?.active ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  useEscClose(true, onClose, busy);

  const [localOpen, setLocalOpen] = useState(false);

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
  }

  // Autocompletado de DNI
  const [dniLookup, setDniLookup] = useState<"idle" | "loading" | "found" | "notfound" | "error">("idle");
  const autoNameRef = useRef<string | null>(null);

  useEffect(() => {
    const doc = docNumber.trim();
    const eligible = !initial && docType === "dni" && /^\d{8}$/.test(doc);
    const ctrl = new AbortController();

    const t = setTimeout(async () => {
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
  }, [docNumber, docType, initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setTopError(null);
    setFieldErrors({});

    const res = await onSubmit({
      docType,
      docNumber: docNumber.trim(),
      name: name.trim(),
      phone: phone.trim() || undefined,
      district: district || undefined,
      localName: localName.trim(),
      localAddress: localAddress.trim() || undefined,
      mesa: mesa.trim(),
      aula: aula.trim() || undefined,
      role,
      isSuplente: role === "suplente",
      coordinatorName: coordinatorName.trim(),
      coordinatorPhone: coordinatorPhone.trim(),
      active,
      notes: notes.trim() || undefined,
      sendWhatsAppImmediately: sendWhatsApp,
    });

    setBusy(false);
    if (!res.ok) {
      setTopError(res.error);
      if (res.fieldErrors) setFieldErrors(res.fieldErrors);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal modal--medium">
        <div className="modal__head">
          <h3>{initial ? "Editar personero" : "Registrar personero"}</h3>
          <button type="button" className="iconbtn" onClick={onClose} disabled={busy}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal__body">
          {topError && <div className="banner banner--error">{topError}</div>}

          <div className="personeros__row">
            <label className="field">
              <span className="field__label">Tipo de documento</span>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as PersoneroInput["docType"])}
                disabled={busy}
              >
                <option value="dni">DNI</option>
                <option value="ce">Carné de Extranjería</option>
                <option value="passport">Pasaporte</option>
              </select>
            </label>

            <label className="field">
              <span className="field__label">Número</span>
              <input
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                maxLength={docType === "dni" ? 8 : 20}
                required
                disabled={busy}
              />
              {dniLookup === "loading" && <span className="field__hint">Consultando RENIEC…</span>}
              {dniLookup === "found" && <span className="field__hint" style={{ color: "#16a34a" }}>Nombre autocompletado por RENIEC</span>}
            </label>
          </div>

          <label className="field">
            <span className="field__label">Nombres y Apellidos</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required disabled={busy} />
          </label>

          <div className="personeros__row">
            <label className="field">
              <span className="field__label">Celular (WhatsApp)</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. 982136949"
                disabled={busy}
              />
            </label>

            <label className="field">
              <span className="field__label">Distrito</span>
              <select value={district} onChange={(e) => setDistrict(e.target.value)} disabled={busy}>
                <option value="">Seleccionar distrito</option>
                {DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="personeros__row">
            <div className="field combo">
              <span className="field__label">Colegio / Local de votación</span>
              <input
                value={localName}
                onChange={(e) => {
                  setLocalName(e.target.value);
                  setLocalOpen(true);
                }}
                onFocus={() => setLocalOpen(true)}
                required
                disabled={busy}
              />
              {localOpen && localSuggestions.length > 0 && (
                <ul className="combo__list">
                  {localSuggestions.map((l) => (
                    <li key={l.id} className="combo__item" onMouseDown={() => pickLocal(l)}>
                      <strong>{l.name}</strong>
                      <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)" }}>
                        {l.district} · {l.address}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label className="field">
              <span className="field__label">N° de Mesa</span>
              <input
                value={mesa}
                onChange={(e) => setMesa(e.target.value)}
                placeholder="Ej. 067412"
                maxLength={8}
                required
                disabled={busy}
              />
            </label>
          </div>

          <div className="personeros__row">
            <label className="field">
              <span className="field__label">Cargo Electoral</span>
              <select value={role} onChange={(e) => setRole(e.target.value)} disabled={busy}>
                <option value="titular">Personero Titular de Mesa</option>
                <option value="suplente">Personero Suplente de Mesa</option>
                <option value="general">Personero General de Colegio</option>
              </select>
            </label>
          </div>

          {!initial && phone.trim() !== "" && (
            <label className="field field--check" style={{ marginTop: 6 }}>
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                disabled={busy}
              />
              <span>Enviar credencial oficial con QR por WhatsApp inmediatamente</span>
            </label>
          )}

          <div className="modal__foot" style={{ marginTop: 14 }}>
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              {busy ? "Guardando…" : initial ? "Guardar cambios" : "Registrar personero"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WhatsAppBlastModal({
  totalPersoneros,
  notificados,
  onClose,
  onSuccess,
}: {
  totalPersoneros: number;
  notificados: number;
  onClose: () => void;
  onSuccess: (count: number) => void;
}) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendientes = Math.max(0, totalPersoneros - notificados);

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const origin = window.location.origin;
      const res = await notifyAllPendingWhatsApp(origin);
      if (res.ok) {
        onSuccess(res.data?.sentCount ?? 0);
      } else {
        setError(res.error || "Error al enviar las notificaciones.");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal modal--small">
        <div className="modal__head">
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Send size={18} className="text-green" /> Enviar Notificación WhatsApp
          </h3>
          <button type="button" className="iconbtn" onClick={onClose} disabled={sending}>
            <X size={18} />
          </button>
        </div>
        <div className="modal__body">
          {error && <div className="banner banner--error">{error}</div>}

          <p style={{ margin: "0 0 12px", fontSize: "14px", lineHeight: 1.5 }}>
            Se enviará un mensaje oficial de WhatsApp a todos los personeros registrados que aún tengan la notificación <strong>pendiente</strong>.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              padding: "12px",
              background: "var(--bg-soft)",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Ya notificados</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--st-resolved-fg, #10b981)" }}>{notificados}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Pendientes</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--st-triaged-fg, #f59e0b)" }}>{pendientes}</div>
            </div>
          </div>

          <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: 0 }}>
            El mensaje incluye su número de mesa, local de votación, contacto del coordinador de colegio y el enlace a su credencial con QR.
          </p>
        </div>

        <div className="modal__foot">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={sending}>
            Cancelar
          </button>
          <button type="button" className="btn btn--primary" onClick={handleSend} disabled={sending || pendientes === 0}>
            <Send size={14} />
            <span>{sending ? "Enviando mensajes…" : `Enviar a ${pendientes} personeros`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
