import React, { useState, useEffect } from 'react';
import {
  Share2, CheckCircle2, UserCheck, MessageCircle,
  Check, Send, Sparkles, ArrowRight, LayoutGrid
} from 'lucide-react';
import type { VoteLockStatus } from '@/services/voteLockService';
import { clearVoteLock } from '@/services/voteLockService';
import { findAnyCandidateById, DISTRITOS_MDD } from '@/data/votoData';
import { createSvgLogoFallback, createSvgUserFallback } from '@/services/jneService';
import { audioFeedback } from '@/utils/audioFeedback';

interface VoteLockScreenProps {
  lockStatus: VoteLockStatus;
  onGoToResults: () => void;
  onOpenShareModal?: () => void;
  onUnlockSuccess?: () => void;
  onGoToCedulaAlcalde?: () => void;
  onGoToCedulaGobernador?: () => void;
}

export const VoteLockScreen: React.FC<VoteLockScreenProps> = ({
  lockStatus,
  onGoToResults,
  onOpenShareModal,
  onUnlockSuccess,
  onGoToCedulaAlcalde,
  onGoToCedulaGobernador
}) => {
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Auto-scroll suave al comprobante al montarse
  useEffect(() => {
    const timer = setTimeout(() => {
      const elem = document.getElementById('votelock-screen-main') || document.getElementById('encuesta-pregunta-card');
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const rec = lockStatus.record;
  const gobCand = rec?.candidatoGobernadorId ? findAnyCandidateById(rec.candidatoGobernadorId) : null;
  const alcCand = rec?.candidatoAlcaldeId ? findAnyCandidateById(rec.candidatoAlcaldeId) : null;
  const distObj = rec?.distrito ? DISTRITOS_MDD.find((d: any) => d.id === rec.distrito) : null;
  const distName = distObj ? distObj.nombre : (rec?.provincia || 'Madre de Dios');

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://ahoranacionmdd.pe';
  const shareMessage = `He emitido mi voto en la Cédula Oficial Madre de Dios 2026. Conoce las propuestas y participa aquí:\n${currentUrl}`;


  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      audioFeedback.playClick();
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    audioFeedback.playClick();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Encuestas Madre de Dios 2026',
          text: shareMessage,
          url: currentUrl
        });
      } catch {
        handleCopyLink();
      }
    } else if (onOpenShareModal) {
      onOpenShareModal();
    } else {
      handleCopyLink();
    }
  };

  const handleResultsClick = () => {
    audioFeedback.playClick();
    if (onGoToResults) {
      onGoToResults();
    }
    if (typeof window !== 'undefined') {
      window.location.hash = 'encuestas';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div
      id="votelock-screen-main"
      className="votelock-container"
      style={{
        maxWidth: '820px',
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: '24px',
        border: '2px solid #059669',
        boxShadow: '0 16px 40px rgba(5, 150, 105, 0.12)',
        padding: '30px 24px',
        textAlign: 'center',
        color: '#0f172a',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <style>{`
        .btn-share-touch { transition: transform 0.15s ease, background 0.15s ease; }
        .btn-share-touch:active { transform: scale(0.97); }

        /* Animación interactiva de parpadeo y pulso para Ver Resultados Oficiales */
        @keyframes pulseResultsGlow {
          0% {
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 0 12px rgba(220, 38, 38, 0);
            transform: scale(1.02);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(220, 38, 38, 0);
            transform: scale(1);
          }
        }

        @keyframes liveDotBlink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(0.65); }
        }

        .btn-pulse-results {
          animation: pulseResultsGlow 2.2s infinite cubic-bezier(0.4, 0, 0.6, 1);
          transition: all 0.2s ease;
        }
        .btn-pulse-results:hover {
          background: #b91c1c !important;
          transform: translateY(-2px) scale(1.03) !important;
          box-shadow: 0 8px 25px rgba(220, 38, 38, 0.5) !important;
        }

        @media (max-width: 767px) {
          .votelock-container {
            padding: 20px 14px !important;
            border-radius: 16px !important;
          }
          .votelock-title {
            font-size: 1.35rem !important;
          }
          .votelock-timer {
            font-size: 1.75rem !important;
          }
          .votelock-share-title {
            font-size: 1.1rem !important;
          }
          .votelock-grid-share {
            grid-template-columns: 1fr !important;
          }
          .btn-pulse-results {
            width: 100% !important;
            padding: 15px 16px !important;
            font-size: 0.92rem !important;
          }
        }
      `}</style>

      {/* Insignia Superior Oficial */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: '#ecfdf5',
        color: '#059669',
        border: '1px solid #a7f3d0',
        padding: '6px 18px',
        borderRadius: '9999px',
        fontSize: '0.8rem',
        fontWeight: 900,
        marginBottom: '12px'
      }}>
        <CheckCircle2 size={17} style={{ color: '#059669' }} /> VOTO REGISTRADO Y COMPUTADO CON ÉXITO
      </div>

      <h2 className="votelock-title" style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
        ¡Tu Voto Ciudadano fue Emitido con Éxito!
      </h2>

      <p style={{ fontSize: '0.9rem', color: '#475569', maxWidth: '620px', margin: '0 auto 20px auto', lineHeight: 1.45 }}>
        La participación ciudadana ha sido registrada y sellada en el sistema electoral oficial de Madre de Dios.
      </p>

      {/* BOTONES PRINCIPALES DE ACCIÓN INMEDIATA (ENCUESTADOR / CIUDADANO) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '560px', margin: '0 auto 24px auto' }}>
        {onUnlockSuccess && (
          <button
            onClick={() => {
              clearVoteLock();
              onUnlockSuccess();
            }}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '14px',
              padding: '16px 22px',
              fontSize: '1rem',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 6px 20px rgba(5, 150, 105, 0.28)',
              transition: 'transform 0.15s ease'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>📋</span>
            <span>Registrar Siguiente Elector (Modo Encuestador en Campo)</span>
          </button>
        )}

        <button
          onClick={handleResultsClick}
          className="btn-pulse-results"
          style={{
            width: '100%',
            background: '#091e42',
            color: '#ffffff',
            border: 'none',
            padding: '16px 24px',
            borderRadius: '14px',
            fontSize: '1rem',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 6px 20px rgba(9, 30, 66, 0.22)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <LayoutGrid size={20} style={{ color: '#38bdf8' }} />
            <span style={{ letterSpacing: '0.01em' }}>Ver Más Encuestas Electorales</span>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '0.74rem',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>EXPLORAR</span>
            <ArrowRight size={13} />
          </div>
        </button>
      </div>

      {/* 2. Resumen del Voto Emitido con FOTOS Y LOGOS */}
      {rec && (
        <div style={{
          background: '#f8fafc',
          borderRadius: '18px',
          border: '1.5px solid #e2e8f0',
          padding: '18px',
          textAlign: 'left',
          marginBottom: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserCheck size={15} style={{ color: '#059669' }} />
              Comprobante de Participación Guardado
            </div>
            <span style={{ fontSize: '0.7rem', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
              Cédula Virtual Sellada
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
            
            {/* TARJETA 1: GOBERNADOR REGIONAL */}
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              padding: '12px 14px',
              borderRadius: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#991b1b', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  GOBERNADOR REGIONAL
                </span>
                <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <CheckCircle2 size={12} /> Marcado
                </span>
              </div>

              {rec.candidatoGobernadorId === 'blanco' ? (
                <div style={{ padding: '6px 0', fontSize: '0.88rem', fontWeight: 900, color: '#475569' }}>
                  🗳️ Voto en Blanco
                </div>
              ) : rec.candidatoGobernadorId === 'nulo' ? (
                <div style={{ padding: '6px 0', fontSize: '0.88rem', fontWeight: 900, color: '#dc2626' }}>
                  ❌ Voto Nulo / Viciado
                </div>
              ) : gobCand ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={gobCand.fotoUrl}
                    alt={gobCand.nombre}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = createSvgUserFallback(gobCand.nombre);
                    }}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #fee2e2',
                      flexShrink: 0
                    }}
                  />

                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '3px',
                    width: '34px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <img
                      src={gobCand.partidoLogo}
                      alt={gobCand.partido}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = createSvgLogoFallback(gobCand.partido);
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.25 }}>
                      {gobCand.nombre}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>
                      {gobCand.partido}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '6px 0', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Aún no has emitido tu voto para Gobernador Regional.
                  </div>
                  <button
                    onClick={() => {
                      audioFeedback.playClick();
                      if (onGoToCedulaGobernador) {
                        onGoToCedulaGobernador();
                      } else if (typeof window !== 'undefined') {
                        window.location.hash = 'simulador';
                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '8px 16px',
                      fontSize: '0.82rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 3px 10px rgba(220, 38, 38, 0.25)'
                    }}
                  >
                    <span>🗳️ Votar por Gobernador en la Cédula →</span>
                  </button>
                </div>
              )}
            </div>

            {/* TARJETA 2: ALCALDÍA PROVINCIAL O DISTRITAL */}
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              padding: '12px 14px',
              borderRadius: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  ALCALDÍA ({distName})
                </span>
                <span style={{ fontSize: '0.68rem', color: alcCand ? '#059669' : '#94a3b8', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
                  {alcCand ? <CheckCircle2 size={12} /> : null} {alcCand ? 'Marcado' : 'Opcional'}
                </span>
              </div>

              {rec.candidatoAlcaldeId === 'blanco' ? (
                <div style={{ padding: '6px 0', fontSize: '0.88rem', fontWeight: 900, color: '#475569' }}>
                  🗳️ Voto en Blanco
                </div>
              ) : rec.candidatoAlcaldeId === 'nulo' ? (
                <div style={{ padding: '6px 0', fontSize: '0.88rem', fontWeight: 900, color: '#dc2626' }}>
                  ❌ Voto Nulo / Viciado
                </div>
              ) : alcCand ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={alcCand.fotoUrl}
                    alt={alcCand.nombre}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = createSvgUserFallback(alcCand.nombre);
                    }}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #e0f2fe',
                      flexShrink: 0
                    }}
                  />

                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '3px',
                    width: '34px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <img
                      src={alcCand.partidoLogo}
                      alt={alcCand.partido}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = createSvgLogoFallback(alcCand.partido);
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.25 }}>
                      {alcCand.nombre}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginTop: '2px' }}>
                      {alcCand.partido}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '6px 0', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Aún no has emitido tu voto para la Alcaldía ({distName}).
                  </div>
                  <button
                    onClick={() => {
                      audioFeedback.playClick();
                      if (onGoToCedulaAlcalde) {
                        onGoToCedulaAlcalde();
                      } else if (typeof window !== 'undefined') {
                        window.location.hash = 'simulador';
                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '8px 16px',
                      fontSize: '0.82rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 3px 10px rgba(2, 132, 199, 0.25)',
                      transition: 'transform 0.1s ease'
                    }}
                  >
                    <span>🗳️ Votar por Alcalde en la Cédula →</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}



      {/* 4. BLOQUE VIRAL PREMIUM: COMPARTIR CON AMIGOS Y FAMILIA */}
      <div style={{
        background: '#ffffff',
        borderRadius: '18px',
        border: '2px solid #38bdf8',
        padding: '18px 16px',
        marginBottom: '18px',
        boxShadow: '0 6px 20px rgba(56, 189, 248, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        textAlign: 'center'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 900, marginBottom: '4px' }}>
            <Sparkles size={12} style={{ color: '#0284c7' }} /> ¡TU VOZ CUENTA Y LA DE TUS AMIGOS TAMBIÉN!
          </div>
          <h3 className="votelock-share-title" style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '2px 0 4px 0', lineHeight: 1.25 }}>
            Invita a tus amigos y defiende la democracia
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0, lineHeight: 1.4, maxWidth: '600px', marginInline: 'auto' }}>
            Comparte esta encuesta con tus grupos de WhatsApp, familiares y vecinos de Madre de Dios para que nadie se quede sin votar.
          </p>
        </div>

        {/* Botones de Compartir de Alto Impacto */}
        <div className="votelock-grid-share" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '8px'
        }}>
          {/* Botón WhatsApp */}
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-share-touch"
            style={{
              background: '#25d366',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '0.88rem',
              fontWeight: 900,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 3px 12px rgba(37, 211, 102, 0.25)',
              cursor: 'pointer'
            }}
          >
            <MessageCircle size={17} /> Compartir por WhatsApp
          </a>

          {/* Botón Facebook */}
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-share-touch"
            style={{
              background: '#1877f2',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '0.88rem',
              fontWeight: 900,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 3px 12px rgba(24, 119, 242, 0.25)',
              cursor: 'pointer'
            }}
          >
            <Send size={15} /> Enviar a Facebook
          </a>

          {/* Botón Copiar Enlace */}
          <button
            onClick={handleCopyLink}
            className="btn-share-touch"
            style={{
              background: copiedLink ? '#059669' : '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '0.88rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 3px 12px rgba(15, 23, 42, 0.15)',
              cursor: 'pointer'
            }}
          >
            {copiedLink ? <Check size={16} /> : <Share2 size={16} />}
            <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
          </button>

          {/* Botón Compartir Cédula Nativa */}
          <button
            onClick={handleNativeShare}
            className="btn-share-touch"
            style={{
              background: '#475569',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '0.88rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 3px 12px rgba(71, 85, 105, 0.15)',
              cursor: 'pointer'
            }}
          >
            <Share2 size={16} /> Más Opciones...
          </button>
        </div>
      </div>

    </div>
  );
};
