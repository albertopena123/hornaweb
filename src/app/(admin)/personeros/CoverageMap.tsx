"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import {
  Building2,
  MapPin,
  Vote,
  Phone,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ExternalLink,
  ChevronRight,
  Search,
  Filter,
  X,
  Plus,
  Edit2,
  Crosshair,
  Trash2,
  Save,
  Check,
} from "lucide-react";
import type { ElectoralLocalData, PersoneroRow, PermFlags } from "./types";
import { DISTRICTS, districtLabel } from "@/lib/districts";
import {
  updateLocal,
  updateLocalCoordinates,
  updateLocalCoordinator,
  updateMesa,
  unassignPersoneroFromMesa,
} from "./actions";
import { parseCoordinates, getGoogleMapsUrl } from "@/lib/geo";
import { confirmAction, toastSuccess, toastError } from "@/lib/alerts";

type Props = {
  locales: ElectoralLocalData[];
  personeros: PersoneroRow[];
  onAssignMesa?: (mesaNum: string, localName: string, role?: "titular" | "suplente") => void;
  onCoordinatorUpdated?: (localId: string, name: string, phone: string) => void;
  onLocalUpdated?: (local: ElectoralLocalData) => void;
  perms?: PermFlags;
};

export function CoverageMap({
  locales,
  personeros,
  onAssignMesa,
  onCoordinatorUpdated,
  onLocalUpdated,
  perms,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const tempMarkerRef = useRef<any>(null);

  const [localItems, setLocalItems] = useState<ElectoralLocalData[]>(locales);
  useEffect(() => {
    setLocalItems(locales);
  }, [locales]);

  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);
  const [provinceFilter, setProvinceFilter] = useState<string>("");
  const [districtFilter, setDistrictFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "full" | "partial" | "empty">("all");
  const [search, setSearch] = useState("");
  const [mesaTab, setMesaTab] = useState<"all" | "empty" | "assigned">("all");

  // Estado para editar coordinador del colegio
  const [editingCoord, setEditingCoord] = useState(false);
  const [coordName, setCoordName] = useState("");
  const [coordPhone, setCoordPhone] = useState("");
  const [savingCoord, setSavingCoord] = useState(false);
  const [coordMsg, setCoordMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Estado para editar colegio y coordenadas GPS
  const [editingLocal, setEditingLocal] = useState<ElectoralLocalData | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editDistrict, setEditDistrict] = useState("");
  const [editProvince, setEditProvince] = useState("Tambopata");
  const [editLat, setEditLat] = useState<string>("");
  const [editLng, setEditLng] = useState<string>("");
  const [mapsInput, setMapsInput] = useState("");
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [savingLocal, setSavingLocal] = useState(false);
  const [localEditMsg, setLocalEditMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Estado para editar mesa puntual (aula, ONPE)
  const [editingMesa, setEditingMesa] = useState<{ number: string; aula: string; pres: string; sec: string; supl: string } | null>(null);
  const [savingMesa, setSavingMesa] = useState(false);

  const selectedLocal = useMemo(
    () => localItems.find((l) => l.id === selectedLocalId) ?? null,
    [localItems, selectedLocalId]
  );

  useEffect(() => {
    if (selectedLocal) {
      setCoordName(selectedLocal.coordinatorName || "");
      setCoordPhone(selectedLocal.coordinatorPhone || "");
      setEditingCoord(false);
      setCoordMsg(null);
    }
  }, [selectedLocalId]);

  // Modal de edición de colegio
  function handleOpenEditLocal(loc: ElectoralLocalData) {
    setEditingLocal(loc);
    setEditName(loc.name);
    setEditCode(loc.code || "");
    setEditAddress(loc.address || "");
    setEditDistrict(loc.district || "");
    setEditProvince(loc.province || "Tambopata");
    setEditLat(loc.latitude !== null ? String(loc.latitude) : "");
    setEditLng(loc.longitude !== null ? String(loc.longitude) : "");
    setMapsInput("");
    setIsPickingLocation(false);
    setLocalEditMsg(null);
  }

  function handleParseMapsLink() {
    const parsed = parseCoordinates(mapsInput);
    if (parsed) {
      setEditLat(String(parsed.lat));
      setEditLng(String(parsed.lng));
      setLocalEditMsg({ kind: "success", text: `Coordenadas extraídas: ${parsed.lat.toFixed(6)}, ${parsed.lng.toFixed(6)}` });

      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo([parsed.lat, parsed.lng], { animate: true });
        updateTempMarker(parsed.lat, parsed.lng);
      }
    } else {
      setLocalEditMsg({ kind: "error", text: "No se reconocieron coordenadas en el texto o enlace ingresado." });
    }
  }

  function updateTempMarker(lat: number, lng: number) {
    if (!mapInstanceRef.current) return;
    import("leaflet").then(({ default: L }) => {
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
      }
      const marker = L.marker([lat, lng], {
        draggable: true,
        title: "Nueva ubicación",
      }).addTo(mapInstanceRef.current);

      marker.on("dragend", (e: any) => {
        const pos = e.target.getLatLng();
        setEditLat(String(pos.lat));
        setEditLng(String(pos.lng));
      });

      tempMarkerRef.current = marker;
    });
  }

  function startLocationPicker() {
    setIsPickingLocation(true);
    setLocalEditMsg({
      kind: "success",
      text: "Haz clic en cualquier punto del mapa para fijar la ubicación del colegio.",
    });
  }

  function cancelLocationPicker() {
    setIsPickingLocation(false);
    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove();
      tempMarkerRef.current = null;
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
      setIsPickingLocation(false);
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
    } else {
      setLocalEditMsg({ kind: "error", text: res.error || "Error al actualizar el colegio." });
    }
    setSavingLocal(false);
  }

  async function handleSaveCoordinator() {
    if (!selectedLocal) return;
    if (!coordName.trim()) {
      setCoordMsg({ kind: "error", text: "Ingresa el nombre del coordinador." });
      return;
    }
    setSavingCoord(true);
    setCoordMsg(null);
    const res = await updateLocalCoordinator(selectedLocal.id, coordName.trim(), coordPhone.trim());
    if (res.ok) {
      setLocalItems((prev) =>
        prev.map((loc) =>
          loc.id === selectedLocal.id
            ? { ...loc, coordinatorName: coordName.trim(), coordinatorPhone: coordPhone.trim() }
            : loc
        )
      );
      setEditingCoord(false);
      setCoordMsg({ kind: "success", text: "Coordinador de colegio guardado correctamente." });
      onCoordinatorUpdated?.(selectedLocal.id, coordName.trim(), coordPhone.trim());
    } else {
      setCoordMsg({ kind: "error", text: res.error || "No se pudo guardar." });
    }
    setSavingCoord(false);
  }

  async function handleUnassign(personeroId: string, mesaNum: string, isSupl: boolean) {
    const roleLabel = isSupl ? "personero suplente" : "personero titular";
    const confirmed = await confirmAction({
      title: "¿Desasignar personero?",
      text: `¿Estás seguro de retirar al ${roleLabel} de la mesa ${mesaNum}?`,
      confirmButtonText: "Sí, desasignar",
      isDanger: true,
    });
    if (!confirmed) return;

    const res = await unassignPersoneroFromMesa(personeroId);
    if (res.ok) {
      toastSuccess("Personero desasignado correctamente");
      if (selectedLocal) {
        // Actualizar estado local
        setLocalItems((prev) =>
          prev.map((loc) => {
            if (loc.id !== selectedLocal.id) return loc;
            const updatedMesas = loc.mesas.map((m) => {
              if (m.number !== mesaNum) return m;
              return {
                ...m,
                titular: isSupl ? m.titular : null,
                suplente: isSupl ? null : m.suplente,
                personero: isSupl ? (m.titular || null) : (m.suplente || null),
              };
            });
            const cubiertas = updatedMesas.filter((m) => !!m.titular || (!m.titular && !!m.suplente)).length;
            return { ...loc, mesas: updatedMesas, cubiertasCount: cubiertas };
          })
        );
      }
    } else {
      toastError(res.error || "No se pudo desasignar al personero");
    }
  }

  async function handleSaveMesa() {
    if (!editingMesa) return;
    setSavingMesa(true);
    const res = await updateMesa(editingMesa.number, {
      aula: editingMesa.aula,
      onpePresidente: editingMesa.pres,
      onpeSecretario: editingMesa.sec,
      onpeSuplentes: editingMesa.supl,
    });
    if (res.ok && selectedLocal) {
      setLocalItems((prev) =>
        prev.map((loc) => {
          if (loc.id !== selectedLocal.id) return loc;
          return {
            ...loc,
            mesas: loc.mesas.map((m) =>
              m.number === editingMesa.number
                ? {
                    ...m,
                    aula: editingMesa.aula || null,
                    onpePresidente: editingMesa.pres || null,
                    onpeSecretario: editingMesa.sec || null,
                    onpeSuplentes: editingMesa.supl || null,
                  }
                : m
            ),
          };
        })
      );
      setEditingMesa(null);
    }
    setSavingMesa(false);
  }

  // Provincias únicas ordenadas
  const availableProvincias = useMemo(() => {
    const set = new Set<string>();
    localItems.forEach((l) => {
      if (l.province) set.add(l.province);
    });
    return Array.from(set).sort();
  }, [localItems]);

  // Distritos filtrados según provincia
  const availableDistritos = useMemo(() => {
    return DISTRICTS.filter((d) => !provinceFilter || d.province === provinceFilter);
  }, [provinceFilter]);

  // Conteo de locales por distrito
  const localCountByDistrict = useMemo(() => {
    const map = new Map<string, number>();
    localItems.forEach((l) => {
      map.set(l.district, (map.get(l.district) || 0) + 1);
    });
    return map;
  }, [localItems]);

  const totalLocalesInScope = useMemo(() => {
    return localItems.filter((l) => !provinceFilter || l.province === provinceFilter).length;
  }, [localItems, provinceFilter]);

  // Conteo de estados dinámicos dentro del ámbito de provincia/distrito
  const statusCounts = useMemo(() => {
    let all = 0;
    let empty = 0;
    let partial = 0;
    let full = 0;

    localItems.forEach((l) => {
      if (provinceFilter && l.province !== provinceFilter) return;
      if (districtFilter && l.district !== districtFilter) return;

      all++;
      const isFull = l.cubiertasCount >= l.totalMesas && l.totalMesas > 0;
      const isEmpty = l.cubiertasCount === 0;
      if (isEmpty) empty++;
      else if (isFull) full++;
      else partial++;
    });

    return { all, empty, partial, full };
  }, [localItems, provinceFilter, districtFilter]);

  // Filtrado de locales
  const filteredLocales = useMemo(() => {
    const q = search.trim().toLowerCase();
    return localItems.filter((l) => {
      const matchProvince = provinceFilter === "" || l.province === provinceFilter;
      const matchDistrict = districtFilter === "" || l.district === districtFilter;
      const matchSearch = q === "" || l.name.toLowerCase().includes(q) || (l.address && l.address.toLowerCase().includes(q));

      const isFull = l.cubiertasCount >= l.totalMesas && l.totalMesas > 0;
      const isEmpty = l.cubiertasCount === 0;
      const isPartial = !isFull && !isEmpty;

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "full" && isFull) ||
        (statusFilter === "partial" && isPartial) ||
        (statusFilter === "empty" && isEmpty);

      return matchProvince && matchDistrict && matchSearch && matchStatus;
    });
  }, [localItems, search, provinceFilter, districtFilter, statusFilter]);

  // Inicializar Leaflet
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import("leaflet")).default;

      const map = L.map(mapContainerRef.current, {
        center: [-12.5933, -69.1891],
        zoom: 9,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Listener de clic para ubicación interactiva
      map.on("click", (e: any) => {
        if (mapContainerRef.current?.getAttribute("data-picking") === "true") {
          const { lat, lng } = e.latlng;
          setEditLat(lat.toFixed(6));
          setEditLng(lng.toFixed(6));
          updateTempMarker(lat, lng);
        }
      });

      updateMarkers(L, map, markersGroup, filteredLocales);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Actualizar atributo data-picking en el contenedor para el cursor y clicks
  useEffect(() => {
    if (mapContainerRef.current) {
      mapContainerRef.current.setAttribute("data-picking", isPickingLocation ? "true" : "false");
    }
  }, [isPickingLocation]);

  // Actualizar marcadores cuando cambian los locales filtrados
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;
    import("leaflet").then(({ default: L }) => {
      updateMarkers(L, mapInstanceRef.current, markersGroupRef.current, filteredLocales);
    });
  }, [filteredLocales]);

  function updateMarkers(L: any, map: any, group: any, locs: ElectoralLocalData[]) {
    group.clearLayers();

    locs.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;

      const pct = loc.totalMesas > 0 ? Math.round((loc.cubiertasCount / loc.totalMesas) * 100) : 0;
      let color = "#ef4444";
      let statusClass = "map-pin--red";

      if (pct === 100) {
        color = "#10b981";
        statusClass = "map-pin--green";
      } else if (pct > 0) {
        color = "#f59e0b";
        statusClass = "map-pin--yellow";
      }

      const iconHtml = `
        <div class="map-pin ${statusClass}" title="${loc.name} (${loc.cubiertasCount}/${loc.totalMesas} mesas)">
          <div class="map-pin__circle">
            <span class="map-pin__count">${loc.cubiertasCount}/${loc.totalMesas}</span>
          </div>
          <div class="map-pin__pulse" style="background-color: ${color}"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: "custom-leaflet-pin",
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon });

      marker.on("click", () => {
        setSelectedLocalId(loc.id);
        map.panTo([loc.latitude, loc.longitude], { animate: true });
      });

      group.addLayer(marker);
    });
  }

  // Filtrado de mesas en el panel lateral
  const visibleMesas = useMemo(() => {
    if (!selectedLocal) return [];
    return selectedLocal.mesas.filter((m) => {
      const hasTitular = !!m.titular || (!!m.personero && !m.personero.isSuplente);
      const hasSuplente = !!m.suplente || (!!m.personero && m.personero.isSuplente);
      if (mesaTab === "empty") return !hasTitular;
      if (mesaTab === "assigned") return hasTitular;
      return true;
    });
  }, [selectedLocal, mesaTab]);

  return (
    <div className="coverage-map-wrapper">
      {/* Banner flotante si está en modo selección interactiva de coordenadas */}
      {isPickingLocation && (
        <div className="map-picker-banner">
          <div className="picker-banner-text">
            <Crosshair size={18} className="spin-icon" />
            <span>
              <strong>Modo Ubicación Activo:</strong> Haz clic en el mapa para posicionar el colegio{" "}
              <em>{editingLocal?.name}</em>.
            </span>
          </div>
          <div className="picker-banner-coords">
            {editLat && editLng ? (
              <span className="badge badge--green" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <MapPin size={12} /> {parseFloat(editLat).toFixed(5)}, {parseFloat(editLng).toFixed(5)}
              </span>
            ) : (
              <span className="badge badge--amber">Esperando clic en el mapa...</span>
            )}
            <button type="button" className="btn btn--xs btn--secondary" onClick={cancelLocationPicker}>
              Finalizar / Volver
            </button>
          </div>
        </div>
      )}

      {/* Barra de Filtros Superiores */}
      <div className="coverage-map-toolbar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar colegio, código o dirección..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={provinceFilter}
          onChange={(e) => {
            const nextProv = e.target.value;
            setProvinceFilter(nextProv);
            if (nextProv && districtFilter) {
              const d = DISTRICTS.find((item) => item.id === districtFilter);
              if (d && d.province !== nextProv) setDistrictFilter("");
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
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
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
            className={`status-pill ${statusFilter === "all" ? "status-pill--active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            Todos ({statusCounts.all})
          </button>
          <button
            type="button"
            className={`status-pill status-pill--red ${statusFilter === "empty" ? "status-pill--active" : ""}`}
            onClick={() => setStatusFilter("empty")}
          >
            Sin personeros ({statusCounts.empty})
          </button>
          <button
            type="button"
            className={`status-pill status-pill--yellow ${statusFilter === "partial" ? "status-pill--active" : ""}`}
            onClick={() => setStatusFilter("partial")}
          >
            Parciales ({statusCounts.partial})
          </button>
          <button
            type="button"
            className={`status-pill status-pill--green ${statusFilter === "full" ? "status-pill--active" : ""}`}
            onClick={() => setStatusFilter("full")}
          >
            100% Cubiertos ({statusCounts.full})
          </button>
        </div>

        {(search || provinceFilter || districtFilter || statusFilter !== "all") && (
          <button
            type="button"
            className="btn btn--xs btn--outline"
            onClick={() => {
              setSearch("");
              setProvinceFilter("");
              setDistrictFilter("");
              setStatusFilter("all");
            }}
            style={{ fontSize: "11px" }}
          >
            Limpiar filtros
          </button>
        )}

        <div className="coverage-counter-badge">
          Mostrando <strong>{filteredLocales.length}</strong> de {localItems.length} locales
        </div>
      </div>

      {/* Contenedor del Mapa y Panel Lateral */}
      <div className="coverage-map-main">
        {/* Contenedor Leaflet */}
        <div
          className={`leaflet-map-canvas ${isPickingLocation ? "leaflet-map-canvas--crosshair" : ""}`}
          ref={mapContainerRef}
        />

        {/* Panel Lateral Deslizable de Detalle del Colegio */}
        {selectedLocal && (
          <>
            <div
              className="local-drawer-backdrop"
              onClick={() => setSelectedLocalId(null)}
              aria-hidden="true"
            />
            <aside className="local-drawer">
            <header className="local-drawer__head">
              <div className="local-drawer__title-area">
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span className="local-drawer__district">
                    {selectedLocal.province} · {districtLabel(selectedLocal.district as any)}
                  </span>
                  {selectedLocal.code && (
                    <span className="badge badge--neutral" style={{ fontSize: "10px" }}>
                      Cod: {selectedLocal.code}
                    </span>
                  )}
                </div>
                <h2 className="local-drawer__name">{selectedLocal.name}</h2>
                {selectedLocal.address && (
                  <p className="local-drawer__addr">
                    <MapPin size={14} /> {selectedLocal.address}
                  </p>
                )}
                {selectedLocal.latitude && selectedLocal.longitude ? (
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
                    <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "monospace" }}>
                      GPS: {selectedLocal.latitude.toFixed(5)}, {selectedLocal.longitude.toFixed(5)}
                    </span>
                    <a
                      href={getGoogleMapsUrl(selectedLocal.latitude, selectedLocal.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="coord-wa-link"
                      style={{ fontSize: "11px" }}
                    >
                      <ExternalLink size={10} /> Google Maps
                    </a>
                  </div>
                ) : (
                  <span className="badge badge--amber" style={{ marginTop: "4px", fontSize: "10px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <AlertCircle size={11} /> Sin coordenadas GPS registradas
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                {perms?.canWriteLocales !== false && (
                  <button
                    type="button"
                    className="btn btn--xs btn--outline"
                    onClick={() => handleOpenEditLocal(selectedLocal)}
                    title="Editar nombre, dirección y coordenadas GPS del colegio"
                  >
                    <Edit2 size={12} /> Editar Colegio
                  </button>
                )}
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setSelectedLocalId(null)}
                  title="Cerrar panel"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            {/* Barra de Progreso de Cobertura */}
            <div className="local-drawer__progress-card">
              <div className="progress-card__header">
                <span className="progress-card__label">Cobertura de Mesas (Titulares)</span>
                <span className="progress-card__stat">
                  <strong>{selectedLocal.cubiertasCount}</strong> de {selectedLocal.totalMesas} mesas (
                  {Math.round((selectedLocal.cubiertasCount / Math.max(1, selectedLocal.totalMesas)) * 100)}%)
                </span>
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      (selectedLocal.cubiertasCount / Math.max(1, selectedLocal.totalMesas)) * 100
                    )}%`,
                    backgroundColor:
                      selectedLocal.cubiertasCount === selectedLocal.totalMesas
                        ? "#10b981"
                        : selectedLocal.cubiertasCount > 0
                        ? "#f59e0b"
                        : "#ef4444",
                  }}
                />
              </div>
            </div>

            {/* Coordinador del Colegio / Local */}
            <div className="local-drawer__coord-card">
              <div className="drawer-coord-header">
                <div className="drawer-coord-title">
                  <UserCheck size={16} className="text-brand-accent" />
                  <span>Coordinador de Colegio</span>
                </div>
                {!editingCoord && perms?.canWriteLocales !== false && (
                  <button
                    type="button"
                    className="btn btn--xs btn--outline"
                    onClick={() => {
                      setCoordName(selectedLocal.coordinatorName || "");
                      setCoordPhone(selectedLocal.coordinatorPhone || "");
                      setEditingCoord(true);
                    }}
                  >
                    {selectedLocal.coordinatorName ? "Cambiar" : "+ Asignar"}
                  </button>
                )}
              </div>

              {editingCoord ? (
                <div className="coord-edit-form">
                  <input
                    type="text"
                    placeholder="Nombre completo del coordinador"
                    value={coordName}
                    onChange={(e) => setCoordName(e.target.value)}
                    className="coord-input"
                  />
                  <input
                    type="tel"
                    placeholder="Celular / WhatsApp (ej. 982136949)"
                    value={coordPhone}
                    onChange={(e) => setCoordPhone(e.target.value)}
                    className="coord-input"
                  />
                  {coordMsg && (
                    <div className={`coord-alert coord-alert--${coordMsg.kind}`}>
                      {coordMsg.text}
                    </div>
                  )}
                  <div className="coord-actions">
                    <button
                      type="button"
                      className="btn btn--xs btn--primary"
                      onClick={handleSaveCoordinator}
                      disabled={savingCoord}
                    >
                      {savingCoord ? "Guardando..." : "Guardar Coordinador"}
                    </button>
                    <button
                      type="button"
                      className="btn btn--xs btn--secondary"
                      onClick={() => setEditingCoord(false)}
                      disabled={savingCoord}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : selectedLocal.coordinatorName ? (
                <div className="coord-assigned-view">
                  <div className="coord-name-row">
                    <strong className="coord-name">{selectedLocal.coordinatorName}</strong>
                    <span className="badge badge--green">Encargado</span>
                  </div>
                  {selectedLocal.coordinatorPhone && (
                    <div className="coord-contact-row">
                      <a
                        href={`https://wa.me/51${selectedLocal.coordinatorPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `Hola ${selectedLocal.coordinatorName}, te escribo respecto al local ${selectedLocal.name} de Ahora Nación.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="coord-wa-link"
                      >
                        <Phone size={13} /> {selectedLocal.coordinatorPhone} (WhatsApp)
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="coord-empty-view">
                  <span className="badge badge--amber">Sin coordinador asignado</span>
                  <p className="coord-hint">
                    Asigna un encargado para que los personeros puedan contactarlo desde su credencial.
                  </p>
                </div>
              )}
            </div>

            {/* Sub-pestañas de mesas */}
            <div className="local-drawer__tabs">
              <button
                type="button"
                className={`drawer-tab ${mesaTab === "all" ? "drawer-tab--active" : ""}`}
                onClick={() => setMesaTab("all")}
              >
                Todas ({selectedLocal.mesas.length})
              </button>
              <button
                type="button"
                className={`drawer-tab ${mesaTab === "empty" ? "drawer-tab--active" : ""}`}
                onClick={() => setMesaTab("empty")}
              >
                Faltantes ({selectedLocal.totalMesas - selectedLocal.cubiertasCount})
              </button>
              <button
                type="button"
                className={`drawer-tab ${mesaTab === "assigned" ? "drawer-tab--active" : ""}`}
                onClick={() => setMesaTab("assigned")}
              >
                Cubiertas ({selectedLocal.cubiertasCount})
              </button>
            </div>

            {/* Lista detallada de Mesas (Titular y Suplente) */}
            <div className="local-drawer__mesas-list">
              {visibleMesas.map((mesa) => {
                const titular = mesa.titular || (mesa.personero && !mesa.personero.isSuplente ? mesa.personero : null);
                const suplente = mesa.suplente || (mesa.personero && mesa.personero.isSuplente ? mesa.personero : null);
                const isCovered = !!titular;

                return (
                  <div
                    key={mesa.id}
                    className={`mesa-card-item ${isCovered ? "mesa-card-item--covered" : "mesa-card-item--empty"}`}
                  >
                    <div className="mesa-card-item__top">
                      <div className="mesa-badge">
                        <Vote size={14} />
                        <span>Mesa {mesa.number}</span>
                        {mesa.aula && <span className="mesa-aula-tag">Aula: {mesa.aula}</span>}
                      </div>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <button
                          type="button"
                          className="btn-icon-xs"
                          onClick={() =>
                            setEditingMesa({
                              number: mesa.number,
                              aula: mesa.aula || "",
                              pres: mesa.onpePresidente || "",
                              sec: mesa.onpeSecretario || "",
                              supl: mesa.onpeSuplentes || "",
                            })
                          }
                          title="Editar aula o autoridades ONPE de la mesa"
                        >
                          <Edit2 size={11} />
                        </button>
                        {isCovered ? (
                          <span className="badge badge--green">
                            <CheckCircle2 size={12} /> Titular Asignado
                          </span>
                        ) : (
                          <span className="badge badge--red">
                            <AlertCircle size={12} /> Sin Titular
                          </span>
                        )}
                      </div>
                    </div>

                    {/* SECCIÓN PERSONERO TITULAR */}
                    <div className="mesa-role-box mesa-role-box--titular">
                      <div className="mesa-role-header">
                        <span className="role-tag role-tag--titular">Personero Titular</span>
                        {titular && perms?.canWriteMesas !== false && (
                          <button
                            type="button"
                            className="btn-link-danger"
                            onClick={() => handleUnassign(titular.id, mesa.number, false)}
                            title="Quitar asignación titular"
                          >
                            <Trash2 size={11} /> Quitar
                          </button>
                        )}
                      </div>
                      {titular ? (
                        <div className="personero-entry">
                          <div className="personero-name-row">
                            <UserCheck size={13} className="text-green" />
                            <strong className="personero-name">{titular.name}</strong>
                          </div>
                          {titular.phone && (
                            <a
                              href={`https://wa.me/51${titular.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="personero-phone-row"
                            >
                              <Phone size={12} /> {titular.phone}
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="empty-role-action">
                          <span>Vacante</span>
                          {perms?.canWriteMesas !== false && (
                            <button
                              type="button"
                              className="btn btn--xs btn--primary"
                              onClick={() => onAssignMesa?.(mesa.number, selectedLocal.name, "titular")}
                            >
                              <Plus size={11} /> Asignar Titular
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* SECCIÓN PERSONERO SUPLENTE */}
                    <div className="mesa-role-box mesa-role-box--suplente">
                      <div className="mesa-role-header">
                        <span className="role-tag role-tag--suplente">Personero Suplente</span>
                        {suplente && perms?.canWriteMesas !== false && (
                          <button
                            type="button"
                            className="btn-link-danger"
                            onClick={() => handleUnassign(suplente.id, mesa.number, true)}
                            title="Quitar asignación suplente"
                          >
                            <Trash2 size={11} /> Quitar
                          </button>
                        )}
                      </div>
                      {suplente ? (
                        <div className="personero-entry">
                          <div className="personero-name-row">
                            <UserCheck size={13} className="text-amber" />
                            <strong className="personero-name">{suplente.name}</strong>
                          </div>
                          {suplente.phone && (
                            <a
                              href={`https://wa.me/51${suplente.phone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="personero-phone-row"
                            >
                              <Phone size={12} /> {suplente.phone}
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="empty-role-action">
                          <span>Vacante</span>
                          {perms?.canWriteMesas !== false && (
                            <button
                              type="button"
                              className="btn btn--xs btn--secondary"
                              onClick={() => onAssignMesa?.(mesa.number, selectedLocal.name, "suplente")}
                            >
                              <Plus size={11} /> Asignar Suplente
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Miembros de Mesa ONPE */}
                    {(mesa.onpePresidente || mesa.onpeSecretario) && (
                      <div className="mesa-card-item__onpe">
                        <span className="onpe-title">Autoridades ONPE de la mesa:</span>
                        {mesa.onpePresidente && <div className="onpe-row">Pres: {mesa.onpePresidente}</div>}
                        {mesa.onpeSecretario && <div className="onpe-row">Sec: {mesa.onpeSecretario}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
          </>
        )}
      </div>

      {/* MODAL PARA EDITAR COLEGIO Y COORDENADAS GPS */}
      {editingLocal && (
        <div className="modal-backdrop" onClick={() => !savingLocal && setEditingLocal(null)}>
          <div className="modal" style={{ maxWidth: "580px" }} onClick={(e) => e.stopPropagation()}>
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

            <div className="modal__body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="field">
                <label className="field__label">
                  Nombre Oficial del Colegio / Local <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ej. I.E. Faustino Maldonado"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div className="field">
                  <label className="field__label">Código Local</label>
                  <input
                    type="text"
                    className="input"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    placeholder="Ej. 06701"
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
                <label className="field__label">Dirección / Referencia</label>
                <input
                  type="text"
                  className="input"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Ej. Jr. Lambayeque N° 450"
                />
              </div>

              {/* SECCIÓN COORDENADAS GPS */}
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <strong style={{ fontSize: "13px", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                    <MapPin size={15} className="text-brand-accent" /> Coordenadas GPS del Colegio
                  </strong>
                  <button
                    type="button"
                    className="btn btn--xs btn--primary"
                    onClick={startLocationPicker}
                    title="Fijar coordenadas haciendo clic sobre el mapa"
                  >
                    <Crosshair size={13} /> Ubicar en el mapa
                  </button>
                </div>

                <div className="field" style={{ marginBottom: "10px" }}>
                  <label className="field__label" style={{ fontSize: "11px" }}>
                    Pegar enlace o coordenadas de Google Maps
                  </label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="text"
                      className="input"
                      style={{ fontSize: "12px" }}
                      placeholder="Pega URL de Google Maps o '-12.5933, -69.1891'"
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
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div className="field">
                    <label className="field__label" style={{ fontSize: "11px" }}>Latitud (decimal)</label>
                    <input
                      type="text"
                      className="input"
                      value={editLat}
                      onChange={(e) => setEditLat(e.target.value)}
                      placeholder="-12.5933"
                    />
                  </div>
                  <div className="field">
                    <label className="field__label" style={{ fontSize: "11px" }}>Longitud (decimal)</label>
                    <input
                      type="text"
                      className="input"
                      value={editLng}
                      onChange={(e) => setEditLng(e.target.value)}
                      placeholder="-69.1891"
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
                <Save size={14} /> {savingLocal ? "Guardando cambios..." : "Guardar Colegio"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL PARA EDITAR AULA Y AUTORIDADES ONPE DE MESA */}
      {editingMesa && (
        <div className="modal-backdrop" onClick={() => !savingMesa && setEditingMesa(null)}>
          <div className="modal" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
            <header className="modal__head">
              <div>
                <span className="badge badge--blue">Editar Mesa Electoral</span>
                <h3 style={{ margin: "4px 0 0", fontSize: "17px", fontWeight: 800 }}>
                  Mesa N° {editingMesa.number}
                </h3>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setEditingMesa(null)}
                disabled={savingMesa}
              >
                ✕
              </button>
            </header>

            <div className="modal__body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="field">
                <label className="field__label">Aula / Pabellón</label>
                <input
                  type="text"
                  className="input"
                  value={editingMesa.aula}
                  onChange={(e) => setEditingMesa({ ...editingMesa, aula: e.target.value })}
                  placeholder="Ej. Pabellón B - Aula 204"
                />
              </div>

              <div className="field">
                <label className="field__label">Presidente de Mesa (ONPE)</label>
                <input
                  type="text"
                  className="input"
                  value={editingMesa.pres}
                  onChange={(e) => setEditingMesa({ ...editingMesa, pres: e.target.value })}
                  placeholder="Nombre según padrón ONPE"
                />
              </div>

              <div className="field">
                <label className="field__label">Secretario de Mesa (ONPE)</label>
                <input
                  type="text"
                  className="input"
                  value={editingMesa.sec}
                  onChange={(e) => setEditingMesa({ ...editingMesa, sec: e.target.value })}
                  placeholder="Nombre según padrón ONPE"
                />
              </div>

              <div className="field">
                <label className="field__label">Suplentes ONPE</label>
                <input
                  type="text"
                  className="input"
                  value={editingMesa.supl}
                  onChange={(e) => setEditingMesa({ ...editingMesa, supl: e.target.value })}
                  placeholder="Nombres de suplentes"
                />
              </div>
            </div>

            <footer className="modal__foot">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setEditingMesa(null)}
                disabled={savingMesa}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSaveMesa}
                disabled={savingMesa}
              >
                {savingMesa ? "Guardando..." : "Guardar Mesa"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
