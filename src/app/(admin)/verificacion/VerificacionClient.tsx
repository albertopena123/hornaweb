"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Phone,
  MessageSquare,
  Building2,
  MapPin,
  Vote,
  ExternalLink,
  Filter,
  Check,
  X,
  UserCheck,
  Eye,
  Tv,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Image as ImageIcon,
  Table,
  Layers,
  Move,
  PanelLeftClose,
  PanelLeftOpen,
  Expand,
  Shrink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import "./verificacion.css";
import { approveActa, observeActa } from "./actions";

type Props = {
  user: any;
  initialActas: any[];
  candidates: any[];
};

export function VerificacionClient({ user, initialActas, candidates }: Props) {
  const [actas, setActas] = useState(initialActas);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialActas.find((a) => a.status === "enviada" || a.status === "en_revision")?.id || initialActas[0]?.id || null
  );

  const [tabFilter, setTabFilter] = useState<"pending" | "approved" | "observed" | "all">("pending");
  const [electionFilter, setElectionFilter] = useState<"all" | "gobernador" | "provincial">("all");
  const [searchMesa, setSearchMesa] = useState("");

  // Maximizar espacio para cotejo
  const [queueCollapsed, setQueueCollapsed] = useState(false);
  const [fitMode, setFitMode] = useState<"width" | "contain">("width");
  const [statsCollapsed, setStatsCollapsed] = useState(false);

  // Controles de inspección de imagen (Zoom, Rotación y Panorámica/Arrastre)
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Modo Pantalla Completa / Lightbox Gigante
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Vistas Móviles
  const [mobileTab, setMobileTab] = useState<"queue" | "inspect">("inspect");
  const [mobileInspectSubtab, setMobileInspectSubtab] = useState<"both" | "photo" | "votes">("both");

  // Referencias a los contenedores para captura nativa de wheel
  const viewportRef = useRef<HTMLDivElement>(null);
  const lightboxCanvasRef = useRef<HTMLDivElement>(null);

  // Modal de Observación
  const [showObserveModal, setShowObserveModal] = useState(false);
  const [observeReason, setObserveReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const selectedActa = useMemo(
    () => actas.find((a) => a.id === selectedId) ?? null,
    [actas, selectedId]
  );

  // Resetear zoom y pan
  const resetZoom = () => {
    setZoomLevel(1);
    setRotation(0);
    setPanPosition({ x: 0, y: 0 });
  };

  // Manejadores de arrastre con mouse (Pan)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - panPosition.x,
      y: e.clientY - panPosition.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Manejadores de arrastre táctil (Móviles / Tablets)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - panPosition.x,
        y: e.touches[0].clientY - panPosition.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPanPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Doble click para alternar entre 100% y 250%
  const handleDoubleClick = () => {
    if (zoomLevel > 1.2) {
      resetZoom();
    } else {
      setZoomLevel(2.5);
    }
  };

  // Zoom con rueda del mouse en el viewport principal (PC)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      setZoomLevel((prev) => {
        const next = Math.round((prev + delta) * 10) / 10;
        return Math.min(Math.max(next, 0.6), 5.0);
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [selectedActa, fitMode]);

  // Zoom con rueda del mouse en el lightbox de pantalla completa (PC)
  useEffect(() => {
    const el = lightboxCanvasRef.current;
    if (!el || !isFullscreen) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.25 : -0.25;
      setZoomLevel((prev) => {
        const next = Math.round((prev + delta) * 10) / 10;
        return Math.min(Math.max(next, 0.6), 6.0);
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isFullscreen]);

  // Cerrar lightbox con tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Filtrar cola de actas
  const filteredQueue = useMemo(() => {
    const q = searchMesa.trim().toLowerCase();
    return actas.filter((a) => {
      const matchMesa = q === "" || a.mesaNumber.includes(q) || a.local?.name?.toLowerCase().includes(q);
      const isPending = a.status === "enviada" || a.status === "en_revision";
      const isApproved = a.status === "aprobada";
      const isObserved = a.status === "observada";

      if (tabFilter === "pending" && !isPending) return false;
      if (tabFilter === "approved" && !isApproved) return false;
      if (tabFilter === "observed" && !isObserved) return false;

      const eType = a.electionType || "gobernador";
      if (electionFilter !== "all" && eType !== electionFilter) return false;

      return matchMesa;
    });
  }, [actas, tabFilter, electionFilter, searchMesa]);

  // Candidatos activos para el acta seleccionada (gobernador vs provincial)
  const activeCandidatesForActa = useMemo(() => {
    if (!selectedActa) return [];
    const eType = selectedActa.electionType || "gobernador";
    if (eType === "gobernador") {
      return candidates.filter((c) => c.cargo === "gobernador");
    }
    const prov = selectedActa.local?.province || "Tambopata";
    return candidates.filter(
      (c) => c.cargo === "provincial" && (!c.province || c.province.toLowerCase() === prov.toLowerCase())
    );
  }, [selectedActa, candidates]);

  // Contadores
  const countPending = useMemo(
    () => actas.filter((a) => a.status === "enviada" || a.status === "en_revision").length,
    [actas]
  );
  const countApproved = useMemo(() => actas.filter((a) => a.status === "aprobada").length, [actas]);
  const countObserved = useMemo(() => actas.filter((a) => a.status === "observada").length, [actas]);

  // Manejar Aprobación
  async function handleApprove() {
    if (!selectedActa) return;
    if (!confirm(`¿Confirmas que los votos coinciden con el acta de la Mesa N° ${selectedActa.mesaNumber}? Esta acción integrará los votos al cómputo oficial en tiempo real.`)) {
      return;
    }

    setIsProcessing(true);
    setActionMessage(null);

    const res = await approveActa(selectedActa.id);
    if (res.ok && res.acta) {
      setActas((prev) => prev.map((a) => (a.id === selectedActa.id ? { ...a, ...res.acta } : a)));
      setActionMessage({ kind: "success", text: `✓ Acta de Mesa ${selectedActa.mesaNumber} aprobada e integrada al cómputo.` });
    } else {
      setActionMessage({ kind: "error", text: res.error || "Error al aprobar acta." });
    }
    setIsProcessing(false);
  }

  // Manejar Observación
  async function handleObserveSubmit() {
    if (!selectedActa) return;
    if (!observeReason.trim()) {
      alert("Por favor indica el motivo de la observación.");
      return;
    }

    setIsProcessing(true);
    const res = await observeActa(selectedActa.id, observeReason.trim());
    if (res.ok && res.acta) {
      setActas((prev) => prev.map((a) => (a.id === selectedActa.id ? { ...a, ...res.acta } : a)));
      setShowObserveModal(false);
      setObserveReason("");
      setActionMessage({ kind: "success", text: `⚠ Acta de Mesa ${selectedActa.mesaNumber} marcada como observada.` });
    } else {
      alert(res.error || "Error al observar acta.");
    }
    setIsProcessing(false);
  }

  // Construir link de WhatsApp con el personero
  const personeroWaLink = useMemo(() => {
    if (!selectedActa?.personero?.phone) return null;
    const cleanPhone = selectedActa.personero.phone.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Hola ${selectedActa.personero.name}, te escribo desde el Centro de Cómputo de Ahora Nación sobre el Acta de Escrutinio de la Mesa N° ${selectedActa.mesaNumber} (${selectedActa.local?.name}).`
    );
    return `https://wa.me/51${cleanPhone}?text=${msg}`;
  }, [selectedActa]);

  return (
    <div className="verif-page">
      {/* Barra Superior Compacta */}
      <header className="verif-header">
        <div className="verif-header__title">
          <div className="verif-brand-pill">Centro de Cómputo · Verificador</div>
          <h1>Filtro y Verificación de Actas de Escrutinio</h1>
          <p className="verif-header__sub">
            Cotejo lado a lado de la fotografía del acta original contra los datos registrados antes de su integración oficial.
          </p>
        </div>

        <div className="verif-header__actions">
          <button
            type="button"
            className="btn btn--outline btn-sm"
            onClick={() => setStatsCollapsed(!statsCollapsed)}
            title="Ocultar o mostrar las tarjetas de resumen para ganar espacio vertical"
          >
            {statsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            <span>{statsCollapsed ? "Ver Resumen" : "Ocultar Resumen"}</span>
          </button>
          <Link href="/visor-envivo" target="_blank" className="btn btn--secondary btn--visor-live">
            <Tv size={15} className="text-red animate-pulse" /> Pantalla Gigante <ExternalLink size={12} />
          </Link>
          <Link href="/personeros" className="btn btn--outline btn-sm">
            Volver a Personeros
          </Link>
        </div>
      </header>

      {/* Métricas de Cola (Colapsables con 1 clic para máxima altura de cotejo) */}
      {!statsCollapsed && (
        <div className="verif-stats-bar">
          <button
            type="button"
            className={`stat-tab-card ${tabFilter === "pending" ? "stat-tab-card--active" : ""}`}
            onClick={() => {
              setTabFilter("pending");
              setMobileTab("queue");
            }}
          >
            <div className="stat-tab-icon stat-tab-icon--blue">
              <Clock size={18} />
            </div>
            <div>
              <span className="stat-tab-count">{countPending}</span>
              <span className="stat-tab-label">Actas Pendientes</span>
            </div>
          </button>

          <button
            type="button"
            className={`stat-tab-card ${tabFilter === "approved" ? "stat-tab-card--active" : ""}`}
            onClick={() => {
              setTabFilter("approved");
              setMobileTab("queue");
            }}
          >
            <div className="stat-tab-icon stat-tab-icon--green">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <span className="stat-tab-count">{countApproved}</span>
              <span className="stat-tab-label">Actas Aprobadas</span>
            </div>
          </button>

          <button
            type="button"
            className={`stat-tab-card ${tabFilter === "observed" ? "stat-tab-card--active" : ""}`}
            onClick={() => {
              setTabFilter("observed");
              setMobileTab("queue");
            }}
          >
            <div className="stat-tab-icon stat-tab-icon--amber">
              <AlertTriangle size={18} />
            </div>
            <div>
              <span className="stat-tab-count">{countObserved}</span>
              <span className="stat-tab-label">Actas Observadas</span>
            </div>
          </button>

          <button
            type="button"
            className={`stat-tab-card ${tabFilter === "all" ? "stat-tab-card--active" : ""}`}
            onClick={() => {
              setTabFilter("all");
              setMobileTab("queue");
            }}
          >
            <div className="stat-tab-icon stat-tab-icon--gray">
              <Vote size={18} />
            </div>
            <div>
              <span className="stat-tab-count">{actas.length}</span>
              <span className="stat-tab-label">Total Recibidas</span>
            </div>
          </button>
        </div>
      )}

      {actionMessage && (
        <div className={`verif-alert verif-alert--${actionMessage.kind}`}>
          {actionMessage.text}
        </div>
      )}

      {/* Pestañas de Alternancia Móvil (Solo visible en pantallas pequeñas <= 1150px) */}
      <div className="mobile-view-tabs">
        <button
          type="button"
          className={`mobile-tab-btn ${mobileTab === "queue" ? "active" : ""}`}
          onClick={() => setMobileTab("queue")}
        >
          <span>📋 Cola de Actas</span>
          <span className="mobile-tab-badge">{filteredQueue.length}</span>
        </button>
        <button
          type="button"
          className={`mobile-tab-btn ${mobileTab === "inspect" ? "active" : ""}`}
          onClick={() => setMobileTab("inspect")}
        >
          <span>🔍 {selectedActa ? `Mesa N° ${selectedActa.mesaNumber}` : "Inspección"}</span>
          {selectedActa && (
            <span className={`mobile-tab-dot status-chip--${selectedActa.status === "aprobada" ? "approved" : selectedActa.status === "observada" ? "observed" : "pending"}`} />
          )}
        </button>
      </div>

      {/* Área de Trabajo Dividida (Con soporte de Colapso de Cola para Vista Ancha) */}
      <div className={`verif-workbench mobile-show-${mobileTab} ${queueCollapsed ? "queue-is-collapsed" : ""}`}>
        {/* Cola Izquierda: Lista de Actas */}
        {!queueCollapsed && (
          <aside className="verif-queue-panel">
            <div className="queue-panel-head">
              <div className="queue-panel-title-row">
                <h3>Cola ({filteredQueue.length})</h3>
                <button
                  type="button"
                  className="btn-collapse-queue-icon"
                  onClick={() => setQueueCollapsed(true)}
                  title="Ocultar cola para ampliar el área de cotejo"
                >
                  <PanelLeftClose size={15} />
                </button>
              </div>

              <div className="queue-search">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Buscar por mesa o colegio..."
                  value={searchMesa}
                  onChange={(e) => setSearchMesa(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
                <button
                  type="button"
                  className={`btn btn--xs ${electionFilter === "all" ? "btn--primary" : "btn--secondary"}`}
                  onClick={() => setElectionFilter("all")}
                >
                  Todas
                </button>
                <button
                  type="button"
                  className={`btn btn--xs ${electionFilter === "gobernador" ? "btn--primary" : "btn--secondary"}`}
                  onClick={() => setElectionFilter("gobernador")}
                >
                  Gobernación
                </button>
                <button
                  type="button"
                  className={`btn btn--xs ${electionFilter === "provincial" ? "btn--primary" : "btn--secondary"}`}
                  onClick={() => setElectionFilter("provincial")}
                >
                  Alcaldías
                </button>
              </div>
            </div>

            <div className="queue-list">
              {filteredQueue.length === 0 ? (
                <div className="queue-empty">
                  <p>No hay actas en esta categoría.</p>
                </div>
              ) : (
                filteredQueue.map((acta) => {
                  const isSelected = acta.id === selectedId;
                  const isApproved = acta.status === "aprobada";
                  const isObserved = acta.status === "observada";
                  const isProv = acta.electionType === "provincial";

                  return (
                    <button
                      key={acta.id}
                      type="button"
                      className={`queue-item ${isSelected ? "queue-item--selected" : ""}`}
                      onClick={() => {
                        setSelectedId(acta.id);
                        resetZoom();
                        setMobileTab("inspect");
                      }}
                    >
                      <div className="queue-item__top">
                        <span className="queue-item__mesa">Mesa {acta.mesaNumber}</span>
                        <span
                          className={`status-chip ${
                            isApproved
                              ? "status-chip--approved"
                              : isObserved
                              ? "status-chip--observed"
                              : "status-chip--pending"
                          }`}
                        >
                          {isApproved ? "Aprobada" : isObserved ? "Observada" : "Pendiente"}
                        </span>
                      </div>

                      <div className="queue-item__local">{acta.local?.name}</div>
                      <div className="queue-item__meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className={`badge ${isProv ? "badge--purple" : "badge--neutral"}`} style={{ fontSize: "10px" }}>
                          {isProv ? `Alcaldía (${acta.local?.province || "Prov"})` : "Gobernador"}
                        </span>
                        <span>Total: <strong>{acta.totalVotos}</strong></span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* Panel Central: Inspección Lado a Lado */}
        {selectedActa ? (
          <main className="verif-inspect-panel">
            {/* Barra superior de navegación móvil */}
            <div className="inspect-mobile-bar">
              <button
                type="button"
                className="btn-mobile-back"
                onClick={() => setMobileTab("queue")}
              >
                <ArrowLeft size={16} /> Volver a la Cola
              </button>

              <div className="mobile-subtab-group">
                <button
                  type="button"
                  className={`btn-subtab ${mobileInspectSubtab === "photo" ? "active" : ""}`}
                  onClick={() => setMobileInspectSubtab("photo")}
                  title="Ver solo foto ampliada"
                >
                  <ImageIcon size={13} /> Foto
                </button>
                <button
                  type="button"
                  className={`btn-subtab ${mobileInspectSubtab === "votes" ? "active" : ""}`}
                  onClick={() => setMobileInspectSubtab("votes")}
                  title="Ver solo tabla de votos"
                >
                  <Table size={13} /> Votos
                </button>
                <button
                  type="button"
                  className={`btn-subtab ${mobileInspectSubtab === "both" ? "active" : ""}`}
                  onClick={() => setMobileInspectSubtab("both")}
                  title="Ver ambos"
                >
                  <Layers size={13} /> Ambos
                </button>
              </div>
            </div>

            {/* Header del Acta Seleccionada */}
            <div className="inspect-head">
              <div className="inspect-head-left">
                {/* Botón para expandir o restaurar cola en PC */}
                <button
                  type="button"
                  className="btn-queue-toggle-desk"
                  onClick={() => setQueueCollapsed(!queueCollapsed)}
                  title={queueCollapsed ? "Mostrar cola de actas lateral" : "Ocultar cola de actas para maximizar el área de inspección"}
                >
                  {queueCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                  <span>{queueCollapsed ? `Ver Cola (${filteredQueue.length})` : "Ocultar Cola"}</span>
                </button>

                <div>
                  <div className="inspect-title-row">
                    <h2>Mesa N° {selectedActa.mesaNumber}</h2>
                    <span
                      className={`status-chip ${
                        selectedActa.status === "aprobada"
                          ? "status-chip--approved"
                          : selectedActa.status === "observada"
                          ? "status-chip--observed"
                          : "status-chip--pending"
                      }`}
                    >
                      {selectedActa.status === "aprobada"
                        ? "✓ Acta Aprobada e Integrada"
                        : selectedActa.status === "observada"
                        ? "⚠ Acta Observada"
                        : "🔍 Pendiente de Verificación"}
                    </span>
                  </div>
                  <p className="inspect-local-addr">
                    <Building2 size={13} /> {selectedActa.local?.name} ({selectedActa.local?.province} · {selectedActa.local?.district})
                  </p>
                </div>
              </div>

              {/* Ficha del Personero Remitente con WhatsApp */}
              {selectedActa.personero && (
                <div className="inspect-personero-badge">
                  <div className="personero-meta">
                    <span className="personero-label">Personero remitente:</span>
                    <strong className="personero-name">{selectedActa.personero.name}</strong>
                    <span className="personero-sub">DNI: {selectedActa.personero.docNumber}</span>
                  </div>
                  {personeroWaLink && (
                    <a
                      href={personeroWaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-whatsapp-personero"
                      title="Abrir chat de WhatsApp para consultar con el personero"
                    >
                      <Phone size={13} /> WhatsApp ({selectedActa.personero.phone})
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Layout Side-by-Side con Máxima Amplitud para la Foto (65% Foto / 35% Tabla) */}
            <div className={`inspect-split-grid mobile-subtab-${mobileInspectSubtab}`}>
              {/* Lado Izquierdo: Foto del Acta con Zoom, Pan y Ajuste al Ancho */}
              <div className="inspect-photo-box">
                <div className="photo-box-toolbar">
                  <div className="photo-box-title-group">
                    <span className="photo-box-title">Acta de Escrutinio</span>
                    <span className="photo-box-badge">Mesa {selectedActa.mesaNumber}</span>

                    {/* Selector Rápido de Ajuste (Ancho vs Hoja Completa) */}
                    <div className="fit-mode-toggle">
                      <button
                        type="button"
                        className={`btn-fit ${fitMode === "width" ? "btn-fit--active" : ""}`}
                        onClick={() => {
                          setFitMode("width");
                          resetZoom();
                        }}
                        title="Ajustar al Ancho: letras y casilleros gigantes y nítidos"
                      >
                        <Expand size={13} /> Ajustar al Ancho
                      </button>
                      <button
                        type="button"
                        className={`btn-fit ${fitMode === "contain" ? "btn-fit--active" : ""}`}
                        onClick={() => {
                          setFitMode("contain");
                          resetZoom();
                        }}
                        title="Ver Hoja Completa en pantalla"
                      >
                        <Shrink size={13} /> Hoja Completa
                      </button>
                    </div>
                  </div>

                  {/* Controles de Zoom Avanzado para PC y Móvil */}
                  <div className="photo-controls">
                    <button
                      type="button"
                      className="btn-ctrl"
                      onClick={() => setZoomLevel((z) => Math.min(Math.round((z + 0.3) * 10) / 10, 5.0))}
                      title="Acercar (Zoom In)"
                    >
                      <ZoomIn size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-ctrl"
                      onClick={() => setZoomLevel((z) => Math.max(Math.round((z - 0.3) * 10) / 10, 0.6))}
                      title="Alejar (Zoom Out)"
                    >
                      <ZoomOut size={15} />
                    </button>
                    <span className="zoom-indicator-pill" title="Nivel de zoom actual">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      className="btn-ctrl"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      title="Rotar 90° hacia la derecha"
                    >
                      <RotateCw size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-ctrl btn-ctrl--text"
                      onClick={resetZoom}
                      title="Restablecer vista"
                    >
                      100%
                    </button>
                    <button
                      type="button"
                      className="btn-ctrl btn-ctrl--maximize"
                      onClick={() => setIsFullscreen(true)}
                      title="Pantalla Completa Gigante (ESC para salir)"
                    >
                      <Maximize2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Visor Interactivo con Pan / Drag / Wheel */}
                <div
                  ref={viewportRef}
                  className={`photo-viewport photo-viewport--${fitMode} ${isDragging ? "is-dragging" : ""} ${zoomLevel > 1 || fitMode === "width" ? "can-drag" : ""}`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onDoubleClick={handleDoubleClick}
                >
                  {selectedActa.photoUrl ? (
                    <>
                      <img
                        src={selectedActa.photoUrl}
                        alt={`Foto acta mesa ${selectedActa.mesaNumber}`}
                        className={`inspect-img inspect-img--${fitMode}`}
                        style={{
                          transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                          transition: isDragging ? "none" : "transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)",
                        }}
                        draggable={false}
                      />
                      <div className="photo-floating-hints">
                        <span className="hint-pill">
                          <Move size={11} /> {fitMode === "width" ? "Desplaza verticalmente o arrastra para cotejar" : "Rueda o arrastra para zoom"}
                        </span>
                        <button
                          type="button"
                          className="hint-btn-fullscreen"
                          onClick={() => setIsFullscreen(true)}
                        >
                          <Maximize2 size={12} /> Pantalla Completa
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="photo-missing">No se adjuntó imagen del acta.</div>
                  )}
                </div>
              </div>

              {/* Lado Derecho: Tabla de Votos Registrados para Cotejo */}
              <div className="inspect-votes-box">
                <div className="votes-box-header">
                  <span className="votes-box-title">Datos Registrados</span>
                  <span className="votes-box-source">
                    Origen: <strong>{selectedActa.source === "ia" ? "IA + Personero" : "Manual"}</strong>
                  </span>
                </div>

                <div className="votes-tally-list">
                  {activeCandidatesForActa.map((c) => {
                    const matchedVote = selectedActa.votos?.find((v: any) => v.candidateId === c.id);
                    const voteCount = matchedVote?.votes || 0;
                    const isHorna = c.party.includes("AHORA NACION");

                    return (
                      <div
                        key={c.id}
                        className={`tally-row ${isHorna ? "tally-row--highlight" : ""}`}
                      >
                        <div className="tally-party-info">
                          <span className="tally-order">{c.order}</span>
                          {c.partyLogo ? (
                            <img src={c.partyLogo} alt={c.party} className="tally-logo" />
                          ) : (
                            <div className="tally-logo-fallback">{c.party.slice(0, 2)}</div>
                          )}
                          <div className="tally-names">
                            <strong className="tally-party" title={c.party}>{c.party}</strong>
                            <span className="tally-candidate" title={c.name}>{c.name}</span>
                          </div>
                        </div>

                        <div className="tally-number">
                          <span>{voteCount}</span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="tally-special-section">
                    <div className="tally-row tally-row--special">
                      <span>Votos en Blanco</span>
                      <strong>{selectedActa.votosBlancos}</strong>
                    </div>
                    <div className="tally-row tally-row--special">
                      <span>Votos Nulos</span>
                      <strong>{selectedActa.votosNulos}</strong>
                    </div>
                    <div className="tally-row tally-row--special">
                      <span>Votos Impugnados</span>
                      <strong>{selectedActa.votosImpugnados}</strong>
                    </div>
                  </div>

                  <div className="tally-sum-bar">
                    <span>Total Ciudadanos que Votaron:</span>
                    <strong className="tally-sum-val">{selectedActa.totalVotos}</strong>
                  </div>
                </div>

                {/* Motivo de observación si ya estaba observada */}
                {selectedActa.status === "observada" && selectedActa.observationReason && (
                  <div className="observed-reason-callout">
                    <strong>Motivo de Observación Registrado:</strong>
                    <p>"{selectedActa.observationReason}"</p>
                  </div>
                )}

                {/* Botonera de Decisión del Verificador */}
                <div className="inspect-decision-toolbar">
                  <button
                    type="button"
                    className="btn-decision btn-decision--approve"
                    onClick={handleApprove}
                    disabled={isProcessing}
                  >
                    <CheckCircle2 size={18} /> Aprobar e Integrar
                  </button>
                  <button
                    type="button"
                    className="btn-decision btn-decision--observe"
                    onClick={() => setShowObserveModal(true)}
                    disabled={isProcessing}
                  >
                    <AlertTriangle size={18} /> Observar / Rechazar
                  </button>
                </div>
              </div>
            </div>
          </main>
        ) : (
          <div className="verif-no-selection">
            <div className="no-selection-icon-circle">
              <Vote size={44} />
            </div>
            <h3>Selecciona un acta de la cola para verificar</h3>
            <p className="no-selection-sub">
              Elige cualquier acta de la lista para cotejar la fotografía original contra los datos registrados antes de su integración oficial.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL / LIGHTBOX DE PANTALLA COMPLETA (MODO GIGANTE EN PC) */}
      {/* ========================================================= */}
      {isFullscreen && selectedActa && (
        <div className="verif-lightbox" onClick={() => setIsFullscreen(false)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            {/* Barra Flotante Superior */}
            <div className="lightbox-toolbar">
              <div className="lightbox-info">
                <span className="lightbox-mesa-badge">Mesa N° {selectedActa.mesaNumber}</span>
                <span className="lightbox-local-name">{selectedActa.local?.name}</span>
              </div>

              <div className="lightbox-controls">
                <button
                  type="button"
                  className="btn-lightbox-ctrl"
                  onClick={() => setZoomLevel((z) => Math.min(Math.round((z + 0.3) * 10) / 10, 6.0))}
                  title="Acercar (Zoom In)"
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  type="button"
                  className="btn-lightbox-ctrl"
                  onClick={() => setZoomLevel((z) => Math.max(Math.round((z - 0.3) * 10) / 10, 0.6))}
                  title="Alejar (Zoom Out)"
                >
                  <ZoomOut size={18} />
                </button>
                <span className="lightbox-zoom-pill">{Math.round(zoomLevel * 100)}%</span>
                <button
                  type="button"
                  className="btn-lightbox-ctrl"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Rotar 90°"
                >
                  <RotateCw size={18} />
                </button>
                <button
                  type="button"
                  className="btn-lightbox-ctrl"
                  onClick={resetZoom}
                  title="Ajustar al 100% y centrar"
                >
                  100%
                </button>
                <button
                  type="button"
                  className="btn-lightbox-ctrl btn-lightbox-ctrl--close"
                  onClick={() => setIsFullscreen(false)}
                  title="Cerrar pantalla completa (ESC)"
                >
                  <Minimize2 size={18} /> Salir (ESC)
                </button>
              </div>
            </div>

            {/* Lienzo Gigante de Inspección con Arrastre Libre */}
            <div
              ref={lightboxCanvasRef}
              className={`lightbox-canvas ${isDragging ? "is-dragging" : ""}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onDoubleClick={handleDoubleClick}
            >
              {selectedActa.photoUrl ? (
                <img
                  src={selectedActa.photoUrl}
                  alt={`Foto acta mesa ${selectedActa.mesaNumber}`}
                  className="lightbox-img"
                  style={{
                    transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transition: isDragging ? "none" : "transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)",
                  }}
                  draggable={false}
                />
              ) : (
                <div className="photo-missing">No se adjuntó imagen del acta.</div>
              )}
            </div>

            {/* Barra Inferior del Visor Gigante */}
            <div className="lightbox-footer">
              <span className="lightbox-hint">
                💡 <strong>Rueda del ratón</strong> para zoom rápido · <strong>Click y arrastra</strong> para examinar casilleros · <strong>ESC</strong> para volver.
              </span>
              <div className="lightbox-actions">
                <button
                  type="button"
                  className="btn-decision btn-decision--approve btn-sm"
                  onClick={() => {
                    setIsFullscreen(false);
                    handleApprove();
                  }}
                  disabled={isProcessing}
                >
                  <CheckCircle2 size={16} /> Aprobar Acta
                </button>
                <button
                  type="button"
                  className="btn-decision btn-decision--observe btn-sm"
                  onClick={() => {
                    setIsFullscreen(false);
                    setShowObserveModal(true);
                  }}
                  disabled={isProcessing}
                >
                  <AlertTriangle size={16} /> Observar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Observar Acta */}
      {showObserveModal && selectedActa && (
        <div className="modal-backdrop" onClick={() => setShowObserveModal(false)}>
          <div className="modal" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <header className="modal__head">
              <div>
                <span className="badge badge--red">Observación de Acta</span>
                <h3 style={{ margin: "6px 0 0", fontSize: "17px", fontWeight: 800 }}>
                  Observar Acta Mesa N° {selectedActa.mesaNumber}
                </h3>
              </div>
              <button type="button" className="btn-icon" onClick={() => setShowObserveModal(false)}>
                ✕
              </button>
            </header>

            <div className="modal__body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ fontSize: "13px", color: "#475569", margin: 0 }}>
                Indica claramente la inconsistencia detectada para que el personero la corrija o reenvíe una fotografía más legible.
              </p>

              {/* Botones de motivos comunes */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[
                  "Suma de votos no coincide",
                  "Fotografía borrosa o cortada",
                  "Mesa incorrecta",
                  "Faltan firmas de miembros ONPE",
                ].map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    className="btn btn--xs btn--outline"
                    onClick={() => setObserveReason(sug)}
                  >
                    {sug}
                  </button>
                ))}
              </div>

              <div className="field">
                <label className="field__label">Detalle de la Observación:</label>
                <textarea
                  className="input"
                  rows={3}
                  value={observeReason}
                  onChange={(e) => setObserveReason(e.target.value)}
                  placeholder="Ej. La suma de los votos por partido da 240 pero el total consignado dice 235."
                  autoFocus
                />
              </div>

              {personeroWaLink && (
                <div style={{ background: "#ecfdf5", padding: "10px", borderRadius: "6px", border: "1px solid #a7f3d0", fontSize: "12px" }}>
                  <strong>Consejo:</strong> Puedes coordinar directamente con {selectedActa.personero?.name} por WhatsApp antes o después de observar el acta.
                </div>
              )}
            </div>

            <footer className="modal__foot">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setShowObserveModal(false)}
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primary"
                style={{ background: "#dc2626" }}
                onClick={handleObserveSubmit}
                disabled={isProcessing}
              >
                {isProcessing ? "Registrando..." : "Confirmar Observación"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
