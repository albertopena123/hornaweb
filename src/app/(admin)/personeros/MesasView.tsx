"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Vote,
  Search,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  UserCheck,
  Phone,
  Filter,
  Edit2,
  Save,
  Trash2,
  ExternalLink,
  Camera,
} from "lucide-react";
import type { ElectoralLocalData, PersoneroRow, PermFlags } from "./types";
import { DISTRICTS, districtLabel } from "@/lib/districts";
import {
  updateLocalCoordinator,
  updateLocal,
  updateMesa,
  unassignPersoneroFromMesa,
} from "./actions";
import { parseCoordinates, getGoogleMapsUrl } from "@/lib/geo";

type Props = {
  locales: ElectoralLocalData[];
  personeros: PersoneroRow[];
  onAssignMesa?: (mesaNum: string, localName: string, role?: "titular" | "suplente") => void;
  onCoordinatorUpdated?: (localId: string, name: string, phone: string) => void;
  onLocalUpdated?: (local: ElectoralLocalData) => void;
  perms?: PermFlags;
};

export function MesasView({
  locales,
  personeros,
  onAssignMesa,
  onCoordinatorUpdated,
  onLocalUpdated,
  perms,
}: Props) {
  const [localItems, setLocalItems] = useState<ElectoralLocalData[]>(locales);
  useEffect(() => {
    setLocalItems(locales);
  }, [locales]);

  const [q, setQ] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "empty" | "without-suplente" | "full">("all");
  const [coordFilter, setCoordFilter] = useState<"all" | "with" | "without">("all");
  const [selectedMesa, setSelectedMesa] = useState<any | null>(null);

  // Modal para editar coordinador del colegio
  const [editingLocalCoord, setEditingLocalCoord] = useState<ElectoralLocalData | null>(null);
  const [coordName, setCoordName] = useState("");
  const [coordPhone, setCoordPhone] = useState("");
  const [savingCoord, setSavingCoord] = useState(false);
  const [coordError, setCoordError] = useState<string | null>(null);

  // Modal para editar colegio completo
  const [editingLocal, setEditingLocal] = useState<ElectoralLocalData | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editDistrict, setEditDistrict] = useState("");
  const [editProvince, setEditProvince] = useState("Tambopata");
  const [editLat, setEditLat] = useState<string>("");
  const [editLng, setEditLng] = useState<string>("");
  const [mapsInput, setMapsInput] = useState("");
  const [savingLocal, setSavingLocal] = useState(false);
  const [localEditMsg, setLocalEditMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Modal para editar mesa (aula, autoridades ONPE)
  const [editingMesaInline, setEditingMesaInline] = useState(false);
  const [mesaAula, setMesaAula] = useState("");
  const [mesaPres, setMesaPres] = useState("");
  const [mesaSec, setMesaSec] = useState("");
  const [mesaSupl, setMesaSupl] = useState("");
  const [savingMesa, setSavingMesa] = useState(false);

  function openCoordModal(loc: ElectoralLocalData) {
    setEditingLocalCoord(loc);
    setCoordName(loc.coordinatorName || "");
    setCoordPhone(loc.coordinatorPhone || "");
    setCoordError(null);
  }

  function openEditLocalModal(loc: ElectoralLocalData) {
    setEditingLocal(loc);
    setEditName(loc.name);
    setEditCode(loc.code || "");
    setEditAddress(loc.address || "");
    setEditDistrict(loc.district || "");
    setEditProvince(loc.province || "Tambopata");
    setEditLat(loc.latitude !== null ? String(loc.latitude) : "");
    setEditLng(loc.longitude !== null ? String(loc.longitude) : "");
    setMapsInput("");
    setLocalEditMsg(null);
  }

  function handleParseMapsLink() {
    const parsed = parseCoordinates(mapsInput);
    if (parsed) {
      setEditLat(String(parsed.lat));
      setEditLng(String(parsed.lng));
      setLocalEditMsg({
        kind: "success",
        text: `Coordenadas extraídas: ${parsed.lat.toFixed(6)}, ${parsed.lng.toFixed(6)}`,
      });
    } else {
      setLocalEditMsg({
        kind: "error",
        text: "No se reconocieron coordenadas en el enlace o texto ingresado.",
      });
    }
  }

  async function handleSaveLocal() {
    if (!editingLocal) return;
    if (!editName.trim()) {
      setLocalEditMsg({ kind: "error", text: "El nombre del colegio es obligatorio." });
      return;
    }

    const latNum = editLat.trim() ? parseFloat(editLat.trim()) : null;
    const lngNum = editLng.trim() ? parseFloat(editLng.trim()) : null;

    if ((latNum !== null && isNaN(latNum)) || (lngNum !== null && isNaN(lngNum))) {
      setLocalEditMsg({ kind: "error", text: "Las coordenadas deben ser números válidos." });
      return;
    }

    setSavingLocal(true);
    setLocalEditMsg(null);

    const res = await updateLocal(editingLocal.id, {
      name: editName.trim(),
      code: editCode.trim() || undefined,
      address: editAddress.trim() || null,
      district: editDistrict || undefined,
      province: editProvince || undefined,
      latitude: latNum,
      longitude: lngNum,
    });

    if (res.ok) {
      const updated: ElectoralLocalData = {
        ...editingLocal,
        name: editName.trim(),
        code: editCode.trim(),
        address: editAddress.trim() || null,
        district: editDistrict,
        province: editProvince,
        latitude: latNum,
        longitude: lngNum,
      };

      setLocalItems((prev) => prev.map((l) => (l.id === editingLocal.id ? updated : l)));
      onLocalUpdated?.(updated);
      setEditingLocal(null);
    } else {
      setLocalEditMsg({ kind: "error", text: res.error || "Error al actualizar datos del colegio." });
    }
    setSavingLocal(false);
  }

  async function handleSaveLocalCoord() {
    if (!editingLocalCoord) return;
    if (!coordName.trim()) {
      setCoordError("Ingresa el nombre del coordinador.");
      return;
    }
    setSavingCoord(true);
    setCoordError(null);
    const res = await updateLocalCoordinator(editingLocalCoord.id, coordName.trim(), coordPhone.trim());
    if (res.ok) {
      setLocalItems((prev) =>
        prev.map((loc) =>
          loc.id === editingLocalCoord.id
            ? { ...loc, coordinatorName: coordName.trim(), coordinatorPhone: coordPhone.trim() }
            : loc
        )
      );
      onCoordinatorUpdated?.(editingLocalCoord.id, coordName.trim(), coordPhone.trim());
      setEditingLocalCoord(null);
    } else {
      setCoordError(res.error || "Error al guardar el coordinador.");
    }
    setSavingCoord(false);
  }

  async function handleUnassignPersonero(personeroId: string, mesaNum: string, isSupl: boolean) {
    if (!confirm("¿Deseas desasignar a este personero de la mesa?")) return;
    const res = await unassignPersoneroFromMesa(personeroId);
    if (res.ok) {
      setLocalItems((prev) =>
        prev.map((loc) => ({
          ...loc,
          mesas: loc.mesas.map((m) => {
            if (m.number !== mesaNum) return m;
            return {
              ...m,
              titular: isSupl ? m.titular : null,
              suplente: isSupl ? null : m.suplente,
              personero: isSupl ? (m.titular || null) : (m.suplente || null),
            };
          }),
        }))
      );
      setSelectedMesa((prev: any) => {
        if (!prev || prev.mesa.number !== mesaNum) return prev;
        return {
          ...prev,
          mesa: {
            ...prev.mesa,
            titular: isSupl ? prev.mesa.titular : null,
            suplente: isSupl ? null : prev.mesa.suplente,
            personero: isSupl ? (prev.mesa.titular || null) : (prev.mesa.suplente || null),
          },
        };
      });
    }
  }

  async function handleSaveMesaDetails() {
    if (!selectedMesa) return;
    setSavingMesa(true);
    const res = await updateMesa(selectedMesa.mesa.number, {
      aula: mesaAula,
      onpePresidente: mesaPres,
      onpeSecretario: mesaSec,
      onpeSuplentes: mesaSupl,
    });
    if (res.ok) {
      setLocalItems((prev) =>
        prev.map((loc) => ({
          ...loc,
          mesas: loc.mesas.map((m) =>
            m.number === selectedMesa.mesa.number
              ? {
                  ...m,
                  aula: mesaAula || null,
                  onpePresidente: mesaPres || null,
                  onpeSecretario: mesaSec || null,
                  onpeSuplentes: mesaSupl || null,
                }
              : m
          ),
        }))
      );
      setSelectedMesa((prev: any) => ({
        ...prev,
        mesa: {
          ...prev.mesa,
          aula: mesaAula || null,
          onpePresidente: mesaPres || null,
          onpeSecretario: mesaSec || null,
          onpeSuplentes: mesaSupl || null,
        },
      }));
      setEditingMesaInline(false);
    }
    setSavingMesa(false);
  }

  // Filtrado de colegios
  const filteredLocales = useMemo(() => {
    const term = q.trim().toLowerCase();
    return localItems
      .map((loc) => {
        const matchesDistrict = district === "" || loc.district === district;
        const matchesProvince = province === "" || loc.province === province;
        if (!matchesDistrict || !matchesProvince) return null;

        const hasCoord = !!loc.coordinatorName;
        if (coordFilter === "with" && !hasCoord) return null;
        if (coordFilter === "without" && hasCoord) return null;

        // Filtrar mesas dentro del colegio
        const matchingMesas = loc.mesas.filter((m) => {
          const titular = m.titular || (m.personero && !m.personero.isSuplente ? m.personero : null);
          const suplente = m.suplente || (m.personero && m.personero.isSuplente ? m.personero : null);

          const hasTitular = !!titular;
          const hasSuplente = !!suplente;
          const isComplete = hasTitular && hasSuplente;

          if (filterStatus === "empty" && hasTitular) return false;
          if (filterStatus === "without-suplente" && (!hasTitular || hasSuplente)) return false;
          if (filterStatus === "full" && !isComplete) return false;

          if (term === "") return true;
          return (
            m.number.includes(term) ||
            loc.name.toLowerCase().includes(term) ||
            (loc.coordinatorName && loc.coordinatorName.toLowerCase().includes(term)) ||
            (titular?.name && titular.name.toLowerCase().includes(term)) ||
            (suplente?.name && suplente.name.toLowerCase().includes(term))
          );
        });

        if (
          term !== "" &&
          matchingMesas.length === 0 &&
          !loc.name.toLowerCase().includes(term) &&
          !(loc.coordinatorName && loc.coordinatorName.toLowerCase().includes(term))
        ) {
          return null;
        }

        return {
          ...loc,
          displayMesas: matchingMesas,
        };
      })
      .filter(Boolean) as (ElectoralLocalData & { displayMesas: any[] })[];
  }, [localItems, q, district, province, filterStatus, coordFilter]);

  // Provincias únicas ordenadas
  const availableProvincias = useMemo(() => {
    const set = new Set<string>();
    localItems.forEach((l) => {
      if (l.province) set.add(l.province);
    });
    return Array.from(set).sort();
  }, [localItems]);

  // Distritos filtrados según la provincia seleccionada
  const availableDistritos = useMemo(() => {
    return DISTRICTS.filter((d) => !province || d.province === province);
  }, [province]);

  // Conteo de locales por distrito
  const localCountByDistrict = useMemo(() => {
    const map = new Map<string, number>();
    localItems.forEach((l) => {
      map.set(l.district, (map.get(l.district) || 0) + 1);
    });
    return map;
  }, [localItems]);

  // Total de locales en el ámbito actual
  const totalLocalesInScope = useMemo(() => {
    return localItems.filter((l) => !province || l.province === province).length;
  }, [localItems, province]);

  // Estadísticas dinámicas de mesas dentro del ámbito seleccionado
  const mesaStats = useMemo(() => {
    let total = 0;
    let sinTitular = 0;
    let faltaSuplente = 0;
    let completas = 0;

    localItems.forEach((loc) => {
      if (province && loc.province !== province) return;
      if (district && loc.district !== district) return;

      loc.mesas.forEach((m) => {
        total++;
        const hasTitular = !!(m.titular || (m.personero && !m.personero.isSuplente ? m.personero : null));
        const hasSuplente = !!(m.suplente || (m.personero && m.personero.isSuplente ? m.personero : null));

        if (!hasTitular) {
          sinTitular++;
        } else if (!hasSuplente) {
          faltaSuplente++;
        } else {
          completas++;
        }
      });
    });

    return { total, sinTitular, faltaSuplente, completas };
  }, [localItems, province, district]);

  // Estadísticas dinámicas de colegios dentro del ámbito seleccionado
  const colegioStats = useMemo(() => {
    const inScope = localItems.filter((loc) => {
      if (province && loc.province !== province) return false;
      if (district && loc.district !== district) return false;
      return true;
    });
    const withCoord = inScope.filter((l) => !!l.coordinatorName).length;
    return {
      total: inScope.length,
      withCoord,
      withoutCoord: inScope.length - withCoord,
    };
  }, [localItems, province, district]);

  const hasActiveFilters = q || district || province || filterStatus !== "all" || coordFilter !== "all";

  function clearFilters() {
    setQ("");
    setDistrict("");
    setProvince("");
    setFilterStatus("all");
    setCoordFilter("all");
  }

  return (
    <div className="mesas-matrix-container">
      {/* Barra de Búsqueda y Filtros */}
      <div className="mesas-filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por N° de mesa (ej. 067000), colegio o personero..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <select
          value={province}
          onChange={(e) => {
            const nextProv = e.target.value;
            setProvince(nextProv);
            if (nextProv && district) {
              const d = DISTRICTS.find((item) => item.id === district);
              if (d && d.province !== nextProv) setDistrict("");
            }
          }}
          className="filter-select"
        >
          <option value="">Todas las Provincias ({availableProvincias.length})</option>
          {availableProvincias.map((p) => {
            const count = localItems.filter((l) => l.province === p).length;
            return (
              <option key={p} value={p}>
                {p} ({count} {count === 1 ? "local" : "locales"})
              </option>
            );
          })}
        </select>

        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="filter-select"
        >
          <option value="">Todos los Distritos ({totalLocalesInScope} locales)</option>
          {availableDistritos.map((d) => {
            const count = localCountByDistrict.get(d.id) || 0;
            return (
              <option key={d.id} value={d.id}>
                {d.label} ({count} {count === 1 ? "local" : "locales"})
              </option>
            );
          })}
        </select>

        <div className="status-pills">
          <button
            type="button"
            className={`status-pill ${filterStatus === "all" ? "status-pill--active" : ""}`}
            onClick={() => setFilterStatus("all")}
          >
            Todas ({mesaStats.total})
          </button>
          <button
            type="button"
            className={`status-pill status-pill--red ${filterStatus === "empty" ? "status-pill--active" : ""}`}
            onClick={() => setFilterStatus("empty")}
          >
            Sin Titular ({mesaStats.sinTitular})
          </button>
          <button
            type="button"
            className={`status-pill status-pill--yellow ${filterStatus === "without-suplente" ? "status-pill--active" : ""}`}
            onClick={() => setFilterStatus("without-suplente")}
          >
            Falta Suplente ({mesaStats.faltaSuplente})
          </button>
          <button
            type="button"
            className={`status-pill status-pill--green ${filterStatus === "full" ? "status-pill--active" : ""}`}
            onClick={() => setFilterStatus("full")}
          >
            100% Completas ({mesaStats.completas})
          </button>
        </div>

        {/* Filtro de Coordinadores de Colegio */}
        <div className="status-pills status-pills--coords" style={{ borderLeft: "1px solid var(--border, #cbd5e1)", paddingLeft: "8px" }}>
          <button
            type="button"
            className={`status-pill ${coordFilter === "all" ? "status-pill--active" : ""}`}
            onClick={() => setCoordFilter("all")}
          >
            Colegios ({colegioStats.total})
          </button>
          <button
            type="button"
            className={`status-pill status-pill--green ${coordFilter === "with" ? "status-pill--active" : ""}`}
            onClick={() => setCoordFilter("with")}
          >
            Con Coord. ({colegioStats.withCoord})
          </button>
          <button
            type="button"
            className={`status-pill status-pill--yellow ${coordFilter === "without" ? "status-pill--active" : ""}`}
            onClick={() => setCoordFilter("without")}
          >
            Sin Coord. ({colegioStats.withoutCoord})
          </button>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="btn btn--xs btn--outline"
            onClick={clearFilters}
            style={{ fontSize: "11px" }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Cuadrícula de Colegios y sus Mesas */}
      {filteredLocales.length === 0 ? (
        <div
          className="personeros__empty"
          style={{
            padding: "48px 16px",
            background: "var(--surface, #fff)",
            borderRadius: "14px",
            border: "1px dashed var(--border, #cbd5e1)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <Building2 size={36} style={{ color: "var(--text-muted, #94a3b8)" }} />
          <h4 style={{ margin: "0", fontSize: "16px", fontWeight: 700, color: "var(--text, #0f172a)" }}>
            No se encontraron colegios ni mesas
          </h4>
          <p style={{ margin: "0", fontSize: "13px", color: "var(--text-muted, #64748b)", maxWidth: "380px" }}>
            No hay locales que coincidan con los filtros de búsqueda o ubicación seleccionados.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={clearFilters}
              style={{ marginTop: "8px" }}
            >
              Restablecer filtros
            </button>
          )}
        </div>
      ) : (
        <div className="locales-cards-grid">
          {filteredLocales.map((loc) => {
            const pct = loc.totalMesas > 0 ? Math.round((loc.cubiertasCount / loc.totalMesas) * 100) : 0;
            return (
              <div key={loc.id} className="local-card">
                <div className="local-card__head">
                  <div>
                    <span className="local-card__district">
                      {loc.province} · {districtLabel(loc.district as any)}
                    </span>
                    <h3 className="local-card__name">{loc.name}</h3>
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {perms?.canWriteLocales !== false && (
                      <button
                        type="button"
                        className="btn btn--xs btn--outline"
                        onClick={() => openEditLocalModal(loc)}
                        title="Editar nombre, dirección o coordenadas GPS"
                      >
                        <Edit2 size={11} /> Editar
                      </button>
                    )}
                    <span
                      className={`badge ${
                        pct === 100 ? "badge--green" : pct > 0 ? "badge--amber" : "badge--red"
                      }`}
                    >
                      {loc.cubiertasCount}/{loc.totalMesas} mesas ({pct}%)
                    </span>
                  </div>
                </div>

                {loc.address && (
                  <div style={{ fontSize: "12px", color: "#64748b", display: "flex", gap: "4px", alignItems: "center" }}>
                    <MapPin size={13} /> {loc.address}
                    {loc.latitude && loc.longitude && (
                      <a
                        href={getGoogleMapsUrl(loc.latitude, loc.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="coord-wa-link"
                        style={{ fontSize: "11px", marginLeft: "6px" }}
                      >
                        <ExternalLink size={10} /> Maps
                      </a>
                    )}
                  </div>
                )}

                {/* Fila del Coordinador del Colegio */}
                <div className="local-card__coord-bar">
                  <div className="local-card__coord-info">
                    <UserCheck size={13} className={loc.coordinatorName ? "text-green" : "text-amber"} />
                    {loc.coordinatorName ? (
                      <span className="coord-text">
                        Coord: <strong>{loc.coordinatorName}</strong>
                        {loc.coordinatorPhone && (
                          <a
                            href={`https://wa.me/51${loc.coordinatorPhone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="coord-phone-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            ({loc.coordinatorPhone})
                          </a>
                        )}
                      </span>
                    ) : (
                      <span className="coord-text coord-text--missing">Sin coordinador asignado</span>
                    )}
                  </div>
                  {perms?.canWriteLocales !== false && (
                    <button
                      type="button"
                      className="btn btn--xs btn--outline"
                      onClick={() => openCoordModal(loc)}
                      title="Asignar o modificar el coordinador de este colegio"
                    >
                      {loc.coordinatorName ? "Editar Coord." : "+ Asignar Coord."}
                    </button>
                  )}
                </div>

                {/* Mini-cuadrícula de mesas de este colegio */}
                <div className="mesas-mini-grid">
                {loc.displayMesas.map((m) => {
                  const titular = m.titular || (m.personero && !m.personero.isSuplente ? m.personero : null);
                  const suplente = m.suplente || (m.personero && m.personero.isSuplente ? m.personero : null);

                  const hasTitular = !!titular;
                  const hasSuplente = !!suplente;

                  let pillClass = "mesa-mini-pill--empty";
                  if (hasTitular && hasSuplente) pillClass = "mesa-mini-pill--covered"; // Verde fuerte
                  else if (hasTitular) pillClass = "mesa-mini-pill--partial"; // Ámbar/azul
                  else if (hasSuplente) pillClass = "mesa-mini-pill--suplente-only";

                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`mesa-mini-pill ${pillClass}`}
                      onClick={() => {
                        setEditingMesaInline(false);
                        setMesaAula(m.aula || "");
                        setMesaPres(m.onpePresidente || "");
                        setMesaSec(m.onpeSecretario || "");
                        setMesaSupl(m.onpeSuplentes || "");
                        setSelectedMesa({ mesa: m, localName: loc.name, localId: loc.id });
                      }}
                      title={`Mesa ${m.number} | Titular: ${titular?.name || "Vacante"} | Suplente: ${suplente?.name || "Vacante"}`}
                    >
                      {m.number}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Modal de Detalle de Mesa seleccionada (Titular + Suplente + Aula + ONPE) */}
      {selectedMesa && (
        <div className="modal-backdrop" onClick={() => setSelectedMesa(null)}>
          <div className="modal" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <header className="modal__head">
              <div>
                <span className="badge badge--blue">Detalle de Mesa</span>
                <h3 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 800 }}>
                  Mesa N° {selectedMesa.mesa.number}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                  {selectedMesa.localName}
                </p>
              </div>
              <button type="button" className="btn-icon" onClick={() => setSelectedMesa(null)}>
                ✕
              </button>
            </header>

            <div className="modal__body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* PERSONERO TITULAR */}
              {(() => {
                const titular =
                  selectedMesa.mesa.titular ||
                  (selectedMesa.mesa.personero && !selectedMesa.mesa.personero.isSuplente
                    ? selectedMesa.mesa.personero
                    : null);

                return (
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="badge badge--green">Personero Titular</span>
                      {titular && perms?.canWriteMesas !== false && (
                        <button
                          type="button"
                          className="btn-link-danger"
                          onClick={() => handleUnassignPersonero(titular.id, selectedMesa.mesa.number, false)}
                        >
                          <Trash2 size={11} /> Desasignar
                        </button>
                      )}
                    </div>
                    {titular ? (
                      <div style={{ marginTop: "6px" }}>
                        <div style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                          {titular.name}
                        </div>
                        {titular.phone && (
                          <div style={{ marginTop: "4px" }}>
                            <a
                              href={`https://wa.me/51${titular.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="coord-phone-link"
                            >
                              <Phone size={12} /> {titular.phone} (WhatsApp)
                            </a>
                          </div>
                        )}
                        {perms?.canWriteMesas !== false && (
                          <button
                            type="button"
                            className="btn btn--xs btn--outline"
                            style={{ marginTop: "8px" }}
                            onClick={() => {
                              const mNum = selectedMesa.mesa.number;
                              const lName = selectedMesa.localName;
                              setSelectedMesa(null);
                              onAssignMesa?.(mNum, lName, "titular");
                            }}
                          >
                            Cambiar Titular
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "13px", color: "#64748b" }}>Sin personero titular</span>
                        {perms?.canWriteMesas !== false && (
                          <button
                            type="button"
                            className="btn btn--xs btn--primary"
                            onClick={() => {
                              const mNum = selectedMesa.mesa.number;
                              const lName = selectedMesa.localName;
                              setSelectedMesa(null);
                              onAssignMesa?.(mNum, lName, "titular");
                            }}
                          >
                            <Plus size={11} /> Asignar Titular
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* PERSONERO SUPLENTE */}
              {(() => {
                const suplente =
                  selectedMesa.mesa.suplente ||
                  (selectedMesa.mesa.personero && selectedMesa.mesa.personero.isSuplente
                    ? selectedMesa.mesa.personero
                    : null);

                return (
                  <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="badge badge--amber">Personero Suplente</span>
                      {suplente && perms?.canWriteMesas !== false && (
                        <button
                          type="button"
                          className="btn-link-danger"
                          onClick={() => handleUnassignPersonero(suplente.id, selectedMesa.mesa.number, true)}
                        >
                          <Trash2 size={11} /> Desasignar
                        </button>
                      )}
                    </div>
                    {suplente ? (
                      <div style={{ marginTop: "6px" }}>
                        <div style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                          {suplente.name}
                        </div>
                        {suplente.phone && (
                          <div style={{ marginTop: "4px" }}>
                            <a
                              href={`https://wa.me/51${suplente.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="coord-phone-link"
                            >
                              <Phone size={12} /> {suplente.phone} (WhatsApp)
                            </a>
                          </div>
                        )}
                        {perms?.canWriteMesas !== false && (
                          <button
                            type="button"
                            className="btn btn--xs btn--outline"
                            style={{ marginTop: "8px" }}
                            onClick={() => {
                              const mNum = selectedMesa.mesa.number;
                              const lName = selectedMesa.localName;
                              setSelectedMesa(null);
                              onAssignMesa?.(mNum, lName, "suplente");
                            }}
                          >
                            Cambiar Suplente
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "13px", color: "#64748b" }}>Sin personero suplente</span>
                        {perms?.canWriteMesas !== false && (
                          <button
                            type="button"
                            className="btn btn--xs btn--secondary"
                            onClick={() => {
                              const mNum = selectedMesa.mesa.number;
                              const lName = selectedMesa.localName;
                              setSelectedMesa(null);
                              onAssignMesa?.(mNum, lName, "suplente");
                            }}
                          >
                            <Plus size={11} /> Asignar Suplente
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* SECCIÓN AULA Y MIEMBROS ONPE */}
              <div style={{ background: "#f1f5f9", padding: "12px", borderRadius: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                    Ubicación y Autoridades ONPE
                  </span>
                  {!editingMesaInline && perms?.canWriteMesas !== false && (
                    <button
                      type="button"
                      className="btn btn--xs btn--outline"
                      onClick={() => setEditingMesaInline(true)}
                    >
                      <Edit2 size={11} /> Editar
                    </button>
                  )}
                </div>

                {editingMesaInline ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 600 }}>Aula / Pabellón</label>
                      <input
                        type="text"
                        className="input"
                        value={mesaAula}
                        onChange={(e) => setMesaAula(e.target.value)}
                        placeholder="Ej. Pabellón C - Aula 102"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 600 }}>Presidente de Mesa ONPE</label>
                      <input
                        type="text"
                        className="input"
                        value={mesaPres}
                        onChange={(e) => setMesaPres(e.target.value)}
                        placeholder="Nombre completo según padrón"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 600 }}>Secretario de Mesa ONPE</label>
                      <input
                        type="text"
                        className="input"
                        value={mesaSec}
                        onChange={(e) => setMesaSec(e.target.value)}
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 600 }}>Suplentes ONPE</label>
                      <input
                        type="text"
                        className="input"
                        value={mesaSupl}
                        onChange={(e) => setMesaSupl(e.target.value)}
                        placeholder="Nombres de suplentes"
                      />
                    </div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                      <button
                        type="button"
                        className="btn btn--xs btn--primary"
                        onClick={handleSaveMesaDetails}
                        disabled={savingMesa}
                      >
                        {savingMesa ? "Guardando..." : "Guardar Mesa"}
                      </button>
                      <button
                        type="button"
                        className="btn btn--xs btn--secondary"
                        onClick={() => setEditingMesaInline(false)}
                        disabled={savingMesa}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: "13px", color: "#334155", marginBottom: "4px" }}>
                      Aula: <strong>{selectedMesa.mesa.aula || "Por confirmar"}</strong>
                    </div>
                    {selectedMesa.mesa.onpePresidente && (
                      <div style={{ fontSize: "12px", color: "#475569" }}>
                        Presidente ONPE: <strong>{selectedMesa.mesa.onpePresidente}</strong>
                      </div>
                    )}
                    {selectedMesa.mesa.onpeSecretario && (
                      <div style={{ fontSize: "12px", color: "#475569" }}>
                        Secretario ONPE: <strong>{selectedMesa.mesa.onpeSecretario}</strong>
                      </div>
                    )}
                    {selectedMesa.mesa.onpeSuplentes && (
                      <div style={{ fontSize: "12px", color: "#475569" }}>
                        Suplentes ONPE: <strong>{selectedMesa.mesa.onpeSuplentes}</strong>
                      </div>
                    )}
                    {!selectedMesa.mesa.onpePresidente && !selectedMesa.mesa.onpeSecretario && (
                      <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                        Sin autoridades ONPE registradas para esta mesa.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <footer className="modal__foot" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Link
                href={`/personeros/acta?mesa=${selectedMesa.mesa.number}`}
                className="btn btn--primary"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
              >
                <Camera size={14} /> Subir Acta Mesa {selectedMesa.mesa.number}
              </Link>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setSelectedMesa(null)}
              >
                Cerrar
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Modal para Editar Colegio Completo */}
      {editingLocal && (
        <div className="modal-backdrop" onClick={() => !savingLocal && setEditingLocal(null)}>
          <div className="modal" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <header className="modal__head">
              <div>
                <span className="badge badge--blue">Editar Centro de Votación</span>
                <h3 style={{ margin: "4px 0 0", fontSize: "17px", fontWeight: 800 }}>
                  {editingLocal.name}
                </h3>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setEditingLocal(null)}
                disabled={savingLocal}
              >
                ✕
              </button>
            </header>

            <div className="modal__body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="field">
                <label className="field__label">
                  Nombre del Colegio <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <div className="field">
                  <label className="field__label">Código Local</label>
                  <input
                    type="text"
                    className="input"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field__label">Provincia</label>
                  <select
                    className="input"
                    value={editProvince}
                    onChange={(e) => setEditProvince(e.target.value)}
                  >
                    <option value="Tambopata">Tambopata</option>
                    <option value="Manu">Manu</option>
                    <option value="Tahuamanu">Tahuamanu</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field__label">Distrito</label>
                  <select
                    className="input"
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="field__label">Dirección</label>
                <input
                  type="text"
                  className="input"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                />
              </div>

              {/* Coordenadas */}
              <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <label className="field__label" style={{ fontSize: "11px" }}>
                  Pegar URL de Google Maps o Coordenadas directas
                </label>
                <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="URL de Google Maps o '-12.5933, -69.1891'"
                    value={mapsInput}
                    onChange={(e) => setMapsInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn--xs btn--secondary"
                    onClick={handleParseMapsLink}
                  >
                    Extraer
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#64748b" }}>Latitud</label>
                    <input
                      type="text"
                      className="input"
                      value={editLat}
                      onChange={(e) => setEditLat(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#64748b" }}>Longitud</label>
                    <input
                      type="text"
                      className="input"
                      value={editLng}
                      onChange={(e) => setEditLng(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {localEditMsg && (
                <div className={`coord-alert coord-alert--${localEditMsg.kind}`}>
                  {localEditMsg.text}
                </div>
              )}
            </div>

            <footer className="modal__foot">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setEditingLocal(null)}
                disabled={savingLocal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSaveLocal}
                disabled={savingLocal}
              >
                <Save size={13} /> {savingLocal ? "Guardando..." : "Guardar Cambios"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Modal para Asignar / Editar Coordinador del Colegio */}
      {editingLocalCoord && (
        <div className="modal-backdrop" onClick={() => setEditingLocalCoord(null)}>
          <div className="modal" style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
            <header className="modal__head">
              <div>
                <span className="badge badge--blue">Coordinación de Colegio</span>
                <h3 style={{ margin: "6px 0 0", fontSize: "17px", fontWeight: 800 }}>
                  {editingLocalCoord.coordinatorName ? "Modificar Coordinador" : "Asignar Coordinador de Colegio"}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                  {editingLocalCoord.name} ({editingLocalCoord.totalMesas} mesas)
                </p>
              </div>
              <button type="button" className="btn-icon" onClick={() => setEditingLocalCoord(null)}>
                ✕
              </button>
            </header>

            <div className="modal__body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <p style={{ fontSize: "13px", color: "#475569", lineHeight: 1.4, margin: 0 }}>
                El coordinador es el responsable de supervisar este centro de votación. Su nombre y número de WhatsApp aparecerán directamente en la credencial digital de los personeros para que puedan comunicarse inmediatamente.
              </p>

              <div className="field">
                <label className="field__label">
                  Nombre Completo del Coordinador <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej. Juan Carlos Pérez Quispe"
                  value={coordName}
                  onChange={(e) => setCoordName(e.target.value)}
                  autoFocus
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
                  value={coordPhone}
                  onChange={(e) => setCoordPhone(e.target.value)}
                />
              </div>

              {coordError && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "8px 12px", borderRadius: "6px", color: "#b91c1c", fontSize: "12px" }}>
                  {coordError}
                </div>
              )}
            </div>

            <footer className="modal__foot">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setEditingLocalCoord(null)}
                disabled={savingCoord}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSaveLocalCoord}
                disabled={savingCoord}
              >
                {savingCoord ? "Guardando..." : "Guardar Coordinador"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
