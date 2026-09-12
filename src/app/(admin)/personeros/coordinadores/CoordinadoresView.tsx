"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  School,
  Search,
  Phone,
  MessageCircle,
  MapPin,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  Printer,
  X,
  Vote,
  UserCheck,
  UserPlus,
  Users,
  Loader2,
  Check,
  IdCard,
} from "lucide-react";
import type { ElectoralLocalData, PersoneroRow, PermFlags } from "../types";
import { updateLocalCoordinator, removeLocalCoordinator } from "../actions";
import { confirmAction, toastSuccess, toastError } from "@/lib/alerts";
import { DISTRICTS, districtLabel } from "@/lib/districts";
import { getGoogleMapsUrl } from "@/lib/geo";

type Props = {
  locales: ElectoralLocalData[];
  personeros: PersoneroRow[];
  perms: PermFlags;
  stats?: {
    totalMesas: number;
    colegiosTotal: number;
    colegiosConCoord: number;
  };
};

export function CoordinadoresView({ locales, personeros, perms }: Props) {
  const [localItems, setLocalItems] = useState<ElectoralLocalData[]>(locales);
  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "missing" | "assigned">("all");
  const [sortBy, setSortBy] = useState<"mesas-desc" | "name-asc" | "province-asc">("mesas-desc");

  // Modal para Asignar / Editar Coordinador
  const [modalLocal, setModalLocal] = useState<ElectoralLocalData | null>(null);
  const [modalTab, setModalTab] = useState<"dni" | "registered">("dni");
  const [modalDni, setModalDni] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalPhone, setModalPhone] = useState("");
  const [modalDniLookup, setModalDniLookup] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal de Nómina Imprimible
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Consulta automática de DNI a RENIEC o personeros registrados
  useEffect(() => {
    const doc = modalDni.trim().replace(/\D/g, "");
    if (doc.length !== 8) {
      setModalDniLookup("idle");
      return;
    }

    // 1. Si el DNI ya está entre los personeros registrados, tomar sus datos
    const found = personeros.find((p) => p.docNumber === doc);
    if (found) {
      setModalName(found.name);
      if (found.phone) setModalPhone(found.phone);
      setModalDniLookup("success");
      return;
    }

    // 2. Si no, consultar el proxy oficial de RENIEC
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setModalDniLookup("loading");
      try {
        const res = await fetch(`/api/dni/${doc}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error();
        const json = await res.json().catch(() => null);
        const resolved = json?.name || json?.nombre;
        if (resolved) {
          setModalName(resolved);
          setModalDniLookup("success");
        } else {
          setModalDniLookup("idle");
        }
      } catch {
        setModalDniLookup("idle");
      }
    }, 350);

    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [modalDni, personeros]);

  // Candidatos filtrados para la pestaña "Seleccionar de Registrados"
  const filteredCandidates = useMemo(() => {
    const term = modalSearchTerm.trim().toLowerCase();
    if (!term) return personeros.slice(0, 20);
    return personeros
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.docNumber.includes(term) ||
          (p.phone && p.phone.includes(term))
      )
      .slice(0, 30);
  }, [personeros, modalSearchTerm]);

  // Provincias únicas
  const provinces = useMemo(() => {
    const set = new Set<string>();
    localItems.forEach((l) => {
      if (l.province) set.add(l.province);
    });
    return Array.from(set).sort();
  }, [localItems]);

  // Distritos filtrados por provincia seleccionada
  const availableDistricts = useMemo(() => {
    return DISTRICTS.filter((d) => {
      if (provinceFilter === "all") return true;
      return d.province.toLowerCase() === provinceFilter.toLowerCase();
    });
  }, [provinceFilter]);

  // Contadores en vivo
  const totalColegios = localItems.length;
  const conCoord = useMemo(
    () => localItems.filter((l) => !!l.coordinatorName && l.coordinatorName.trim() !== "").length,
    [localItems]
  );
  const sinCoord = totalColegios - conCoord;
  const pctCoord = totalColegios > 0 ? Math.round((conCoord / totalColegios) * 100) : 0;
  const totalMesas = useMemo(
    () => localItems.reduce((acc, l) => acc + (l.totalMesas || l.mesas.length || 0), 0),
    [localItems]
  );

  // Filtrado y ordenamiento
  const filteredLocales = useMemo(() => {
    const q = search.trim().toLowerCase();

    return localItems
      .filter((loc) => {
        // Filtro de estado
        const hasCoord = !!loc.coordinatorName && loc.coordinatorName.trim() !== "";
        if (statusFilter === "missing" && hasCoord) return false;
        if (statusFilter === "assigned" && !hasCoord) return false;

        // Filtro de provincia
        if (provinceFilter !== "all" && loc.province?.toLowerCase() !== provinceFilter.toLowerCase()) {
          return false;
        }

        // Filtro de distrito
        if (districtFilter !== "all" && loc.district?.toLowerCase() !== districtFilter.toLowerCase()) {
          return false;
        }

        // Búsqueda de texto
        if (!q) return true;
        const termInName = loc.name.toLowerCase().includes(q);
        const termInCode = (loc.code || "").toLowerCase().includes(q);
        const termInCoord = (loc.coordinatorName || "").toLowerCase().includes(q);
        const termInDni = (loc.coordinatorDni || "").includes(q);
        const termInPhone = (loc.coordinatorPhone || "").includes(q);
        const termInDistrict = (loc.district || "").toLowerCase().includes(q);

        return termInName || termInCode || termInCoord || termInDni || termInPhone || termInDistrict;
      })
      .sort((a, b) => {
        if (sortBy === "mesas-desc") {
          const aM = a.totalMesas || a.mesas.length || 0;
          const bM = b.totalMesas || b.mesas.length || 0;
          if (bM !== aM) return bM - aM;
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "province-asc") {
          const pComp = (a.province || "").localeCompare(b.province || "");
          if (pComp !== 0) return pComp;
          return a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      });
  }, [localItems, search, statusFilter, provinceFilter, districtFilter, sortBy]);

  // Abrir modal de asignación
  function openAssignModal(loc: ElectoralLocalData) {
    setModalLocal(loc);
    setModalDni(loc.coordinatorDni || "");
    setModalName(loc.coordinatorName || "");
    setModalPhone(loc.coordinatorPhone || "");
    setModalError(null);
    setModalTab("dni");
    setModalSearchTerm("");
    setModalDniLookup(loc.coordinatorDni ? "success" : "idle");
  }

  // Seleccionar un personero registrado
  function handleSelectPersonero(p: PersoneroRow) {
    setModalDni(p.docNumber);
    setModalName(p.name);
    setModalPhone(p.phone || "");
    setModalTab("dni");
    setModalDniLookup("success");
    toastSuccess(`Datos de ${p.name} cargados en el formulario.`);
  }

  // Guardar coordinador
  async function handleSaveCoordinator() {
    if (!modalLocal) return;
    const name = modalName.trim();
    const phone = modalPhone.trim().replace(/\D/g, "");
    const dni = modalDni.trim().replace(/\D/g, "");

    if (dni && dni.length !== 8) {
      setModalError("El DNI debe tener exactamente 8 dígitos.");
      return;
    }
    if (name.length < 2) {
      setModalError("Ingresa el nombre completo del coordinador.");
      return;
    }
    if (phone.length < 6 || phone.length > 15) {
      setModalError("Ingresa un número de celular válido (6 a 15 dígitos).");
      return;
    }

    setModalSaving(true);
    setModalError(null);

    const res = await updateLocalCoordinator(modalLocal.id, name, phone, dni || null);
    if (res.ok) {
      toastSuccess(`Coordinador asignado a ${modalLocal.name}`);
      setLocalItems((prev) =>
        prev.map((l) =>
          l.id === modalLocal.id
            ? { ...l, coordinatorName: name, coordinatorPhone: phone, coordinatorDni: dni || null }
            : l
        )
      );
      setModalLocal(null);
    } else {
      const msg = res.error || "Error al actualizar coordinador.";
      setModalError(msg);
      toastError(msg);
    }
    setModalSaving(false);
  }

  // Desasignar coordinador
  async function handleRemoveCoordinator(loc: ElectoralLocalData) {
    const ok = await confirmAction({
      title: "¿Desasignar Coordinador?",
      text: `¿Estás seguro de retirar a ${loc.coordinatorName} de la coordinación de ${loc.name}?`,
      confirmButtonText: "Sí, desasignar",
    });

    if (!ok) return;

    const res = await removeLocalCoordinator(loc.id);
    if (res.ok) {
      toastSuccess(`Coordinador retirado de ${loc.name}`);
      setLocalItems((prev) =>
        prev.map((l) =>
          l.id === loc.id
            ? { ...l, coordinatorName: null, coordinatorPhone: null, coordinatorDni: null }
            : l
        )
      );
    } else {
      toastError(res.error || "No se pudo desasignar al coordinador.");
    }
  }

  return (
    <div className="coordinadores-container" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Banner de Monitoreo Territorial */}
      <div className="coord-header-card">
        <div className="coord-header-card__top">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="coord-icon-badge">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: "var(--text, #0f172a)" }}>
                Coordinadores de Centro de Votación
              </h2>
              <p style={{ fontSize: "13px", color: "var(--text-muted, #64748b)", margin: "2px 0 0" }}>
                Gestión y fiscalización de los líderes territoriales a cargo de los 51 colegios electorales de Madre de Dios.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setShowPrintModal(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}
            >
              <Printer size={14} /> Imprimir / Exportar Nómina
            </button>
          </div>
        </div>

        {/* Métricas rápidas de liderazgo */}
        <div className="coord-stats-grid">
          <div className="coord-stat-box">
            <span className="coord-stat-box__label">Total Colegios</span>
            <span className="coord-stat-box__val">{totalColegios}</span>
            <span className="coord-stat-box__sub">{totalMesas} mesas en total</span>
          </div>

          <div className="coord-stat-box coord-stat-box--success">
            <span className="coord-stat-box__label">Con Coordinador</span>
            <span className="coord-stat-box__val" style={{ color: "#16a34a" }}>
              {conCoord} <small style={{ fontSize: "13px", fontWeight: 600 }}>({pctCoord}%)</small>
            </span>
            <span className="coord-stat-box__sub">Líderes activos en colegio</span>
          </div>

          <div className="coord-stat-box coord-stat-box--danger">
            <span className="coord-stat-box__label">Sin Coordinador (Urgente)</span>
            <span className="coord-stat-box__val" style={{ color: "#dc2626" }}>
              {sinCoord}
            </span>
            <span className="coord-stat-box__sub">Colegios desprotegidos</span>
          </div>

          <div className="coord-stat-box">
            <span className="coord-stat-box__label">Cobertura de Liderazgo</span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
              <div style={{ flex: 1, height: "8px", background: "var(--border, #e2e8f0)", borderRadius: "9999px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${pctCoord}%`,
                    background: pctCoord > 70 ? "#16a34a" : pctCoord > 30 ? "#f59e0b" : "#dc2626",
                    borderRadius: "9999px",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
              <strong style={{ fontSize: "13px", minWidth: "36px" }}>{pctCoord}%</strong>
            </div>
            <span className="coord-stat-box__sub">{conCoord} de {totalColegios} asignados</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="coord-toolbar">
        {/* Píldoras rápidas de Estado */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className={`pill-tab ${statusFilter === "all" ? "pill-tab--active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            Todos los Colegios ({totalColegios})
          </button>
          <button
            type="button"
            className={`pill-tab pill-tab--alert ${statusFilter === "missing" ? "pill-tab--alert-active" : ""}`}
            onClick={() => setStatusFilter("missing")}
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <AlertTriangle size={13} />
            <span>Sin Coordinador ({sinCoord})</span>
          </button>
          <button
            type="button"
            className={`pill-tab pill-tab--success ${statusFilter === "assigned" ? "pill-tab--success-active" : ""}`}
            onClick={() => setStatusFilter("assigned")}
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <CheckCircle2 size={13} />
            <span>Con Coordinador ({conCoord})</span>
          </button>
        </div>

        {/* Buscador y Selectores */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <div className="search-box" style={{ minWidth: "240px", flex: "1 1 240px" }}>
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar colegio, código, DNI o celular..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="input select"
            style={{ width: "auto", minWidth: "150px" }}
            value={provinceFilter}
            onChange={(e) => {
              setProvinceFilter(e.target.value);
              setDistrictFilter("all");
            }}
          >
            <option value="all">Todas las Provincias</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            className="input select"
            style={{ width: "auto", minWidth: "150px" }}
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
          >
            <option value="all">Todos los Distritos</option>
            {availableDistricts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>

          <select
            className="input select"
            style={{ width: "auto", minWidth: "170px" }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="mesas-desc">Más mesas (Prioritarios)</option>
            <option value="name-asc">Colegio (A - Z)</option>
            <option value="province-asc">Por Provincia</option>
          </select>
        </div>
      </div>

      {/* Grid de Centros de Votación */}
      <div className="coord-cards-grid">
        {filteredLocales.length === 0 ? (
          <div className="coord-empty-state">
            <AlertTriangle size={36} style={{ color: "#f59e0b", marginBottom: "8px" }} />
            <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text, #0f172a)" }}>
              No se encontraron colegios con los filtros seleccionados
            </h3>
            <p style={{ margin: "4px 0 12px", fontSize: "13px", color: "var(--text-muted, #64748b)" }}>
              Prueba cambiando los filtros de provincia, distrito o el término de búsqueda.
            </p>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setProvinceFilter("all");
                setDistrictFilter("all");
              }}
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          filteredLocales.map((loc) => {
            const hasCoord = !!loc.coordinatorName && loc.coordinatorName.trim() !== "";
            const mapsUrl =
              loc.latitude && loc.longitude
                ? getGoogleMapsUrl(loc.latitude, loc.longitude)
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${loc.name}, ${loc.district || ""}, Madre de Dios`
                  )}`;
            const numMesas = loc.totalMesas || loc.mesas.length || 0;

            return (
              <div
                key={loc.id}
                className={`coord-card ${hasCoord ? "coord-card--assigned" : "coord-card--missing"}`}
              >
                {/* Cabecera del Colegio */}
                <div className="coord-card__head">
                  <div className="coord-card__head-top">
                    <div className="coord-card__badges">
                      <span className="coord-card__code">
                        {loc.code ? `CÓD. ${loc.code}` : "LOCAL ONPE"}
                      </span>
                      <span className="coord-card__location">
                        {loc.province} · {districtLabel(loc.district as any)}
                      </span>
                    </div>

                    <span className="coord-card__mesas-badge">
                      <Vote size={12} /> {numMesas} {numMesas === 1 ? "mesa" : "mesas"}
                    </span>
                  </div>

                  <h3 className="coord-card__name">
                    <School size={16} className="coord-card__school-icon" />
                    <span>{loc.name}</span>
                  </h3>

                  {loc.address && (
                    <div className="coord-card__address">
                      <MapPin size={12} className="coord-card__pin-icon" />
                      <span className="coord-card__address-text" title={loc.address}>
                        {loc.address}
                      </span>
                      {mapsUrl && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="coord-card__map-link"
                          title="Abrir en Google Maps"
                        >
                          <ExternalLink size={10} /> Maps
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Sección del Coordinador */}
                <div className="coord-card__body">
                  {hasCoord ? (
                    <div className="coord-assigned-box">
                      <div className="coord-assigned-box__top">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span className="coord-avatar-badge">
                            <UserCheck size={16} />
                          </span>
                          <div>
                            <span className="coord-badge coord-badge--success">Coordinador Oficial</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <span className="coord-person-name">{loc.coordinatorName}</span>
                              {loc.coordinatorDni && (
                                <span className="coord-card__code" style={{ fontSize: "10.5px" }}>
                                  DNI: {loc.coordinatorDni}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {perms.canWriteLocales && (
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              type="button"
                              className="btn-icon-subtle"
                              title="Modificar coordinador"
                              onClick={() => openAssignModal(loc)}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon-subtle btn-icon-subtle--danger"
                              title="Desasignar coordinador"
                              onClick={() => handleRemoveCoordinator(loc)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Botones de Contacto Directo */}
                      {loc.coordinatorPhone && (
                        <div className="coord-contact-row">
                          <a
                            href={`https://wa.me/51${loc.coordinatorPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Hola ${loc.coordinatorName}, te escribimos del equipo electoral de Simón Horna Alpaca (Ahora Nación). Nos comunicamos contigo para coordinar las ${numMesas} mesas del colegio ${loc.name}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="coord-btn-wa"
                          >
                            <MessageCircle size={14} /> WhatsApp Directo
                          </a>

                          <a
                            href={`tel:${loc.coordinatorPhone.replace(/\D/g, "")}`}
                            className="coord-btn-call"
                          >
                            <Phone size={13} /> {loc.coordinatorPhone}
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="coord-missing-box">
                      <div className="coord-missing-alert">
                        <AlertTriangle size={15} style={{ color: "#d97706", flexShrink: 0 }} />
                        <div>
                          <strong>Sin coordinador asignado</strong>
                          <p>Este centro de votación no tiene responsable territorial para el día D.</p>
                        </div>
                      </div>

                      {perms.canWriteLocales && (
                        <button
                          type="button"
                          className="btn btn--primary btn--sm coord-assign-trigger"
                          onClick={() => openAssignModal(loc)}
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                          <ShieldCheck size={14} /> Asignar Coordinador
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Pie de tarjeta con enlace a Mesas del local */}
                <div className="coord-card__foot">
                  <Link
                    href={`/personeros/mesas?local=${encodeURIComponent(loc.name)}`}
                    className="coord-card__mesas-link"
                  >
                    <span>Ver las {numMesas} mesas de este colegio</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal para Asignar o Modificar Coordinador (con DNI y Buscador) */}
      {modalLocal && (
        <div className="modal-backdrop" onClick={() => !modalSaving && setModalLocal(null)}>
          <div className="modal" style={{ maxWidth: "520px", width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <header className="modal__head">
              <div>
                <span className="badge badge--blue" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <ShieldCheck size={12} /> Liderazgo Territorial
                </span>
                <h3 style={{ margin: "4px 0 0", fontSize: "17px", fontWeight: 800 }}>
                  {modalLocal.coordinatorName ? "Modificar Coordinador" : "Asignar Coordinador de Colegio"}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted, #64748b)" }}>
                  {modalLocal.name} ({modalLocal.totalMesas || modalLocal.mesas.length} mesas)
                </p>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setModalLocal(null)}
                disabled={modalSaving}
              >
                <X size={18} />
              </button>
            </header>

            {/* Selector de Pestañas Moderno */}
            <div className="assign-modal-tabs">
              <button
                type="button"
                className={`tab-btn ${modalTab === "dni" ? "tab-btn--active" : ""}`}
                onClick={() => setModalTab("dni")}
                style={{
                  padding: "10px 14px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "13px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  color: modalTab === "dni" ? "var(--accent, #2563eb)" : "var(--text-muted, #64748b)",
                  borderBottom: modalTab === "dni" ? "2px solid var(--accent, #2563eb)" : "2px solid transparent",
                }}
              >
                <UserPlus size={14} /> Registrar / Ingresar con DNI
              </button>
              <button
                type="button"
                className={`tab-btn ${modalTab === "registered" ? "tab-btn--active" : ""}`}
                onClick={() => setModalTab("registered")}
                style={{
                  padding: "10px 14px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "13px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  color: modalTab === "registered" ? "var(--accent, #2563eb)" : "var(--text-muted, #64748b)",
                  borderBottom: modalTab === "registered" ? "2px solid var(--accent, #2563eb)" : "2px solid transparent",
                }}
              >
                <Users size={14} /> Seleccionar de Registrados ({personeros.length})
              </button>
            </div>

            <div className="modal__body" style={{ display: "flex", flexDirection: "column", gap: "14px", maxHeight: "65vh", overflowY: "auto", padding: "16px" }}>
              {modalTab === "dni" ? (
                <>
                  <p className="coord-modal-desc">
                    El coordinador es la máxima autoridad del partido en este centro de votación: supervisa las mesas, distribuye credenciales y resuelve controversias con el JNE/ONPE.
                  </p>

                  {/* Campo DNI con autocompletado RENIEC */}
                  <div className="field">
                    <label className="field__label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>
                        DNI del Coordinador (8 dígitos) <span style={{ color: "#dc2626" }}>*</span>
                      </span>
                      {modalDniLookup === "loading" && (
                        <span style={{ fontSize: "11px", color: "var(--accent, #2563eb)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Loader2 size={11} className="spin" /> Consultando RENIEC...
                        </span>
                      )}
                      {modalDniLookup === "success" && (
                        <span style={{ fontSize: "11px", color: "#16a34a", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                          <Check size={12} /> Identificado
                        </span>
                      )}
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        className="input"
                        placeholder="Ej. 71234567"
                        maxLength={8}
                        value={modalDni}
                        onChange={(e) => setModalDni(e.target.value.replace(/\D/g, "").slice(0, 8))}
                        autoFocus
                      />
                      <IdCard size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    </div>
                  </div>

                  <div className="field">
                    <label className="field__label">
                      Nombres y Apellidos Completos <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ej. Juan Carlos Pérez Quispe"
                      value={modalName}
                      onChange={(e) => setModalName(e.target.value)}
                    />
                  </div>

                  <div className="field">
                    <label className="field__label">
                      Celular / WhatsApp del Coordinador <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="tel"
                      className="input"
                      placeholder="Ej. 982136949"
                      value={modalPhone}
                      onChange={(e) => setModalPhone(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                /* Pestaña: Seleccionar de registrados con buscador y cards (sin select nativo) */
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div className="search-box">
                    <Search size={14} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Buscar por DNI, nombre o celular..."
                      value={modalSearchTerm}
                      onChange={(e) => setModalSearchTerm(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "300px", overflowY: "auto" }}>
                    {filteredCandidates.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "24px 12px", color: "var(--text-muted, #64748b)", fontSize: "13px" }}>
                        No se encontraron personeros que coincidan.
                      </div>
                    ) : (
                      filteredCandidates.map((p) => (
                        <div
                          key={p.id}
                          className="assign-candidate-card"
                          style={{ cursor: "pointer" }}
                          onClick={() => handleSelectPersonero(p)}
                        >
                          <div style={{ minWidth: 0, flex: 1, paddingRight: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <strong style={{ fontSize: "13px", color: "var(--text, #0f172a)" }}>
                                {p.name}
                              </strong>
                              <span className="badge badge--green" style={{ fontSize: "9.5px", padding: "1px 5px" }}>
                                Registrado
                              </span>
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted, #64748b)", display: "flex", gap: "8px", marginTop: "2px" }}>
                              <span>DNI: <strong>{p.docNumber}</strong></span>
                              {p.phone && <span>Tel: {p.phone}</span>}
                              {p.district && <span>Distrito: {p.district}</span>}
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn btn--xs btn--primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPersonero(p);
                            }}
                          >
                            Seleccionar
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {modalError && (
                <div
                  style={{
                    background: "rgba(220, 38, 38, 0.08)",
                    border: "1px solid rgba(220, 38, 38, 0.3)",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    color: "#dc2626",
                    fontSize: "12px",
                  }}
                >
                  {modalError}
                </div>
              )}
            </div>

            <footer className="modal__foot">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setModalLocal(null)}
                disabled={modalSaving}
              >
                Cancelar
              </button>
              {modalTab === "dni" && (
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={handleSaveCoordinator}
                  disabled={modalSaving}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <ShieldCheck size={14} /> {modalSaving ? "Guardando..." : "Guardar Coordinador"}
                </button>
              )}
            </footer>
          </div>
        </div>
      )}

      {/* Modal de Nómina Oficial Imprimible */}
      {showPrintModal && (
        <div className="modal-backdrop" onClick={() => setShowPrintModal(false)}>
          <div
            className="modal"
            style={{ maxWidth: "860px", width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal__head print-hidden">
              <div>
                <span className="badge badge--green" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <ShieldCheck size={12} /> Nómina Territorial Oficial
                </span>
                <h3 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 800 }}>
                  Padrón de Coordinadores de Centro de Votación
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted, #64748b)" }}>
                  Madre de Dios · 51 Colegios Electorales
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => window.print()}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Printer size={14} /> Imprimir Ahora
                </button>
                <button type="button" className="btn-icon" onClick={() => setShowPrintModal(false)}>
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="modal__body" style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              <div style={{ textAlign: "center", marginBottom: "16px", borderBottom: "1px solid var(--border, #e2e8f0)", paddingBottom: "12px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 900, margin: 0 }}>
                  PARTIDO POLÍTICO AHORA NACIÓN
                </h2>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted, #475569)", marginTop: "2px" }}>
                  NÓMINA DE COORDINADORES DE LOCAL DE VOTACIÓN · REGIÓN MADRE DE DIOS
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted, #64748b)", marginTop: "4px" }}>
                  Total Colegios: 51 | Asignados: {conCoord} | Pendientes: {sinCoord}
                </div>
              </div>

              <table className="table" style={{ width: "100%", fontSize: "12px" }}>
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>#</th>
                    <th>Provincia / Distrito</th>
                    <th>Centro de Votación</th>
                    <th style={{ width: "70px", textAlign: "center" }}>Mesas</th>
                    <th>Coordinador Oficial</th>
                    <th>Teléfono / WhatsApp</th>
                  </tr>
                </thead>
                <tbody>
                  {localItems.map((loc, idx) => {
                    const hasCoord = !!loc.coordinatorName && loc.coordinatorName.trim() !== "";
                    const numMesas = loc.totalMesas || loc.mesas.length || 0;

                    return (
                      <tr key={loc.id} style={{ background: !hasCoord ? "rgba(239, 68, 68, 0.04)" : undefined }}>
                        <td style={{ color: "var(--text-muted, #64748b)" }}>{idx + 1}</td>
                        <td>
                          <strong>{loc.province}</strong>
                          <div style={{ fontSize: "11px", color: "var(--text-muted, #64748b)" }}>
                            {districtLabel(loc.district as any)}
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: "var(--text, #0f172a)" }}>{loc.name}</strong>
                          {loc.code && (
                            <div style={{ fontSize: "10.5px", color: "var(--text-muted, #64748b)" }}>
                              CÓD. {loc.code}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 700 }}>{numMesas}</td>
                        <td>
                          {hasCoord ? (
                            <div>
                              <strong style={{ color: "var(--text, #0f172a)" }}>{loc.coordinatorName}</strong>
                              {loc.coordinatorDni && (
                                <div style={{ fontSize: "11px", color: "var(--text-muted, #64748b)" }}>
                                  DNI: {loc.coordinatorDni}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "#dc2626", fontWeight: 700, fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <AlertTriangle size={11} /> Sin Coordinador
                            </span>
                          )}
                        </td>
                        <td>
                          {hasCoord && loc.coordinatorPhone ? (
                            <a
                              href={`tel:${loc.coordinatorPhone}`}
                              style={{ color: "var(--accent, #2563eb)", fontWeight: 700, textDecoration: "none" }}
                            >
                              {loc.coordinatorPhone}
                            </a>
                          ) : (
                            <span style={{ color: "#94a3b8" }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <footer className="modal__foot print-hidden">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setShowPrintModal(false)}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => window.print()}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Printer size={14} /> Imprimir Nómina
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
