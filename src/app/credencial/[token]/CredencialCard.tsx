"use client";

import Link from "next/link";
import {
  Printer,
  Share2,
  MapPin,
  CheckCircle2,
  Building2,
  Calendar,
  UserCheck,
  Phone,
  ArrowLeft,
  Vote,
  ExternalLink,
} from "lucide-react";
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
  const isGeneral = data.role === "general";
  const isSuplente = !!data.isSuplente || data.role === "suplente";
  const roleTitle = isGeneral
    ? "Personero General de Local"
    : isSuplente
    ? "Personero Suplente de Mesa"
    : "Personero Titular de Mesa";
  const aulaText = data.aula?.trim() || "Por verificar en local";
  const mesaText = data.mesa?.trim() || "Por asignar";

  function handlePrint() {
    window.print();
  }

  function handleShare() {
    const text = `⭐ Credencial Oficial de Personero - Ahora Nación ⭐\nPersonero: ${data.name}\nLocal: ${data.localName}\nMesa N°: ${mesaText}\nAula: ${aulaText}\nVer en línea: ${window.location.href}`;
    if (navigator.share) {
      navigator.share({ title: "Credencial de Personero", text, url: window.location.href }).catch(() => {});
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank");
    }
  }

  const mapsQuery = encodeURIComponent(
    data.localAddress || `${data.localName}, ${data.district || "Madre de Dios"}, Perú`
  );
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  return (
    <main className="cred-page">
      <div className="cred-container">
        {/* Barra superior */}
        <div className="cred-actions-top">
          <Link href="/mi-mesa" className="cred-back-link">
            <ArrowLeft size={16} /> Consultar otra mesa
          </Link>
          <div className="cred-badge-status">
            <CheckCircle2 size={13} />
            <span>Padrón Oficial Verificado</span>
          </div>
        </div>

        {/* Tarjeta carnet oficial */}
        <div className="cred-card">
          {/* Header Oficial */}
          <header className="cred-header">
            <p className="cred-party-title">Partido Político Ahora Nación</p>
            <h1 className="cred-badge-doc">Credencial Oficial</h1>
            <p className="cred-sub-campaign">Elecciones 2026 · Región Madre de Dios</p>
          </header>

          {/* Cuerpo del carnet */}
          <div className="cred-body">
            {/* Personero / Hero */}
            <div className="cred-person-hero">
              <div className="cred-avatar" aria-hidden="true">
                {data.name.charAt(0).toUpperCase()}
              </div>
              <div className="cred-person-meta">
                <span className="cred-role-pill">{roleTitle}</span>
                <h2 className="cred-person-name">{data.name}</h2>
                <div className="cred-person-dni">
                  DNI: <strong>{data.docNumber}</strong>
                  {data.isMesaMember && (
                    <span style={{ marginLeft: "0.5rem", color: "#b45309", fontWeight: 700 }}>
                      · Miembro ONPE
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Cuadro destacado de Mesa y Aula */}
            <div className="cred-mesa-box">
              <div className="cred-mesa-item">
                <span className="cred-mesa-label">Mesa de Sufragio</span>
                <span className="cred-mesa-value">{mesaText}</span>
              </div>
              <div className="cred-mesa-item">
                <span className="cred-mesa-label">Aula / Ubicación</span>
                <span className="cred-aula-value">{aulaText}</span>
              </div>
            </div>

            {/* Datos del Local de Votación */}
            <div className="cred-info-list">
              <div className="cred-info-row">
                <Building2 size={18} className="cred-info-icon" />
                <div className="cred-info-content">
                  <span className="cred-info-label">Local de Votación</span>
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
                  <span className="cred-info-label">Distrito / Provincia</span>
                  <span className="cred-info-val">
                    {(data.district || "Tambopata").toUpperCase()} · {(data.province || "Madre de Dios").toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="cred-coordinator-box">
                <div className="cred-coordinator-box__head">
                  <UserCheck size={16} className="cred-coordinator-icon" />
                  <span className="cred-coordinator-tag">Coordinador Responsable de este Colegio</span>
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

            {/* Pie con QR dinámico */}
            <div className="cred-footer-qr">
              <img
                src={data.qrCodeUrl}
                alt="Código QR de verificación de credencial"
                className="cred-qr-img"
              />
              <div className="cred-stamp">
                <span className="cred-stamp-title">Personería Legal Regional</span>
                <div className="cred-stamp-role">Ahora Nación Madre de Dios</div>
                <div className="cred-security-code">ID: {data.token.slice(0, 12)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="cred-buttons">
          <button className="cred-btn-primary" onClick={handlePrint}>
            <Printer size={18} /> Imprimir / Descargar Credencial
          </button>
          <button className="cred-btn-secondary" onClick={handleShare}>
            <Share2 size={18} /> Compartir por WhatsApp
          </button>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cred-btn-outline"
          >
            <MapPin size={18} /> ¿Cómo llegar al colegio? (Google Maps) <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </main>
  );
}
