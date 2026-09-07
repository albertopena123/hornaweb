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
  setPublicRegistration,
  notifyPersoneroWhatsApp,
  notifyAllPendingWhatsApp,
  assignPersoneroToMesa,
} from "./actions";
import type {
  PersoneroRow,
  PersoneroInput,
  PermFlags,
  ActionResult,
  LocalOption,
  ElectoralLocalData,
} from "./types";
import { CoverageMap } from "./CoverageMap";
import { MesasView } from "./MesasView";
import Link from "next/link";
import {
  Map,
  Vote,
  Users,
  Send,
  ExternalLink,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Check,
  Sparkles,
  Tv,
  CheckCheck,
  FileText,
  UserCheck,
} from "lucide-react";

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
  electoralLocales,
  publicRegistration,
}: {
  rows: PersoneroRow[];
  perms: PermFlags;
  locales: LocalOption[];
  electoralLocales: ElectoralLocalData[];
  publicRegistration: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"map" | "mesas" | "list">("map");
  const [q, setQ] = useState("");
  const [district, setDistrict] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [modal, setModal] = useState<
    | null
    | { mode: "create"; prefillMesa?: string; prefillLocal?: string; prefillRole?: "titular" | "suplente" }
    | { mode: "edit"; row: PersoneroRow }
  >(null);
  const [toDelete, setToDelete] = useState<PersoneroRow | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pubReg, setPubReg] = useState(publicRegistration);
  const [pubBusy, setPubBusy] = useState(false);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [massNotifying, setMassNotifying] = useState(false);

  const [pending, startTransition] = useTransition();

  function toast(kind: Toast["kind"], message: string) {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), kind, message }]);
  }

  async function togglePublic() {
    const next = !pubReg;
    setPubBusy(true);
    const res = await setPublicRegistration(next);
    if (res.ok) {
      setPubReg(next);
      toast("success", next ? "Inscripción pública activada." : "Inscripción pública desactivada.");
    } else {
      toast("error", res.error);
    }
    setPubBusy(false);
  }

  const [localList, setLocalList] = useState<ElectoralLocalData[]>(electoralLocales);
  const [personeroList, setPersoneroList] = useState<PersoneroRow[]>(rows);

  useEffect(() => {
    setLocalList(electoralLocales);
  }, [electoralLocales]);

  useEffect(() => {
    setPersoneroList(rows);
  }, [rows]);

  function handleCoordinatorUpdated(localId: string, name: string, phone: string) {
    const targetLocal = localList.find((l) => l.id === localId);
    setLocalList((prev) =>
      prev.map((l) => (l.id === localId ? { ...l, coordinatorName: name, coordinatorPhone: phone } : l))
    );
    if (targetLocal) {
      setPersoneroList((prev) =>
        prev.map((p) =>
          p.localName.toLowerCase().includes(targetLocal.name.toLowerCase()) ||
          targetLocal.name.toLowerCase().includes(p.localName.toLowerCase())
            ? { ...p, coordinatorName: name, coordinatorPhone: phone }
            : p
        )
      );
    }
    toast("success", `Coordinador actualizado: ${name}`);
  }

  // KPIs
  const totalMesasRegion = 511;
  const mesasCubiertas = useMemo(() => {
    let count = 0;
    localList.forEach((l) => (count += l.cubiertasCount));
    return count;
  }, [localList]);

  const colegiosConCoord = useMemo(
    () => localList.filter((l) => !!l.coordinatorName).length,
    [localList]
  );

  const pctCubiertas = Math.round((mesasCubiertas / totalMesasRegion) * 100);
  const notificadosCount = useMemo(() => personeroList.filter((r) => r.whatsappNotifiedAt !== null).length, [personeroList]);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return personeroList.filter((r) => {
      const matchesDistrict = district === "" || r.district === district;
      const matchesRole =
        roleFilter === "" ||
        (roleFilter === "titular" && !r.isSuplente && r.role !== "general") ||
        (roleFilter === "suplente" && (r.isSuplente || r.role === "suplente")) ||
        (roleFilter === "general" && r.role === "general");
      const matchesTerm =
        term === "" ||
        r.name.toLowerCase().includes(term) ||
        r.docNumber.toLowerCase().includes(term) ||
        r.mesa.includes(term) ||
        r.localName.toLowerCase().includes(term);

      return matchesDistrict && matchesRole && matchesTerm;
    });
  }, [personeroList, q, district, roleFilter]);

  function run(action: () => Promise<ActionResult<unknown>>, okMsg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) toast("success", okMsg);
      else toast("error", res.error);
    });
  }

  async function handleSendWhatsApp(personeroId: string, name: string) {
    setNotifyingId(personeroId);
    const origin = window.location.origin;
    const res = await notifyPersoneroWhatsApp(personeroId, origin);
    if (res.ok) {
      toast("success", `Notificación entregada por WhatsApp a ${name}.`);
    } else {
      toast("error", res.error);
    }
    setNotifyingId(null);
  }

  async function handleMassWhatsApp() {
    if (!confirm("¿Deseas enviar WhatsApp con su credencial a todos los personeros asignados pendientes de notificación?")) {
      return;
    }
    setMassNotifying(true);
    const origin = window.location.origin;
    const res = await notifyAllPendingWhatsApp(origin);
    if (res.ok) {
      toast(
        "success",
        `Envío masivo completado: ${res.data?.sentCount} enviados, ${res.data?.failCount} fallidos.`
      );
    } else {
      toast("error", res.error);
    }
    setMassNotifying(false);
  }

  function handleAssignFromMesaOrMap(mesaNum: string, localName: string, role?: "titular" | "suplente") {
    setModal({
      mode: "create",
      prefillMesa: mesaNum,
      prefillLocal: localName,
      prefillRole: role || "titular",
    });
  }

  function handleLocalUpdated(updated: ElectoralLocalData) {
    setLocalList((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    toast("success", `Datos del colegio actualizados: ${updated.name}`);
  }

  return (
    <div className="personeros">
      {/* Header Principal */}
      <header className="personeros__head">
        <div className="personeros__title-wrap">
          <h1>Módulo de Personeros</h1>
          <p className="personeros__sub">
            Gestión electoral integral · Cobertura de 511 mesas y 51 colegios en Madre de Dios
          </p>
        </div>
        <div className="personeros__head-actions">
          {perms.canWrite && (
            <>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleMassWhatsApp}
                disabled={massNotifying}
              >
                <Send size={15} /> {massNotifying ? "Enviando..." : "Notificar WhatsApp"}
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setModal({ mode: "create" })}
              >
                <Icon name="plus" size={16} /> Registrar personero
              </button>
            </>
          )}
        </div>
      </header>

      {/* Tarjetas de Resumen KPI */}
      <div className="personeros-kpis">
        <div className="kpi-card">
          <div className="kpi-icon-wrap kpi-icon--blue">
            <Vote size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Mesas MDD</span>
            <span className="kpi-value">{totalMesasRegion}</span>
            <span className="kpi-hint">51 Colegios Región</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap kpi-icon--green">
            <CheckCircle2 size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Mesas Cubiertas</span>
            <span className="kpi-value">
              {mesasCubiertas} <span style={{ fontSize: "13px", fontWeight: 600, color: "#10b981" }}>({pctCubiertas}%)</span>
            </span>
            <span className="kpi-hint">Personero Asignado</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap kpi-icon--red">
            <AlertTriangle size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Mesas Faltantes</span>
            <span className="kpi-value">{Math.max(0, totalMesasRegion - mesasCubiertas)}</span>
            <span className="kpi-hint">Por cubrir en región</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap kpi-icon--purple">
            <Users size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Registrados</span>
            <span className="kpi-value">{personeroList.length}</span>
            <span className="kpi-hint">{notificadosCount} con WhatsApp</span>
          </div>
        </div>

        <div className="kpi-card kpi-card--wide">
          <div className="kpi-icon-wrap kpi-icon--amber">
            <UserCheck size={20} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Coordinadores de Colegio</span>
            <span className="kpi-value">
              {colegiosConCoord} / {localList.length} colegios
            </span>
            <span className="kpi-hint">
              {localList.length - colegiosConCoord > 0
                ? `${localList.length - colegiosConCoord} colegios pendientes de asignar coordinador`
                : "100% de colegios asignados con coordinador"}
            </span>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación de Submódulos */}
      <nav className="personeros-subnav">
        <div className="subnav-tabs">
          <button
            type="button"
            className={`subnav-tab ${activeTab === "map" ? "subnav-tab--active" : ""}`}
            onClick={() => setActiveTab("map")}
          >
            <Map size={16} /> Mapa de Cobertura
            <span className="subnav-counter">{localList.length}</span>
          </button>
          <button
            type="button"
            className={`subnav-tab ${activeTab === "mesas" ? "subnav-tab--active" : ""}`}
            onClick={() => setActiveTab("mesas")}
          >
            <Vote size={16} /> Padrón de Mesas
            <span className="subnav-counter">{totalMesasRegion}</span>
          </button>
          <button
            type="button"
            className={`subnav-tab ${activeTab === "list" ? "subnav-tab--active" : ""}`}
            onClick={() => setActiveTab("list")}
          >
            <Users size={16} /> Directorio
            <span className="subnav-counter">{personeroList.length}</span>
          </button>
        </div>

        <div className="subnav-actions">
          <Link
            href="/verificacion"
            className="btn btn--sm btn--primary"
            title="Estación de Cotejo y Aprobación de Actas"
          >
            <CheckCheck size={14} /> Verificación
          </Link>

          <Link
            href="/visor-envivo"
            target="_blank"
            className="btn btn--sm btn--tv-live"
            title="Pantalla Gigante de Cómputo Electoral en Vivo"
          >
            <Tv size={14} className="text-red animate-pulse" /> Pantalla TV <ExternalLink size={12} />
          </Link>

          <Link
            href="/candidatos"
            className="btn btn--sm btn--secondary"
            title="Padrón y Edición Oficial de Candidatos"
          >
            <Vote size={13} /> Candidatos
          </Link>

          <Link
            href="/personero/acta"
            className="btn btn--sm btn--secondary"
            title="Módulo de Registro y Subida de Acta de Escrutinio"
          >
            <FileText size={13} /> Subir Acta
          </Link>

          <div className="pub-reg-toggle-wrap">
            <span className="pub-reg-label">Inscripción:</span>
            <button
              type="button"
              role="switch"
              aria-checked={pubReg}
              aria-label="Activar inscripción pública de personeros"
              className={`personeros__switch ${pubReg ? "is-on" : ""}`}
              disabled={!perms.canWrite || pubBusy}
              onClick={togglePublic}
            />
          </div>
        </div>
      </nav>

      {/* Submódulo 1: Mapa Interactivo de Cobertura */}
      {activeTab === "map" && (
        <CoverageMap
          locales={localList}
          personeros={personeroList}
          onAssignMesa={handleAssignFromMesaOrMap}
          onCoordinatorUpdated={handleCoordinatorUpdated}
          onLocalUpdated={handleLocalUpdated}
        />
      )}

      {/* Submódulo 2: Mesas por Colegio */}
      {activeTab === "mesas" && (
        <MesasView
          locales={localList}
          personeros={personeroList}
          onAssignMesa={handleAssignFromMesaOrMap}
          onCoordinatorUpdated={handleCoordinatorUpdated}
          onLocalUpdated={handleLocalUpdated}
        />
      )}

      {/* Submódulo 3: Directorio Tabular de Personeros */}
      {activeTab === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="personeros__filters">
            <input
              className="personeros__search"
              placeholder="Buscar por nombre, DNI, mesa o colegio…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="personeros__district"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
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
                    <th>Nombre / DNI</th>
                    <th>Cargo</th>
                    <th>Colegio / Local</th>
                    <th>Mesa y Aula</th>
                    <th>Celular</th>
                    <th>Notificación WhatsApp</th>
                    <th>Credencial</th>
                    {perms.canWrite && <th>Acciones</th>}
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
                  {visible.map((r) => {
                    const credUrl = `/credencial/${r.credentialToken || r.id}`;
                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="personeros__name-row">
                            <span className="personeros__name">{r.name}</span>
                            {r.isMesaMember && (
                              <span className="badge badge--amber" title="Seleccionado por ONPE como miembro de mesa">
                                Miembro ONPE
                              </span>
                            )}
                          </div>
                          <span className="personeros__doc">
                            <span className="badge badge--neutral">{DOC_LABEL[r.docType]}</span>
                            <span className="personeros__doc-num">{r.docNumber}</span>
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
                          <div><strong>{r.localName}</strong></div>
                          {r.localAddress && <div className="personeros__notes">{r.localAddress}</div>}
                        </td>
                        <td>
                          {r.mesa ? (
                            <div>
                              <span className="personeros__mesa">Mesa {r.mesa}</span>
                              <div className="personeros__notes">Aula: {r.aula || "—"}</div>
                            </div>
                          ) : (
                            <span className="badge badge--red">Sin mesa</span>
                          )}
                        </td>
                        <td>
                          {r.phone ? (
                            <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{r.phone}</span>
                          ) : (
                            <span className="dtable__muted">—</span>
                          )}
                        </td>
                        <td>
                          {r.whatsappNotifiedAt ? (
                            <span className="wa-status-tag">
                              <CheckCircle2 size={13} /> Notificado
                            </span>
                          ) : (
                            <span className="wa-status-tag wa-status-tag--pending">Pendiente</span>
                          )}
                        </td>
                        <td>
                          <a
                            href={credUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-cred-link"
                            title="Ver Credencial Oficial con QR"
                          >
                            <ExternalLink size={12} /> Ver Credencial
                          </a>
                        </td>
                        {perms.canWrite && (
                          <td>
                            <div className="personeros__actions">
                              {r.phone && r.mesa && (
                                <button
                                  type="button"
                                  className="btn-wa-notify"
                                  disabled={notifyingId === r.id}
                                  onClick={() => handleSendWhatsApp(r.id, r.name)}
                                  title="Enviar datos y credencial por WhatsApp"
                                >
                                  <Send size={12} /> {notifyingId === r.id ? "..." : "WhatsApp"}
                                </button>
                              )}
                              <button
                                className="iconbtn"
                                title="Editar datos o asignación"
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
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="tablefoot">
              <span>
                Mostrando {visible.length} de {rows.length} personeros registrados
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Registro / Edición */}
      {modal && (
        <PersoneroModal
          initial={modal.mode === "edit" ? modal.row : null}
          prefillMesa={modal.mode === "create" ? modal.prefillMesa : undefined}
          prefillLocal={modal.mode === "create" ? modal.prefillLocal : undefined}
          prefillRole={modal.mode === "create" ? modal.prefillRole : undefined}
          locales={locales}
          onClose={() => setModal(null)}
          onSubmit={async (input) => {
            const origin = window.location.origin;
            const res =
              modal.mode === "edit"
                ? await updatePersonero(modal.row.id, input, origin)
                : await createPersonero(input, origin);
            if (res.ok) {
              toast("success", modal.mode === "edit" ? "Personero actualizado." : "Personero registrado.");
              setModal(null);
            }
            return res;
          }}
        />
      )}

      {/* Modal de Confirmación de Eliminación */}
      {toDelete && (
        <ConfirmDialog
          title="Eliminar personero"
          description={
            <>
              Se eliminará a <strong>{toDelete.name}</strong> de la lista de personeros. Esta acción no se puede deshacer.
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
  }, [docType, docNumber, initial]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setTopError(null);
    setFieldErrors({});

    const isSupl = role === "suplente";
    const res = await onSubmit({
      docType,
      docNumber,
      name,
      phone: phone || undefined,
      district: district || undefined,
      localName,
      localAddress: localAddress || undefined,
      mesa,
      aula: aula || undefined,
      role: role === "general" ? "general" : role,
      isSuplente: isSupl,
      coordinatorName,
      coordinatorPhone,
      active,
      notes: notes || undefined,
      sendWhatsAppImmediately: sendWhatsApp,
    });

    if (!res.ok) {
      setTopError(res.error);
      setFieldErrors(res.fieldErrors ?? {});
    }
    setBusy(false);
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <form className="modal" style={{ maxWidth: "620px" }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <header className="modal__head">
          <h2>{initial ? "Editar asignación de personero" : "Registrar nuevo personero"}</h2>
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
                maxLength={12}
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder={docType === "dni" ? "8 dígitos" : "N° de documento"}
                required
              />
              {dniLookup === "loading" && <span style={{ fontSize: "11px", color: "#2563eb" }}>Consultando padrón...</span>}
              {fieldErrors.docNumber && <span style={{ color: "#b91c1c", fontSize: "11px" }}>{fieldErrors.docNumber}</span>}
            </label>
          </div>

          <div className="personeros__row">
            <label className="field">
              <span className="field__label">
                Nombres completos<span className="field__req">*</span>
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre y apellidos"
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Celular WhatsApp</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9 dígitos para notificación"
              />
            </label>
          </div>

          <div className="personeros__row">
            <label className="field">
              <span className="field__label">Distrito</span>
              <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                <option value="">Seleccionar distrito</option>
                {DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Cargo Electoral</span>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="titular">Personero Titular de Mesa</option>
                <option value="suplente">Personero Suplente de Mesa</option>
                <option value="general">Personero General de Local</option>
              </select>
            </label>
          </div>

          {/* Local de Votación con Combobox */}
          <div className="field combo">
            <span className="field__label">
              Colegio / Local de Votación<span className="field__req">*</span>
            </span>
            <input
              type="text"
              value={localName}
              onChange={(e) => {
                setLocalName(e.target.value);
                setLocalOpen(true);
              }}
              onFocus={() => setLocalOpen(true)}
              placeholder="Escribe el nombre del colegio..."
              required
            />
            {localOpen && localSuggestions.length > 0 && (
              <ul className="combo__list">
                {localSuggestions.map((l) => (
                  <li key={l.id} className="combo__item" onClick={() => pickLocal(l)}>
                    <strong>{l.name}</strong>
                    {l.address && <div style={{ fontSize: "11px", color: "#64748b" }}>{l.address}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Asignación de Mesa y Aula */}
          <div className="personeros__row" style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <label className="field">
              <span className="field__label">
                N° de Mesa Oficial<span className="field__req">*</span>
              </span>
              <input
                type="text"
                value={mesa}
                onChange={(e) => setMesa(e.target.value)}
                placeholder="Ej. 067000"
                style={{ fontWeight: 800, fontSize: "15px", color: "#b91c1c" }}
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Aula / Pabellón asignado</span>
              <input
                type="text"
                value={aula}
                onChange={(e) => setAula(e.target.value)}
                placeholder="Ej. Aula 102 - 1er Piso"
              />
            </label>
          </div>

          <div className="personeros__row">
            <label className="field">
              <span className="field__label">Coordinador de Local</span>
              <input
                type="text"
                value={coordinatorName}
                onChange={(e) => setCoordinatorName(e.target.value)}
              />
            </label>

            <label className="field">
              <span className="field__label">Teléfono Coordinador</span>
              <input
                type="tel"
                value={coordinatorPhone}
                onChange={(e) => setCoordinatorPhone(e.target.value)}
              />
            </label>
          </div>

          {/* Opción de WhatsApp Inmediato */}
          <label className="field field--check" style={{ marginTop: "8px", background: "#f0fdf4", padding: "10px 14px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
            <input
              type="checkbox"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
            />
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#166534" }}>
              📲 Enviar notificación por WhatsApp al personero inmediatamente con su credencial
            </span>
          </label>
        </div>

        <footer className="modal__foot">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? "Guardando..." : initial ? "Guardar cambios" : "Registrar y asignar"}
          </button>
        </footer>
      </form>
    </div>
  );
}
