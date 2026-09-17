"use client";

import React from "react";
import { Scissors } from "lucide-react";
import { districtLabel, isDistrictId } from "@/lib/districts";
import "./credencial-sheet.css";

export type CredencialSheetData = {
  id: string;
  name: string;
  docType?: string;
  docNumber: string;
  role?: string;
  isSuplente?: boolean;
  mesa?: string | null;
  localName: string;
  localAddress?: string | null;
  district?: string | null;
  qrDataUrl?: string;
};

type Props = {
  data: CredencialSheetData;
  id?: string;
};

export function CredencialA4Sheet({ data, id = "credencial-a4-sheet-target" }: Props) {
  const isGeneral = data.role === "general";
  const isSuplente = !!data.isSuplente || data.role === "suplente";
  const roleTitle = isGeneral
    ? "PERSONERO GENERAL DE LOCAL"
    : isSuplente
    ? "PERSONERO SUPLENTE DE MESA"
    : "PERSONERO TITULAR DE MESA";

  const docTypeLabel = (data.docType || "dni").toUpperCase();
  const mesaText = data.mesa && data.mesa.trim() !== "-" && data.mesa.trim() !== "" ? data.mesa.trim() : "POR ASIGNAR";

  const districtName = data.district
    ? isDistrictId(data.district)
      ? districtLabel(data.district)
      : data.district.toUpperCase()
    : "TAMBOPATA";

  const renderHalf = (type: "original" | "copia") => {
    const isOriginal = type === "original";

    return (
      <div className={`cred-v-half ${!isOriginal ? "cred-v-half--copia" : ""}`}>
        {/* Cabecera Oficial Institucional (Conforme a Ley Orgánica de Elecciones N° 26859) */}
        <header className="cred-v-head">
          <div className="cred-v-head-top">
            <div className="cred-v-brand">
              <div className="cred-v-brand-text">
                <h1 className="cred-v-party-title">ORGANIZACIÓN POLÍTICA &ldquo;AHORA NACIÓN&rdquo;</h1>
                <span className="cred-v-election-sub">
                  ELECCIONES GENERALES 2026
                </span>
                <span className="cred-v-jee-sub">
                  JURADO ELECTORAL ESPECIAL DE TAMBOPATA · RES. N° 00373-2026-JEE-TBPT/JNE
                </span>
              </div>
            </div>

            <div
              className={`cred-v-copy-badge ${
                isOriginal ? "cred-v-copy-badge--original" : "cred-v-copy-badge--copia"
              }`}
            >
              <div>{isOriginal ? "ORIGINAL" : "COPIA / CARGO"}</div>
              <div style={{ fontSize: "8px", fontWeight: 800 }}>
                {isOriginal ? "MESA DE SUFRAGIO ONPE" : "ACREDITACIÓN DEL PERSONERO"}
              </div>
            </div>
          </div>

          <div className="cred-v-title-banner">
            <h2>CREDENCIAL OFICIAL DE PERSONERO DE MESA DE SUFRAGIO</h2>
          </div>
        </header>

        {/* Cuadrícula de Datos Oficiales */}
        <div className="cred-v-data-grid">
          {/* Fila 1: Nombre del personero y DNI */}
          <div className="cred-v-row-1">
            <div className="cred-v-field">
              <span className="cred-v-field-label">Nombres y Apellidos del Personero</span>
              <div className="cred-v-field-val cred-v-field-val--name">
                {data.name.toUpperCase()}
              </div>
            </div>

            <div className="cred-v-field">
              <span className="cred-v-field-label">Documento de Identidad</span>
              <div className="cred-v-field-val cred-v-field-val--doc">
                {docTypeLabel}: {data.docNumber}
              </div>
            </div>
          </div>

          {/* Fila 2: Colegio y Mesa Destacada */}
          <div className="cred-v-row-2">
            <div className="cred-v-field">
              <span className="cred-v-field-label">Centro de Votación / Colegio Electoral</span>
              <div className="cred-v-field-val" style={{ fontWeight: 800 }}>
                {data.localName}
              </div>
              {data.localAddress && (
                <div style={{ fontSize: "9px", color: "#64748b", marginTop: "1px" }}>
                  {data.localAddress}
                </div>
              )}
            </div>

            <div className="cred-v-mesa-box">
              <span className="cred-v-field-label">Mesa Electoral N°</span>
              <div
                className={`cred-v-mesa-num ${
                  mesaText === "POR ASIGNAR" ? "cred-v-mesa-num--pending" : ""
                }`}
              >
                {mesaText}
              </div>
            </div>
          </div>

          {/* Fila 3: Cargo y Jurisdicción */}
          <div className="cred-v-row-3">
            <div className="cred-v-field">
              <span className="cred-v-field-label">Condición Electoral Acreditada</span>
              <div
                className="cred-v-field-val"
                style={{
                  color: isOriginal ? "#b91c1c" : "#1e40af",
                  fontWeight: 900,
                  fontSize: "12px",
                }}
              >
                {roleTitle}
              </div>
            </div>

            <div className="cred-v-field">
              <span className="cred-v-field-label">Distrito / Jurisdicción</span>
              <div className="cred-v-field-val" style={{ fontSize: "11px" }}>
                {districtName.toUpperCase()} · MADRE DE DIOS
              </div>
            </div>
          </div>
        </div>

        {/* Base Legal y Acreditación de Personería */}
        <div className="cred-v-legal">
          <strong>Base Legal:</strong> El Personero Legal Titular de la Organización Política &ldquo;Ahora Nación&rdquo;,
          reconocido ante el Jurado Electoral Especial de Tambopata mediante <strong>Resolución N° 00373-2026-JEE-TBPT/JNE</strong> (Expediente N° EG.2026030581),
          acredita ante las autoridades electorales (JNE, ONPE, ODPE) y los miembros de mesa al ciudadano consignado, facultándolo plenamente a
          presenciar y fiscalizar los actos de instalación, sufragio y escrutinio, formular observaciones, suscribir actas electorales y recabar copias, conforme a los Arts. 127°, 128°, 129°, 130°, 133° y 140°
          de la Ley Orgánica de Elecciones N° 26859 y la Resolución N° 0243-2020-JNE.
        </div>

        {/* Sección de Firmas Oficiales y Huella Dactilar */}
        <div className="cred-v-signatures">
          {/* Firma del Personero Legal Titular */}
          <div className="cred-v-sig-box">
            <div className="cred-v-sig-space" />
            <div className="cred-v-sig-line" />
            <div className="cred-v-sig-title">VLADIMIR LIPA COLQUE</div>
            <div className="cred-v-sig-sub" style={{ fontWeight: 800, color: "#0f172a" }}>DNI N° 46889586</div>
            <div className="cred-v-sig-sub">Personero Legal Titular · JEE Tambopata</div>
            <div className="cred-v-sig-sub" style={{ fontSize: "6.5px", color: "#64748b" }}>
              Res. N° 00373-2026-JEE-TBPT/JNE
            </div>
          </div>

          {/* Firma del Personero + Recuadro para Huella Dactilar */}
          <div className="cred-v-sig-personero-wrapper">
            <div className="cred-v-sig-box cred-v-sig-box--grow">
              <div className="cred-v-sig-space" />
              <div className="cred-v-sig-line" />
              <div className="cred-v-sig-title">Firma del Personero Designado</div>
              <div className="cred-v-sig-sub" style={{ fontWeight: 800, color: "#0f172a" }}>DNI N° {data.docNumber}</div>
              <div className="cred-v-sig-sub">Acreditación Oficial de Mesa</div>
            </div>

            <div className="cred-v-huella-container" title="Espacio libre para impresión dactilar (índice derecho)">
              <div className="cred-v-huella-box" />
              <div className="cred-v-huella-caption">
                <strong>HUELLA</strong>
                <span>Índice Derecho</span>
              </div>
            </div>
          </div>

          {/* QR Digital */}
          <div className="cred-v-qr-box">
            {data.qrDataUrl ? (
              <img
                src={data.qrDataUrl}
                alt="QR Verificación"
                className="cred-v-qr-img"
              />
            ) : (
              <div className="cred-v-qr-placeholder" />
            )}
            <span className="cred-v-qr-label">Validez Digital</span>
          </div>
        </div>

        {/* Constancia de Recepción exclusiva para la Copia */}
        {!isOriginal && (
          <div className="cred-v-onpe-cargo">
            <div>
              <strong>RECEPCIÓN MESA ONPE:</strong> Recibí original al inicio de la jornada
            </div>
            <div>Firma Presidente de Mesa: ______________________</div>
            <div>Hora: ___:___ hrs.</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="cred-a4-vertical-sheet" id={id}>
      {/* Mitad Superior: ORIGINAL (Mesa ONPE) */}
      {renderHalf("original")}

      {/* Divisor Central con Tijeras */}
      <div className="cred-cut-divider-h">
        <div className="cred-cut-line-h" />
        <div className="cred-cut-tag-h" title="Línea de corte para doblar y tijera">
          <Scissors size={12} /> CORTAR POR AQUÍ (LÍNEA DE SEPARACIÓN)
        </div>
      </div>

      {/* Mitad Inferior: COPIA / CARGO (Personero) */}
      {renderHalf("copia")}
    </div>
  );
}
