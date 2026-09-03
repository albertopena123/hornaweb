import React, { useState } from 'react';
import { CANDIDATOS, CANDIDATOS_PROVINCIALES } from '@/data/votoData';
import { createSvgLogoFallback, createSvgUserFallback } from '@/services/jneService';
import type { Candidato } from '@/types';
import { CandidateDetailModal } from './CandidateDetailModal';
import { Search, MapPin, CheckCircle2, FileText, Vote } from 'lucide-react';

interface CandidateDirectoryViewProps {
  onSelectCandidateToVote?: (candidateId: string) => void;
  onOpenQuickVote?: () => void;
}

export const CandidateDirectoryView: React.FC<CandidateDirectoryViewProps> = ({
  onSelectCandidateToVote,
  onOpenQuickVote
}) => {
  const [selectedDepartamento] = useState<string>('Madre de Dios');
  const [selectedProvincia, setSelectedProvincia] = useState<string>('Tambopata');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [inspectingCandidato, setInspectingCandidato] = useState<Candidato | null>(null);
  const [activeCargoTab, setActiveCargoTab] = useState<'GOBERNADOR' | 'ALCALDE_PROVINCIAL'>('GOBERNADOR');

  const candidatosGobernadores = CANDIDATOS.filter(c => c.cargo === 'Gobernador');
  const candidatosProvincialesActuales = CANDIDATOS_PROVINCIALES[selectedProvincia] || CANDIDATOS_PROVINCIALES['Tambopata'] || [];

  const listToDisplay = activeCargoTab === 'GOBERNADOR' ? candidatosGobernadores : candidatosProvincialesActuales;

  const filteredCandidates = listToDisplay.filter((cand) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      cand.nombre.toLowerCase().includes(term) ||
      cand.partido.toLowerCase().includes(term) ||
      cand.profesion.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* 1. Header & Filtro de Ubicación */}
      <div className="mobile-p-16" style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '24px',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.04)'
      }}>
        <div>
          <span style={{ fontSize: '0.78rem', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>
            Elecciones Regionales y Municipales 2026
          </span>
          <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', margin: '4px 0 0 0' }}>
            <MapPin size={22} style={{ color: '#dc2626' }} /> Conoce a tus Candidatos — {selectedDepartamento}
          </h2>
          <p style={{ fontSize: '0.86rem', color: '#64748b', marginTop: '4px', margin: '4px 0 0 0' }}>
            Explora las Hojas de Vida, trayectoria profesional y planes de gobierno de todas las listas inscritas.
          </p>
        </div>

      </div>

      {/* 2. Selector de Categoría (Cédula 1: Gobernador / Cédula 2: Alcalde) + Buscador en Vivo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px' }}>
        <div className="mobile-scroll-x" style={{ gap: '10px', width: '100%' }}>
          <button
            onClick={() => setActiveCargoTab('GOBERNADOR')}
            style={{
              padding: '10px 20px',
              borderRadius: '14px',
              border: activeCargoTab === 'GOBERNADOR' ? '2px solid #ef4444' : '1px solid #cbd5e1',
              background: activeCargoTab === 'GOBERNADOR' ? 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)' : '#ffffff',
              color: activeCargoTab === 'GOBERNADOR' ? '#ffffff' : '#475569',
              fontWeight: 900,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              boxShadow: activeCargoTab === 'GOBERNADOR' ? '0 4px 14px rgba(220, 38, 38, 0.35)' : 'none'
            }}
          >
            <img
              src="/gobierno_regional_mdd.png"
              alt="GOREMAD"
              style={{
                width: '24px',
                height: '24px',
                objectFit: 'contain',
                background: '#ffffff',
                borderRadius: '6px',
                padding: '2px'
              }}
            />
            <span>Cédula 1: Gobernación Regional ({candidatosGobernadores.length} listas)</span>
          </button>

          <button
            onClick={() => setActiveCargoTab('ALCALDE_PROVINCIAL')}
            style={{
              padding: '10px 20px',
              borderRadius: '14px',
              border: activeCargoTab === 'ALCALDE_PROVINCIAL' ? '2px solid #0284c7' : '1px solid #cbd5e1',
              background: activeCargoTab === 'ALCALDE_PROVINCIAL' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#ffffff',
              color: activeCargoTab === 'ALCALDE_PROVINCIAL' ? '#ffffff' : '#475569',
              fontWeight: 900,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              boxShadow: activeCargoTab === 'ALCALDE_PROVINCIAL' ? '0 4px 14px rgba(2, 132, 199, 0.35)' : 'none'
            }}
          >
            {selectedProvincia === 'Tambopata' ? (
              <img
                src="/muni_tambopata.png"
                alt="Muni Tambopata"
                style={{
                  width: '24px',
                  height: '24px',
                  objectFit: 'contain',
                  background: '#ffffff',
                  borderRadius: '6px',
                  padding: '2px'
                }}
              />
            ) : (
              <FileText size={16} />
            )}
            <span>Cédula 2: Alcaldía de {selectedProvincia} ({candidatosProvincialesActuales.length} listas)</span>
          </button>
        </div>

        {/* Input de Búsqueda */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por candidato o partido..."
            style={{
              width: '100%',
              padding: '9px 14px 9px 36px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>
      </div>
      {/* Selector de Provincia cuando está activo Alcaldía Provincial */}
      {activeCargoTab === 'ALCALDE_PROVINCIAL' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '-16px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>Provincia:</span>
          {['Tambopata', 'Tahuamanu', 'Manu'].map((prov) => (
            <button
              key={prov}
              onClick={() => setSelectedProvincia(prov)}
              style={{
                padding: '6px 16px',
                borderRadius: '9999px',
                border: 'none',
                background: selectedProvincia === prov ? '#0284c7' : '#f1f5f9',
                color: selectedProvincia === prov ? '#ffffff' : '#475569',
                fontSize: '0.82rem',
                fontWeight: selectedProvincia === prov ? 900 : 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {prov}
            </button>
          ))}
        </div>
      )}

      {/* 3. Parrilla Ultra-Profesional de Candidatos */}
      <div className="responsive-candidate-grid">
        {filteredCandidates.map((cand) => {
          return (
            <div
              key={cand.id}
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                border: '1px solid #e2e8f0',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                position: 'relative'
              }}
            >
              <div>
                {/* Header: Partido Logo & Estado de Inscripción */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={cand.partidoLogo}
                      alt={cand.partido}
                      style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px' }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = createSvgLogoFallback(cand.partido);
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>
                        {cand.partido}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                        {cand.cargo} Regional • {cand.provincia || 'Madre de Dios'}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <CheckCircle2 size={12} /> INSCRITO
                  </span>
                </div>

                {/* Fotografía y Rostro del Candidato en Grande */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '18px' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <img
                      src={cand.fotoUrl}
                      alt={cand.nombre}
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '3px solid #991b1b',
                        boxShadow: '0 4px 14px rgba(153, 27, 27, 0.2)',
                        background: '#f1f5f9'
                      }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = createSvgUserFallback(cand.nombre);
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      background: '#ffffff',
                      borderRadius: '8px',
                      padding: '2px',
                      border: '1px solid #cbd5e1'
                    }}>
                      <img
                        src={cand.partidoLogo}
                        alt={cand.partido}
                        style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = createSvgLogoFallback(cand.partido); }}
                      />
                    </div>
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                      {cand.nombre}
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 0 0', fontWeight: 600 }}>
                      {cand.profesion}
                    </p>
                  </div>
                </div>

                {/* Eje de Campaña Principal */}
                <div style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '14px',
                  marginBottom: '18px'
                }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                    Eje Principal de Campaña
                  </span>
                  <p style={{ fontSize: '0.84rem', color: '#334155', margin: 0, fontWeight: 700, lineHeight: 1.4 }}>
                    "{cand.propuestaPrincipal}"
                  </p>
                </div>
              </div>

              {/* Acciones: Hoja de Vida y Votar */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setInspectingCandidato(cand)}
                  style={{
                    flex: 1,
                    padding: '11px 16px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <FileText size={15} /> Hoja de Vida
                </button>

                <button
                  onClick={() => {
                    if (onOpenQuickVote) {
                      onOpenQuickVote();
                    } else if (onSelectCandidateToVote) {
                      onSelectCandidateToVote(cand.id);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '11px 16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)',
                    color: '#ffffff',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 3px 10px rgba(153, 27, 27, 0.25)'
                  }}
                >
                  <Vote size={15} /> Votar por él/ella
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Candidate Detail Modal */}
      {inspectingCandidato && (
        <CandidateDetailModal
          candidato={inspectingCandidato}
          onClose={() => setInspectingCandidato(null)}
          onSelectVote={() => {
            setInspectingCandidato(null);
            if (onSelectCandidateToVote) onSelectCandidateToVote(inspectingCandidato.id);
          }}
        />
      )}

    </div>
  );
};

export default CandidateDirectoryView;
