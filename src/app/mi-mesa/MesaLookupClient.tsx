"use client";

import { useState } from "react";
import { CircleAlert, Info, LoaderCircle, MapPin, MessageCircle, Phone } from "lucide-react";
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
  return `https://wa.me/${withCc}`;
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
      setMessage("El DNI debe tener 8 dígitos.");
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
        setMessage(json?.error ?? "Aún no apareces asignado.");
      } else {
        setState("error");
        setMessage(json?.error ?? "No se pudo consultar. Intenta de nuevo.");
      }
    } catch {
      setState("error");
      setMessage("Sin conexión. Intenta de nuevo.");
    }
  }

  return (
    <main className="mm">
      <div className="mm__card">
        <header className="mm__brand">
          <img src="/assets/images/logo/logo-an.webp" alt="Ahora Nación" />
          <div>
            <strong>Consultor de Mesa</strong>
            <span>Personeros · Ahora Nación</span>
          </div>
        </header>

        <h1 className="mm__title">¿Dónde me toca cuidar los votos?</h1>
        <p className="mm__lead">Ingresa tu DNI y te decimos tu local, tu número de mesa y el teléfono de tu coordinador.</p>

        <form className="mm__form" onSubmit={consultar} noValidate>
          <input
            className="mm__dni"
            inputMode="numeric"
            maxLength={8}
            placeholder="Tu DNI (8 dígitos)"
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
          />
          <button className="mm__btn" type="submit" disabled={state === "loading"}>
            {state === "loading" ? (
              <>
                <LoaderCircle className="mm__spin" size={18} aria-hidden="true" />
                Consultando…
              </>
            ) : (
              "Consultar mi mesa"
            )}
          </button>
        </form>

        {(state === "error" || state === "notfound") && (
          <div className={`mm__alert ${state === "notfound" ? "info" : "error"}`}>
            {state === "notfound" ? (
              <Info size={16} aria-hidden="true" />
            ) : (
              <CircleAlert size={16} aria-hidden="true" />
            )}
            {message}
          </div>
        )}

        {state === "found" && result && (
          <div className="mm__result">
            <p className="mm__hi">Hola, <strong>{result.name}</strong></p>

            <div className="mm__mesa">
              <span>Mesa</span>
              <strong>{result.mesa}</strong>
            </div>

            <div className="mm__local">
              <div className="mm__local-name">{result.localName}</div>
              {result.district && <div className="mm__local-dist">{result.district}</div>}
              {result.localAddress && <div className="mm__local-addr">{result.localAddress}</div>}
              <a className="mm__link" href={mapsLink(result)} target="_blank" rel="noopener noreferrer">
                <MapPin size={16} aria-hidden="true" />
                Cómo llegar
              </a>
            </div>

            <div className="mm__coord">
              <div className="mm__coord-label">Coordinador de local</div>
              <div className="mm__coord-name">{result.coordinatorName}</div>
              <div className="mm__coord-actions">
                <a className="mm__call" href={`tel:${result.coordinatorPhone.replace(/\s/g, "")}`}>
                  <Phone size={16} aria-hidden="true" />
                  Llamar
                </a>
                <a className="mm__wa" href={waLink(result.coordinatorPhone)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={16} aria-hidden="true" />
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
