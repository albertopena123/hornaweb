"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Shield,
  BookOpen,
  Vote,
  MapPin,
  CheckCircle2,
  Users,
  Search,
  Clock,
  Sparkles
} from "lucide-react";
import { DISTRITOS_MDD } from "@/data/votoData";
import { CedulaSimulador } from "@/components/cedula/CedulaSimulador";
import { CandidateDirectoryView } from "@/components/cedula/CandidateDirectoryView";
import { GuiaElectorModal } from "@/components/cedula/GuiaElectorModal";
import type { DistritoMDD, VotoSimulado } from "@/types/voto";
import "./cedula.css";

type TabType = "simulador" | "candidatos" | "guia";

export function AprendeAVotarClient() {
  const [activeTab, setActiveTab] = useState<TabType>("simulador");
  const [selectedProvincia, setSelectedProvincia] = useState<"Tambopata" | "Tahuamanu" | "Manu">("Tambopata");
  const [isGuiaOpen, setIsGuiaOpen] = useState<boolean>(false);

  // Distrito principal representativo según la provincia seleccionada
  const currentDistrito: DistritoMDD =
    DISTRITOS_MDD.find((d) => d.provincia === selectedProvincia) || DISTRITOS_MDD[0];

  const userLocation = {
    distrito: currentDistrito,
    sector: currentDistrito.centrosPoblados?.[0] || currentDistrito.nombre,
    lat: currentDistrito.lat,
    lng: currentDistrito.lng
  };

  const handleVoteSubmitted = (voto: VotoSimulado) => {
    console.log("Voto emitido en Cédula Oficial:", voto);
  };

  return (
    <div className="mm">
      {/* 1. Header Superior Institucional (Idéntico a /mi-mesa, /unete y /mi-foto) */}
      <header className="mm__top">
        <Link className="mm__logo" href="/">
          <img src="/assets/images/logo/logo-an.webp" alt="Ahora Nación" />
          <span>
            <strong>Simón Horna Alpaca</strong>
            <span>Ahora Nación · Madre de Dios</span>
          </span>
        </Link>

        <nav className="mm__nav" aria-label="Navegación principal">
          <Link href="/" className="mm__nav-link">
            Inicio
          </Link>
          <Link href="/#apoyo" className="mm__nav-link">
            Apoyo
          </Link>
          <Link href="/mi-mesa" className="mm__nav-link">
            Consultor de Mesa
          </Link>
          <Link href="/mi-foto" className="mm__nav-link">
            Foto con Marco
          </Link>
          <Link href="/aprende-a-votar" className="mm__nav-link is-active">
            Aprende a Votar
          </Link>
          <Link href="/unete" className="mm__nav-link">
            Únete
          </Link>
        </nav>

        <div className="mm__top-actions">
          <Link className="mm__back-btn" href="/">
            ← Volver al inicio
          </Link>
        </div>
      </header>

      {/* 2. Contenedor Central */}
      <main className="mm__container" style={{ maxWidth: "1550px" }}>
        {/* Hero Central */}
        <section className="mm__hero">
          <div className="mm__badge">
            <span className="mm__badge-dot" /> Simulador Oficial ONPE — Madre de Dios 2026
          </div>

          <h1 className="mm__title">
            Aprende a Votar en la <em>Cédula Electoral 2026</em>
          </h1>

          <p className="mm__lead">
            Practica en la réplica digital de la cédula física oficial para las Elecciones Regionales y Municipales de Madre de Dios.
            Conoce cómo marcar con una cruz (+) o aspa (x) sobre el símbolo o foto de <strong>Simón Horna Alpaca (Ahora Nación)</strong> para Gobernador Regional y de tu lista provincial.
          </p>

          {/* Selector de Vistas / Pestañas Principales */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            flexWrap: "wrap",
            margin: "24px 0 16px"
          }}>
            <button
              onClick={() => setActiveTab("simulador")}
              style={{
                background: activeTab === "simulador" ? "#e90305" : "rgba(255, 255, 255, 0.07)",
                color: "#ffffff",
                border: activeTab === "simulador" ? "1px solid #e90305" : "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "999px",
                padding: "8px 20px",
                fontSize: "0.85rem",
                fontWeight: activeTab === "simulador" ? 800 : 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
                boxShadow: activeTab === "simulador" ? "0 4px 15px rgba(233, 3, 5, 0.4)" : "none"
              }}
            >
              <Vote size={16} /> Cédula de Votación
            </button>

            <button
              onClick={() => setActiveTab("candidatos")}
              style={{
                background: activeTab === "candidatos" ? "#e90305" : "rgba(255, 255, 255, 0.07)",
                color: "#ffffff",
                border: activeTab === "candidatos" ? "1px solid #e90305" : "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "999px",
                padding: "8px 20px",
                fontSize: "0.85rem",
                fontWeight: activeTab === "candidatos" ? 800 : 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
                boxShadow: activeTab === "candidatos" ? "0 4px 15px rgba(233, 3, 5, 0.4)" : "none"
              }}
            >
              <Users size={16} /> Conoce a los Candidatos
            </button>

            <button
              onClick={() => setIsGuiaOpen(true)}
              style={{
                background: "rgba(255, 255, 255, 0.07)",
                color: "#ffffff",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "999px",
                padding: "8px 20px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease"
              }}
            >
              <BookOpen size={16} style={{ color: "#38bdf8" }} /> Guía Cívica (Horarios DNI)
            </button>
          </div>

          {/* Filtro de Provincia (Solo en vista Simulador) */}
          {activeTab === "simulador" && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "999px",
              padding: "4px 8px",
              marginTop: "4px"
            }}>
              <span style={{ fontSize: "0.78rem", color: "rgba(255, 255, 255, 0.6)", paddingLeft: "8px", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                <MapPin size={13} /> Seleccionar Provincia:
              </span>
              {(["Tambopata", "Tahuamanu", "Manu"] as const).map((prov) => (
                <button
                  key={prov}
                  onClick={() => setSelectedProvincia(prov)}
                  style={{
                    background: selectedProvincia === prov ? "#e90305" : "transparent",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "999px",
                    padding: "5px 14px",
                    fontSize: "0.8rem",
                    fontWeight: selectedProvincia === prov ? 800 : 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  {prov}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 3. Contenido Principal según Pestaña Activa */}
        <section style={{ width: "100%", margin: "0 auto 48px" }}>
          {activeTab === "simulador" && (
            <CedulaSimulador
              key={selectedProvincia}
              userLocation={userLocation}
              onSubmitVote={handleVoteSubmitted}
              onNavigate={(tab) => {
                if (tab === "candidatos") setActiveTab("candidatos");
              }}
            />
          )}

          {activeTab === "candidatos" && (
            <CandidateDirectoryView
              onSelectCandidateToVote={() => {
                setActiveTab("simulador");
              }}
            />
          )}
        </section>

        {/* 4. Tarjetas Informativas Pedagógicas Inferiores */}
        <section className="mm__info-grid">
          <div className="mm__info-card">
            <div className="mm__info-icon">
              <CheckCircle2 size={24} />
            </div>
            <h3>Validez del Trazo (Art. 282 LOE)</h3>
            <p>
              El voto es válido si las dos líneas del aspa (X) o cruz (+) se cruzan dentro del recuadro asignado al símbolo o fotografía del candidato.
            </p>
          </div>

          <div className="mm__info-card">
            <div className="mm__info-icon">
              <Vote size={24} />
            </div>
            <h3>Voto Cruzado Permitido</h3>
            <p>
              Puedes elegir a Simón Horna (Ahora Nación) para Gobernador Regional y marcar libremente por tu candidato preferido a la Alcaldía Provincial.
            </p>
          </div>

          <div className="mm__info-card">
            <div className="mm__info-icon">
              <Shield size={24} />
            </div>
            <h3>Compromiso Madre de Dios 2026</h3>
            <p>
              Capacítate, conoce las propuestas de los candidatos acreditados y ejerce un voto consciente, responsable y bien informado este 2026.
            </p>
          </div>
        </section>
      </main>

      {/* Modal: Guía Cívica del Elector */}
      <GuiaElectorModal isOpen={isGuiaOpen} onClose={() => setIsGuiaOpen(false)} />
    </div>
  );
}
