"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import "./candidatos.css";

export type TipoCargo = "todos" | "gobernador" | "provincial" | "distrital";

export interface CandidatoEquipo {
  slug: string;
  nombre: string;
  cargo: string;
  tipo: "gobernador" | "provincial" | "distrital";
  ambito: string;
  lema: string;
  propuestas: string[];
  destacado?: boolean;
}

const CANDIDATOS_LISTA: CandidatoEquipo[] = [
  {
    slug: "simon-horna",
    nombre: "Simón Pedro Horna Alpaca",
    cargo: "Gobernador Regional",
    tipo: "gobernador",
    ambito: "Madre de Dios",
    lema: "«Todo el poder a las regiones». Madre de Dios decide su propio futuro con autonomía, dignidad y desarrollo real.",
    propuestas: [
      "Formalización minera integral con acompañamiento técnico, zonificación y sostenibilidad ambiental.",
      "Conectividad vial interprovincial: carreteras transitables todo el año y asfaltado de corredores productivos.",
      "Fondo Regional de Apoyo al Productor Castañero, Agrícola y Piscícola de Madre de Dios.",
      "Salud y educación de calidad con especialistas y equipamiento en las tres provincias: Tambopata, Manu y Tahuamanu."
    ],
    destacado: true,
  },
  {
    slug: "juan-ticona",
    nombre: "Juan Ticona Quispe",
    cargo: "Alcalde Provincial",
    tipo: "provincial",
    ambito: "Tambopata",
    lema: "Modernización urbana, pistas y veredas de calidad, y seguridad ciudadana permanente en la capital regional.",
    propuestas: [
      "Plan maestro de pavimentación, drenaje pluvial y mejoramiento de vías principales en Puerto Maldonado.",
      "Seguridad ciudadana con patrullaje integrado, cámaras de videovigilancia de última generación y alarmas comunitarias.",
      "Reordenamiento, limpieza y modernización de mercados municipales y ferias agropecuarias.",
      "Saneamiento físico-legal de asentamientos humanos y titulación rápida de predios urbanos."
    ],
  },
  {
    slug: "yilmer-gonzales",
    nombre: "Yilmer Gonzales Khan",
    cargo: "Alcalde Provincial",
    tipo: "provincial",
    ambito: "Manu",
    lema: "Conectividad integral fluvial y terrestre, impulso al ecoturismo sostenible y valor a nuestras comunidades originarias.",
    propuestas: [
      "Conectividad fluvial y terrestre segura los 365 días del año en toda la cuenca del Manu.",
      "Fomento al ecoturismo vivencial y conservación de la biodiversidad generando empleo para los jóvenes locales.",
      "Acceso a energía solar limpia, agua tratada y telecomunicaciones en comunidades nativas.",
      "Apoyo y crédito directo para pequeños productores de plátano, cacao y frutales amazónicos."
    ],
  },
  {
    slug: "abimael-huaman",
    nombre: "Abimael Huamán Ccolque",
    cargo: "Alcalde Distrital",
    tipo: "distrital",
    ambito: "Huepetuhe",
    lema: "Minería con responsabilidad, agua potable garantizada y transparencia en cada sol invertido para el pueblo.",
    propuestas: [
      "Sistema integral de agua potable y saneamiento básico continuo para la población urbana y centros poblados.",
      "Asistencia técnica municipal y simplificación para la pequeña minería en procesos de remediación y formalización.",
      "Infraestructura deportiva de nivel y espacios culturales seguros para la niñez y juventud.",
      "Vías carrozables rehabilitadas permanentemente hacia zonas de producción y comunidades."
    ],
  },
  {
    slug: "isaac-cahuana",
    nombre: "Isaac Cahuana Ccama",
    cargo: "Alcalde Distrital",
    tipo: "distrital",
    ambito: "Laberinto",
    lema: "Impulso decidido al agro familiar, piscicultura y reactivación económica del corredor vial estratégico.",
    propuestas: [
      "Centro agropecuario y piscícola con asistencia técnica e insumos para productores locales.",
      "Mantenimiento continuo de caminos vecinales y accesos a puertos ribereños de Laberinto.",
      "Puesto de salud con atención continua las 24 horas, botiquín comunal y equipamiento de emergencia.",
      "Talleres productivos y capital semilla para emprendimientos de mujeres y jóvenes."
    ],
  },
  {
    slug: "jhonny-curinambe",
    nombre: "Jhonny Curinambe Leyva",
    cargo: "Alcalde Distrital",
    tipo: "distrital",
    ambito: "Las Piedras",
    lema: "Caminos seguros para los castañeros, posta médica equipada y progreso con justicia social para las familias.",
    propuestas: [
      "Apertura y mantenimiento de trochas carrozables hacia bosques castañeros y parcelas agrícolas.",
      "Modernización y equipamiento de los centros de salud distritales con ambulancia operativa.",
      "Fortalecimiento de la cadena de valor y comercialización directa de la castaña sin intermediarios abusivos.",
      "Proyectos de electrificación y alumbrado para sectores rurales y nuevos asentamientos."
    ],
  },
  {
    slug: "danny-taboada",
    nombre: "Danny Taboada Cáceres",
    cargo: "Alcalde Distrital",
    tipo: "distrital",
    ambito: "Iberia",
    lema: "Integración fronteriza estratégica, titulación de predios y educación técnica de calidad para el futuro de Tahuamanu.",
    propuestas: [
      "Zona de dinamización comercial y desarrollo de servicios en el corredor fronterizo Perú-Brasil.",
      "Saneamiento físico-legal y titulación masiva para familias y productores de Iberia.",
      "Convenios para institutos técnicos y carreras tecnológicas con salida laboral directa para los jóvenes.",
      "Mejoramiento integral del ornato público, áreas verdes y seguridad vecinal preventiva."
    ],
  },
];

