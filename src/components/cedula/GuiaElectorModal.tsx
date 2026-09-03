import React, { useState } from 'react';
import { X, Clock, AlertTriangle, CheckCircle2, FileCheck, Landmark } from 'lucide-react';

interface GuiaElectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuiaElectorModal: React.FC<GuiaElectorModalProps> = ({ isOpen, onClose }) => {
  const [selectedDniDigit, setSelectedDniDigit] = useState<string>('');

  if (!isOpen) return null;

  const DNI_SCHEDULE: Record<string, string> = {
    '1': '07:00 a.m. a 08:00 a.m.',
    '2': '08:00 a.m. a 09:00 a.m.',
    '3': '09:00 a.m. a 10:00 a.m.',
    '4': '10:00 a.m. a 11:00 a.m.',
    '5': '11:00 a.m. a 12:00 m.',
    '6': '12:00 m. a 01:00 p.m.',
    '7': '01:00 p.m. a 02:00 p.m.',
    '8': '02:00 p.m. a 03:00 p.m.',
    '9': '03:00 p.m. a 04:00 p.m.',
    '0': '04:00 p.m. a 05:00 p.m.'
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 3000,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        borderRadius: '24px',
        background: '#ffffff',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        padding: '30px',
        position: 'relative',
        border: '1px solid #e2e8f0',
        color: '#0f172a'
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
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{ background: '#fee2e2', color: '#991b1b', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Landmark size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              Guía Cívica del Elector — Madre de Dios 2026
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Horarios de votación, requisitos y sanciones electorales
            </p>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '16px 0' }} />

        {/* 1. Consulta tu Horario Escalonado por DNI */}
        <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '18px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Clock size={18} style={{ color: '#0284c7' }} />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>
              Horario Escalonado Sugerido según el Último Dígito de tu DNI
            </h4>
          </div>

          <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '12px' }}>
            Selecciona el último número de tu DNI para conocer el horario preferente sin aglomeraciones:
          </p>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
              <button
                key={digit}
                onClick={() => setSelectedDniDigit(digit)}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  border: selectedDniDigit === digit ? '2px solid #0284c7' : '1px solid #cbd5e1',
                  background: selectedDniDigit === digit ? '#0284c7' : '#ffffff',
                  color: selectedDniDigit === digit ? '#ffffff' : '#0f172a',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {digit}
              </button>
            ))}
          </div>

          {selectedDniDigit ? (
            <div style={{ background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#0369a1', fontWeight: 800 }}>DNI TERMINADO EN {selectedDniDigit}:</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0c4a6e' }}>
                  {DNI_SCHEDULE[selectedDniDigit]}
                </div>
              </div>
              <span style={{ fontSize: '0.74rem', background: '#ffffff', color: '#0369a1', padding: '4px 10px', borderRadius: '9999px', fontWeight: 800 }}>
                Horario Recomendado
              </span>
            </div>
          ) : (
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
              * Población vulnerable (adultos mayores, embarazadas y personas con discapacidad): de 07:00 a.m. a 09:00 a.m.
            </div>
          )}
        </div>

        {/* 2. ¿Qué llevar el día de la votación? */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck size={18} style={{ color: '#059669' }} /> Requisitos Indispensables
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} />
              <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                <strong>DNI Físico o Electrónico</strong> (incluso si está vencido según disponga la ley).
              </div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} />
              <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                <strong>Lapicero Azul</strong> (recomendado para marcar en la cédula).
              </div>
            </div>
          </div>
        </div>

        {/* 3. Escala de Multas Electorales */}
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#991b1b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={16} /> Escala de Multas Electorales por No Votar (Madre de Dios)
          </h4>
          <div style={{ fontSize: '0.8rem', color: '#7f1d1d', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div>• Distrito considerado <strong>No Pobre</strong> (Puerto Maldonado): <strong>S/ 103.00</strong></div>
            <div>• Distrito considerado <strong>Pobre No Extremo</strong> (Inambari, Laberinto, Iberia): <strong>S/ 51.50</strong></div>
            <div>• Distrito considerado <strong>Pobre Extremo</strong> (Salvación, Fitzcarrald): <strong>S/ 25.75</strong></div>
            <div>• Multa por no asistir como <strong>Miembro de Mesa</strong>: <strong>S/ 257.50</strong></div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            background: '#0f172a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer'
          }}
        >
          Entendido, Cerrar Guía
        </button>
      </div>
    </div>
  );
};
