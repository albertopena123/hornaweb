"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import {
  Printer,
  ExternalLink,
  X,
  FileCheck2,
  Scissors,
  Download,
  Loader2,
  CreditCard,
  FileText,
} from "lucide-react";
import type { PersoneroRow } from "../types";
import { CredencialA4Sheet } from "@/components/credencial/CredencialA4Sheet";
import { FotocheckCard } from "@/components/credencial/FotocheckCard";
import {
  downloadCredencialA4Pdf,
  downloadFotocheckPdf,
} from "@/lib/credencialPdf";
import "./credential-modal.css";

type Props = {
  personero: PersoneroRow;
  onClose: () => void;
};

export function CredentialA4Modal({ personero, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"a4" | "fotocheck">("a4");
  const [generatingA4, setGeneratingA4] = useState(false);
  const [generatingFotocheck, setGeneratingFotocheck] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const mesaText = personero.mesa && personero.mesa !== "-" ? personero.mesa : "POR ASIGNAR";

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const verifyUrl = `${origin.replace(/\/+$/, "")}/credencial/${
    personero.credentialToken || personero.id
  }`;

  // Generar código QR digital de alta resolución
  useEffect(() => {
    QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 240,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => {
        setQrDataUrl(
          `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
            verifyUrl
          )}`
        );
      });
  }, [verifyUrl]);

  // Descargar PDF de Hoja A4 Oficial (Original + Copia)
  async function handleDownloadA4() {
    const sheet = document.getElementById("credencial-a4-sheet-target");
    if (!sheet) return;

    setGeneratingA4(true);
    try {
      await downloadCredencialA4Pdf(sheet, personero.name, personero.docNumber);
    } catch (err) {
      console.error("Error al generar PDF A4:", err);
      window.print();
    } finally {
      setGeneratingA4(false);
    }
  }

  // Descargar PDF de Fotocheck (Frente y Reverso)
  async function handleDownloadFotocheck() {
    const front = document.getElementById("fotocheck-front-target");
    const back = document.getElementById("fotocheck-back-target");
    if (!front || !back) return;

    setGeneratingFotocheck(true);
    try {
      await downloadFotocheckPdf(front, back, personero.name, personero.docNumber);
    } catch (err) {
      console.error("Error al generar PDF de Fotocheck:", err);
    } finally {
      setGeneratingFotocheck(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (!mounted) return null;

  const personeroSheetData = {
    id: personero.id,
    name: personero.name,
    docType: personero.docType,
    docNumber: personero.docNumber,
    role: personero.role,
    isSuplente: personero.isSuplente,
    mesa: personero.mesa,
    localName: personero.localName,
    localAddress: personero.localAddress,
    district: personero.district,
    qrDataUrl,
  };

  const personeroFotocheckData = {
    id: personero.id,
    name: personero.name,
    docNumber: personero.docNumber,
    docType: personero.docType,
    role: personero.role,
    isSuplente: personero.isSuplente,
    mesa: personero.mesa,
    localName: personero.localName,
    localAddress: personero.localAddress,
    district: personero.district,
    coordinatorName: personero.coordinatorName,
    coordinatorPhone: personero.coordinatorPhone,
    qrDataUrl,
    token: personero.credentialToken || personero.id,
  };

  const modalContent = (
    <div
      id="credencial-print-portal"
      className="cred-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="cred-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra Superior de Acciones */}
        <header className="cred-modal-header no-print">
          <div className="cred-modal-title-group">
            <div className="cred-modal-badge-icon">
              <FileCheck2 size={24} />
            </div>
            <div>
              <h2 className="cred-modal-title">
                {viewMode === "a4"
                  ? "Credencial Oficial A4 (2 en 1: Original y Copia)"
                  : "Fotocheck Oficial de Personero (Frente y Reverso)"}
              </h2>
              <p className="cred-modal-subtitle">
                {personero.name} · DNI: {personero.docNumber} · Mesa: {mesaText}
              </p>
            </div>
          </div>

          <div className="cred-modal-actions">
            {/* Selector de Formato: Hoja A4 vs Fotocheck */}
            <div
              style={{
                display: "inline-flex",
                background: "rgba(0,0,0,0.2)",
                padding: "2px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                className={`btn btn--xs ${viewMode === "a4" ? "btn--primary" : "btn--ghost"}`}
                onClick={() => setViewMode("a4")}
                style={{
                  fontWeight: 800,
                  fontSize: "11px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <FileText size={13} /> Hoja A4 Oficial
              </button>
              <button
                type="button"
                className={`btn btn--xs ${viewMode === "fotocheck" ? "btn--primary" : "btn--ghost"}`}
                onClick={() => setViewMode("fotocheck")}
                style={{
                  fontWeight: 800,
                  fontSize: "11px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <CreditCard size={13} /> Fotocheck Oficial
              </button>
            </div>

            {/* BOTÓN DESCARGAR */}
            {viewMode === "a4" ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handleDownloadA4}
                disabled={generatingA4}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  background: "linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)",
                  borderColor: "#b91c1c",
                  fontWeight: 800,
                }}
                title="Descargar archivo PDF oficial de 1 página A4 (Original y Copia)"
              >
                {generatingA4 ? (
                  <>
                    <Loader2 size={16} className="spin" /> Generando A4...
                  </>
                ) : (
                  <>
                    <Download size={16} /> Descargar PDF A4
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handleDownloadFotocheck}
                disabled={generatingFotocheck}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
                  borderColor: "#1e3a8a",
                  fontWeight: 800,
                }}
                title="Descargar archivo PDF del Fotocheck (Frente y Reverso)"
              >
                {generatingFotocheck ? (
                  <>
                    <Loader2 size={16} className="spin" /> Generando Fotocheck...
                  </>
                ) : (
                  <>
                    <Download size={16} /> Descargar Fotocheck (PDF)
                  </>
                )}
              </button>
            )}

            <a
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--secondary btn--sm"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              title="Abrir Fotocheck digital público del personero"
            >
              <ExternalLink size={14} /> Enlace Digital
            </a>

            {/* Imprimir */}
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={handlePrint}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              title="Imprimir en tu impresora"
            >
              <Printer size={15} /> Imprimir
            </button>

            <button
              type="button"
              className="btn-icon"
              onClick={onClose}
              title="Cerrar modal"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted, #94a3b8)",
                padding: "6px",
                display: "flex",
              }}
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Banner Informativo */}
        <div className="cred-modal-info-banner no-print">
          {viewMode === "a4" ? (
            <>
              <Scissors size={14} style={{ flexShrink: 0 }} />
              <span>
                <strong>Formato A4 Vertical Completo:</strong> 1 sola hoja con el <strong>Original</strong> (arriba para la mesa ONPE) y la <strong>Copia / Cargo</strong> (abajo con firma y constancia de recepción).
              </span>
            </>
          ) : (
            <>
              <CreditCard size={14} style={{ flexShrink: 0 }} />
              <span>
                <strong>Fotocheck Oficial de Personero:</strong> Formato carnet de identificación en alta resolución con <strong>Frente y Reverso</strong> (Código QR de validación digital, firma y huella).
              </span>
            </>
          )}
        </div>

        {/* Previsualización Scrollable */}
        <div className="cred-modal-body">
          {viewMode === "a4" ? (
            <CredencialA4Sheet data={personeroSheetData} />
          ) : (
            <div style={{ padding: "20px 0", width: "100%", overflowX: "auto" }}>
              <FotocheckCard data={personeroFotocheckData} />
            </div>
          )}
        </div>

        {/* Componentes en segundo plano para garantizar descarga inmediata */}
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: "794px",
            opacity: 0,
            pointerEvents: "none",
            zIndex: -99999,
          }}
          aria-hidden="true"
        >
          {viewMode !== "a4" && <CredencialA4Sheet data={personeroSheetData} />}
          {viewMode !== "fotocheck" && <FotocheckCard data={personeroFotocheckData} />}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
