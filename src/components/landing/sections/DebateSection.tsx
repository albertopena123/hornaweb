"use client";

import { useState } from "react";
import { type BroadcastConfig } from "@/lib/broadcast";
import "./debate.css";

type Props = {
  broadcast: BroadcastConfig;
};

export default function DebateSection({ broadcast }: Props) {
  const [copied, setCopied] = useState(false);

  // Si está deshabilitado por completo en el admin, no renderizar
  if (!broadcast.enabled) return null;

  const isLive = broadcast.status === "live";
  const isUpcoming = broadcast.status === "upcoming";
  const isRecorded = broadcast.status === "recorded";

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const shareUrl = `${window.location.origin}/debate`;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const whatsappText = encodeURIComponent(
    `¡Atención Madre de Dios! 🗳️ Transmisión del ${broadcast.title} · Conoce las propuestas de Simón Horna: ${
      typeof window !== "undefined"
        ? `${window.location.origin}/debate`
        : "https://hornaweb.pe/debate"
    }`
  );

  return (
    <section id="debate-envivo" className="debate-section">
      {/* Luces de ambientación cinematográfica */}
      <div className="debate-section__glow-1" aria-hidden="true" />
      <div className="debate-section__glow-2" aria-hidden="true" />

      <div className="debate-container">
        {/* Encabezado */}
        <div className="debate-header">
          <div className="debate-header__tag">
            {isLive ? (
              <>
                <span className="cinema-pulse-dot" />
                <span>SEÑAL OFICIAL EN DIRECTO</span>
              </>
            ) : isUpcoming ? (
              <span>🟡 PRÓXIMA TRANSMISIÓN</span>
            ) : (
              <span>🔵 REPETICIÓN OFICIAL</span>
            )}
          </div>
          <h2 className="debate-header__title">
            Debate Electoral Regional <span>{broadcast.region}</span> 2026
          </h2>
          <p className="debate-header__desc">
            Sigue de cerca las propuestas, visión y debates oficiales para el
            futuro de {broadcast.region}. Transmisión oficial para toda nuestra
            gente.
          </p>
        </div>

        {/* Marco de Cine / Cinema Frame */}
        <div className="cinema-frame">
          {/* Barra Superior */}
          <div className="cinema-topbar">
            <div className="cinema-badges">
              {isLive && (
                <div className="cinema-badge--live">
                  <span className="cinema-pulse-dot" />
                  <span>EN VIVO</span>
                </div>
              )}
              {isUpcoming && (
                <div className="cinema-badge--upcoming">
                  <span>EN BREVE</span>
                </div>
              )}
              {isRecorded && (
                <div className="cinema-badge--recorded">
                  <span>GRABACIÓN</span>
                </div>
              )}

              <span className="cinema-region-pill">
                🇵🇪 {broadcast.region}
              </span>
            </div>

            <div className="cinema-topbar__source">
              {broadcast.subtitle}
            </div>
          </div>

          {/* Área del Reproductor */}
          <div className="cinema-screen">
            {broadcast.embedUrl && !isUpcoming ? (
              <iframe
                src={broadcast.embedUrl}
                title={broadcast.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="cinema-standby">
                <div className="cinema-standby__icon">📡</div>
                <h3 className="cinema-standby__title">
                  {isUpcoming
                    ? "La transmisión iniciará en breve"
                    : "Esperando señal en vivo..."}
                </h3>
                <p className="cinema-standby__text">
                  El equipo técnico conectará la señal oficial de{" "}
                  <strong>{broadcast.region}</strong> ni bien inicie la
                  transmisión. Mantén abierta esta ventana para verla
                  automáticamente.
                </p>
              </div>
            )}
          </div>

          {/* Barra de Acciones y Datos */}
          <div className="cinema-bottombar">
            <div className="cinema-info">
              <h3>{broadcast.title}</h3>
              <p>{broadcast.subtitle}</p>
            </div>

            <div className="cinema-actions">
              {/* Botón WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${whatsappText}`}
                target="_blank"
                rel="noreferrer"
                className="cinema-btn cinema-btn--whatsapp"
                title="Compartir transmisión en WhatsApp"
              >
                <span>📲</span> Compartir en WhatsApp
              </a>

              {/* Botón Copiar Enlace */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="cinema-btn cinema-btn--outline"
              >
                <span>🔗</span> {copied ? "¡Enlace copiado!" : "Copiar enlace"}
              </button>

              {/* Botón YouTube o Facebook si hay url */}
              {broadcast.url && (
                <a
                  href={broadcast.url}
                  target="_blank"
                  rel="noreferrer"
                  className="cinema-btn cinema-btn--outline"
                  title={
                    broadcast.url.includes("facebook") ||
                    broadcast.url.includes("fb.watch")
                      ? "Abrir transmisión en Facebook oficial"
                      : "Abrir transmisión en YouTube oficial"
                  }
                >
                  <span>
                    {broadcast.url.includes("facebook") ||
                    broadcast.url.includes("fb.watch")
                      ? "📘"
                      : "▶"}
                  </span>{" "}
                  {broadcast.url.includes("facebook") ||
                  broadcast.url.includes("fb.watch")
                    ? "Ver en Facebook"
                    : "Ver en YouTube"}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Mensaje de apoyo personalizado */}
        {broadcast.customMessage && (
          <div className="cinema-banner-msg">
            <span style={{ fontSize: 20 }}>📢</span>
            <div>
              <strong>Mensaje a los simpatizantes:</strong>{" "}
              {broadcast.customMessage}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
