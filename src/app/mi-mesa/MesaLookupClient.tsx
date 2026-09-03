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
  Vote,
  Search,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  IdCard,
  Clock,
  FileCheck2,
  Sparkles,
} from "lucide-react";
import "./mi-mesa.css";

type Result = {
  name: string;
  district: string | null;
  localName: string;
  localAddress: string | null;
  mesa: string;
  coordinatorName: string;
  coordinatorPhone: string;
};

function waLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCc = digits.startsWith("51") ? digits : `51${digits}`;
  return `https://wa.me/${withCc}?text=${encodeURIComponent(
    "¡Hola coordinador! Soy personero de mesa asignado por Ahora Nación. Escribo para coordinar los detalles del día de la elección."
  )}`;
}

function mapsLink(r: Result): string {
  const query = encodeURIComponent(r.localAddress || `${r.localName} Madre de Dios`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export default function MesaLookupClient() {
  const [dni, setDni] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "found" | "notfound" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [result, setResult] = useState<Result | null>(null);

  async function consultar(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{8}$/.test(dni)) {
      setState("error");
      setMessage("El DNI debe tener 8 dígitos numéricos.");
      return;
    }
    setState("loading");
    setResult(null);
    try {
      const res = await fetch(`/api/personeros/${dni}`);
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        setResult(json as Result);
        setState("found");
      } else if (res.status === 404) {
        setState("notfound");
        setMessage(json?.error ?? "Aún no apareces asignado a un local o mesa.");
      } else {
        setState("error");
        setMessage(json?.error ?? "No se pudo consultar. Intenta de nuevo.");
      }
    } catch {
      setState("error");
      setMessage("Sin conexión con el servidor. Intenta de nuevo.");
    }
  }

  function handleReset() {
    setDni("");
    setState("idle");
    setResult(null);
    setMessage("");
  }

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
            Consultor de Mesa
          </Link>
          <Link href="/mi-foto" className="mm__nav-link">
            Foto con Marco
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
            <span className="mm__badge-dot" /> Terminal de Consulta Electoral 2026
          </div>

          <h1 className="mm__title">
            Consulta tu local y <em>mesa de votación</em>
          </h1>

          <p className="mm__lead">
            Ingresa tu número de documento para consultar tu asignación oficial como personero de{" "}
            <strong>Ahora Nación</strong> en Madre de Dios, tu local de votación, número de mesa y
            contacto directo con tu coordinador.
          </p>
        </section>

        {/* Consola de Búsqueda */}
        <div className="mm__search-box">
          <form className="mm__search-form" onSubmit={consultar} noValidate>
            <div className="mm__input-wrap">
              <IdCard size={20} className="mm__input-icon" />
              <input
                className="mm__search-input"
                inputMode="numeric"
                maxLength={8}
                placeholder="Ingresa tu DNI (8 dígitos)"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <button className="mm__search-btn" type="submit" disabled={state === "loading"}>
              {state === "loading" ? (
                <>
                  <LoaderCircle className="mm__spin" size={18} aria-hidden="true" />
                  Consultando…
                </>
              ) : (
                <>
                  <Search size={17} /> Consultar Mesa
                </>
              )}
            </button>
          </form>
        </div>

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
                Inscribirme como personero <ArrowRight size={14} />
              </Link>
            )}
          </div>
        )}

        {/* Credencial Digital Electoral */}
        {state === "found" && result && (
          <div className="mm__credential" role="region" aria-label="Credencial de Personero">
            {/* Cabecera de la credencial */}
            <div className="mm__cred-top">
              <div className="mm__cred-brand">
                <img src="/assets/images/logo/logo-an.webp" alt="" />
                <div>
                  <strong>Ahora Nación</strong>
                  <span>Credencial de Personero</span>
                </div>
              </div>
              <div className="mm__cred-status">
                <CheckCircle2 size={14} /> Acreditado
              </div>
            </div>

            {/* Datos del Personero */}
            <div className="mm__cred-person">
              <div className="mm__cred-label">Nombre del Personero(a)</div>
              <div className="mm__cred-name">{result.name}</div>
            </div>

            {/* Número de Mesa Destacado */}
            <div className="mm__cred-mesa-card">
              <div className="mm__cred-mesa-info">
                <strong>Mesa de Votación</strong>
                <span>Supervisión y cuidado de actas</span>
              </div>
              <div className="mm__cred-mesa-number">{result.mesa}</div>
            </div>

            {/* Grilla: Local y Coordinador */}
            <div className="mm__cred-grid">
              {/* Local */}
              <div className="mm__cred-card">
                <div>
                  <div className="mm__cred-card-title">
                    <MapPin size={14} color="#ff6b6d" /> Local de Votación
                  </div>
                  <div className="mm__cred-card-value">{result.localName}</div>
                  {result.district && (
                    <div className="mm__cred-card-sub">Distrito: {result.district}</div>
                  )}
                  {result.localAddress && (
                    <div style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.6)", marginTop: "3px" }}>
                      {result.localAddress}
                    </div>
                  )}
                </div>
                <a
                  className="mm__cred-link"
                  href={mapsLink(result)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver en Google Maps <ExternalLink size={13} />
                </a>
              </div>

              {/* Coordinador */}
              <div className="mm__cred-card">
                <div>
                  <div className="mm__cred-card-title">
                    <Shield size={14} color="#ffd400" /> Coordinador Asignado
                  </div>
                  <div className="mm__cred-card-value">{result.coordinatorName}</div>
                  <div className="mm__cred-card-sub">Central de Coordinación</div>
                </div>

                <div className="mm__coord-btns">
                  <a
                    className="mm__btn-call"
                    href={`tel:${result.coordinatorPhone.replace(/\s/g, "")}`}
                  >
                    <Phone size={13} /> Llamar
                  </a>
                  <a
                    className="mm__btn-wa"
                    href={waLink(result.coordinatorPhone)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle size={13} /> WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Acciones de la Credencial */}
            <div className="mm__cred-actions">
              <button type="button" className="mm__cred-reset" onClick={handleReset}>
                ← Realizar otra consulta de DNI
              </button>

              <Link
                href="/mi-foto"
                className="d-inline-flex align-items-center gap-1"
                style={{ fontSize: "12.5px", color: "#ffd400", fontWeight: 700, textDecoration: "none" }}
              >
                <Sparkles size={14} /> Personalizar mi Foto Oficial
              </Link>
            </div>
          </div>
        )}

        {/* Guía Informativa del Personero (Siempre visible o complementaria) */}
        <section className="mm__guide-section" aria-label="Guía rápida para personeros de mesa">
          <div className="mm__guide-card">
            <div className="mm__guide-icon">
              <Clock size={20} />
            </div>
            <div className="mm__guide-title">Horarios del Día D</div>
            <p className="mm__guide-desc">
              Preséntate a las <strong>7:00 AM</strong> en tu centro de votación para la instalación
              de mesa. El sufragio inicia a las 8:00 AM y el escrutinio a las 5:00 PM.
            </p>
          </div>

          <div className="mm__guide-card">
            <div className="mm__guide-icon">
              <FileCheck2 size={20} />
            </div>
            <div className="mm__guide-title">Documentos Clave</div>
            <p className="mm__guide-desc">
              Lleva contigo tu DNI vigente, tu credencial oficial de personero de Ahora Nación y un
              lapicero azul o negro para firmar las actas.
            </p>
          </div>

          <div className="mm__guide-card">
            <div className="mm__guide-icon">
              <Shield size={20} />
            </div>
            <div className="mm__guide-title">Cuidado de Actas</div>
            <p className="mm__guide-desc">
              Supervisa el conteo voto a voto, toma foto clara al acta de escrutinio y envíala de
              inmediato a tu coordinador por WhatsApp.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
