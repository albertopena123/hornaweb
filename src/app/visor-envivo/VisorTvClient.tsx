"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Building2,
  MapPin,
  Vote,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  X,
  ZoomIn,
  Radio,
  ArrowLeft,
  Award,
  Camera,
  Landmark,
  Trees,
  Compass,
  FileText,
} from "lucide-react";
import "./visor-tv.css";

type LiveData = {
  timestamp: string;
  stats: {
    totalMesas: number;
    esperadas: number;
    recibidas: number;
    aprobadas: number;
    pendientes: number;
    observadas: number;
    pctAvance: number;
    totalVotosValidos: number;
    totalBlancos: number;
    totalNulos: number;
    totalImpugnados: number;
    totalVotosEmitidos: number;
  };
  ranking: Array<{
    id: string;
    name: string;
    party: string;
    partyLogo: string | null;
    photoUrl: string | null;
    color: string | null;
    order: number;
    votes: number;
    pctValidos: number;
    pctEmitidos: number;
  }>;
  votosPorProvincia: Record<string, { aprobadas: number; totalVotos: number }>;
  ultimasActas: Array<{
    id: string;
    mesaNumber: string;
    localName: string;
    district: string;
    province: string;
    totalVotos: number;
    reviewedAt: string | null;
    photoUrl: string | null;
    topCandidate: { party: string; votes: number } | null;
  }>;
  ultimaAprobada: {
    id: string;
    mesaNumber: string;
    localName: string;
    district: string;
    province: string;
    totalVotos: number;
    reviewedAt: string | null;
    photoUrl: string | null;
  } | null;
};

