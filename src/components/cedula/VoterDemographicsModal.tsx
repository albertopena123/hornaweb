import React, { useState } from 'react';
import { SECTORES_PUERTO_MALDONADO } from '@/data/votoData';
import { MapPin, Navigation, User, Calendar, Check, X, ShieldCheck, Search } from 'lucide-react';
import { createSvgLogoFallback, createSvgUserFallback } from '@/services/jneService';

export interface DemographicsData {
  sector: string;
  edad: number;
  rangoEdad: '18-25' | '26-40' | '41-60' | '60+';
  sexo: 'Masculino' | 'Femenino';
  lat: number;
  lng: number;
  precisionGPS?: number;
}

interface VoterDemographicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName?: string;
  candidateParty?: string;
  candidatePhoto?: string;
  partyLogo?: string;
  surveyTitle?: string;
  onConfirm: (data: DemographicsData) => void;
}

const STORAGE_LAST_SECTOR = 'voto_mdd_last_field_sector';

export const VoterDemographicsModal: React.FC<VoterDemographicsModalProps> = ({
  isOpen,
  onClose,
  candidateName,
  candidateParty,
  candidatePhoto,
  partyLogo,
  surveyTitle = 'Elecciones Madre de Dios 2026',
  onConfirm
}) => {
  // 1. Ubicación y Sector
  const [selectedSector, setSelectedSector] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_LAST_SECTOR);
      if (saved && SECTORES_PUERTO_MALDONADO.some((s: any) => s.nombre === saved)) {
        return saved;
      }
    }
    return SECTORES_PUERTO_MALDONADO[0].nombre;
  });

  const [sectorSearch, setSectorSearch] = useState<string>('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  // 2. Edad
  const [edadExacta, setEdadExacta] = useState<string>('30');
  const [rangoEdad, setRangoEdad] = useState<'18-25' | '26-40' | '41-60' | '60+'>('26-40');

  // 3. Sexo
  const [sexo, setSexo] = useState<'Masculino' | 'Femenino'>('Masculino');

  // Sincronizar rango de edad al cambiar la edad numérica
  const handleEdadChange = (val: string) => {
    setEdadExacta(val);
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      if (num >= 18 && num <= 25) setRangoEdad('18-25');
      else if (num >= 26 && num <= 40) setRangoEdad('26-40');
      else if (num >= 41 && num <= 60) setRangoEdad('41-60');
      else if (num > 60) setRangoEdad('60+');
    }
  };

  const handleRangoSelect = (rango: '18-25' | '26-40' | '41-60' | '60+') => {
    setRangoEdad(rango);
    if (rango === '18-25') setEdadExacta('22');
    else if (rango === '26-40') setEdadExacta('32');
    else if (rango === '41-60') setEdadExacta('48');
    else if (rango === '60+') setEdadExacta('65');
  };

  // Detección de GPS en Tiempo Real
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsMessage('Geolocalización no soportada en este dispositivo.');
      return;
    }

    setIsLocating(true);
    setGpsMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsCoords({ lat: latitude, lng: longitude, accuracy });
        setIsLocating(false);
        setGpsMessage(`✓ GPS Detectado (precisión ±${Math.round(accuracy)}m)`);

        // Encontrar el sector más cercano según coordenadas
        let closest = SECTORES_PUERTO_MALDONADO[0];
        let minDist = Infinity;
        SECTORES_PUERTO_MALDONADO.forEach((s: any) => {
          const dist = Math.hypot(s.lat - latitude, s.lng - longitude);
          if (dist < minDist) {
            minDist = dist;
            closest = s;
          }
        });

        setSelectedSector(closest.nombre);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_LAST_SECTOR, closest.nombre);
        }
      },
      (err) => {
        console.warn('GPS Error:', err);
        setIsLocating(false);
        setGpsMessage('No se pudo acceder al GPS. Selecciona el sector manualmente.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSelectSector = (nombre: string) => {
    setSelectedSector(nombre);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_LAST_SECTOR, nombre);
    }
  };

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const sectorObj = SECTORES_PUERTO_MALDONADO.find((s: any) => s.nombre === selectedSector) || SECTORES_PUERTO_MALDONADO[0];
    const finalLat = gpsCoords ? gpsCoords.lat : sectorObj.lat;
    const finalLng = gpsCoords ? gpsCoords.lng : sectorObj.lng;

    const numEdad = parseInt(edadExacta, 10) || 30;

    onConfirm({
      sector: selectedSector,
      edad: numEdad,
      rangoEdad,
      sexo,
      lat: finalLat,
      lng: finalLng,
      precisionGPS: gpsCoords?.accuracy
    });
  };

  if (!isOpen) return null;

  const sectoresFiltrados = SECTORES_PUERTO_MALDONADO.filter((s: any) =>
    s.nombre.toLowerCase().includes(sectorSearch.toLowerCase().trim())
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '12px',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '560px',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
        border: '1.5px solid #cbd5e1',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '92vh',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        
        {/* Header con Info del Voto */}
        <div style={{
          background: 'linear-gradient(135deg, #091e42 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '18px 20px',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(220, 38, 38, 0.25)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.68rem', fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', marginBottom: '6px' }}>
            <ShieldCheck size={13} style={{ color: '#ef4444' }} /> Encuestas en Campo • Puerto Maldonado
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, margin: '2px 0 0 0', color: '#ffffff', letterSpacing: '-0.01em' }}>
            Datos del Elector y Ubicación
          </h2>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
            {surveyTitle}
          </p>

          {/* Candidato a votar */}
          {candidateName && (
            <div style={{
              marginTop: '12px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              {candidatePhoto && (
                <img
                  src={candidatePhoto}
                  alt={candidateName}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = createSvgUserFallback(candidateName);
                  }}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #ffffff' }}
                />
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase' }}>
                  Voto para:
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {candidateName}
                </div>
                {candidateParty && (
                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                    {candidateParty}
                  </div>
                )}
              </div>
              {partyLogo && (
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#ffffff', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={partyLogo}
                    alt="Logo"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = createSvgLogoFallback(candidateParty || 'Partido');
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cuerpo del Formulario */}
        <form onSubmit={handleConfirmSubmit} style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* SECCIÓN 1: SECTOR / UBICACIÓN EN PUERTO MALDONADO */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} style={{ color: '#dc2626' }} /> 1. Sector en Puerto Maldonado
              </label>
              
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={isLocating}
                style={{
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Navigation size={12} style={{ animation: isLocating ? 'spin 1s linear infinite' : 'none' }} />
                <span>{isLocating ? 'Detectando...' : 'Detectar GPS'}</span>
              </button>
            </div>

            {gpsMessage && (
              <div style={{ fontSize: '0.72rem', color: gpsCoords ? '#16a34a' : '#b45309', marginBottom: '8px', fontWeight: 700 }}>
                {gpsMessage}
              </div>
            )}

            {/* Buscador de sector */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                value={sectorSearch}
                onChange={(e) => setSectorSearch(e.target.value)}
                placeholder="Filtrar sector (ej: La Joya, Cachuela, Chorrillos...)"
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.82rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Grid de 18 sectores táctiles */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '6px',
              maxHeight: '160px',
              overflowY: 'auto',
              padding: '4px',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              background: '#f8fafc'
            }}>
              {sectoresFiltrados.map((sec: any) => {
                const isSelected = selectedSector === sec.nombre;
                return (
                  <button
                    key={sec.nombre}
                    type="button"
                    onClick={() => handleSelectSector(sec.nombre)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #dc2626' : '1px solid #e2e8f0',
                      background: isSelected ? '#fee2e2' : '#ffffff',
                      color: isSelected ? '#991b1b' : '#334155',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 900 : 700,
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '4px',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sec.nombre}
                    </span>
                    {isSelected && <Check size={14} style={{ color: '#dc2626', flexShrink: 0 }} />}
                  </button>
                );
              })}
              {sectoresFiltrados.length === 0 && (
                <div style={{ padding: '12px', fontSize: '0.78rem', color: '#64748b', textAlign: 'center', gridColumn: '1 / -1' }}>
                  No se encontró el sector. Puedes elegir de la lista general.
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
              Sector seleccionado: <strong style={{ color: '#0f172a' }}>{selectedSector}</strong> (se recordará para las próximas encuestas).
            </div>
          </div>

          {/* SECCIÓN 2: SEXO DEL ELECTOR */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>
              <User size={16} style={{ color: '#2563eb', display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              2. Sexo del Elector
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSexo('Masculino')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: sexo === 'Masculino' ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                  background: sexo === 'Masculino' ? '#eff6ff' : '#ffffff',
                  color: sexo === 'Masculino' ? '#1d4ed8' : '#334155',
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: sexo === 'Masculino' ? '0 4px 12px rgba(37, 99, 235, 0.15)' : 'none',
                  transition: 'all 0.1s ease'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>👨</span>
                <span>Masculino</span>
                {sexo === 'Masculino' && <Check size={16} style={{ color: '#2563eb' }} />}
              </button>

              <button
                type="button"
                onClick={() => setSexo('Femenino')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: sexo === 'Femenino' ? '2px solid #ec4899' : '1.5px solid #cbd5e1',
                  background: sexo === 'Femenino' ? '#fdf2f8' : '#ffffff',
                  color: sexo === 'Femenino' ? '#be185d' : '#334155',
                  fontSize: '0.92rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: sexo === 'Femenino' ? '0 4px 12px rgba(236, 72, 153, 0.15)' : 'none',
                  transition: 'all 0.1s ease'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>👩</span>
                <span>Femenino</span>
                {sexo === 'Femenino' && <Check size={16} style={{ color: '#ec4899' }} />}
              </button>
            </div>
          </div>

          {/* SECCIÓN 3: EDAD DEL ELECTOR */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>
              <Calendar size={16} style={{ color: '#059669', display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              3. Edad del Elector
            </label>

            {/* Rango de Edad en Botones Táctiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' }}>
              {[
                { id: '18-25', label: '18 a 25' },
                { id: '26-40', label: '26 a 40' },
                { id: '41-60', label: '41 a 60' },
                { id: '60+', label: '60 a más' }
              ].map((r) => {
                const isSelected = rangoEdad === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRangoSelect(r.id as any)}
                    style={{
                      padding: '10px 4px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #059669' : '1.5px solid #cbd5e1',
                      background: isSelected ? '#ecfdf5' : '#ffffff',
                      color: isSelected ? '#065f46' : '#334155',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? 900 : 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.1s ease'
                    }}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            {/* Input para edad numérica opcional */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>Edad exacta:</span>
              <input
                type="number"
                min="18"
                max="105"
                value={edadExacta}
                onChange={(e) => handleEdadChange(e.target.value)}
                style={{
                  width: '70px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 900,
                  textAlign: 'center',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>años (clasificado como: <strong>{rangoEdad}</strong>)</span>
            </div>
          </div>

          {/* BOTÓN FINAL DE REGISTRO */}
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '13px',
                borderRadius: '14px',
                border: '1.5px solid #cbd5e1',
                background: '#f8fafc',
                color: '#475569',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              style={{
                flex: 2,
                padding: '13px 20px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(220, 38, 38, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>🗳️</span>
              <span>CONFIRMAR Y REGISTRAR VOTO</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default VoterDemographicsModal;
