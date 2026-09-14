"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CircleAlert,
  Info,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
  Search,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  IdCard,
  Clock,
  FileCheck2,
  Sparkles,
  AlertTriangle,
  UserCheck,
  Building2,
  Send,
} from "lucide-react";
import confetti from "canvas-confetti";
import LocalMap from "./LocalMap";
import "./mi-mesa.css";

type Result = {
  dni: string;
  nombres: string;
  apellidos: string;
  fullName: string;
  miembroMesa: boolean;
  cargo: string;
  localVotacion: string;
  direccion: string;
  referencia: string;
  ubigeo: string;
  mesaSufragio: string;
  orden: string;
  tipoVoto: string;
  localLatitud: string | null;
  localLongitud: string | null;
  isPersonero: boolean;
  personeroRole?: string | null;
  coordinatorName?: string | null;
  coordinatorPhone?: string | null;
  credentialToken?: string | null;
};

function waLink(phone: string, mesa: string, localName: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCc = digits.startsWith("51") ? digits : `51${digits}`;
  return `https://wa.me/${withCc}?text=${encodeURIComponent(
    `¡Hola coordinador! Soy personero asignado por Ahora Nación para la Mesa ${mesa} en ${localName}. Escribo para coordinar los detalles de acreditación.`
  )}`;
}