const FILTROS: { id: TipoCargo; label: string; count: number }[] = [
  { id: "todos", label: "Todos los Candidatos", count: 7 },
  { id: "gobernador", label: "Gobernación Regional", count: 1 },
  { id: "provincial", label: "Alcaldías Provinciales", count: 2 },
  { id: "distrital", label: "Alcaldías Distritales", count: 4 },
];

function RetratoFoto({ c, eager = false }: { c: CandidatoEquipo; eager?: boolean }) {
  return (
    <img
      className="cd-foto"
      src={`/assets/images/candidatos/${c.slug}.webp`}
      srcSet={`/assets/images/candidatos/${c.slug}.webp 560w, /assets/images/candidatos/${c.slug}@1.5x.webp 840w`}
      sizes="(max-width: 575px) 85vw, (max-width: 991px) 45vw, 360px"
      width={560}
      height={747}
      alt={`${c.nombre}, ${c.cargo} de ${c.ambito} por Ahora Nación`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

export default function Candidatos() {
  const [filtroActivo, setFiltroActivo] = useState<TipoCargo>("todos");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(3);
  const [candidatoModal, setCandidatoModal] = useState<CandidatoEquipo | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Touch / Drag handling
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Filtrar candidatos
  const candidatosFiltrados = CANDIDATOS_LISTA.filter((c) => {
    if (filtroActivo === "todos") return true;
    return c.tipo === filtroActivo;
  });

  // Determinar número de tarjetas visibles según viewport
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 768) {
        setItemsPerView(1);
      } else if (w < 1140) {
        setItemsPerView(2);
      } else {
        setItemsPerView(3);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calcular índice máximo
  const maxIndex = Math.max(0, candidatosFiltrados.length - itemsPerView);

  // Asegurar que el índice esté dentro de los límites al cambiar de filtro
  useEffect(() => {
    setCurrentIndex(0);
  }, [filtroActivo]);

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  // Autoplay pausado con interacción
  useEffect(() => {
    if (isPaused || candidatoModal || maxIndex <= 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 5500);

    return () => clearInterval(timer);
  }, [isPaused, candidatoModal, maxIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  }, [maxIndex]);

  // Gestos táctiles
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsPaused(true);
    isDragging.current = true;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    touchStartX.current = clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging.current || touchStartX.current === null) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    touchDeltaX.current = clientX - touchStartX.current;
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || touchStartX.current === null) return;
    const delta = touchDeltaX.current;
    if (delta > 45) {
      handlePrev();
    } else if (delta < -45) {
      handleNext();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
    isDragging.current = false;
  };

  // Cierre de modal con teclado ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCandidatoModal(null);
      }
    };
    if (candidatoModal) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [candidatoModal]);

  // Porcentaje de deslizamiento del track
  const stepPercent = itemsPerView === 1 ? 100 : 100 / itemsPerView;
  const translateX = currentIndex * stepPercent;

  return (
    <section id="candidatos" className="cd-section position-relative z-1">
      {/* Luz ambiental sutil decorativa */}
      <div className="cd-ambient-glow" aria-hidden="true"></div>

      <div className="container">
        {/* Cabecera Editorial Premium */}
        <div className="row justify-content-center text-center">
          <div className="col-xl-8 col-lg-10">
            <div className="cd-badge-wrapper">
              <span className="cd-eyebrow">
                <span className="cd-sparkle">✦</span>
                ELECCIONES REGIONALES Y MUNICIPALES 2026
                <span className="cd-sparkle">✦</span>
              </span>
            </div>
            <h2 className="cd-title">
              Nuestros <span className="cd-title-highlight">Candidatos</span>
            </h2>
            <p className="cd-sub">
              Conoce al equipo de <strong>Ahora Nación</strong> en Madre de Dios: líderes con
              experiencia, vocación de servicio y el compromiso inquebrantable de defender nuestra
              tierra, su gente y sus recursos.
            </p>
            <div className="cd-flag-divider" aria-hidden="true">
              <span></span>
            </div>
          </div>
        </div>

        {/* Pestañas de Filtro */}
        <div className="cd-filters-container">
          <div className="cd-filters" role="tablist" aria-label="Filtro de candidatos por nivel">
            {FILTROS.map((f) => {
              const active = filtroActivo === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`cd-filter-pill ${active ? "active" : ""}`}
                  onClick={() => setFiltroActivo(f.id)}
                >
                  <span className="cd-filter-label">{f.label}</span>
                  <span className="cd-filter-badge">{f.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Carrusel Interactivo */}
        <div
          className="cd-carousel-wrapper"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Botones de navegación flotantes */}
          <button
            type="button"
            className="cd-nav-btn cd-nav-prev"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            aria-label="Candidato anterior"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <button
            type="button"
            className="cd-nav-btn cd-nav-next"
            onClick={handleNext}
            disabled={currentIndex >= maxIndex}
            aria-label="Siguiente candidato"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>

          {/* Área del Carrusel con touch & drag */}
          <div
            className="cd-carousel-viewport"
            ref={trackRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseMove={handleTouchMove}
            onMouseUp={handleTouchEnd}
          >
            <div
              className="cd-carousel-track"
              style={{
                transform: `translateX(-${translateX}%)`,
              }}
            >
              {candidatosFiltrados.map((c, idx) => {
                const isGovernor = c.destacado || c.tipo === "gobernador";
                return (
                  <div
                    key={c.slug}
                    className={`cd-slide ${isGovernor ? "cd-slide-governor" : ""}`}
                    style={{
                      width: `${stepPercent}%`,
                      flex: `0 0 ${stepPercent}%`,
                    }}
                  >
                    <div
                      className={`cd-card ${isGovernor ? "cd-card-gold" : ""}`}
                      onClick={() => setCandidatoModal(c)}
                    >
                      {/* Aura dorada para el Gobernador */}
                      {isGovernor && <div className="cd-gold-halo" aria-hidden="true"></div>}

                      <div className="cd-card-media">
                        <RetratoFoto c={c} eager={idx < 3} />

                        {/* Degradado inferior para máxima legibilidad */}
                        <div className="cd-media-scrim"></div>

                        {/* Insignia Superior */}
                        <div className="cd-card-top-badges">
                          {isGovernor ? (
                            <span className="cd-tag-governor">
                              <span className="cd-crown-icon">👑</span>
                              {c.cargo}
                            </span>
                          ) : (
                            <span className="cd-tag-normal">
                              {c.tipo === "provincial" ? "🏛️ " : "🌿 "}
                              {c.cargo}
                            </span>
                          )}

                          <span className="cd-tag-ambito">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: "4px" }}>
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                            </svg>
                            {c.ambito}
                          </span>
                        </div>

                        {/* Sello oficial Ahora Nación en la esquina */}
                        <div className="cd-an-badge" title="Ahora Nación">
                          <img src="/assets/images/logo/logo-an.webp" alt="AN" width={28} height={28} />
                        </div>
                      </div>

                      {/* Información de la Tarjeta */}
                      <div className="cd-card-body">
                        <div className="cd-card-title-group">
                          <h3 className="cd-card-name">{c.nombre}</h3>
                          <p className="cd-card-role-line">
                            {c.cargo} · <strong>{c.ambito}</strong>
                          </p>
                        </div>

                        <p className="cd-card-quote">{c.lema}</p>

                        <div className="cd-card-action">
                          <button
                            type="button"
                            className="cd-btn-ver-propuestas"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCandidatoModal(c);
                            }}
                          >
                            <span>Conocer Propuestas</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                              <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Indicadores de paginación (Dots) */}
          {maxIndex > 0 && (
            <div className="cd-carousel-dots" role="tablist" aria-label="Indicadores de diapositivas">
              {Array.from({ length: maxIndex + 1 }).map((_, idx) => {
                const active = currentIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={`Ir al grupo ${idx + 1}`}
                    className={`cd-dot ${active ? "active" : ""}`}
                    onClick={() => setCurrentIndex(idx)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL ULTRA-PREMIUM DE DETALLE Y PROPUESTAS */}
      {candidatoModal && (
        <div
          className="cd-modal-overlay"
          onClick={() => setCandidatoModal(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cd-modal-title"
        >
          <div className="cd-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Botón de cierre */}
            <button
              type="button"
              className="cd-modal-close"
              onClick={() => setCandidatoModal(null)}
              aria-label="Cerrar ficha"
            >
              ✕
            </button>

            <div className="cd-modal-content">
              {/* Columna Izquierda: Retrato oficial */}
              <div className="cd-modal-media">
                <RetratoFoto c={candidatoModal} eager />
                <div className="cd-modal-badge-party">
                  <img src="/assets/images/logo/logo-an.webp" alt="Ahora Nación" width={32} height={32} />
                  <span>Ahora Nación · 2026</span>
                </div>
              </div>

              {/* Columna Derecha: Datos, lema y propuestas */}
              <div className="cd-modal-info">
                <div className="cd-modal-header">
                  <div className="cd-modal-tags">
                    <span className="cd-modal-chip-cargo">{candidatoModal.cargo}</span>
                    <span className="cd-modal-chip-ambito">📍 {candidatoModal.ambito}</span>
                  </div>
                  <h3 id="cd-modal-title" className="cd-modal-nombre">
                    {candidatoModal.nombre}
                  </h3>
                  <div className="cd-modal-lema">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="cd-quote-icon">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                    <p>{candidatoModal.lema}</p>
                  </div>
                </div>

                <div className="cd-modal-proposals">
                  <h4 className="cd-proposals-heading">
                    <span>Ejes y Propuestas Principales</span>
                  </h4>
                  <ul className="cd-proposals-list">
                    {candidatoModal.propuestas.map((prop, pIdx) => (
                      <li key={pIdx} className="cd-proposal-item">
                        <span className="cd-proposal-icon">✓</span>
                        <span>{prop}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="cd-modal-footer">
                  <div className="cd-modal-official-note">
                    <span className="cd-check-shield">🛡️</span>
                    <span>Candidatura Oficial inscrita ante el JNE · Madre de Dios 2026</span>
                  </div>

                  <button
                    type="button"
                    className="cd-modal-btn-action"
                    onClick={() => {
                      setCandidatoModal(null);
                      const el = document.getElementById("apoyo");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <span>Sumarme al Apoyo</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
