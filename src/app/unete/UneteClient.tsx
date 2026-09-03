"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DISTRICTS, DistrictId } from "@/lib/districts";
import {
  CheckCircle2,
  Shield,
  Users,
  Sparkles,
  MapPin,
  ArrowRight,
  Share2,
  Camera,
  Search,
  Check,
  Phone,
  Vote,
  Heart,
  Loader2,
  AlertCircle,
  Clock,
} from "lucide-react";
import "./unete.css";

const DOC_TYPES = [
  { id: "dni", label: "DNI" },
  { id: "ce", label: "Carné de Extranjería" },
  { id: "passport", label: "Pasaporte" },
] as const;

type DocTypeId = (typeof DOC_TYPES)[number]["id"];
type FieldErrors = Record<string, string>;
type Tab = "simpatizante" | "personero";

type Coords = {
  latitude: number;
  longitude: number;
  gpsAccuracy: number | null;
};

export default function UneteClient() {
  const [tab, setTab] = useState<Tab>("simpatizante");
  const [personeroEnabled, setPersoneroEnabled] = useState(true);

  // Form fields
  const [docType, setDocType] = useState<DocTypeId>("dni");
  const [docNumber, setDocNumber] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState<DistrictId | "">("");

  // Personero specific fields
  const [localName, setLocalName] = useState("");
  const [mesa, setMesa] = useState("");
  const [coordinatorName, setCoordinatorName] = useState("");
  const [coordinatorPhone, setCoordinatorPhone] = useState("");

  // Statuses
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ name: string; tab: Tab }>({
    name: "",
    tab: "simpatizante",
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // DNI Lookup
  const [dniLookup, setDniLookup] = useState<
    "idle" | "loading" | "found" | "notfound" | "error"
  >("idle");
  const autoNameRef = useRef<string | null>(null);

  // GPS
  const [gpsState, setGpsState] = useState<"idle" | "requesting" | "ok" | "denied">("idle");
  const coordsRef = useRef<Coords | null>(null);

  // Check if personero is enabled
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/personeros/registro", { signal: ctrl.signal, cache: "no-store" })
      .then((res) => res.json().catch(() => null))
      .then((json) => {
        if (json?.ok) {
          setPersoneroEnabled(json.enabled !== false);
        }
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  function fireConfetti() {
    if (typeof window === "undefined") return;
    import("canvas-confetti")
      .then((module) => {
        const confetti = module.default || module;
        if (typeof confetti === "function") {
          // Ráfaga central
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#e90305", "#ffd400", "#ffffff", "#b0060c"],
          });
          // Cañón izquierdo
          setTimeout(() => {
            confetti({
              particleCount: 60,
              angle: 60,
              spread: 60,
              origin: { x: 0.1, y: 0.7 },
              colors: ["#e90305", "#ffd400", "#10b981", "#ffffff"],
            });
          }, 250);
          // Cañón derecho
          setTimeout(() => {
            confetti({
              particleCount: 60,
              angle: 120,
              spread: 60,
              origin: { x: 0.9, y: 0.7 },
              colors: ["#e90305", "#ffd400", "#10b981", "#ffffff"],
            });
          }, 500);
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (success) {
      fireConfetti();
    }
  }, [success]);

  // Request GPS in background on mount
  useEffect(() => {
    requestLocation(true);
  }, []);

  function requestLocation(silent = false) {
    if (!("geolocation" in navigator)) {
      if (!silent) setGpsState("denied");
      return;
    }
    if (!silent) setGpsState("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coordsRef.current = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          gpsAccuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        };
        setGpsState("ok");
      },
      () => {
        setGpsState("denied");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  // Auto DNI Lookup
  useEffect(() => {
    const doc = docNumber.trim();
    const eligible = docType === "dni" && /^\d{8}$/.test(doc);
    if (!eligible) {
      setDniLookup("idle");
      return;
    }

    const ctrl = new AbortController();
    setDniLookup("loading");

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/dni/${doc}`, { signal: ctrl.signal });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.ok && typeof json.name === "string" && json.name) {
          setName((prev) =>
            prev.trim() === "" || prev === autoNameRef.current ? json.name : prev
          );
          autoNameRef.current = json.name;
          setDniLookup("found");
        } else {
          setDniLookup(res.status === 404 ? "notfound" : "error");
        }
      } catch {
        if (!ctrl.signal.aborted) setDniLookup("error");
      }
    }, 350);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [docType, docNumber]);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    const doc = docNumber.trim();

    if (docType === "dni") {
      if (!/^\d{8}$/.test(doc)) errs.docNumber = "El DNI debe tener 8 dígitos numéricos.";
    } else if (!/^[A-Za-z0-9]{6,12}$/.test(doc)) {
      errs.docNumber = "Documento inválido (6 a 12 caracteres).";
    }

    if (name.trim().length < 2) errs.name = "Ingresa tu nombre completo.";
    if (!/^[0-9+\s-]{6,15}$/.test(phone.trim())) errs.phone = "Número de celular inválido.";
    if (!district) errs.district = "Selecciona tu distrito en Madre de Dios.";

    if (tab === "personero") {
      if (localName.trim().length < 2) {
        errs.localName = "Ingresa el nombre de tu colegio o local de votación.";
      }
      if (mesa.trim().length > 10) {
        errs.mesa = "Máximo 10 caracteres.";
      }
      if (
        coordinatorPhone.trim() !== "" &&
        !/^[0-9+\s-]{6,15}$/.test(coordinatorPhone.trim())
      ) {
        errs.coordinatorPhone = "Teléfono de coordinador inválido.";
      }
    }

    return errs;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const form = e.currentTarget;
    const honeypot = (form.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";

    setSending(true);

    try {
      if (tab === "simpatizante") {
        const res = await fetch("/api/apoyos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            docType,
            docNumber: docNumber.trim(),
            name: name.trim(),
            phone: phone.trim(),
            district,
            website: honeypot,
            ...(coordsRef.current ?? {}),
          }),
        });
        const json = await res.json().catch(() => null);
        if (json?.ok) {
          setSuccessData({ name: name.trim(), tab: "simpatizante" });
          setSuccess(true);
        } else {
          if (json?.fieldErrors) setFieldErrors(json.fieldErrors);
          setError(json?.error ?? "No se pudo registrar. Intenta de nuevo.");
        }
      } else {
        // Tab personero
        const res = await fetch("/api/personeros/registro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            docType,
            docNumber: docNumber.trim(),
            name: name.trim(),
            phone: phone.trim(),
            district,
            localName: localName.trim(),
            localAddress: "",
            mesa: mesa.trim(),
            coordinatorName: coordinatorName.trim(),
            coordinatorPhone: coordinatorPhone.trim(),
            website: honeypot,
          }),
        });
        const json = await res.json().catch(() => null);
        if (json?.ok) {
          setSuccessData({ name: name.trim(), tab: "personero" });
          setSuccess(true);
        } else {
          if (json?.fieldErrors) setFieldErrors(json.fieldErrors);
          setError(json?.error ?? "No se pudo registrar. Intenta de nuevo.");
        }
      }
    } catch {
      setError("Error de conexión con el servidor. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  }

  function handleReset() {
    setSuccess(false);
    setDocNumber("");
    setName("");
    setPhone("");
    setDistrict("");
    setLocalName("");
    setMesa("");
    setCoordinatorName("");
    setCoordinatorPhone("");
    setFieldErrors({});
    setError(null);
    setDniLookup("idle");
  }

  const shareWhatsAppMessage = encodeURIComponent(
    `¡Hola! Me acabo de sumar a la campaña de Simón Horna por Madre de Dios (Ahora Nación). ¡Súmate tú también aquí y pongámonos la camiseta!: ${
      typeof window !== "undefined" ? window.location.origin : "https://horna.pe"
    }/unete`
  );

  return (
    <div className="uc">
      {/* Top Header */}
      <header className="uc__top">
        <Link className="uc__logo" href="/">
          <img src="/assets/images/logo/logo-an.webp" alt="Ahora Nación" />
          <span>
            <strong>Simón Horna Alpaca</strong>
            <span>Ahora Nación · Madre de Dios</span>
          </span>
        </Link>

        <nav className="uc__nav" aria-label="Navegación principal">
          <Link href="/" className="uc__nav-link">
            Inicio
          </Link>
          <Link href="/#apoyo" className="uc__nav-link">
            Apoyo
          </Link>
          <Link href="/mi-mesa" className="uc__nav-link">
            Consultor de Mesa
          </Link>
          <Link href="/mi-foto" className="uc__nav-link">
            Foto con Marco
          </Link>
          <Link href="/unete" className="uc__nav-link is-active">
            Únete
          </Link>
        </nav>

        <div className="uc__top-actions">
          <Link className="uc__back-btn" href="/">
            ← Volver al inicio
          </Link>
        </div>
      </header>

      {/* Main Wrap */}
      <main className="uc__wrap">
        {/* Left Column: Story & Trust */}
        <section className="uc__info">
          <div className="uc__eyebrow">
            <i /> Campaña Regional 2027–2030
          </div>

          <h1 className="uc__title">
            Súmate al gran equipo del <em>cambio</em>
          </h1>

          <p className="uc__lead">
            Madre de Dios merece un gobierno regional honesto, transparente y cercano a su gente.
            Regístrate en segundos como <strong>simpatizante activo</strong> o inscríbete como{" "}
            <strong>personero de mesa</strong> para defender el voto de Simón Horna.
          </p>

          {/* Interactive Role Selector Cards */}
          <div className="uc__roles-grid" role="group" aria-label="Modalidades de participación">
            <div
              className={`uc__role-card ${tab === "simpatizante" ? "is-active" : ""}`}
              onClick={() => {
                setTab("simpatizante");
                setError(null);
              }}
              role="button"
              tabIndex={0}
            >
              <div className="uc__role-header">
                <div className="uc__role-icon">
                  <Heart size={18} />
                </div>
                <div className="uc__role-title">Simpatizante / Voluntario</div>
              </div>
              <p className="uc__role-desc">
                Recibe novedades oficiales, propuestas y forma parte activa de la red de apoyo en
                tu barrio o distrito.
              </p>
            </div>

            <div
              className={`uc__role-card ${tab === "personero" ? "is-active" : ""}`}
              onClick={() => {
                setTab("personero");
                setError(null);
              }}
              role="button"
              tabIndex={0}
            >
              <div className="uc__role-header">
                <div className="uc__role-icon">
                  <Shield size={18} />
                </div>
                <div className="uc__role-title">Personero de Mesa</div>
              </div>
              <p className="uc__role-desc">
                Cuida las actas y asegura la transparencia electoral el día de los comicios en tu
                colegio de votación.
              </p>
            </div>
          </div>

          {/* Perks list */}
          <div className="uc__perks">
            <div className="uc__perk-item">
              <span className="uc__perk-dot">✓</span>
              <span>
                <strong>Autocompletado instantáneo</strong> y registro rápido con tu número de documento.
              </span>
            </div>
            <div className="uc__perk-item">
              <span className="uc__perk-dot">✓</span>
              <span>
                <strong>Kit digital oficial</strong> y acceso a la comunidad directa de WhatsApp.
              </span>
            </div>
            <div className="uc__perk-item">
              <span className="uc__perk-dot">✓</span>
              <span>
                <strong>Capacitación acreditada</strong> para defensores del voto y coordinadores.
              </span>
            </div>
          </div>

          <div className="uc__quote">
            «El futuro de Madre de Dios se construye con la fuerza y convicción de personas como tú.
            ¡Vamos juntos por nuestra tierra!»
            <br />
            <strong>— Simón Horna Alpaca</strong>
          </div>
        </section>

        {/* Right Column: Interactive Form Card */}
        <section className="uc__card" aria-label="Formulario de inscripción">
          <div className="uc__card-head">
            <div className="uc__card-brand">
              <img src="/assets/images/logo/logo-an.webp" alt="" />
              <div>
                <strong>Inscripción Oficial</strong>
                <span>Ahora Nación · Simón Horna</span>
              </div>
            </div>
            <div className="uc__dni-status">
              {dniLookup === "loading" && (
                <span className="uc__dni-status loading">
                  <Loader2 size={13} className="animate-spin" /> Consultando DNI...
                </span>
              )}
              {dniLookup === "found" && (
                <span className="uc__dni-status found">
                  <Check size={14} /> DNI Verificado
                </span>
              )}
              {dniLookup === "notfound" && (
                <span className="uc__dni-status error">DNI no encontrado</span>
              )}
            </div>
          </div>

          {success ? (
            /* Pantalla de éxito y celebración */
            <div className="uc__success">
              <div className="uc__success-icon">
                <CheckCircle2 size={44} />
              </div>
              <h2 className="uc__success-title">
                ¡Bienvenido(a), {successData.name.split(" ")[0]}!
              </h2>
              <p className="uc__success-desc">
                {successData.tab === "personero"
                  ? "Tu registro como personero de mesa ha sido recibido con éxito. Un coordinador de Ahora Nación se comunicará contigo para coordinar tu acreditación y capacitación."
                  : "¡Tu registro como simpatizante ha sido completado! Gracias por sumarte al equipo del cambio por Madre de Dios."}
              </p>

              <div className="uc__actions-grid">
                <Link href="/mi-foto" className="uc__action-btn primary">
                  <span className="d-flex align-items-center gap-2">
                    <Camera size={18} /> Diseñar mi Foto con Marco Oficial
                  </span>
                  <ArrowRight size={16} />
                </Link>

                <a
                  href={`https://wa.me/?text=${shareWhatsAppMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="uc__action-btn whatsapp"
                >
                  <span className="d-flex align-items-center gap-2">
                    <Share2 size={18} /> Invitar a amigos por WhatsApp
                  </span>
                  <ArrowRight size={16} />
                </a>

                <Link href="/mi-mesa" className="uc__action-btn secondary">
                  <span className="d-flex align-items-center gap-2">
                    <Vote size={18} /> Consultor de Mesa de Votación
                  </span>
                  <ArrowRight size={16} />
                </Link>
                <button
                  type="button"
                  onClick={fireConfetti}
                  className="uc__action-btn"
                  style={{
                    background: "rgba(255, 212, 0, 0.15)",
                    borderColor: "rgba(255, 212, 0, 0.4)",
                    color: "#ffd400",
                    cursor: "pointer",
                  }}
                >
                  <span className="d-flex align-items-center gap-2">
                    <Sparkles size={18} /> ¡Lanzar más confeti de celebración! 🎉
                  </span>
                  <Sparkles size={16} />
                </button>
              </div>

              <button type="button" className="uc__reset-btn" onClick={handleReset}>
                Inscribir a otra persona o registrar otro familiar
              </button>
            </div>
          ) : (
            /* Formulario activo */
            <>
              {/* Tab Switcher */}
              <div className="uc__tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "simpatizante"}
                  className={`uc__tab ${tab === "simpatizante" ? "is-active" : ""}`}
                  onClick={() => {
                    setTab("simpatizante");
                    setError(null);
                  }}
                >
                  <Heart size={15} /> Simpatizante
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "personero"}
                  className={`uc__tab ${tab === "personero" ? "is-active" : ""}`}
                  onClick={() => {
                    setTab("personero");
                    setError(null);
                  }}
                >
                  <Shield size={15} /> Personero de Mesa
                </button>
              </div>

              {error && (
                <div className="uc__alert error d-flex align-items-center gap-2">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form className="uc__form" onSubmit={handleSubmit} noValidate>
                {/* Honeypot anti-bot */}
                <input
                  type="text"
                  name="website"
                  autoComplete="off"
                  tabIndex={-1}
                  style={{ display: "none" }}
                />

                {/* Doc Type & Number */}
                <div className="uc__row">
                  <div className={`uc__field ${fieldErrors.docType ? "has-error" : ""}`}>
                    <label htmlFor="uc-doctype">Documento</label>
                    <div className="uc__input-wrap">
                      <select
                        id="uc-doctype"
                        value={docType}
                        onChange={(e) => setDocType(e.target.value as DocTypeId)}
                      >
                        {DOC_TYPES.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={`uc__field ${fieldErrors.docNumber ? "has-error" : ""}`}>
                    <label htmlFor="uc-docnumber">
                      <span>N° de Documento</span>
                      {docType === "dni" && <span style={{ opacity: 0.6 }}>8 dígitos</span>}
                    </label>
                    <div className="uc__input-wrap">
                      <input
                        id="uc-docnumber"
                        type="text"
                        inputMode={docType === "dni" ? "numeric" : "text"}
                        maxLength={docType === "dni" ? 8 : 12}
                        placeholder={docType === "dni" ? "Ej. 72345678" : "N° de documento"}
                        value={docNumber}
                        onChange={(e) =>
                          setDocNumber(
                            docType === "dni"
                              ? e.target.value.replace(/\D/g, "")
                              : e.target.value
                          )
                        }
                      />
                    </div>
                    {fieldErrors.docNumber && (
                      <span className="uc__field-error">{fieldErrors.docNumber}</span>
                    )}
                  </div>
                </div>

                {/* Nombre Completo */}
                <div className={`uc__field ${fieldErrors.name ? "has-error" : ""}`}>
                  <label htmlFor="uc-name">Nombres y Apellidos</label>
                  <div className="uc__input-wrap">
                    <input
                      id="uc-name"
                      type="text"
                      placeholder="Tus nombres y apellidos completos"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  {fieldErrors.name && (
                    <span className="uc__field-error">{fieldErrors.name}</span>
                  )}
                </div>

                {/* Teléfono & Distrito */}
                <div className="uc__row">
                  <div className={`uc__field ${fieldErrors.phone ? "has-error" : ""}`}>
                    <label htmlFor="uc-phone">Celular / WhatsApp</label>
                    <div className="uc__input-wrap">
                      <input
                        id="uc-phone"
                        type="tel"
                        inputMode="tel"
                        maxLength={15}
                        placeholder="987654321"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    {fieldErrors.phone && (
                      <span className="uc__field-error">{fieldErrors.phone}</span>
                    )}
                  </div>

                  <div className={`uc__field ${fieldErrors.district ? "has-error" : ""}`}>
                    <label htmlFor="uc-district">Distrito</label>
                    <div className="uc__input-wrap">
                      <select
                        id="uc-district"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value as DistrictId)}
                      >
                        <option value="">Selecciona distrito...</option>
                        {DISTRICTS.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.label} ({d.province})
                          </option>
                        ))}
                      </select>
                    </div>
                    {fieldErrors.district && (
                      <span className="uc__field-error">{fieldErrors.district}</span>
                    )}
                  </div>
                </div>

                {/* Campos extra para Personero */}
                {tab === "personero" && (
                  <>
                    <div className={`uc__field ${fieldErrors.localName ? "has-error" : ""}`}>
                      <label htmlFor="uc-local">Colegio / Local de Votación</label>
                      <div className="uc__input-wrap">
                        <input
                          id="uc-local"
                          type="text"
                          placeholder="Ej. I.E. Faustino Maldonado"
                          value={localName}
                          onChange={(e) => setLocalName(e.target.value)}
                        />
                      </div>
                      {fieldErrors.localName && (
                        <span className="uc__field-error">{fieldErrors.localName}</span>
                      )}
                    </div>

                    <div className="uc__row">
                      <div className={`uc__field ${fieldErrors.mesa ? "has-error" : ""}`}>
                        <label htmlFor="uc-mesa">N° de Mesa (opcional)</label>
                        <div className="uc__input-wrap">
                          <input
                            id="uc-mesa"
                            type="text"
                            maxLength={10}
                            placeholder="Ej. 045123"
                            value={mesa}
                            onChange={(e) => setMesa(e.target.value)}
                          />
                        </div>
                        {fieldErrors.mesa && (
                          <span className="uc__field-error">{fieldErrors.mesa}</span>
                        )}
                      </div>

                      <div
                        className={`uc__field ${
                          fieldErrors.coordinatorPhone ? "has-error" : ""
                        }`}
                      >
                        <label htmlFor="uc-coord-phone">Cel. Coordinador (opcional)</label>
                        <div className="uc__input-wrap">
                          <input
                            id="uc-coord-phone"
                            type="tel"
                            maxLength={15}
                            placeholder="999..."
                            value={coordinatorPhone}
                            onChange={(e) => setCoordinatorPhone(e.target.value)}
                          />
                        </div>
                        {fieldErrors.coordinatorPhone && (
                          <span className="uc__field-error">
                            {fieldErrors.coordinatorPhone}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* GPS Status Indicator */}
                <div className="uc__gps-bar">
                  <div className="d-flex align-items-center gap-2">
                    <MapPin size={14} color={gpsState === "ok" ? "#10b981" : "#ffd400"} />
                    <span>
                      {gpsState === "ok"
                        ? "Ubicación aproximada vinculada"
                        : gpsState === "requesting"
                        ? "Detectando ubicación..."
                        : "Ubicación no activada (opcional)"}
                    </span>
                  </div>
                  {gpsState !== "ok" && (
                    <button
                      type="button"
                      className="uc__gps-btn"
                      onClick={() => requestLocation(false)}
                    >
                      Activar GPS
                    </button>
                  )}
                </div>

                {/* Submit Button */}
                <button type="submit" className="uc__submit" disabled={sending}>
                  {sending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Registrando...
                    </>
                  ) : tab === "personero" ? (
                    <>
                      <Shield size={18} /> Inscribirme como Personero
                    </>
                  ) : (
                    <>
                      <Users size={18} /> Sumarme al Equipo
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
