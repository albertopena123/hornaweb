import React from 'react';
import type { Candidato } from '@/types';
import { X, ExternalLink, FileText, CheckCircle2, User, BookOpen, ShieldCheck, Download } from 'lucide-react';

interface CandidateDetailModalProps {
  candidato: Candidato | null;
  onClose: () => void;
  onSelectVote?: (candidatoId: string) => void;
  isSelected?: boolean;
}

export const CandidateDetailModal: React.FC<CandidateDetailModalProps> = ({
  candidato,
  onClose,
  onSelectVote
}) => {
  if (!candidato) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 2500,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '780px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        borderRadius: '24px',
        background: '#ffffff',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        padding: '32px',
        position: 'relative',
        border: '1px solid #e2e8f0',
        color: '#0f172a',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f1f5f9',
            border: 'none',
            color: '#64748b',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2';
            (e.currentTarget as HTMLButtonElement).style.color = '#b91c1c';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9';
            (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
          }}
        >
          <X size={20} />
        </button>

        {/* Official Top Header Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '6px 14px', borderRadius: '9999px', width: 'fit-content', fontSize: '0.8rem', fontWeight: 800 }}>
          <ShieldCheck size={16} /> Expediente Oficial de Candidatura — Madre de Dios 2026
        </div>

        {/* Candidate Profile Header */}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '28px', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px' }}>
          <div style={{ position: 'relative' }}>
            <img
              src={candidato.fotoUrl}
              alt={candidato.nombre}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(candidato.nombre)}&background=b91c1c&color=fff&size=120`;
              }}
              style={{
                width: '130px',
                height: '130px',
                borderRadius: '24px',
                objectFit: 'cover',
                border: '3px solid #b91c1c',
                boxShadow: '0 8px 20px rgba(185, 28, 28, 0.15)',
                background: '#f8fafc'
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '-6px',
              right: '-6px',
              background: '#ffffff',
              padding: '4px',
              borderRadius: '12px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img
                src={candidato.partidoLogo}
                alt={candidato.partido}
                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
              />
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '260px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {candidato.partido}
            </span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '4px 0 8px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {candidato.nombre}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem', fontWeight: 600 }}>
              <User size={16} style={{ color: '#64748b' }} /> {candidato.profesion}
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: '#f1f5f9', color: '#334155', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                Cargo: {candidato.cargo === 'Gobernador' ? 'Gobernador Regional' : 'Alcalde'}
              </span>
              {candidato.provincia && (
                <span style={{ background: '#f1f5f9', color: '#334155', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                  Provincia: {candidato.provincia}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Biografía Breve */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
            Reseña y Trayectoria
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, margin: 0 }}>
            {candidato.biografiaBreve}
          </p>
        </div>

        {/* Propuesta Principal (Destacada) */}
        <div style={{ marginBottom: '24px', background: '#fffbeb', border: '1.5px solid #fef3c7', padding: '18px 20px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ background: '#f59e0b', color: '#ffffff', fontSize: '0.7rem', fontWeight: 900, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
              Propuesta Central
            </span>
          </div>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#92400e', margin: 0, lineHeight: 1.4 }}>
            "{candidato.propuestaPrincipal}"
          </h4>
        </div>

        {/* Propuestas Secundarias */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} style={{ color: '#059669' }} /> Ejes Temáticos de Gobierno
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {candidato.propuestasSecundarias.map((prop: string, idx: number) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: '#ffffff', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '12px' }}>
                <CheckCircle2 size={16} style={{ color: '#059669', marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontSize: '0.88rem', color: '#334155', fontWeight: 600 }}>{prop}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Declaración de Sentencias y Antecedentes (Sin Sentencias Declaradas) */}
        <div style={{ marginBottom: '28px', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldCheck size={24} style={{ color: '#059669', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#065f46' }}>
              Declaración Jurada Oficial — Sin Sentencias ni Antecedentes Penales
            </div>
            <div style={{ fontSize: '0.78rem', color: '#047857' }}>
              El candidato ha declarado cero sentencias firmadas en materia penal o civil.
            </div>
          </div>
        </div>

        {/* Enlaces Oficiales en Botones */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <a
            href={candidato.hojaDeVidaUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '14px 20px',
              borderRadius: '14px',
              background: '#b91c1c',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 800,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(185, 28, 28, 0.25)'
            }}
          >
            <FileText size={18} /> Ver Hoja de Vida Completa <ExternalLink size={14} />
          </a>

          <a
            href={candidato.planDeGobiernoUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '14px 20px',
              borderRadius: '14px',
              background: '#0f172a',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 800,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Download size={18} /> Plan de Gobierno Oficial <ExternalLink size={14} />
          </a>
        </div>

        {/* Bottom Vote Simulation Trigger Button */}
        {onSelectVote && (
          <button
            onClick={() => {
              onSelectVote(candidato.id);
              onClose();
            }}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '14px',
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              fontWeight: 900,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(5, 150, 105, 0.3)'
            }}
          >
            ✓ Simular Mi Voto por {candidato.nombre.split(' ')[0]} {candidato.nombre.split(' ')[1] || ''}
          </button>
        )}
      </div>
    </div>
  );
};
