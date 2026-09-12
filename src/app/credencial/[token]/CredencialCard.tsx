"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Download,
  Printer,
  Share2,
  MapPin,
  CheckCircle2,
  Building2,
  UserCheck,
  Phone,
  ArrowLeft,
  Vote,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  CreditCard,
  FileText,
} from "lucide-react";
import { CredencialA4Sheet } from "@/components/credencial/CredencialA4Sheet";
import { FotocheckCard } from "@/components/credencial/FotocheckCard";
import {
  downloadCredencialA4Pdf,
  downloadFotocheckPdf,
} from "@/lib/credencialPdf";
import "./credencial.css";

export type CredencialData = {
  id: string;
  name: string;
  docNumber: string;
  role: string;
  isSuplente?: boolean;
  mesa: string;
  aula: string | null;
  localName: string;
  localAddress: string | null;
  district: string | null;
  province: string | null;
  coordinatorName: string;
  coordinatorPhone: string;
  qrCodeUrl: string;
  token: string;
  isMesaMember?: boolean;
};

export function CredencialCard({ data }: { data: CredencialData }) {
  const [copiedDni, setCopiedDni] = useState(false);
  const [generatingA4, setGeneratingA4] = useState(false);
  const [generatingFotocheck, setGeneratingFotocheck] = useState(false);

  const isGeneral = data.role === "general";
  const isSuplente = !!data.isSuplente || data.role === "suplente";
  const roleTitle = isGeneral
    ? "Personero General de Local"
    : isSuplente
    ? "Personero Suplente de Mesa"
    : "Personero Titular de Mesa";

  const rolePillClass = isGeneral
    ? "cred-role-pill--general"
    : isSuplente
    ? "cred-role-pill--suplente"
    : "";

  const mesaText = data.mesa?.trim() || "Por asignar";
  const isMesaAssigned = Boolean(data.mesa && data.mesa.trim() !== "" && data.mesa.trim() !== "-");

  function handleCopyDni() {
    navigator.clipboard.writeText(data.docNumber).then(() => {
      setCopiedDni(true);
      setTimeout(() => setCopiedDni(false), 2000);
    });
  }

  function handleShare() {
    const text = `Credencial y Fotocheck Oficial de Personero - Ahora Nación\n👤 Personero: ${data.name}\n🏫 Local: ${data.localName}\n🗳️ Mesa N°: ${mesaText}\n🔗 Ver credencial digital: ${window.location.href}`;
    if (navigator.share) {
      navigator.share({ title: "Credencial de Personero · Ahora Nación", text, url: window.location.href }).catch(() => {});
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank");
    }
  }

  // Descargar PDF de Hoja A4 Oficial (Original + Copia)
  async function handleDownloadA4Pdf() {
    const sheet = document.getElementById("credencial-a4-public-sheet");
    if (!sheet) return;

    setGeneratingA4(true);
    try {
      await downloadCredencialA4Pdf(sheet, data.name, data.docNumber);
    } catch (err) {
      console.error("Error al generar PDF A4:", err);
      window.print();
    } finally {
      setGeneratingA4(false);
    }
  }

  // Descargar PDF de Fotocheck Oficial (Frente y Reverso con QR)
  async function handleDownloadFotocheckPdf() {
    const front = document.getElementById("fotocheck-front-public");
    const back = document.getElementById("fotocheck-back-public");
    if (!front || !back) return;

    setGeneratingFotocheck(true);
    try {
      await downloadFotocheckPdf(front, back, data.name, data.docNumber);
    } catch (err) {
      console.error("Error al generar PDF del Fotocheck:", err);
    } finally {
      setGeneratingFotocheck(false);
    }
  }

  const mapsQuery = encodeURIComponent(
    data.localAddress || `${data.localName}, ${data.district || "Madre de Dios"}, Perú`
  );
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  const sheetData = {
    id: data.id,
    name: data.name,
    docNumber: data.docNumber,
    role: data.role,
    isSuplente: data.isSuplente,
    mesa: data.mesa,
    localName: data.localName,
    localAddress: data.localAddress,
    district: data.district,
    qrDataUrl: data.qrCodeUrl,
  };

  const fotocheckData = {
    id: data.id,
    name: data.name,
    docNumber: data.docNumber,
    role: data.role,
    isSuplente: data.isSuplente,
    mesa: data.mesa,
    localName: data.localName,
    localAddress: data.localAddress,
    district: data.district,
    coordinatorName: data.coordinatorName,
    coordinatorPhone: data.coordinatorPhone,
    qrDataUrl: data.qrCodeUrl,
    token: data.token,
  };

  return (
    <main className="cred-page">
      <div className="cred-container">
        {/* Barra superior */}
        <div className="cred-actions-top">
          <Link href="/mi-mesa" className="cred-back-link">
            <ArrowLeft size={15} /> Consultar otra mesa
          </Link>
          <div className="cred-badge-status">
            <span className="cred-badge-status__pulse" />
            <span>Padrón Oficial Verificado</span>
          </div>
        </div>

        {/* Tarjeta Fotocheck Digital Oficial */}
        <div className="cred-card">
          {/* Header Oficial con Logo del Partido */}
          <header className="cred-header">
            <div className="cred-header-brand">
              <img
                src="/assets/images/logo/logo-an.webp"
                alt="Logo Ahora Nación"
                className="cred-header-logo"
              />
              <div>
                <h1 className="cred-party-title">Partido Político Ahora Nación</h1>
                <p className="cred-party-sub">Madre de Dios · Elecciones 2026</p>
              </div>
            </div>

            <div className="cred-badge-doc-banner">
              <span className="cred-badge-doc">FOTOCHECK DIGITAL OFICIAL</span>
            </div>

            <p className="cred-sub-campaign">
              SIMÓN HORNA ALPACA · GOBERNADOR REGIONAL
            </p>
          </header>

          {/* Cuerpo del carnet */}
          <div className="cred-body">
            {/* Personero / Hero */}
            <div className="cred-person-hero">
              <div className="cred-avatar" aria-hidden="true">
                {data.name.charAt(0).toUpperCase()}
                <div className="cred-avatar-check">✓</div>
              </div>
              <div className="cred-person-meta">
                <span className={`cred-role-pill ${rolePillClass}`}>
                  {roleTitle}
                </span>
                <h2 className="cred-person-name">{data.name}</h2>
                <div className="cred-person-dni">
                  <span>DNI:</span>
                  <strong>{data.docNumber}</strong>
                  <button
                    type="button"
                    onClick={handleCopyDni}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px 4px",
                      display: "inline-flex",
                      alignItems: "center",
                      color: copiedDni ? "#16a34a" : "#64748b",
                    }}
                    title="Copiar DNI"
                  >
                    {copiedDni ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  {data.isMesaMember && (
                    <span style={{ marginLeft: "0.25rem", color: "#b45309", fontWeight: 800, fontSize: "0.75rem" }}>
                      · Miembro ONPE
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Cuadro destacado de Mesa */}
            <div className="cred-mesa-box">
              <span className="cred-mesa-label">Mesa Electoral Oficial de Sufragio</span>
              <span
                className={`cred-mesa-value ${
                  !isMesaAssigned ? "cred-mesa-value--pending" : ""
                }`}
              >
                {mesaText}
              </span>
            </div>

            {/* Datos del Local de Votación */}
            <div className="cred-info-list">
              <div className="cred-info-row">
                <Building2 size={18} className="cred-info-icon" />
                <div className="cred-info-content">
                  <span className="cred-info-label">Local de Votación / Colegio</span>
                  <span className="cred-info-val">{data.localName}</span>
                </div>
              </div>

              {data.localAddress && (
                <div className="cred-info-row">
                  <MapPin size={18} className="cred-info-icon" />
                  <div className="cred-info-content">
                    <span className="cred-info-label">Dirección</span>
                    <span className="cred-info-val">{data.localAddress}</span>
                  </div>
                </div>
              )}

              <div className="cred-info-row">
                <Vote size={18} className="cred-info-icon" />
                <div className="cred-info-content">
                  <span className="cred-info-label">Distrito / Jurisdicción</span>
                  <span className="cred-info-val">
                    {(data.district || "Tambopata").toUpperCase()} · MADRE DE DIOS
                  </span>
                </div>
              </div>

              <div className="cred-coordinator-box">
                <div className="cred-coordinator-box__head">
                  <UserCheck size={15} />
                  <span>Coordinador Responsable del Colegio</span>
                </div>
                <div className="cred-coordinator-box__body">
                  <div className="cred-coordinator-name">{data.coordinatorName}</div>
                  <div className="cred-coordinator-desc">
                    Encargado de este local para dudas, asistencia, material y consultas el día de votación.
                  </div>
                  {data.coordinatorPhone && (
                    <a
                      href={`https://wa.me/51${data.coordinatorPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Hola ${data.coordinatorName}, soy ${data.name}, personero de Ahora Nación en la mesa ${mesaText} del colegio ${data.localName}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cred-coordinator-wa-btn"
                    >
                      <Phone size={14} /> WhatsApp Coordinador: {data.coordinatorPhone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Pie con QR dinámico y Sello */}
            <div className="cred-footer-qr">
              <img
                src={data.qrCodeUrl}
                alt="Código QR de verificación"
                className="cred-qr-img"
              />
              <div className="cred-stamp">
                <span className="cred-stamp-title">Personería Legal Regional</span>
                <div className="cred-stamp-role">Ahora Nación Madre de Dios</div>
                <div className="cred-security-code">TOKEN: {data.token.slice(0, 16)}</div>
                <div style={{ fontSize: "0.625rem", color: "#64748b", marginTop: "4px", lineHeight: "1.2" }}>
                  Acreditado conforme a la Ley Orgánica de Elecciones N° 26859
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción principales */}
        <div className="cred-buttons">
          {/* BOTÓN 1: Descargar Credencial Oficial A4 en PDF */}
          <button
            type="button"
            className="cred-btn-download-a4"
            onClick={handleDownloadA4Pdf}
            disabled={generatingA4}
            title="Descargar hoja oficial A4 vertical (Original y Copia) en formato PDF para la mesa ONPE"
          >
            {generatingA4 ? (
              <>
                <Loader2 size={18} className="spin" /> Generando Hoja A4...
              </>
            ) : (
              <>
                <FileText size={18} /> Descargar Credencial Oficial A4 (PDF)
              </>
            )}
          </button>

          {/* BOTÓN 2: Descargar Fotocheck Oficial en PDF */}
          <button
            type="button"
            className="cred-btn-download-fc"
            onClick={handleDownloadFotocheckPdf}
            disabled={generatingFotocheck}
            title="Descargar Fotocheck Oficial en PDF (Frente y Reverso con QR oficial para portar o imprimir)"
          >
            {generatingFotocheck ? (
               <>
                <Loader2 size={18} className="spin" /> Generando Fotocheck...
              </>
            ) : (
              <>
                <CreditCard size={18} /> Descargar Fotocheck (PDF)
              </>
            )}
          </button>

          {/* Botón Compartir Fotocheck */}
          <button type="button" className="cred-btn-share" onClick={handleShare}>
            <Share2 size={16} /> Compartir Fotocheck por WhatsApp
          </button>

          {/* Botón Mapa */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cred-btn-outline"
          >
            <MapPin size={16} /> ¿Cómo llegar al colegio? (Google Maps) <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Componentes en segundo plano con CSS cargado para generación limpia de PDFs */}
      <div className="cred-a4-hidden-container" aria-hidden="true">
        <CredencialA4Sheet id="credencial-a4-public-sheet" data={sheetData} />
        <FotocheckCard
          frontId="fotocheck-front-public"
          backId="fotocheck-back-public"
          data={fotocheckData}
        />
      </div>
    </main>
  );
}
