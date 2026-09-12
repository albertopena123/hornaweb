"use client";

import React from "react";
import { districtLabel, isDistrictId } from "@/lib/districts";
import "./credencial-sheet.css";

export type FotocheckCardData = {
  id: string;
  name: string;
  docNumber: string;
  docType?: string;
  role?: string;
  isSuplente?: boolean;
  mesa?: string | null;
  localName: string;
  localAddress?: string | null;
  district?: string | null;
  coordinatorName?: string;
  coordinatorPhone?: string;
  qrDataUrl?: string;
  token?: string;
};

type Props = {
  data: FotocheckCardData;
  frontId?: string;
  backId?: string;
};

export function FotocheckCard({
  data,
  frontId = "fotocheck-front-target",
  backId = "fotocheck-back-target",
}: Props) {
  const isGeneral = data.role === "general";
  const isSuplente = !!data.isSuplente || data.role === "suplente";
  const roleTitle = isGeneral
    ? "PERSONERO GENERAL DE LOCAL"
    : isSuplente
    ? "PERSONERO SUPLENTE DE MESA"
    : "PERSONERO TITULAR DE MESA";

  const docType = (data.docType || "DNI").toUpperCase();
  const mesaText =
    data.mesa && data.mesa.trim() !== "-" && data.mesa.trim() !== ""
      ? data.mesa.trim()
      : "POR ASIGNAR";

  const districtName = data.district
    ? isDistrictId(data.district)
      ? districtLabel(data.district)
      : data.district.toUpperCase()
    : "TAMBOPATA";

  return (
    <div className="fc-pair-wrapper">
      {/* --------------------------------------------------------------------
          FRENTE (ANVERSO) - FOTOCHECK OFICIAL DE PERSONERO
          -------------------------------------------------------------------- */}
      <div className="fc-card" id={frontId}>
        {/* Encabezado Oficial Rojo */}
        <header className="fc-head">
          <div className="fc-brand-row">
            <img
              src="/assets/images/logo/logo-an.webp"
              alt="Logo Ahora Nación"
              className="fc-logo-img"
            />
            <div className="fc-brand-text">
              <h1 className="fc-party-title">AHORA NACIÓN</h1>
              <div className="fc-party-sub">MADRE DE DIOS · 2026</div>
              <div className="fc-campaign-sub">SIMÓN HORNA ALPACA · GOBERNADOR</div>
            </div>
          </div>

          <div className="fc-banner-title">
            <span>FOTOCHECK OFICIAL DE PERSONERO</span>
          </div>
        </header>

        {/* Cuerpo del Anverso */}
        <div className="fc-body">
          {/* Identidad del Personero */}
          <div className="fc-person-section">
            <div className="fc-avatar">
              {data.name.charAt(0).toUpperCase()}
            </div>

            <div className="fc-person-details">
              <div className={`fc-role-badge ${isSuplente ? "fc-role-badge--suplente" : isGeneral ? "fc-role-badge--general" : ""}`}>
                {roleTitle}
              </div>
              <h2 className="fc-name">{data.name.toUpperCase()}</h2>
              <div className="fc-dni">
                {docType}: <strong>{data.docNumber}</strong>
              </div>
            </div>
          </div>

          {/* Recuadro Mesa de Sufragio Destacada */}
          <div className="fc-mesa-box">
            <span className="fc-mesa-label">MESA DE SUFRAGIO N°</span>
            <div
              className={`fc-mesa-num ${
                mesaText === "POR ASIGNAR" ? "fc-mesa-num--pending" : ""
              }`}
            >
              {mesaText}
            </div>
          </div>

          {/* Local de Votación */}
          <div className="fc-local-box">
            <span className="fc-local-label">LOCAL DE VOTACIÓN</span>
            <div className="fc-local-name">
              {data.localName}
            </div>
            <div className="fc-local-dist">
              {districtName} · MADRE DE DIOS
            </div>
          </div>
        </div>

        {/* Franja de Seguridad Inferior */}
        <footer className="fc-foot-bar">
          <span>ACREDITACIÓN OFICIAL JNE / ONPE</span>
          <span>MADRE DE DIOS</span>
        </footer>
      </div>

      {/* --------------------------------------------------------------------
          REVERSO (DORSO) - FOTOCHECK OFICIAL DE PERSONERO
          -------------------------------------------------------------------- */}
      <div className="fc-card fc-card--back" id={backId}>
        {/* Encabezado Reverso Azul */}
        <header className="fc-head fc-head--back">
          <div className="fc-party-title" style={{ textAlign: "center", fontSize: "10.5px" }}>
            PERSONERÍA LEGAL REGIONAL
          </div>
          <div className="fc-party-sub" style={{ textAlign: "center", fontSize: "8px" }}>
            PARTIDO POLÍTICO AHORA NACIÓN · ELECCIONES 2026
          </div>
        </header>

        {/* Cuerpo del Reverso */}
        <div className="fc-back-body">
          {/* QR de Validación Digital */}
          <div className="fc-qr-row">
            {data.qrDataUrl ? (
              <img
                src={data.qrDataUrl}
                alt="QR Validación"
                className="fc-qr-img"
              />
            ) : (
              <div className="fc-qr-img" style={{ background: "#f1f5f9" }} />
            )}
            <div className="fc-qr-info">
              <div className="fc-qr-title">VALIDACIÓN DIGITAL OFICIAL</div>
              <div className="fc-qr-desc">
                Escanee el código QR para verificar la acreditación oficial de este personero en línea.
              </div>
              <div className="fc-qr-token">
                ID: {(data.token || data.id).slice(0, 16)}
              </div>
            </div>
          </div>

          {/* Base Legal */}
          <div className="fc-legal">
            <strong>Base Legal:</strong> Conforme a los Arts. 128°, 129°, 130° y 140° de la Ley Orgánica de Elecciones N° 26859, el personero está legalmente facultado para presenciar y fiscalizar los actos de instalación, sufragio y escrutinio en la mesa de votación.
          </div>

          {/* Zona de Firma y Huella */}
          <div className="fc-sig-row">
            <div className="fc-sig-box">
              <div className="fc-sig-space" />
              <div className="fc-sig-line" />
              <div className="fc-sig-label">Firma y Sello Encargado</div>
              <div className="fc-sig-sub">Personero Legal / Coord. Regional</div>
            </div>

            <div className="fc-huella-box">
              <span className="fc-huella-tag">HUELLA</span>
              <span className="fc-huella-sub">Índice Der.</span>
            </div>
          </div>

          {/* Contacto Coordinador */}
          {data.coordinatorName && (
            <div className="fc-coord-bar">
              <span>Coordinador: <strong>{data.coordinatorName}</strong></span>
              {data.coordinatorPhone && <span>Tel: <strong>{data.coordinatorPhone}</strong></span>}
            </div>
          )}
        </div>

        {/* Franja Inferior */}
        <footer className="fc-foot-bar fc-foot-bar--back">
          <span>PARTIDO POLÍTICO AHORA NACIÓN</span>
          <span>ELECCIONES 2026</span>
        </footer>
      </div>
    </div>
  );
}
