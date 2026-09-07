"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Tv,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  RefreshCw,
  Building2,
  MapPin,
  Vote,
  Flame,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  X,
  ZoomIn,
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newActaAlert, setNewActaAlert] = useState<any | null>(null);
  const [selectedPhotoActa, setSelectedPhotoActa] = useState<any | null>(null);

  const lastSeenActaIdRef = useRef<string | null>(initialData.ultimaAprobada?.id || null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Reproducir timbre de notificación
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
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Ignorar si el navegador bloquea audio sin interacción
    }
  };

  // Reloj digital en tiempo real
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

            // Detectar nueva acta aprobada
            if (
              freshData.ultimaAprobada &&
              freshData.ultimaAprobada.id !== lastSeenActaIdRef.current
            ) {
              lastSeenActaIdRef.current = freshData.ultimaAprobada.id;
              setNewActaAlert(freshData.ultimaAprobada);
              playAlertSound();

              // Ocultar alerta después de 7 segundos
              setTimeout(() => {
                if (isMounted) setNewActaAlert(null);
              }, 7000);
            }
          }
        }
      } catch (err) {
        console.error("Error al actualizar cómputo:", err);
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

  // Pantalla Completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const { stats, ranking, votosPorProvincia, ultimasActas } = data;
  const winner = ranking[0];

  return (
    <div className="visor-tv-root">
      {/* Barra de Difusión / TV Header */}
      <header className="visor-tv-header">
        <div className="header-brand-block">
          <div className="live-beacon-pill">
            <span className="live-dot animate-ping" />
            <span className="live-dot" />
            <span className="live-text">EN VIVO</span>
          </div>

          <div className="header-titles">
            <h1 className="header-main-title">
              {scope === "gobernador"
                ? "CÓMPUTO GOBERNACIÓN REGIONAL"
                : `CÓMPUTO ALCALDÍA PROVINCIAL ${scope.toUpperCase()}`}{" "}
              <span className="title-sub-badge">
                {scope === "gobernador" ? "MADRE DE DIOS" : scope.toUpperCase()} 2026
              </span>
            </h1>
            <p className="header-subtitle">
              SISTEMA DE TRANSMISIÓN RÁPIDA DE ACTAS · AHORA NACIÓN
            </p>
          </div>
        </div>

        <div className="header-center-info">
          <div className="digital-clock">
            <Clock size={16} className="text-amber-400" />
            <span>{currentTime || "00:00:00"}</span>
          </div>
          <div className="status-indicator">
            <span className={`sync-dot ${isUpdating ? "sync-dot--active" : ""}`} />
            <span>{isUpdating ? "Sincronizando..." : "Conectado"}</span>
          </div>
        </div>

        <div className="header-controls">
          <button
            type="button"
            className={`tv-btn-icon ${soundEnabled ? "tv-btn-icon--active" : ""}`}
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playAlertSound();
            }}
            title={soundEnabled ? "Silenciar alertas" : "Activar sonido de actas entrantes"}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <button
            type="button"
            className="tv-btn-icon"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Salir de pantalla completa" : "Modo Pantalla Completa"}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          <Link href="/verificacion" className="tv-link-operator">
            Estación Filtro <ChevronRight size={14} />
          </Link>
        </div>
      </header>

      {/* Selector de Ámbito Electoral (Gobernación Regional vs Alcaldías Provinciales) */}
      <nav className="visor-scope-nav">
        <button
          type="button"
          className={`scope-nav-btn ${scope === "gobernador" ? "scope-nav-btn--active" : ""}`}
          onClick={() => setScope("gobernador")}
        >
          🏛️ Gobernación Regional
        </button>
        <button
          type="button"
          className={`scope-nav-btn ${scope === "Tambopata" ? "scope-nav-btn--active" : ""}`}
          onClick={() => setScope("Tambopata")}
        >
          🏢 Alcaldía Tambopata
        </button>
        <button
          type="button"
          className={`scope-nav-btn ${scope === "Manu" ? "scope-nav-btn--active" : ""}`}
          onClick={() => setScope("Manu")}
        >
          🏢 Alcaldía Manu
        </button>
        <button
          type="button"
          className={`scope-nav-btn ${scope === "Tahuamanu" ? "scope-nav-btn--active" : ""}`}
          onClick={() => setScope("Tahuamanu")}
        >
          🏢 Alcaldía Tahuamanu
        </button>
      </nav>

      {/* Ticker de Métricas Globales */}
      <section className="visor-tv-ticker">
        <div className="ticker-card ticker-card--main">
          <div className="ticker-label">AVANCE REGIONAL DE MESAS</div>
          <div className="ticker-value">
            <span className="ticker-val-big">{stats.pctAvance}%</span>
            <span className="ticker-val-sub">
              ({stats.aprobadas} de {stats.totalMesas} mesas)
            </span>
          </div>
          <div className="ticker-progress-track">
            <div
              className="ticker-progress-fill"
              style={{ width: `${Math.min(stats.pctAvance, 100)}%` }}
            />
          </div>
        </div>

        <div className="ticker-card">
          <div className="ticker-label">VOTOS VÁLIDOS</div>
          <div className="ticker-value">
            <span className="ticker-val-num">{stats.totalVotosValidos.toLocaleString("es-PE")}</span>
            <span className="ticker-val-badge">Total partidos</span>
          </div>
        </div>

        <div className="ticker-card">
          <div className="ticker-label">TOTAL CIUDADANOS QUE VOTARON</div>
          <div className="ticker-value">
            <span className="ticker-val-num">{stats.totalVotosEmitidos.toLocaleString("es-PE")}</span>
            <span className="ticker-val-badge">100% emitidos</span>
          </div>
        </div>

        <div className="ticker-card">
          <div className="ticker-label">EN COLA DE VERIFICACIÓN</div>
          <div className="ticker-value">
            <span className="ticker-val-num text-amber-400">{stats.pendientes}</span>
            <span className="ticker-val-badge text-gray-300">En revisión</span>
          </div>
        </div>
      </section>

      {/* Pop-up / Alerta Hero: Nueva Acta Aprobada */}
      {newActaAlert && (
        <aside className="alert-nueva-acta animate-slide-in">
          <div className="alert-badge">
            <Sparkles size={16} /> ¡NUEVA ACTA DE ESCRUTINIO APROBADA!
          </div>
          <div className="alert-body">
            <div className="alert-mesa">
              MESA N° <strong>{newActaAlert.mesaNumber}</strong>
            </div>
            <div className="alert-local">
              <Building2 size={14} /> {newActaAlert.localName} · {newActaAlert.district} (
              {newActaAlert.province})
            </div>
            <div className="alert-votes">
              +<strong>{newActaAlert.totalVotos}</strong> votos procesados e integrados al cómputo
            </div>
          </div>
          <button
            type="button"
            className="alert-close-btn"
            onClick={() => setNewActaAlert(null)}
          >
            <X size={16} />
          </button>
        </aside>
      )}

      {/* Grid Principal */}
      <main className="visor-tv-grid">
        {/* Columna Izquierda: Resultados Candidatos (Ranking) */}
        <section className="visor-ranking-card">
          <div className="ranking-card-head">
            <div className="ranking-title-group">
              <Vote size={20} className="text-red-500" />
              <h2>
                RESULTADOS:{" "}
                {scope === "gobernador"
                  ? "GOBERNADOR REGIONAL"
                  : `ALCALDÍA PROVINCIAL DE ${scope.toUpperCase()}`}
              </h2>
            </div>
            <div className="ranking-head-meta">
              <span>{ranking.length} Candidatos</span>
              <span className="dot-sep">·</span>
              <span className="text-blue-300">Cálculo sobre Votos Válidos</span>
            </div>
          </div>

          <div className="ranking-list">
            {ranking.map((cand, idx) => {
              const isFirst = idx === 0 && cand.votes > 0;
              const isHorna = cand.party.toUpperCase().includes("AHORA NACION");
              const barColor = cand.color || (isHorna ? "#dc2626" : "#2563eb");

              return (
                <div
                  key={cand.id}
                  className={`cand-row ${isFirst ? "cand-row--leader" : ""} ${
                    isHorna ? "cand-row--horna" : ""
                  }`}
                >
                  <div className="cand-rank-pos">
                    {isFirst ? (
                      <span className="leader-crown" title="Primer lugar">
                        👑 1°
                      </span>
                    ) : (
                      <span>{idx + 1}°</span>
                    )}
                  </div>

                  {/* Foto Candidato */}
                  <div className="cand-avatar-wrap">
                    {cand.photoUrl ? (
                      <img
                        src={cand.photoUrl}
                        alt={cand.name}
                        className="cand-avatar"
                        onError={(e) => {
                          // Fallback si la imagen falla
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="cand-avatar-fallback">{cand.name.charAt(0)}</div>
                    )}
                  </div>

                  {/* Logo Partido */}
                  <div className="cand-logo-wrap">
                    {cand.partyLogo ? (
                      <img src={cand.partyLogo} alt={cand.party} className="cand-party-logo" />
                    ) : (
                      <div className="cand-party-logo-fallback">{cand.order}</div>
                    )}
                  </div>

                  {/* Datos y Barra */}
                  <div className="cand-data-col">
                    <div className="cand-info-top">
                      <div className="cand-names">
                        <strong className="cand-person-name">{cand.name}</strong>
                        <span className="cand-party-title">{cand.party}</span>
                      </div>
                      <div className="cand-numbers">
                        <span className="cand-pct-badge">{cand.pctValidos.toFixed(1)}%</span>
                        <span className="cand-votes-text">
                          {cand.votes.toLocaleString("es-PE")} votos
                        </span>
                      </div>
                    </div>

                    <div className="cand-bar-track">
                      <div
                        className="cand-bar-fill"
                        style={{
                          width: `${Math.max(cand.pctValidos, 1)}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Columna Derecha: Desglose Provincial & Feed de Últimas Actas */}
        <aside className="visor-sidebar">
          {/* Tarjeta de Provincias */}
          <div className="sidebar-card">
            <div className="sidebar-card-head">
              <MapPin size={18} className="text-emerald-400" />
              <h3>DESGLOSE POR PROVINCIA</h3>
            </div>

            <div className="provinces-grid">
              {Object.entries(votosPorProvincia).map(([prov, item]) => (
                <div key={prov} className="province-card">
                  <div className="province-top">
                    <span className="prov-name">{prov}</span>
                    <span className="prov-actas">{item.aprobadas} actas</span>
                  </div>
                  <div className="prov-votes-sum">
                    <strong>{item.totalVotos.toLocaleString("es-PE")}</strong> votos
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feed de Últimas Actas Procesadas */}
          <div className="sidebar-card sidebar-card--feed">
            <div className="sidebar-card-head">
              <ShieldCheck size={18} className="text-blue-400" />
              <h3>ÚLTIMAS ACTAS INCORPORADAS</h3>
            </div>

            <div className="feed-actas-list">
              {ultimasActas.length === 0 ? (
                <div className="feed-empty">Esperando las primeras actas aprobadas...</div>
              ) : (
                ultimasActas.map((acta) => (
                  <div
                    key={acta.id}
                    className="feed-acta-item"
                    onClick={() => setSelectedPhotoActa(acta)}
                  >
                    {/* Thumbnail del acta */}
                    <div className="acta-thumb-wrap">
                      {acta.photoUrl ? (
                        <img
                          src={acta.photoUrl}
                          alt={`Acta ${acta.mesaNumber}`}
                          className="acta-thumb"
                        />
                      ) : (
                        <div className="acta-thumb-fallback">ACTA</div>
                      )}
                      <span className="thumb-zoom-hint">
                        <ZoomIn size={12} />
                      </span>
                    </div>

                    <div className="feed-acta-info">
                      <div className="feed-acta-mesa">
                        <strong>Mesa {acta.mesaNumber}</strong>
                        <span className="feed-votos-pill">{acta.totalVotos} votos</span>
                      </div>
                      <div className="feed-acta-school">
                        <Building2 size={12} /> {acta.localName}
                      </div>
                      <div className="feed-acta-prov">
                        {acta.district} · {acta.province}
                      </div>
                      {acta.topCandidate && (
                        <div className="feed-top-cand">
                          Ganador mesa: <span>{acta.topCandidate.party}</span> (
                          {acta.topCandidate.votes}v)
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* Modal de Inspección Visual de Foto para Pantalla Gigante */}
      {selectedPhotoActa && (
        <div className="photo-modal-backdrop" onClick={() => setSelectedPhotoActa(null)}>
          <div className="photo-modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="photo-modal-head">
              <div>
                <h3>Fotografía Original · Mesa N° {selectedPhotoActa.mesaNumber}</h3>
                <p>
                  {selectedPhotoActa.localName} ({selectedPhotoActa.province} ·{" "}
                  {selectedPhotoActa.district}) — Total Votos: {selectedPhotoActa.totalVotos}
                </p>
              </div>
              <button
                type="button"
                className="photo-modal-close"
                onClick={() => setSelectedPhotoActa(null)}
              >
                ✕
              </button>
            </header>

            <div className="photo-modal-body">
              {selectedPhotoActa.photoUrl ? (
                <img
                  src={selectedPhotoActa.photoUrl}
                  alt={`Acta Mesa ${selectedPhotoActa.mesaNumber}`}
                  className="photo-modal-img"
                />
              ) : (
                <p className="text-gray-400">No hay imagen adjunta para esta acta.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