export function VisorTvClient({ initialData }: { initialData: LiveData }) {
  const [scope, setScope] = useState<"gobernador" | "Tambopata" | "Manu" | "Tahuamanu">("gobernador");
  const [data, setData] = useState<LiveData>(initialData);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newActaAlert, setNewActaAlert] = useState<any | null>(null);
  const [selectedPhotoActa, setSelectedPhotoActa] = useState<any | null>(null);
  const [activeSideActaId, setActiveSideActaId] = useState<string | null>(null);
  const [modalCountdown, setModalCountdown] = useState<number | null>(null);

  const lastSeenActaIdRef = useRef<string | null>(initialData.ultimaAprobada?.id || null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Timbre oficial de alerta acústica al llegar nueva acta (Conteo Rápido)
  const playAlertSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const now = ctx.currentTime;
      // Secuencia armónica de 4 tonos tipo campanada de noticia electoral
      const frequencies = [523.25, 659.25, 783.99, 1046.5];
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.3, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.45);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.45);
      });
    } catch {
      // Navegadores que bloqueen audio sin interacción previa
    }
  };

  // Desplegar modal interactivo durante 10 segundos
  const triggerActaLiveModal = (acta: any, seconds: number = 10) => {
    setSelectedPhotoActa(acta);
    setModalCountdown(seconds);

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    countdownTimerRef.current = setInterval(() => {
      setModalCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          setSelectedPhotoActa(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const closePhotoModal = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setModalCountdown(null);
    setSelectedPhotoActa(null);
  };

  const pauseModalCountdown = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setModalCountdown(null);
  };

  // Reloj y fecha digital en tiempo real
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
      setCurrentDate(
        now.toLocaleDateString("es-PE", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Polling automático cada 3.5 segundos y al cambiar ámbito
  useEffect(() => {
    let isMounted = true;

    async function pollLiveResults() {
      try {
        setIsUpdating(true);
        const isProv = scope !== "gobernador";
        const url = `/api/actas/live-results?electionType=${isProv ? "provincial" : "gobernador"}&province=${isProv ? scope : ""}`;
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const freshData: LiveData = await res.json();
          if (isMounted) {
            setData(freshData);

            // Alerta inmediata cuando un personero/verificador aprueba una nueva acta
            if (
              freshData.ultimaAprobada &&
              freshData.ultimaAprobada.id !== lastSeenActaIdRef.current
            ) {
              lastSeenActaIdRef.current = freshData.ultimaAprobada.id;
              setNewActaAlert(freshData.ultimaAprobada);
              setActiveSideActaId(freshData.ultimaAprobada.id);

              // 1. Reproducir sonido oficial
              playAlertSound();

              // 2. Mostrar la imagen en pantalla gigante por 10 segundos
              triggerActaLiveModal(freshData.ultimaAprobada, 10);

              // Ocultar banner de alerta a los 10 segundos
              setTimeout(() => {
                if (isMounted) setNewActaAlert(null);
              }, 10000);
            }
          }
        }
      } catch (err) {
        console.error("Error al sincronizar conteo rápido:", err);
      } finally {
        if (isMounted) setIsUpdating(false);
      }
    }

    pollLiveResults();
    const interval = setInterval(pollLiveResults, 3500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [soundEnabled, scope]);

  // Pantalla Completa para proyección
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const { stats, ranking, votosPorProvincia, ultimasActas } = data;

  // Acta activa en el panel lateral (100% datos reales)
  const currentSideActa =
    ultimasActas.find((a) => a.id === activeSideActaId) || ultimasActas[0] || null;

  return (
    <div className="visor-tv-root">
      {/* HEADER PRINCIPAL — AHORA NACIÓN CONTEO RÁPIDO */}
      <header className="visor-tv-header">
        <div className="header-left-cluster">
          <Link href="/" className="visor-nav-back" title="Volver a la web principal">
            <ArrowLeft size={16} />
            <span className="visor-back-text">Web Principal</span>
          </Link>

          <div className="visor-brand-divider" />

          {/* Logotipo y denominación */}
          <div className="header-brand-wrap">
            <img
              src="/assets/images/logo/logo-an.webp"
              alt="Ahora Nación"
              className="header-brand-logo"
            />
            <div className="header-brand-titles">
              <div className="header-brand-top">
                <span className="brand-name">AHORA NACIÓN</span>
                <span className="brand-tag">MADRE DE DIOS 2026</span>
              </div>
              <h1 className="header-page-title">
                {scope === "gobernador"
                  ? "CONTEO RÁPIDO · GOBERNACIÓN REGIONAL"
                  : `CONTEO RÁPIDO · ALCALDÍA PROVINCIAL ${scope.toUpperCase()}`}
              </h1>
            </div>
          </div>
        </div>

        {/* Indicador EN VIVO y Reloj Broadcast */}
        <div className="header-center-cluster">
          <div className="live-pill-badge">
            <span className="live-core-dot" />
            <span className="live-badge-txt">EN VIVO</span>
          </div>

          <div className="broadcast-clock-box">
            <Clock size={16} className="clock-icon" />
            <div className="clock-digits">
              <span className="clock-time">{currentTime || "00:00:00"}</span>
              <span className="clock-date">{currentDate}</span>
            </div>
          </div>

          <div className={`sync-status-badge ${isUpdating ? "is-syncing" : "is-online"}`}>
            <Radio size={14} className="sync-icon" />
            <span>{isUpdating ? "Sincronizando..." : "Conexión en Vivo"}</span>
          </div>
        </div>

        {/* Controles de sonido, pantalla y admin */}
        <div className="header-right-cluster">
          <button
            type="button"
            className={`visor-ctrl-btn ${soundEnabled ? "is-active" : ""}`}
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playAlertSound();
            }}
            title={soundEnabled ? "Silenciar alertas" : "Activar sonido de actas entrantes"}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <span className="ctrl-btn-label">{soundEnabled ? "Sonido ON" : "Silencio"}</span>
          </button>

          <button
            type="button"
            className="visor-ctrl-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Salir de pantalla completa" : "Modo Pantalla Completa"}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            <span className="ctrl-btn-label">{isFullscreen ? "Salir" : "TV Fullscreen"}</span>
          </button>

          <Link href="/inicio" className="visor-admin-badge" title="Ir al Panel de Control">
            <span>Panel Admin</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </header>

      {/* SELECTOR DE ÁMBITO ELECTORAL CON ICONOS SVG */}
      <nav className="visor-scope-bar">
        <div className="scope-bar-label">
          <span>ÁMBITO:</span>
        </div>
        <div className="scope-pills-list">
          <button
            type="button"
            className={`scope-pill-btn ${scope === "gobernador" ? "is-active" : ""}`}
            onClick={() => setScope("gobernador")}
          >
            <Landmark size={15} />
            <span className="scope-pill-text">Gobernación Regional</span>
            <span className="scope-pill-count">Madre de Dios</span>
          </button>

          <button
            type="button"
            className={`scope-pill-btn ${scope === "Tambopata" ? "is-active" : ""}`}
            onClick={() => setScope("Tambopata")}
          >
            <Building2 size={15} />
            <span className="scope-pill-text">Alcaldía Tambopata</span>
            <span className="scope-pill-count">Puerto Maldonado</span>
          </button>

          <button
            type="button"
            className={`scope-pill-btn ${scope === "Manu" ? "is-active" : ""}`}
            onClick={() => setScope("Manu")}
          >
            <Trees size={15} />
            <span className="scope-pill-text">Alcaldía Manu</span>
            <span className="scope-pill-count">Villa Salvación</span>
          </button>

          <button
            type="button"
            className={`scope-pill-btn ${scope === "Tahuamanu" ? "is-active" : ""}`}
            onClick={() => setScope("Tahuamanu")}
          >
            <Compass size={15} />
            <span className="scope-pill-text">Alcaldía Tahuamanu</span>
            <span className="scope-pill-count">Iñapari</span>
          </button>
        </div>
      </nav>

      {/* TICKER DE MÉTRICAS GLOBALES */}
      <section className="visor-metrics-grid">
        <div className="metric-card metric-card--progress">
          <div className="metric-top">
            <span className="metric-title">AVANCE DE MESAS COMPUTADAS</span>
            <span className="metric-badge-live">CONTEO RÁPIDO</span>
          </div>
          <div className="metric-big-row">
            <span className="metric-number-hero">{stats.pctAvance.toFixed(1)}%</span>
            <div className="metric-sub-info">
              <span className="metric-sub-highlight">{stats.aprobadas} de {stats.totalMesas}</span>
              <span className="metric-sub-label">mesas computadas</span>
            </div>
          </div>
          <div className="metric-progress-track">
            <div
              className="metric-progress-fill"
              style={{ width: `${Math.min(stats.pctAvance, 100)}%` }}
            />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-title">VOTOS VÁLIDOS COMPUTADOS</span>
            <Vote size={18} className="metric-icon-red" />
          </div>
          <div className="metric-big-row">
            <span className="metric-number">{stats.totalVotosValidos.toLocaleString("es-PE")}</span>
          </div>
          <div className="metric-footer-note">
            <span>Suma acumulada de votos válidos</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-title">CIUDADANOS QUE VOTARON</span>
            <ShieldCheck size={18} className="metric-icon-gold" />
          </div>
          <div className="metric-big-row">
            <span className="metric-number">{stats.totalVotosEmitidos.toLocaleString("es-PE")}</span>
          </div>
          <div className="metric-footer-note">
            <span>Blancos: {stats.totalBlancos} · Nulos: {stats.totalNulos}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-title">EN MESA DE CONTROL</span>
            <Sparkles size={18} className="metric-icon-blue" />
          </div>
          <div className="metric-big-row">
            <span className={`metric-number ${stats.pendientes > 0 ? "text-amber-400" : ""}`}>
              {stats.pendientes}
            </span>
            <span className="metric-sub-badge">{stats.pendientes === 1 ? "acta en revisión" : "actas en revisión"}</span>
          </div>
          <div className="metric-footer-note">
            <span>{stats.observadas} observadas</span>
          </div>
        </div>
      </section>

      {/* ALERTA: NUEVA ACTA APROBADA */}
      {newActaAlert && (
        <aside className="visor-alert-banner">
          <div className="alert-left-flair">
            <Sparkles size={20} className="alert-sparkle-icon" />
          </div>
          <div className="alert-content-body">
            <div className="alert-headline">
              <strong>¡NUEVA ACTA DE ESCRUTINIO INCORPORADA AL CONTEO RÁPIDO!</strong>
              <span className="alert-timestamp">Recién aprobada</span>
            </div>
            <div className="alert-details">
              <span>Mesa N° <strong>{newActaAlert.mesaNumber}</strong></span>
              <span className="alert-sep">·</span>
              <span><Building2 size={13} /> {newActaAlert.localName} ({newActaAlert.district})</span>
              <span className="alert-sep">·</span>
              <span className="alert-votos-plus">+{newActaAlert.totalVotos} votos computados</span>
            </div>
          </div>
          <button
            type="button"
            className="alert-dismiss-btn"
            onClick={() => setNewActaAlert(null)}
          >
            <X size={16} />
          </button>
        </aside>
      )}

      {/* CONTENIDO PRINCIPAL: RESULTADOS (IZQ) + FOTO DEL ACTA A UN COSTADO (DER) */}
      <main className="visor-main-layout">
        {/* COLUMNA IZQUIERDA: RESULTADOS DE CANDIDATOS */}
        <section className="visor-ranking-panel">
          <div className="ranking-panel-header">
            <div className="ranking-title-area">
              <div className="ranking-title-badge">
                <Vote size={18} />
                <span>TABLA ELECTORAL · CONTEO RÁPIDO</span>
              </div>
              <h2 className="ranking-main-heading">
                {scope === "gobernador"
                  ? "Resultados Conteo Rápido · Gobernación Regional"
                  : `Resultados Conteo Rápido · Alcaldía Provincial de ${scope}`}
              </h2>
            </div>
            <div className="ranking-meta-pills">
              <span className="ranking-pill-highlight">
                Cálculo sobre Votos Válidos
              </span>
              <span className="ranking-pill-count">
                {ranking.length} Listas en contienda
              </span>
            </div>
          </div>

          {/* Aviso cuando aún no se han computado actas */}
          {stats.totalVotosValidos === 0 && (
            <div className="pre-conteo-notice">
              <div className="notice-icon-box">
                <Radio size={24} className="notice-icon" />
              </div>
              <div className="notice-text-content">
                <strong>SISTEMA DE CONTEO RÁPIDO LISTO</strong>
                <p>
                  Esperando el cierre de mesas de votación y el ingreso de las primeras actas oficiales
                  de escrutinio por parte de nuestros personeros en Madre de Dios.
                </p>
              </div>
            </div>
          )}

          {/* Lista de Candidatos */}
          <div className="candidates-list-wrap">
            {ranking.map((cand, idx) => {
              const isFirst = idx === 0 && cand.votes > 0;
              const isHorna = cand.party.toUpperCase().includes("AHORA NACION");

              return (
                <div
                  key={cand.id}
                  className={`candidate-card ${isHorna ? "candidate-card--horna" : ""} ${
                    isFirst ? "candidate-card--first" : ""
                  }`}
                >
                  <div className="cand-rank-badge">
                    {isFirst ? (
                      <span className="badge-crown" title="1° Lugar">
                        <Award size={18} />
                        <strong>1°</strong>
                      </span>
                    ) : (
                      <span className="badge-num">{idx + 1}°</span>
                    )}
                  </div>

                  <div className="cand-avatar-container">
                    {cand.photoUrl ? (
                      <img
                        src={cand.photoUrl}
                        alt={cand.name}
                        className="cand-avatar-img"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="cand-avatar-placeholder">
                        {cand.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="cand-party-logo-box">
                    {cand.partyLogo ? (
                      <img
                        src={cand.partyLogo}
                        alt={cand.party}
                        className="cand-party-logo-img"
                      />
                    ) : (
                      <div className="cand-party-box-fallback">
                        {cand.order}
                      </div>
                    )}
                  </div>

                  <div className="cand-details-col">
                    <div className="cand-header-row">
                      <div className="cand-identity-block">
                        <h3 className="cand-name-text">
                          {cand.name}
                          {isHorna && (
                            <span className="cand-tag-partido">AHORA NACIÓN</span>
                          )}
                        </h3>
                        <span className="cand-party-name">{cand.party}</span>
                      </div>

                      <div className="cand-score-block">
                        <div className="cand-pct-display">
                          <span className="pct-number">{cand.pctValidos.toFixed(1)}%</span>
                        </div>
                        <div className="cand-votes-display">
                          <span className="votes-count">
                            {cand.votes.toLocaleString("es-PE")}
                          </span>
                          <span className="votes-label">votos</span>
                        </div>
                      </div>
                    </div>

                    <div className="cand-meter-track">
                      <div
                        className={`cand-meter-fill ${isHorna ? "is-horna-meter" : ""}`}
                        style={{
                          width: `${Math.max(cand.pctValidos, stats.totalVotosValidos === 0 ? 0 : 1)}%`,
                          backgroundColor: isHorna ? undefined : (cand.color || "#2563eb"),
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* COLUMNA DERECHA: FOTOGRAFÍA DEL ACTA A UN COSTADO + PROVINCIAS */}
        <aside className="visor-sidebar-panel">
          {/* PANEL DE EVIDENCIA FOTOGRÁFICA DEL ACTA */}
          <div className="sidebar-box sidebar-box--acta-viewer">
            <div className="sidebar-box-head">
              <div className="box-title-group">
                <Camera size={18} className="text-red-400" />
                <h3 className="box-title">ACTA EN VIVO · FOTOGRAFÍA</h3>
              </div>
              <span className="acta-live-tag">
                {currentSideActa ? "Transmitida" : "En Espera"}
              </span>
            </div>

            {currentSideActa ? (
              <>
                <div className="acta-highlight-meta">
                  <div className="acta-meta-main">
                    <span className="acta-mesa-tag">MESA N° {currentSideActa.mesaNumber}</span>
                    <span className="acta-votos-tag">{currentSideActa.totalVotos} votos</span>
                  </div>
                  <div className="acta-meta-school">
                    <Building2 size={13} />
                    <span>{currentSideActa.localName}</span>
                  </div>
                  <div className="acta-meta-location">
                    <MapPin size={12} />
                    <span>{currentSideActa.district} · {currentSideActa.province}</span>
                  </div>
                </div>

                <div
                  className="acta-photo-display-frame"
                  onClick={() => triggerActaLiveModal(currentSideActa, 10)}
                  title="Haz clic para inspeccionar el acta en pantalla completa"
                >
                  {currentSideActa.photoUrl ? (
                    <img
                      src={currentSideActa.photoUrl}
                      alt={`Acta Fotográfica Mesa ${currentSideActa.mesaNumber}`}
                      className="acta-photo-img"
                    />
                  ) : (
                    <div className="acta-photo-empty">
                      <FileText size={36} />
                      <span>Sin fotografía digital adjunta</span>
                    </div>
                  )}

                  <div className="acta-photo-zoom-banner">
                    <ZoomIn size={15} />
                    <span>Ampliar Fotografía del Acta</span>
                  </div>
                </div>

                {ultimasActas.length > 1 && (
                  <div className="actas-carousel-pills">
                    <span className="carousel-label">Otras mesas recientes:</span>
                    <div className="carousel-buttons-row">
                      {ultimasActas.map((acta) => (
                        <button
                          key={acta.id}
                          type="button"
                          className={`acta-pill-selector ${
                            currentSideActa.id === acta.id ? "is-selected" : ""
                          }`}
                          onClick={() => setActiveSideActaId(acta.id)}
                        >
                          Mesa {acta.mesaNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="acta-empty-state-box">
                <Camera size={44} className="acta-empty-camera-icon" />
                <strong className="acta-empty-title">CENTRO DE TRANSMISIÓN ACTIVO</strong>
                <p className="acta-empty-desc">
                  La fotografía física del acta enviada por el personero se mostrará automáticamente
                  aquí con sus votos en tiempo real ni bien sea aprobada por el centro de control.
                </p>
              </div>
            )}
          </div>

          {/* Desglose por Provincia */}
          <div className="sidebar-box sidebar-box--territorio">
            <div className="sidebar-box-head">
              <div className="box-title-group">
                <MapPin size={18} className="text-emerald-400" />
                <h3 className="box-title">MADRE DE DIOS · PROVINCIAS</h3>
              </div>
              <div className="mdd-flag-badge" title="Bandera de Madre de Dios">
                <span className="flag-stripe flag-stripe--green" />
                <span className="flag-stripe flag-stripe--gold" />
                <span className="flag-stripe flag-stripe--green" />
              </div>
            </div>

            <div className="provinces-cards-stack">
              {Object.entries(votosPorProvincia).map(([prov, item]) => {
                const totalMesasProv =
                  prov === "Tambopata" ? 406 : prov === "Manu" ? 67 : 38;
                const pctProv = totalMesasProv > 0 ? (item.aprobadas / totalMesasProv) * 100 : 0;

                return (
                  <div key={prov} className="province-mini-card">
                    <div className="prov-header-row">
                      <strong className="prov-label">{prov}</strong>
                      <span className="prov-actas-badge">
                        {item.aprobadas} de {totalMesasProv} actas
                      </span>
                    </div>
                    <div className="prov-progress-row">
                      <div className="prov-progress-track">
                        <div
                          className="prov-progress-fill"
                          style={{ width: `${Math.min(pctProv, 100)}%` }}
                        />
                      </div>
                      <span className="prov-pct-text">{pctProv.toFixed(1)}%</span>
                    </div>
                    <div className="prov-votes-footer">
                      <span>Votos registrados:</span>
                      <strong>{item.totalVotos.toLocaleString("es-PE")}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </main>

      {/* MODAL DE 10 SEGUNDOS AL LLEGAR ACTA (O AL AMPLIAR MANUALMENTE) */}
      {selectedPhotoActa && (
        <div className="photo-modal-backdrop" onClick={closePhotoModal}>
          <div className="photo-modal-card" onClick={(e) => e.stopPropagation()}>
            {modalCountdown !== null && (
              <div className="modal-countdown-strip">
                <div className="countdown-info">
                  <Sparkles size={15} className="countdown-sparkle" />
                  <span>
                    ¡ACTA DE ESCRUTINIO EN DIRECTO! Esta ventana se cerrará automáticamente en{" "}
                    <strong className="countdown-sec-num">{modalCountdown}s</strong>
                  </span>
                </div>
                <div className="countdown-actions">
                  <button
                    type="button"
                    className="countdown-btn countdown-btn--pause"
                    onClick={pauseModalCountdown}
                  >
                    Mantener abierta
                  </button>
                  <button
                    type="button"
                    className="countdown-btn countdown-btn--close"
                    onClick={closePhotoModal}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}

            <header className="photo-modal-header">
              <div className="modal-title-wrap">
                <div className="modal-badge-row">
                  <span className="modal-pill-tag">ACTA DE ESCRUTINIO · CONTEO RÁPIDO</span>
                  <span className="modal-mesa-number">Mesa N° {selectedPhotoActa.mesaNumber}</span>
                </div>
                <h3 className="modal-local-title">{selectedPhotoActa.localName}</h3>
                <p className="modal-geo-subtitle">
                  {selectedPhotoActa.province} · Distrito de {selectedPhotoActa.district} — Total Votos:{" "}
                  <strong>{selectedPhotoActa.totalVotos}</strong>
                </p>
              </div>
              <button
                type="button"
                className="photo-modal-close-btn"
                onClick={closePhotoModal}
                title="Cerrar visor de foto"
              >
                <X size={20} />
              </button>
            </header>

            <div className="photo-modal-viewer">
              {selectedPhotoActa.photoUrl ? (
                <img
                  src={selectedPhotoActa.photoUrl}
                  alt={`Acta Mesa ${selectedPhotoActa.mesaNumber}`}
                  className="photo-modal-fullimg"
                />
              ) : (
                <div className="photo-modal-noimg">
                  No hay imagen fotográfica adjunta para esta acta.
                </div>
              )}
            </div>

            <footer className="photo-modal-footer">
              <span>Sistema de Transmisión Rápida y Conteo Rápido · Ahora Nación Madre de Dios</span>
              <button
                type="button"
                className="modal-btn-confirm"
                onClick={closePhotoModal}
              >
                Cerrar Visor
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