export default function MesaLookupClient() {
  const [dni, setDni] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "found" | "notfound" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [result, setResult] = useState<Result | null>(null);

  // Estados de animación de progreso 0% a 100%
  const [loadPercent, setLoadPercent] = useState(0);
  const [loadStepText, setLoadStepText] = useState("Iniciando conexión con el padrón electoral...");

  // Estados para inscripción rápida como personero con número de celular
  const [phoneInput, setPhoneInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinedSuccess, setJoinedSuccess] = useState(false);
  const [joinedData, setJoinedData] = useState<{
    coordinatorName: string;
    coordinatorPhone: string;
    token?: string;
  } | null>(null);

  async function consultar(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{8}$/.test(dni)) {
      setState("error");
      setMessage("El DNI debe tener 8 dígitos numéricos.");
      return;
    }
    setState("loading");
    setResult(null);
    setPhoneInput("");
    setJoinError(null);
    setJoinedSuccess(false);
    setJoinedData(null);
    setLoadPercent(8);
    setLoadStepText("Iniciando conexión segura con el padrón...");

    // Ticker progresivo dinámico de 8% a 93% mientras se recibe la respuesta
    let currentPct = 8;
    const progressTimer = setInterval(() => {
      currentPct += Math.floor(Math.random() * 5) + 3;
      if (currentPct > 93) {
        currentPct = 93;
      }
      setLoadPercent(currentPct);

      if (currentPct < 25) {
        setLoadStepText("Conectando con servidores del padrón electoral...");
      } else if (currentPct < 52) {
        setLoadStepText("Consultando base de datos oficial de la ONPE...");
      } else if (currentPct < 75) {
        setLoadStepText("Localizando local de votación y mesa...");
      } else if (currentPct < 90) {
        setLoadStepText("Verificando condición de Miembro de Mesa...");
      } else {
        setLoadStepText("Extrayendo credencial oficial del elector...");
      }
    }, 180);

    try {
      const res = await fetch(`/api/donde-votar/${dni}`);
      const json = await res.json().catch(() => null);
      clearInterval(progressTimer);

      if (res.ok && json?.ok && json?.data) {
        setLoadPercent(100);
        setLoadStepText("¡Datos encontrados exitosamente!");
        await new Promise((r) => setTimeout(r, 260));
        setResult(json.data as Result);
        setState("found");
      } else if (res.status === 404) {
        setLoadPercent(100);
        await new Promise((r) => setTimeout(r, 180));
        setState("notfound");
        setMessage(
          json?.error ?? "No se encontraron datos para este DNI en el padrón electoral."
        );
      } else {
        setLoadPercent(100);
        await new Promise((r) => setTimeout(r, 180));
        setState("error");
        setMessage(json?.error ?? "No se pudo consultar el local de votación. Intenta de nuevo.");
      }
    } catch {
      clearInterval(progressTimer);
      setLoadPercent(100);
      setState("error");
      setMessage("Sin conexión con el servidor. Intenta de nuevo.");
    }
  }

  async function handleJoinPersonero(e: React.FormEvent) {
    e.preventDefault();
    if (!result) return;

    const cleanPhone = phoneInput.trim().replace(/\D/g, "");
    if (!/^9\d{8}$/.test(cleanPhone)) {
      setJoinError("Ingresa un número de WhatsApp o celular válido de 9 dígitos (inicia con 9).");
      return;
    }

    setJoining(true);
    setJoinError(null);

    try {
      const res = await fetch("/api/donde-votar/unirme-personero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dni: result.dni,
          phone: cleanPhone,
          name: result.fullName,
          mesa: result.mesaSufragio,
          localName: result.localVotacion,
          localAddress: result.direccion,
          district: result.ubigeo,
        }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        setJoinedSuccess(true);
        setJoinedData(json.data);
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        setJoinError(json?.error ?? "No se pudo procesar la inscripción. Intenta de nuevo.");
      }
    } catch {
      setJoinError("Error de conexión al registrar. Intenta de nuevo.");
    } finally {
      setJoining(false);
    }
  }

  function handleReset() {
    setDni("");
    setState("idle");
    setResult(null);
    setMessage("");
    setPhoneInput("");
    setJoinError(null);
    setJoinedSuccess(false);
    setJoinedData(null);
  }

  const effectiveCoordinatorName =
    joinedData?.coordinatorName || result?.coordinatorName || "Coordinación Regional Ahora Nación";
  const effectiveCoordinatorPhone =
    joinedData?.coordinatorPhone || result?.coordinatorPhone || "982555123";
  const effectiveToken = joinedData?.token || result?.credentialToken;

  return (
    <div className="mm">
      {/* Header Superior */}
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
          <Link href="/mi-mesa" className="mm__nav-link is-active">
            ¿Dónde Voto?
          </Link>
          <Link href="/mi-foto" className="mm__nav-link">
            Foto con Marco
          </Link>
          <Link href="/aprende-a-votar" className="mm__nav-link">
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

      {/* Contenedor Central */}
      <main className="mm__container">
        {/* Hero Central */}
        <section className="mm__hero">
          <div className="mm__badge">
            <span className="mm__badge-dot" /> Consulta Electoral Oficial 2026
          </div>

          <h1 className="mm__title">
            ¿Dónde me toca <em>votar</em>?
          </h1>

          <p className="mm__lead">
            Consulta tu local de votación, número de mesa de sufragio, orden y si fuiste elegido{" "}
            <strong>Miembro de Mesa</strong> para las Elecciones Regionales y Municipales 2026.
          </p>
        </section>

        {/* Consola de Búsqueda */}
        <div className={`mm__search-box ${state === "loading" ? "is-loading" : ""}`}>
          {state === "loading" && <div className="mm__loading-bar" />}
          <form className="mm__search-form" onSubmit={consultar} noValidate>
            <div className="mm__input-wrap">
              <IdCard size={20} className="mm__input-icon" />
              <input
                className="mm__search-input"
                inputMode="numeric"
                maxLength={8}
                placeholder="Ingresa tu DNI (8 dígitos)"
                value={dni}
                disabled={state === "loading"}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button className="mm__search-btn" type="submit" disabled={state === "loading"}>
              {state === "loading" ? (
                <>
                  <LoaderCircle className="mm__spin" size={18} aria-hidden="true" />
                  <span>Consultando…</span>
                </>
              ) : (
                <>
                  <Search size={17} /> Consultar Mesa
                </>
              )}
            </button>
          </form>
        </div>

        {/* Panel Animado de Carga en Vivo con Contador 0 a 100% */}
        {state === "loading" && (
          <div className="mm__loading-panel" role="status" aria-live="polite">
            <div className="mm__loading-radar">
              <div className="mm__radar-ring" />
              <div className="mm__radar-ring ring-2" />
              <LoaderCircle className="mm__spin mm__radar-icon" size={26} />
            </div>

            <div className="mm__loading-info">
              <div className="mm__loading-header">
                <div>
                  <strong className="mm__loading-title">
                    {loadStepText}
                  </strong>
                  <div className="mm__loading-desc">
                    Escaneando DNI <span className="mm__loading-dni">{dni}</span> en tiempo real
                  </div>
                </div>
                <div className="mm__loading-pct">{loadPercent}%</div>
              </div>

              {/* Barra de progreso de 0 a 100% */}
              <div className="mm__progress-track">
                <div
                  className="mm__progress-fill"
                  style={{ width: `${loadPercent}%` }}
                />
              </div>

              <div className="mm__loading-pills">
                <span className="mm__pill">
                  <span className="mm__pill-dot" /> Servidor electoral conectado
                </span>
                <span className="mm__pill muted">
                  {loadPercent < 100 ? "Procesando información oficial..." : "¡Listo!"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Alertas */}
        {(state === "error" || state === "notfound") && (
          <div className={`mm__alert ${state === "notfound" ? "info" : "error"}`}>
            <div className="d-flex align-items-center gap-2">
              {state === "notfound" ? (
                <Info size={20} aria-hidden="true" className="flex-shrink-0" />
              ) : (
                <CircleAlert size={20} aria-hidden="true" className="flex-shrink-0" />
              )}
              <span>{message}</span>
            </div>
            {state === "notfound" && (
              <Link href="/unete" className="mm__alert-btn">
                Inscribirme en la campaña <ArrowRight size={14} />
              </Link>
            )}
          </div>
        )}

        {/* Resultado Oficial */}
        {state === "found" && result && (
          <div className="mm__credential" role="region" aria-label="Información de Local y Mesa">
            {/* Cabecera del resultado */}
            <div className="mm__cred-top">
              <div className="mm__cred-brand">
                <img src="/assets/images/logo/logo-an.webp" alt="" />
                <div>
                  <strong>Información Electoral Oficial</strong>
                  <span>Elecciones Regionales y Municipales 2026</span>
                </div>
              </div>

              {/* Badge Miembro de Mesa o Personero */}
              {result.isPersonero || joinedSuccess ? (
                <div className="mm__cred-status" style={{ background: "#dc2626", color: "#fff" }}>
                  <CheckCircle2 size={14} /> Personero(a) Acreditado(a)
                </div>
              ) : result.miembroMesa ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "0.5px",
                    background: "rgba(234, 179, 8, 0.2)",
                    border: "1px solid rgba(234, 179, 8, 0.5)",
                    color: "#fde047",
                    textTransform: "uppercase",
                  }}
                >
                  <AlertTriangle size={14} /> ¡Miembro de Mesa!
                </div>
              ) : (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "0.5px",
                    background: "rgba(34, 197, 94, 0.2)",
                    border: "1px solid rgba(34, 197, 94, 0.5)",
                    color: "#4ade80",
                    textTransform: "uppercase",
                  }}
                >
                  <UserCheck size={14} /> No eres Miembro de Mesa
                </div>
              )}
            </div>

            {/* Datos del Ciudadano */}
            <div className="mm__cred-person">
              <div className="mm__cred-label">Nombre del Elector</div>
              <div className="mm__cred-name">{result.fullName}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                DNI: <strong>{result.dni}</strong> · Tipo de voto: <strong>{result.tipoVoto}</strong>
              </div>
            </div>

            {/* Mensaje de Miembro de Mesa destacado */}
            {result.miembroMesa ? (
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(202, 138, 4, 0.1))",
                  border: "1px solid rgba(234, 179, 8, 0.4)",
                  borderRadius: "14px",
                  padding: "12px 16px",
                  margin: "12px 0 16px",
                  fontSize: "13px",
                  color: "#fef08a",
                  lineHeight: "1.5",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <AlertTriangle size={22} className="flex-shrink-0" style={{ color: "#facc15" }} />
                <div>
                  <strong>Has sido designado(a) como {result.cargo}.</strong>
                  <br />
                  Debes presentarte a las <strong>7:00 AM</strong> en tu local de votación para la instalación de la mesa.
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "rgba(34, 197, 94, 0.08)",
                  border: "1px solid rgba(34, 197, 94, 0.25)",
                  borderRadius: "14px",
                  padding: "10px 16px",
                  margin: "10px 0 16px",
                  fontSize: "12.5px",
                  color: "#86efac",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <CheckCircle2 size={16} className="flex-shrink-0" />
                <span>No eres miembro de mesa. Tu horario de votación es de 8:00 AM a 5:00 PM.</span>
              </div>
            )}

            {/* Número de Mesa y Orden Destacados */}
            <div className="mm__cred-mesa-card">
              <div className="mm__cred-mesa-info">
                <strong>Mesa de Sufragio</strong>
                <span>
                  {result.orden ? `N° de Orden en el Padrón: ${result.orden}` : "Padrón Electoral 2026"}
                </span>
              </div>
              <div className="mm__cred-mesa-number">{result.mesaSufragio || "—"}</div>
            </div>

            {/* Datos del Local de Votación */}
            <div className="mm__cred-card" style={{ marginTop: "14px" }}>
              <div className="mm__cred-card-title">
                <Building2 size={15} color="#ff6b6d" /> Local de Votación Oficial
              </div>
              <div className="mm__cred-card-value" style={{ fontSize: "16px", fontWeight: 800 }}>
                {result.localVotacion}
              </div>
              {result.direccion && (
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)", marginTop: "4px" }}>
                  <MapPin size={13} style={{ display: "inline", marginRight: "4px", color: "#ff6b6d" }} />
                  {result.direccion}
                </div>
              )}
              {result.referencia && (
                <div style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.55)", marginTop: "3px" }}>
                  Referencia: {result.referencia}
                </div>
              )}
              {result.ubigeo && (
                <div className="mm__cred-card-sub" style={{ marginTop: "6px" }}>
                  Ubicación: <strong>{result.ubigeo}</strong>
                </div>
              )}
            </div>

            {/* =========================================================
                MAPA INTERACTIVO INTEGRADO CON PIN DE UBICACIÓN
               ========================================================= */}
            <LocalMap
              lat={result.localLatitud ? parseFloat(result.localLatitud) : null}
              lng={result.localLongitud ? parseFloat(result.localLongitud) : null}
              localName={result.localVotacion}
              direccion={result.direccion}
              mesa={result.mesaSufragio}
            />

            {/* =========================================================
                SECCIÓN DE CAPTACIÓN / INSCRIPCIÓN INTERACTIVA CON CELULAR
               ========================================================= */}
            {!result.isPersonero && !joinedSuccess ? (
              <div
                style={{
                  background:
                    "linear-gradient(135deg, rgba(233, 3, 5, 0.16) 0%, rgba(13, 22, 34, 0.98) 100%)",
                  border: "1.5px solid rgba(233, 3, 5, 0.45)",
                  borderRadius: "20px",
                  padding: "20px",
                  marginTop: "18px",
                  boxShadow: "0 10px 30px rgba(233, 3, 5, 0.15)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      background: "#e90305",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      flexShrink: 0,
                      boxShadow: "0 4px 12px rgba(233, 3, 5, 0.4)",
                    }}
                  >
                    <Shield size={20} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "11.5px",
                        fontWeight: 800,
                        color: "#ff6b6d",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                      }}
                    >
                      🛡️ Defiende el Voto en tu Mesa
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#fff", marginTop: "2px" }}>
                      ¿Deseas ser Personero(a) en la Mesa N° {result.mesaSufragio}?
                    </div>
                    <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", marginTop: "4px", lineHeight: "1.4" }}>
                      Ya tenemos tu mesa y colegio listos. <strong>Ingresa tu número de WhatsApp</strong> para que tu coordinador te envíe tu credencial oficial y te sumes al equipo de Simón Horna:
                    </div>
                  </div>
                </div>

                {/* Formulario rápido con número de celular */}
                <form onSubmit={handleJoinPersonero} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <div
                      style={{
                        flex: "1 1 220px",
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Phone
                        size={18}
                        style={{
                          position: "absolute",
                          left: "14px",
                          color: "rgba(255,255,255,0.5)",
                        }}
                      />
                      <input
                        type="tel"
                        maxLength={9}
                        inputMode="numeric"
                        placeholder="Ej. 982123456 (WhatsApp)"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ""))}
                        style={{
                          width: "100%",
                          height: "48px",
                          background: "rgba(7, 12, 18, 0.95)",
                          border: "1.5px solid rgba(255, 255, 255, 0.2)",
                          borderRadius: "12px",
                          padding: "0 14px 0 42px",
                          color: "#fff",
                          fontSize: "15px",
                          fontWeight: 700,
                          letterSpacing: "1px",
                          outline: "none",
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={joining}
                      style={{
                        height: "48px",
                        padding: "0 22px",
                        background: "linear-gradient(135deg, #e90305 0%, #c40204 100%)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "12px",
                        fontSize: "14px",
                        fontWeight: 800,
                        cursor: joining ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        boxShadow: "0 4px 15px rgba(233, 3, 5, 0.4)",
                        whiteSpace: "nowrap",
                        flex: "0 0 auto",
                      }}
                    >
                      {joining ? (
                        <>
                          <LoaderCircle className="mm__spin" size={16} /> Registrando…
                        </>
                      ) : (
                        <>
                          <Send size={15} /> ¡Quiero ser Personero en mi Mesa!
                        </>
                      )}
                    </button>
                  </div>

                  {joinError && (
                    <div style={{ color: "#fca5a5", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <CircleAlert size={14} /> {joinError}
                    </div>
                  )}

                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                    🔒 Tus datos están protegidos y solo se utilizarán para la coordinación electoral oficial de Ahora Nación.
                  </div>
                </form>
              </div>
            ) : null}

            {/* =========================================================
                ESTADO DE ÉXITO TRAS REGISTRARSE O SI YA ES PERSONERO
               ========================================================= */}
            {(result.isPersonero || joinedSuccess) && (
              <div
                style={{
                  background:
                    "linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(13, 22, 34, 0.95) 100%)",
                  border: "1.5px solid rgba(34, 197, 94, 0.4)",
                  borderRadius: "20px",
                  padding: "20px",
                  marginTop: "18px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <CheckCircle2 size={24} color="#4ade80" />
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#86efac" }}>
                      {joinedSuccess
                        ? `¡Felicitaciones ${result.nombres}! Te has inscrito como Personero(a)`
                        : `Acreditado(a) como Personero(a) de Ahora Nación`}
                    </div>
                    <div style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.75)" }}>
                      Mesa N° <strong>{result.mesaSufragio}</strong> · {result.localVotacion}
                    </div>
                  </div>
                </div>

                {/* Coordinador Asignado */}
                <div
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    marginTop: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#ffd400", fontWeight: 700 }}>
                      <Shield size={12} style={{ display: "inline", marginRight: "4px" }} />
                      Tu Coordinador de Ahora Nación
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#fff", marginTop: "2px" }}>
                      {effectiveCoordinatorName}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <a
                      href={`tel:${effectiveCoordinatorPhone.replace(/\s/g, "")}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 14px",
                        borderRadius: "10px",
                        background: "rgba(255,255,255,0.1)",
                        color: "#fff",
                        textDecoration: "none",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      <Phone size={13} /> Llamar
                    </a>

                    <a
                      href={waLink(effectiveCoordinatorPhone, result.mesaSufragio, result.localVotacion)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 14px",
                        borderRadius: "10px",
                        background: "#25D366",
                        color: "#fff",
                        textDecoration: "none",
                        fontSize: "12px",
                        fontWeight: 700,
                        boxShadow: "0 4px 12px rgba(37, 211, 102, 0.3)",
                      }}
                    >
                      <MessageCircle size={14} /> Chatear por WhatsApp
                    </a>
                  </div>
                </div>

                {effectiveToken && (
                  <Link
                    href={`/credencial/${effectiveToken}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      padding: "12px 18px",
                      background: "linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)",
                      color: "#ffffff",
                      borderRadius: "12px",
                      fontWeight: 800,
                      fontSize: "14px",
                      textDecoration: "none",
                      boxShadow: "0 4px 14px rgba(220, 38, 38, 0.4)",
                      textAlign: "center",
                      marginTop: "12px",
                    }}
                  >
                    <FileCheck2 size={16} /> Ver y Descargar Mi Credencial Oficial
                  </Link>
                )}
              </div>
            )}

            {/* Acciones de la Credencial */}
            <div className="mm__cred-actions" style={{ marginTop: "20px" }}>
              <button type="button" className="mm__cred-reset" onClick={handleReset}>
                ← Realizar otra consulta de DNI
              </button>

              <Link
                href="/mi-foto"
                className="d-inline-flex align-items-center gap-1"
                style={{ fontSize: "12.5px", color: "#ffd400", fontWeight: 700, textDecoration: "none" }}
              >
                <Sparkles size={14} /> Personalizar mi Foto de Apoyo Oficial
              </Link>
            </div>
          </div>
        )}

        {/* Guía Informativa Electoral */}
        <section className="mm__guide-section" aria-label="Guía rápida para electores y personeros">
          <div className="mm__guide-card">
            <div className="mm__guide-icon">
              <Clock size={20} />
            </div>
            <div className="mm__guide-title">Horario de Sufragio</div>
            <p className="mm__guide-desc">
              Si eres <strong>Miembro de Mesa</strong>, debes presentarte a las <strong>7:00 AM</strong>.
              Para electores generales, las mesas atienden de <strong>8:00 AM a 5:00 PM</strong>.
            </p>
          </div>

          <div className="mm__guide-card">
            <div className="mm__guide-icon">
              <FileCheck2 size={20} />
            </div>
            <div className="mm__guide-title">Documento Obligatorio</div>
            <p className="mm__guide-desc">
              Lleva tu <strong>DNI físico</strong> (azul, amarillo o electrónico). Aunque esté vencido,
              por disposición del Reniec y JNE puedes ejercer tu derecho a votar.
            </p>
          </div>

          <div className="mm__guide-card">
            <div className="mm__guide-icon">
              <Shield size={20} />
            </div>
            <div className="mm__guide-title">Defiende tu Región</div>
            <p className="mm__guide-desc">
              Cuidar el voto es cuidar el futuro de Madre de Dios. Revisa bien tu cédula y marca el
              símbolo de <strong>Ahora Nación</strong> para consolidar el cambio.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
