"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { type BroadcastConfig, type BroadcastStatus } from "@/lib/broadcast";
import { updateBroadcastAction } from "./actions";
import "./transmision.css";

type Props = {
  initialConfig: BroadcastConfig;
  userEmail: string;
};

// Extractor de embed de YouTube en el cliente para previsualización inmediata
function clientParseEmbedUrl(rawUrl: string): string {
  let url = (rawUrl || "").trim();
  if (!url) return "";

  // Si pegan el código iframe completo
  const iframeSrcMatch = url.match(/src=["']([^"']+)["']/i);
  if (iframeSrcMatch && iframeSrcMatch[1]) {
    url = iframeSrcMatch[1];
  }

  // YouTube matchers
  const youtubeLive = url.match(/youtube\.com\/live\/([a-zA-Z0-9_-]+)/);
  if (youtubeLive && youtubeLive[1]) {
    return `https://www.youtube.com/embed/${youtubeLive[1]}?autoplay=0&rel=0`;
  }

  const youtuBe = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (youtuBe && youtuBe[1]) {
    return `https://www.youtube.com/embed/${youtuBe[1]}?autoplay=0&rel=0`;
  }

  const youtubeWatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (youtubeWatch && youtubeWatch[1]) {
    return `https://www.youtube.com/embed/${youtubeWatch[1]}?autoplay=0&rel=0`;
  }

  const youtubeEmbed = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (youtubeEmbed && youtubeEmbed[1]) {
    return `https://www.youtube.com/embed/${youtubeEmbed[1]}?autoplay=0&rel=0`;
  }

  // Facebook matchers
  if (url.includes("facebook.com/plugins/video.php")) {
    return url;
  }
  if (url.includes("facebook.com") || url.includes("fb.watch")) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
      url
    )}&show_text=false&autoplay=false`;
  }

  if (url.startsWith("https://") || url.startsWith("http://")) {
    return url;
  }

  return "";
}

export function TransmisionClient({ initialConfig }: Props) {
  const [enabled, setEnabled] = useState(initialConfig.enabled);
  const [showOnHome, setShowOnHome] = useState(initialConfig.showOnHome);
  const [status, setStatus] = useState<BroadcastStatus>(initialConfig.status);
  const [region, setRegion] = useState(initialConfig.region || "Madre de Dios");
  const [title, setTitle] = useState(
    initialConfig.title || "Debate Electoral Regional Madre de Dios 2026"
  );
  const [subtitle, setSubtitle] = useState(
    initialConfig.subtitle || "Jurado Nacional de Elecciones (JNE) · Voto Informado"
  );
  const [url, setUrl] = useState(initialConfig.url || "");
  const [customMessage, setCustomMessage] = useState(
    initialConfig.customMessage || ""
  );

  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Embed calculado al instante
  const previewEmbedUrl = useMemo(() => clientParseEmbedUrl(url), [url]);

  const handleSave = () => {
    setToast(null);
    startTransition(async () => {
      const res = await updateBroadcastAction({
        enabled,
        showOnHome,
        status,
        region,
        title,
        subtitle,
        url,
        customMessage,
      });

      if (res.ok) {
        setToast({
          type: "success",
          message: "¡Transmisión y debate actualizados con éxito en la web!",
        });
        setTimeout(() => setToast(null), 5000);
      } else {
        setToast({
          type: "error",
          message: res.error || "No se pudo guardar la configuración.",
        });
      }
    });
  };

  return (
    <div className="transmision-admin">
      {/* Encabezado */}
      <div className="transmision-admin__head">
        <div>
          <h1 className="transmision-admin__title">
            <span style={{ fontSize: 28 }}>📡</span> Transmisión en Vivo y Debate
            Oficial
          </h1>
          <p className="transmision-admin__sub">
            Controla el enlace de YouTube o señal en vivo del debate regional para
            Madre de Dios en tiempo real.
          </p>
        </div>
        <div className="transmision-admin__actions">
          <Link
            href="/debate"
            target="_blank"
            className="btn btn--outline btn--sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            Ver página pública ↗
          </Link>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="btn btn--primary"
            style={{
              background: "#dc2626",
              color: "white",
              padding: "9px 20px",
              fontWeight: 600,
              cursor: isPending ? "not-allowed" : "pointer",
            }}
          >
            {isPending ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>

      {/* Alerta Toast */}
      {toast && (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: "10px",
            backgroundColor:
              toast.type === "success" ? "#ecfdf5" : "#fef2f2",
            color: toast.type === "success" ? "#065f46" : "#991b1b",
            border: `1px solid ${
              toast.type === "success" ? "#a7f3d0" : "#fecaca"
            }`,
            fontSize: "14px",
            fontWeight: 500,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              color: "inherit",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid Principal: Formulario + Monitor */}
      <div className="transmision-admin__grid">
        {/* Columna Izquierda: Ajustes */}
        <div className="transmision-card">
          <h3 className="transmision-section-title">
            <span>⚙️</span> Estado y Visibilidad
          </h3>

          {/* Interruptor 1: Activar Transmisión */}
          <div className="switch-control">
            <div className="switch-control__info">
              <span className="switch-control__label">
                Módulo Activo en la Web
              </span>
              <span className="switch-control__desc">
                {enabled
                  ? "El módulo del debate está visible para el público."
                  : "El módulo está pausado/oculto en la web."}
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Interruptor 2: Mostrar en el Home */}
          <div className="switch-control">
            <div className="switch-control__info">
              <span className="switch-control__label">
                Mostrar en la Portada Principal (Home)
              </span>
              <span className="switch-control__desc">
                Muestra la sección del debate en la página de inicio (debajo de
                candidatos).
              </span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={showOnHome}
                onChange={(e) => setShowOnHome(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Selector de Estado */}
          <div className="form-group">
            <label>Tipo de Emisión</label>
            <div className="status-pills">
              <button
                type="button"
                className={`status-pill-btn ${
                  status === "live" ? "status-pill-btn--active-live" : ""
                }`}
                onClick={() => setStatus("live")}
              >
                <span className="live-pulse-dot"></span>
                <span>🔴 EN VIVO</span>
              </button>

              <button
                type="button"
                className={`status-pill-btn ${
                  status === "upcoming" ? "status-pill-btn--active-upcoming" : ""
                }`}
                onClick={() => setStatus("upcoming")}
              >
                <span>🟡 EN BREVE</span>
              </button>

              <button
                type="button"
                className={`status-pill-btn ${
                  status === "recorded" ? "status-pill-btn--active-recorded" : ""
                }`}
                onClick={() => setStatus("recorded")}
              >
                <span>🔵 GRABADO</span>
              </button>
            </div>
          </div>

          <hr style={{ border: "0", borderTop: "1px solid #f1f5f9" }} />

          <h3 className="transmision-section-title">
            <span>📹</span> Enlace y Contenido
          </h3>

          {/* URL de Transmisión */}
          <div className="form-group">
            <label htmlFor="broadcast-url">URL de Transmisión o Video</label>
            <input
              id="broadcast-url"
              type="text"
              placeholder="Ej: https://youtube.com/live/Ks-XO4mJg6A o https://youtu.be/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <span className="form-helper">
              Pega el enlace en vivo de YouTube ni bien empiece la transmisión.
              El sistema lo detectará automáticamente.
            </span>
          </div>

          {/* Región */}
          <div className="form-group">
            <label htmlFor="broadcast-region">Región</label>
            <input
              id="broadcast-region"
              type="text"
              placeholder="Madre de Dios"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </div>

          {/* Título */}
          <div className="form-group">
            <label htmlFor="broadcast-title">Título del Evento</label>
            <input
              id="broadcast-title"
              type="text"
              placeholder="Debate Electoral Regional Madre de Dios 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Subtítulo */}
          <div className="form-group">
            <label htmlFor="broadcast-subtitle">Entidad / Subtítulo</label>
            <input
              id="broadcast-subtitle"
              type="text"
              placeholder="Jurado Nacional de Elecciones (JNE) · Voto Informado"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </div>

          {/* Mensaje de llamado */}
          <div className="form-group">
            <label htmlFor="broadcast-message">Mensaje para la Gente (Opcional)</label>
            <textarea
              id="broadcast-message"
              rows={3}
              placeholder="¡Apoya con fuerza a nuestro candidato Simón Horna en los comentarios oficiales!"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="btn btn--primary"
            style={{
              background: "#dc2626",
              color: "white",
              padding: "12px",
              fontWeight: 600,
              width: "100%",
              marginTop: "8px",
              cursor: isPending ? "not-allowed" : "pointer",
            }}
          >
            {isPending ? "Guardando cambios en la web..." : "💾 Guardar y Publicar en Vivo"}
          </button>
        </div>

        {/* Columna Derecha: Monitor de Previsualización */}
        <div className="monitor-card">
          <div className="monitor-header">
            <div className="monitor-header__left">
              {status === "live" && <span className="live-pulse-dot"></span>}
              <span>
                {status === "live"
                  ? "Señal en Vivo"
                  : status === "upcoming"
                  ? "Transmisión en Espera"
                  : "Emisión Grabada"}
              </span>
            </div>
            <div className="monitor-dots">
              <span className="monitor-dot monitor-dot--red"></span>
              <span className="monitor-dot monitor-dot--yellow"></span>
              <span className="monitor-dot monitor-dot--green"></span>
            </div>
          </div>

          {/* Pantalla del monitor */}
          <div className="monitor-screen">
            {previewEmbedUrl ? (
              <iframe
                src={previewEmbedUrl}
                title="Monitor de Transmisión"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="monitor-screen-empty">
                <span style={{ fontSize: 36 }}>📺</span>
                <p style={{ margin: 0, fontWeight: 500 }}>
                  Aún no has ingresado una URL válida de YouTube.
                </p>
                <small style={{ color: "#475569" }}>
                  Pega un enlace como <code>https://youtube.com/live/...</code> para
                  previsualizar aquí.
                </small>
              </div>
            )}
          </div>

          {/* Pie del monitor */}
          <div className="monitor-footer">
            <div className="monitor-info">
              <h4>{title || "Sin título"}</h4>
              <p>
                {region} · {subtitle}
              </p>
            </div>
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: 12,
                  color: "#38bdf8",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                Abrir enlace original ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
