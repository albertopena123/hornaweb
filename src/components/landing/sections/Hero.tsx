"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Target,
  ClipboardList,
  MapPin,
  ArrowRight,
  Users,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Award,
  Compass,
  Sparkles,
} from "lucide-react";

/* ─── Type definitions ───────────────────────────────────── */
export interface HeroCandidate {
  id: string;
  slug: string;
  nombre: string;
  apellido: string;
  cargoBadge: string;
  cargoCompleto: string;
  ambito: string;
  ambitoSub: string;
  tipo: "gobernador" | "provincial" | "distrital";
  cita: string;
  frases: string[];
  descripcion: string;
  imageCutout: string;
  stats: {
    to: number;
    s: string;
    label: string;
    icon: React.ElementType;
    color: string;
    bg: string;
  }[];
  propuestas: string[];
}

/* ─── 7 Candidatos Oficiales Ahora Nación con Siluetas Recortadas en Ultra HD ─── */
const HERO_CANDIDATES: HeroCandidate[] = [
  {
    id: "simon-horna",
    slug: "simon-horna",
    nombre: "Simón",
    apellido: "Horna Alpaca",
    cargoBadge: "Candidato a Gobernador Regional 2027–2030",
    cargoCompleto: "Gobernador Regional de Madre de Dios",
    ambito: "Madre de Dios",
    ambitoSub: "Tambopata · Manu · Tahuamanu",
    tipo: "gobernador",
    cita: "Todo el poder a las regiones. Madre de Dios decide su propio futuro con autonomía.",
    frases: [
      "Todo el poder a las regiones.",
      "Madre de Dios decide su propio futuro con autonomía.",
      "Formalización minera integral con sostenibilidad ambiental.",
      "Conectividad vial interprovincial todo el año.",
      "Fondo de apoyo al castañero y agricultor amazónico.",
    ],
    descripcion:
      "Líder regional de Ahora Nación. Plan integral de formalización minera ambiental, conectividad vial interprovincial y fondo de apoyo al castañero y agricultor.",
    imageCutout: "/assets/images/thumbs/simon-horna.png",
    stats: [
      { to: 4, s: "", label: "Dimensiones\nEstratégicas", icon: Target, color: "#E90305", bg: "rgba(233,3,5,.12)" },
      { to: 17, s: "+", label: "Propuestas\nConcretas", icon: ClipboardList, color: "#4A9EFF", bg: "rgba(74,158,255,.12)" },
      { to: 3, s: "", label: "Provincias\nBeneficiadas", icon: MapPin, color: "#2ECC71", bg: "rgba(46,204,113,.12)" },
    ],
    propuestas: [
      "Formalización minera integral con acompañamiento técnico, zonificación y sostenibilidad ambiental.",
      "Conectividad vial interprovincial: carreteras transitables todo el año y asfaltado de corredores productivos.",
      "Fondo Regional de Apoyo al Productor Castañero, Agrícola y Piscícola de Madre de Dios.",
      "Salud y educación de calidad con especialistas y equipamiento en las tres provincias: Tambopata, Manu y Tahuamanu.",
    ],
  },
  {
    id: "juan-ticona",
    slug: "juan-ticona",
    nombre: "Juan",
    apellido: "Ticona Quispe",
    cargoBadge: "Candidato a Alcalde Provincial 2027–2030",
    cargoCompleto: "Alcalde Provincial de Tambopata",
    ambito: "Tambopata",
    ambitoSub: "Puerto Maldonado · Capital Regional",
    tipo: "provincial",
    cita: "Puerto Maldonado merece modernización vial, orden urbano y seguridad ciudadana 24/7.",
    frases: [
      "Puerto Maldonado merece modernización vial y orden.",
      "Seguridad ciudadana y patrullaje integrado 24/7.",
      "Plan maestro de pavimentación y drenaje pluvial.",
      "Mercados municipales modernos y titulación rápida.",
    ],
    descripcion:
      "Candidato a Alcalde Provincial de Tambopata por Ahora Nación. Plan maestro de pavimentación, drenaje pluvial, mercados modernos y patrullaje integrado.",
    imageCutout: "/assets/images/candidatos/juan-ticona-cutout.webp",
    stats: [
      { to: 12, s: "", label: "Regidores\nen Lista", icon: Users, color: "#E90305", bg: "rgba(233,3,5,.12)" },
      { to: 15, s: "+", label: "Proyectos\nViales Urbanos", icon: Target, color: "#4A9EFF", bg: "rgba(74,158,255,.12)" },
      { to: 100, s: "%", label: "Patrullaje\nIntegrado", icon: ShieldCheck, color: "#2ECC71", bg: "rgba(46,204,113,.12)" },
    ],
    propuestas: [
      "Plan maestro de pavimentación, drenaje pluvial y mejoramiento de vías principales en Puerto Maldonado.",
      "Seguridad ciudadana con patrullaje integrado, cámaras de videovigilancia de última generación y alarmas comunitarias.",
      "Reordenamiento, limpieza y modernización de mercados municipales y ferias agropecuarias.",
      "Saneamiento físico-legal de asentamientos humanos y titulación rápida de predios urbanos.",
    ],
  },
  {
    id: "yilmer-gonzales",
    slug: "yilmer-gonzales",
    nombre: "Yilmer",
    apellido: "Gonzales Khan",
    cargoBadge: "Candidato a Alcalde Provincial 2027–2030",
    cargoCompleto: "Alcalde Provincial del Manu",
    ambito: "Manu",
    ambitoSub: "Villa Salvación · Cuenca del Manu",
    tipo: "provincial",
    cita: "Conectividad integral fluvial y terrestre, ecoturismo y valor a nuestras comunidades originarias.",
    frases: [
      "Conectividad integral fluvial y terrestre en el Manu.",
      "Rutas seguras los 365 días del año.",
      "Ecoturismo vivencial y apoyo a comunidades originarias.",
      "Energía solar limpia y agua tratada en cada comunidad.",
    ],
    descripcion:
      "Candidato a Alcalde Provincial del Manu por Ahora Nación. Rutas seguras todo el año, fomento al ecoturismo vivencial y apoyo directo a comunidades amazónicas.",
    imageCutout: "/assets/images/candidatos/yilmer-gonzales-cutout.webp",
    stats: [
      { to: 4, s: "", label: "Distritos\nIntegrados", icon: MapPin, color: "#2ECC71", bg: "rgba(46,204,113,.12)" },
      { to: 100, s: "%", label: "Rutas Fluviales\nSeguras", icon: Compass, color: "#4A9EFF", bg: "rgba(74,158,255,.12)" },
      { to: 12, s: "+", label: "Comunidades\nNativas", icon: Users, color: "#E90305", bg: "rgba(233,3,5,.12)" },
    ],
    propuestas: [
      "Conectividad fluvial y terrestre segura los 365 días del año en toda la cuenca del Manu.",
      "Fomento al ecoturismo vivencial y conservación de la biodiversidad generando empleo para los jóvenes locales.",
      "Acceso a energía solar limpia, agua tratada y telecomunicaciones en comunidades nativas.",
      "Apoyo y crédito directo para pequeños productores de plátano, cacao y frutales amazónicos.",
    ],
  },
  {
    id: "abimael-huaman",
    slug: "abimael-huaman",
    nombre: "Abimael",
    apellido: "Huamán Ccolque",
    cargoBadge: "Candidato a Alcalde Distrital 2027–2030",
    cargoCompleto: "Alcalde Distrital de Huepetuhe",
    ambito: "Huepetuhe",
    ambitoSub: "Corredor Minero y Productivo",
    tipo: "distrital",
    cita: "Minería con responsabilidad, agua potable continua y transparencia en cada sol invertido.",
    frases: [
      "Minería con responsabilidad y sostenibilidad ambiental.",
      "Agua potable continua y saneamiento en Huepetuhe.",
      "Gestión 100% transparente en cada sol invertido.",
      "Vías carrozables rehabilitadas permanentemente.",
    ],
    descripcion:
      "Candidato a Alcalde Distrital de Huepetuhe por Ahora Nación. Sistema integral de agua potable, asistencia para remediación y caminos carrozables hacia zonas de trabajo.",
    imageCutout: "/assets/images/candidatos/abimael-huaman-cutout.webp",
    stats: [
      { to: 100, s: "%", label: "Agua Potable\ny Saneamiento", icon: Sparkles, color: "#4A9EFF", bg: "rgba(74,158,255,.12)" },
      { to: 8, s: "+", label: "Trochas Rurales\nHabilitadas", icon: Target, color: "#2ECC71", bg: "rgba(46,204,113,.12)" },
      { to: 1, s: "", label: "Gestión 100%\nTransparente", icon: Award, color: "#E90305", bg: "rgba(233,3,5,.12)" },
    ],
    propuestas: [
      "Sistema integral de agua potable y saneamiento básico continuo para la población urbana y centros poblados.",
      "Asistencia técnica municipal y simplificación para la pequeña minería en procesos de remediación y formalización.",
      "Infraestructura deportiva de nivel y espacios culturales seguros para la niñez y juventud.",
      "Vías carrozables rehabilitadas permanentemente hacia zonas de producción y comunidades.",
    ],
  },
  {
    id: "isaac-cahuana",
    slug: "isaac-cahuana",
    nombre: "Isaac",
    apellido: "Cahuana Ccama",
    cargoBadge: "Candidato a Alcalde Distrital 2027–2030",
    cargoCompleto: "Alcalde Distrital de Laberinto",
    ambito: "Laberinto",
    ambitoSub: "Puerto Rosario de Laberinto",
    tipo: "distrital",
    cita: "Impulso decidido al agro familiar, la piscicultura y la reactivación económica del corredor vial.",
    frases: [
      "Impulso decidido al agro familiar y la piscicultura.",
      "Centro agropecuario y reactivación económica del corredor vial.",
      "Puesto de salud con atención continua las 24 horas.",
      "Caminos vecinales transitables y apoyo al agricultor.",
    ],
    descripcion:
      "Candidato a Alcalde Distrital de Laberinto por Ahora Nación. Centro de acopio agropecuario, apoyo permanente al agricultor y atención de salud continua las 24 horas.",
    imageCutout: "/assets/images/candidatos/isaac-cahuana-cutout.webp",
    stats: [
      { to: 1, s: "", label: "Parque Agro y\nPiscícola", icon: Target, color: "#2ECC71", bg: "rgba(46,204,113,.12)" },
      { to: 24, s: "h", label: "Salud Continua\ny Botiquín", icon: Sparkles, color: "#E90305", bg: "rgba(233,3,5,.12)" },
      { to: 100, s: "%", label: "Apoyo al\nAgricultor", icon: Users, color: "#4A9EFF", bg: "rgba(74,158,255,.12)" },
    ],
    propuestas: [
      "Centro agropecuario y piscícola con asistencia técnica e insumos para productores locales.",
      "Mantenimiento continuo de caminos vecinales y accesos a puertos ribereños de Laberinto.",
      "Puesto de salud con atención continua las 24 horas, botiquín comunal y equipamiento de emergencia.",
      "Talleres productivos y capital semilla para emprendimientos de mujeres y jóvenes.",
    ],
  },
  {
    id: "jhonny-curinambe",
    slug: "jhonny-curinambe",
    nombre: "Jhonny",
    apellido: "Curinambe Leyva",
    cargoBadge: "Candidato a Alcalde Distrital 2027–2030",
    cargoCompleto: "Alcalde Distrital de Las Piedras",
    ambito: "Las Piedras",
    ambitoSub: "Corredor Castañero y Forestal",
    tipo: "distrital",
    cita: "Caminos seguros para los castañeros, posta médica equipada y progreso con justicia social.",
    frases: [
      "Caminos seguros y transitables para los castañeros.",
      "Comercialización directa de la castaña sin intermediarios.",
      "Modernización de salud distrital con ambulancia operativa.",
      "Electrificación rural y progreso con justicia social.",
    ],
    descripcion:
      "Candidato a Alcalde Distrital de Las Piedras por Ahora Nación. Mantenimiento vial permanente de rutas castañeras, electrificación rural y comercialización directa sin intermediarios.",
    imageCutout: "/assets/images/candidatos/jhonny-curinambe-cutout.webp",
    stats: [
      { to: 45, s: "+km", label: "Caminos\nCastañeros", icon: MapPin, color: "#E90305", bg: "rgba(233,3,5,.12)" },
      { to: 1, s: "", label: "Ambulancia Nueva\nOperativa", icon: Sparkles, color: "#4A9EFF", bg: "rgba(74,158,255,.12)" },
      { to: 100, s: "%", label: "Electrificación\nRural", icon: Target, color: "#2ECC71", bg: "rgba(46,204,113,.12)" },
    ],
    propuestas: [
      "Apertura y mantenimiento de trochas carrozables hacia bosques castañeros y parcelas agrícolas.",
      "Modernización y equipamiento de los centros de salud distritales con ambulancia operativa.",
      "Fortalecimiento de la cadena de valor y comercialización directa de la castaña sin intermediarios abusivos.",
      "Proyectos de electrificación y alumbrado para sectores rurales y nuevos asentamientos.",
    ],
  },
  {
    id: "danny-taboada",
    slug: "danny-taboada",
    nombre: "Danny",
    apellido: "Taboada Cáceres",
    cargoBadge: "Candidato a Alcalde Distrital 2027–2030",
    cargoCompleto: "Alcalde Distrital de Iberia",
    ambito: "Iberia",
    ambitoSub: "Frontera Tahuamanu · Perú-Brasil",
    tipo: "distrital",
    cita: "Integración fronteriza estratégica, titulación de predios y educación técnica para nuestros jóvenes.",
    frases: [
      "Integración fronteriza estratégica Perú-Brasil.",
      "Zona de dinamización comercial en Iberia.",
      "Saneamiento físico-legal y titulación masiva de predios.",
      "Educación técnica y carreras con empleo para jóvenes.",
    ],
    descripcion:
      "Candidato a Alcalde Distrital de Iberia por Ahora Nación. Zona de desarrollo fronterizo comercial, saneamiento físico-legal masivo y carreras técnicas con salida laboral inmediata.",
    imageCutout: "/assets/images/candidatos/danny-taboada-cutout.webp",
    stats: [
      { to: 1, s: "", label: "Polo Comercial\nFronterizo", icon: Compass, color: "#4A9EFF", bg: "rgba(74,158,255,.12)" },
      { to: 500, s: "+", label: "Títulos de\nPropiedad", icon: Award, color: "#E90305", bg: "rgba(233,3,5,.12)" },
      { to: 3, s: "", label: "Institutos Técnicos\nConvenio", icon: Target, color: "#2ECC71", bg: "rgba(46,204,113,.12)" },
    ],
    propuestas: [
      "Zona de dinamización comercial y desarrollo de servicios en el corredor fronterizo Perú-Brasil.",
      "Saneamiento físico-legal y titulación masiva para familias y productores de Iberia.",
      "Convenios para institutos técnicos y carreras tecnológicas con salida laboral directa para los jóvenes.",
      "Mejoramiento integral del ornato público, áreas verdes y seguridad vecinal preventiva.",
    ],
  },
];

/* ─── Typewriter Effect con Sensación Continua de Escritura ───────── */
function useTypewriterLoop(phrases: string[], speed = 45, deleteSpeed = 22, pause = 2200) {
  const [text, setText] = useState("");
  const [pi, setPi] = useState(0);
  const [ci, setCi] = useState(0);
  const [del, setDel] = useState(false);

  // Reiniciar cuando cambia la lista de frases (al cambiar de candidato)
  useEffect(() => {
    setText("");
    setPi(0);
    setCi(0);
    setDel(false);
  }, [phrases]);

  useEffect(() => {
    if (!phrases || phrases.length === 0) return;
    const phrase = phrases[pi % phrases.length];
    let t: ReturnType<typeof setTimeout>;

    if (!del && ci < phrase.length) {
      t = setTimeout(() => setCi((c) => c + 1), speed);
    } else if (!del && ci === phrase.length) {
      t = setTimeout(() => setDel(true), pause);
    } else if (del && ci > 0) {
      t = setTimeout(() => setCi((c) => c - 1), deleteSpeed);
    } else if (del && ci === 0) {
      setDel(false);
      setPi((i) => (i + 1) % phrases.length);
    }

    setText(phrase.slice(0, ci));
    return () => clearTimeout(t);
  }, [ci, del, pi, phrases, speed, deleteSpeed, pause]);

  return text;
}

/* ─── CountUp ───────────────────────────────────────────── */
function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0);
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let t0 = performance.now();
    let frameId: number;
    const duration = 1200;

    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setV(Math.round(p * to));
      if (p < 1) frameId = requestAnimationFrame(tick);
      else setV(to);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [to]);

  return (
    <span ref={el}>
      {v}
      {suffix}
    </span>
  );
}

/* ─── StatIcon with glow ring ──────────────────────────── */
function StatIcon({
  icon: Icon,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  color: string;
  bgColor: string;
}) {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: bgColor,
        border: `1px solid ${color}40`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
        position: "relative",
        boxShadow: `0 4px 14px ${color}25`,
      }}
      className="stat-icon-wrap"
    >
      <Icon size={18} color={color} strokeWidth={1.8} />
    </div>
  );
}

/* ─── Ticker Items ───────────────────────────────────────── */
const TICKER_ITEMS = [
  { label: "Formalización Minera Integral", Icon: Target },
  { label: "Conectividad Interprovincial", Icon: MapPin },
  { label: "Agua Potable Universal", Icon: Sparkles },
  { label: "Seguridad Ciudadana 24/7", Icon: ShieldCheck },
  { label: "Ecoturismo y Castaña", Icon: Compass },
  { label: "Todo el poder a las regiones", Icon: Award },
];

/* ─── Componente Principal Hero ─────────────────────────── */
export default function Hero() {
  const [candidateIndex, setCandidateIndex] = useState(0);
  // Bandera aleatoria entre Madre de Dios y Perú
  const [flagType, setFlagType] = useState<"mdd" | "peru">("mdd");
  const [isPaused, setIsPaused] = useState(false);
  const [candidatoModal, setCandidatoModal] = useState<HeroCandidate | null>(null);
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);
  const [headerH, setHeaderH] = useState(76);

  const current = HERO_CANDIDATES[candidateIndex];

  // Efecto máquina de escribir continua con frases rotativas de cada candidato
  const typedQuote = useTypewriterLoop(current.frases || [current.cita], 42, 20, 2200);

  // Soporte gestual para deslizar en móviles (swipe izquierda/derecha)
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
  };

  // Bandera aleatoria al cargar
  useEffect(() => {
    setFlagType(Math.random() > 0.4 ? "mdd" : "peru");
  }, []);

  // Parallax del mouse en desktop
  useEffect(() => {
    const hdr = document.querySelector<HTMLElement>("header");
    if (hdr) setHeaderH(hdr.offsetHeight);
    const mm = (e: MouseEvent) => {
      if (window.innerWidth >= 992) {
        setMx((e.clientX / window.innerWidth - 0.5) * 10);
        setMy((e.clientY / window.innerHeight - 0.5) * 6);
      }
    };
    window.addEventListener("mousemove", mm);
    return () => window.removeEventListener("mousemove", mm);
  }, []);

  // Autoplay del Carrusel Hero (cada 7.5 segundos) + bandera aleatoria
  useEffect(() => {
    if (isPaused || candidatoModal) return;
    const t = setInterval(() => {
      setCandidateIndex((prev) => {
        const next = (prev + 1) % HERO_CANDIDATES.length;
        if (Math.random() > 0.5) {
          setFlagType((f) => (f === "mdd" ? "peru" : "mdd"));
        }
        return next;
      });
    }, 7500);
    return () => clearInterval(t);
  }, [isPaused, candidatoModal]);

  const handlePrev = useCallback(() => {
    setCandidateIndex((prev) => (prev === 0 ? HERO_CANDIDATES.length - 1 : prev - 1));
    if (Math.random() > 0.5) setFlagType((f) => (f === "mdd" ? "peru" : "mdd"));
  }, []);

  const handleNext = useCallback(() => {
    setCandidateIndex((prev) => (prev + 1) % HERO_CANDIDATES.length);
    if (Math.random() > 0.5) setFlagType((f) => (f === "mdd" ? "peru" : "mdd"));
  }, []);

  // Tecla ESC para cerrar modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCandidatoModal(null);
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

  return (
    <>
      <style>{`
        /* ── Animaciones ── */
        @keyframes orb { 0%,100%{transform:translateY(0)scale(1)} 50%{transform:translateY(-18px)scale(1.03)} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(233,3,5,.6)} 50%{box-shadow:0 0 0 10px rgba(233,3,5,0)} }
        @keyframes flagWave {
          0% { transform: scale(1) translateY(0) rotate(0deg); }
          50% { transform: scale(1.025) translateY(-8px) rotate(-1deg); }
          100% { transform: scale(1) translateY(0) rotate(0deg); }
        }
        @keyframes candidateFade {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes textFade {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes tick { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes shine { 0%{left:-100%} 100%{left:220%} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

        /* Cursor parpadeante de máquina de escribir */
        .h-cur {
          display: inline-block;
          width: 3px;
          height: 1.05em;
          background: #FFD700;
          margin-left: 3px;
          vertical-align: -2px;
          animation: blink 0.8s step-end infinite;
          border-radius: 1px;
        }

        /* Grid de fondo */
        .h-grid {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background-image:
            linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px);
          background-size: 64px 64px;
        }
        .h-orb {
          position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none;
          animation: orb 8s ease-in-out infinite; z-index: 0;
        }

        /* Sección Hero */
        .h-section {
          background: linear-gradient(148deg, #05101d 0%, #0D1B2A 60%, #071219 100%);
          position: relative;
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - var(--header-h, 76px));
          overflow: hidden;
        }

        /* ── Bandera Dinámica Ondeante (Madre de Dios / Perú) ── */
        .h-flag-wrap {
          position: absolute;
          top: 0;
          right: 0;
          height: 100%;
          width: 65%;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
          mask-image: linear-gradient(to right, transparent 0%, black 35%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 35%);
        }
        .h-flag-img {
          position: absolute;
          top: 0;
          right: 0;
          width: 100%;
          height: 100%;
          transition: opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1), transform 0.75s ease;
          animation: flagWave 9s ease-in-out infinite;
        }
        .h-flag-mdd {
          object-fit: contain;
          object-position: right 40%;
          filter: drop-shadow(0 10px 30px rgba(0,0,0,0.5));
        }
        .h-flag-peru {
          object-fit: cover;
          object-position: top right;
        }

        /* En Móviles: La bandera se ubica elegantemente como atmósfera heroica detrás del candidato */
        @media (max-width: 991px) {
          .h-flag-wrap {
            top: 0;
            bottom: 0;
            right: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0.52;
            mask-image: linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.9) 35%, rgba(0,0,0,0.9) 80%, transparent 100%);
            -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.9) 35%, rgba(0,0,0,0.9) 80%, transparent 100%);
          }
          .h-flag-mdd {
            object-fit: cover;
            object-position: center 30%;
            width: 100%;
            height: 100%;
            filter: drop-shadow(0 8px 24px rgba(0,0,0,0.6));
          }
          .h-flag-peru {
            object-fit: cover;
            object-position: center 30%;
            width: 100%;
            height: 100%;
          }
        }

        /* ── Cuerpo del Hero ── */
        .h-body-grid {
          flex: 1;
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          max-width: 1420px;
          width: 100%;
          margin: 0 auto;
          padding: 25px 32px 15px;
          position: relative;
          z-index: 2;
          align-items: center;
        }
        @media (max-width: 991px) {
          .h-body-grid {
            grid-template-columns: 1fr;
            padding: 16px 16px 20px;
            text-align: center;
            gap: 16px;
          }
        }

        /* Columna Izquierda */
        .h-left-col {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding-right: 28px;
          z-index: 3;
        }
        @media (max-width: 991px) {
          .h-left-col {
            padding-right: 0;
            align-items: center;
          }
        }

        /* Barra de Control y Navegación del Carrusel */
        .h-carousel-nav-bar {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 9999px;
          padding: 4px 14px 4px 6px;
          backdrop-filter: blur(10px);
        }
        .h-cnav-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          border: none;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .h-cnav-btn:hover {
          background: #E90305;
          transform: scale(1.08);
        }
        .h-cnav-text {
          font-size: 11.5px;
          font-weight: 700;
          color: #FFD700;
          letter-spacing: 0.6px;
          text-transform: uppercase;
        }

        /* Live Badge */
        .h-live-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(233, 3, 5, 0.14);
          border: 1px solid rgba(233, 3, 5, 0.4);
          border-radius: 50px;
          padding: 6px 14px;
        }
        .h-live-dot {
          width: 8px;
          height: 8px;
          background: #E90305;
          border-radius: 50%;
          animation: pulse 1.6s infinite;
        }

        /* Nombre Gigante — Con el color oficial de Ahora Nación (#E90305) */
        .h-candidate-name {
          font-size: clamp(2.4rem, 5vw, 4.6rem);
          font-weight: 900;
          color: #ffffff;
          line-height: 1.05;
          letter-spacing: -1.5px;
          margin-bottom: 12px;
          animation: textFade 0.4s ease-out;
        }
        .h-name-red {
          color: #E90305; /* Rojo Oficial Ahora Nación */
          text-shadow: 0 4px 22px rgba(233, 3, 5, 0.4);
        }
        @media (max-width: 991px) {
          .h-candidate-name {
            font-size: clamp(1.85rem, 6.8vw, 2.5rem);
            letter-spacing: -0.8px;
            margin-bottom: 8px;
          }
        }

        /* Cita con Efecto Máquina de Escribir */
        .h-quote-box {
          font-size: clamp(1rem, 1.6vw, 1.25rem);
          font-weight: 600;
          color: #FFD700;
          margin-bottom: 14px;
          line-height: 1.45;
          font-style: italic;
          border-left: 3px solid #E90305;
          padding-left: 14px;
          min-height: 2.8em;
          display: flex;
          align-items: center;
        }
        @media (max-width: 991px) {
          .h-quote-box {
            border-left: none;
            border-top: 2px solid #E90305;
            padding-left: 0;
            padding-top: 8px;
            justify-content: center;
            font-size: 0.95rem;
            min-height: 2.4em;
          }
        }

        /* Descripción de Contexto */
        .h-context-p {
          font-size: clamp(0.92rem, 1.3vw, 1.05rem);
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.82);
          max-width: 580px;
          margin-bottom: 18px;
          animation: textFade 0.5s ease-out;
        }
        @media (max-width: 991px) {
          .h-context-p {
            font-size: 0.88rem;
            line-height: 1.5;
            margin-bottom: 14px;
          }
        }

        /* Tarjetas de Métricas */
        .h-stats-row {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        @media (max-width: 991px) {
          .h-stats-row {
            justify-content: center;
            gap: 8px;
            margin-bottom: 16px;
          }
        }
        .h-stat-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 10px 14px;
          text-align: center;
          min-width: 95px;
          flex: 1 1 95px;
          backdrop-filter: blur(8px);
        }
        @media (max-width: 575px) {
          .h-stat-card {
            min-width: 80px;
            padding: 8px 6px;
            flex: 1 1 calc(33.33% - 6px);
          }
          .h-stat-card .stat-icon-wrap {
            width: 32px !important;
            height: 32px !important;
            margin-bottom: 4px;
          }
        }

        /* Botones CTA */
        .h-cta-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }
        @media (max-width: 991px) {
          .h-cta-row {
            justify-content: center;
            margin-bottom: 8px;
          }
        }
        .h-btn-primary {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #E90305, #B50204);
          color: #fff;
          border: none;
          border-radius: 14px;
          padding: 14px 26px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 8px 24px rgba(233, 3, 5, 0.45);
          transition: all 0.25s ease;
        }
        .h-btn-primary::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 55%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          animation: shine 2.6s infinite;
        }
        .h-btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 32px rgba(233,3,5,0.6);
          color: #fff;
        }
        .h-btn-secondary {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          border: 1.5px solid rgba(255, 255, 255, 0.25);
          border-radius: 14px;
          padding: 14px 22px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          backdrop-filter: blur(10px);
          transition: all 0.25s ease;
        }
        .h-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.16);
          border-color: rgba(255,255,255,0.5);
          transform: translateY(-3px);
          color: #fff;
        }
        @media (max-width: 575px) {
          .h-btn-primary, .h-btn-secondary {
            padding: 12px 18px;
            font-size: 14px;
            flex: 1 1 140px;
            justify-content: center;
          }
        }

        /* ── Columna Derecha: Silueta Recortada en HD Sin Fondo ── */
        .h-right-col {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          position: relative;
          height: 100%;
          min-height: 480px;
        }
        @media (max-width: 991px) {
          .h-right-col {
            min-height: 420px;
            margin-top: 10px;
            flex-direction: column;
            align-items: center;
          }
        }

        /* Silueta recortada en Ultra HD para TODOS los candidatos */
        .h-candidate-cutout {
          display: block;
          position: relative;
          z-index: 2;
          max-height: calc(100vh - var(--header-h, 76px) - 110px);
          width: auto;
          max-width: 100%;
          object-fit: contain;
          object-position: bottom center;
          filter: drop-shadow(0 12px 35px rgba(0,0,0,0.75));
          animation: candidateFade 0.45s cubic-bezier(0.16, 1, 0.3, 1);
          image-rendering: -webkit-optimize-contrast;
        }
        @media (max-width: 991px) {
          .h-candidate-cutout {
            max-height: 380px;
            margin: 0 auto;
            /* Suave degradado inferior para fundir el corte con el fondo */
            mask-image: linear-gradient(to top, transparent 0%, black 14%);
            -webkit-mask-image: linear-gradient(to top, transparent 0%, black 14%);
          }
        }

        /* Insignia de Partido Flotante */
        .h-floating-party {
          position: absolute;
          top: 15%;
          right: 5%;
          z-index: 10;
          background: rgba(255, 255, 255, 0.97);
          border-radius: 18px;
          padding: 10px 16px;
          box-shadow: 0 10px 32px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        @media (max-width: 991px) {
          .h-floating-party {
            top: 10px;
            right: 12px;
            padding: 6px 12px;
            border-radius: 14px;
          }
          .h-floating-party img {
            width: 26px !important;
            height: 26px !important;
          }
        }

        /* Píldora de Ámbito Territorial */
        .h-floating-region {
          position: absolute;
          bottom: 15px;
          left: 5%;
          z-index: 10;
          background: rgba(5, 16, 29, 0.95);
          border: 1.5px solid #E90305;
          border-radius: 18px;
          padding: 10px 18px;
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 28px rgba(0,0,0,0.5);
        }
        @media (max-width: 991px) {
          .h-floating-region {
            position: absolute;
            bottom: 10px;
            left: 10px;
            margin: 0;
            padding: 6px 14px;
            border-radius: 14px;
            z-index: 10;
          }
        }

        /* ── Riel Inferior de Candidatos (Selector de Pestañas) ── */
        .h-thumb-rail {
          background: rgba(4, 11, 20, 0.94);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding: 10px 16px;
          z-index: 10;
          overflow-x: auto;
          scrollbar-width: thin;
          scrollbar-color: #E90305 transparent;
        }
        .h-thumb-rail-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          max-width: 1400px;
          margin: 0 auto;
          flex-wrap: nowrap;
        }
        @media (max-width: 991px) {
          .h-thumb-rail-inner {
            justify-content: flex-start;
          }
        }
        .h-thumb-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.06);
          border: 1.5px solid rgba(255, 255, 255, 0.14);
          border-radius: 9999px;
          padding: 4px 12px 4px 5px;
          cursor: pointer;
          transition: all 0.25s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .h-thumb-chip:hover {
          background: rgba(255, 255, 255, 0.14);
          border-color: rgba(233, 3, 5, 0.6);
          transform: translateY(-2px);
        }
        .h-thumb-chip.active {
          background: linear-gradient(135deg, rgba(233, 3, 5, 0.85), rgba(160, 2, 4, 0.95));
          border-color: #E90305;
          box-shadow: 0 4px 18px rgba(233, 3, 5, 0.45);
        }
        .h-thumb-img {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid #E90305;
          background: #222;
        }
        .h-thumb-name {
          font-size: 11.5px;
          font-weight: 800;
          color: #ffffff;
        }
        .h-thumb-role {
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.68);
          font-weight: 500;
        }
        .h-thumb-chip.active .h-thumb-role {
          color: #ffffff;
        }

        /* ── Ticker Inferior ── */
        .h-ticker {
          background: linear-gradient(90deg, #8c0102, #E90305, #8c0102);
          padding: 8px 0;
          overflow: hidden;
          flex-shrink: 0;
          z-index: 10;
        }
        .h-t-wrap {
          display: flex;
          animation: tick 32s linear infinite;
          white-space: nowrap;
        }
        .h-t-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 28px;
          color: #fff;
          font-size: 10.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.2px;
        }

        /* ── Modal de Propuestas ── */
        .h-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          background: rgba(10, 18, 12, 0.82);
          backdrop-filter: blur(14px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .h-modal-box {
          background: #ffffff;
          border-radius: 28px;
          max-width: 840px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 35px 80px rgba(0,0,0,0.4);
          border: 1px solid #e7e0ce;
        }
        .h-modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #f1ebd9;
          color: #333;
          border: none;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .h-modal-close:hover {
          background: #E90305;
          color: #fff;
        }
        .h-modal-grid {
          display: grid;
          grid-template-columns: 300px 1fr;
        }
        @media (max-width: 768px) {
          .h-modal-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section
        id="inicio"
        className="h-section"
        style={{ "--header-h": `${headerH}px` } as React.CSSProperties}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="h-grid" />
        <div
          className="h-orb"
          style={{ width: 500, height: 500, top: "-15%", left: "-10%", background: "rgba(233,3,5,.18)" }}
        />
        <div
          className="h-orb"
          style={{ width: 300, height: 300, bottom: "8%", right: "0", background: "rgba(30,91,46,.15)", animationDelay: "-4s" }}
        />
        <div
          className="h-orb"
          style={{ width: 220, height: 220, top: "20%", right: "22%", background: "rgba(233,3,5,.14)", animationDelay: "-2s" }}
        />

        {/* ── Bandera Ondeante Dinámica y Aleatoria (Madre de Dios / Perú) ── */}
        <div className="h-flag-wrap">
          {/* Bandera de Madre de Dios (Verde & Oro) */}
          <img
            src="/assets/images/shapes/bandera-madre-de-dios.png"
            alt="Bandera de Madre de Dios"
            className="h-flag-img h-flag-mdd"
            style={{
              opacity: flagType === "mdd" ? 0.88 : 0,
              pointerEvents: "none",
            }}
          />
          {/* Bandera del Perú */}
          <img
            src="/assets/images/shapes/bandera-peru.png"
            alt="Bandera del Perú"
            className="h-flag-img h-flag-peru"
            style={{
              opacity: flagType === "peru" ? 0.55 : 0,
              pointerEvents: "none",
            }}
          />
        </div>

        {/* ── CUERPO DEL HERO (INFORMACIÓN DEL CANDIDATO ACTIVO) ── */}
        <div className="h-body-grid">
          {/* COLUMNA IZQUIERDA: Textos, Cita Escribiéndose y Métricas Dinámicas */}
          <div className="h-left-col">
            <div style={{ width: "100%" }}>
              {/* Barra de Control y Navegación del Carrusel */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <div className="h-carousel-nav-bar">
                  <button
                    type="button"
                    className="h-cnav-btn"
                    onClick={handlePrev}
                    aria-label="Candidato anterior"
                    title="Candidato anterior"
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span className="h-cnav-text">
                    Candidato {candidateIndex + 1} de {HERO_CANDIDATES.length}
                  </span>
                  <button
                    type="button"
                    className="h-cnav-btn"
                    onClick={handleNext}
                    aria-label="Siguiente candidato"
                    title="Siguiente candidato"
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>

                <div className="h-live-badge">
                  <span className="h-live-dot" />
                  <img
                    src="/assets/images/logo/logo-an.webp"
                    alt="AN"
                    style={{ width: 16, height: 16, objectFit: "contain", borderRadius: 4 }}
                  />
                  <span style={{ color: "#fff", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    {current.cargoBadge}
                  </span>
                </div>
              </div>

              {/* Nombre Gigante — Con el color oficial de Ahora Nación (#E90305) */}
              <h1 key={`name-${current.id}`} className="h-candidate-name">
                {current.nombre}{" "}
                <span className="h-name-red">
                  {current.apellido}
                </span>
              </h1>

              {/* Cita con Efecto Máquina de Escribir y Cursor Parpadeante */}
              <div key={`quote-${current.id}`} className="h-quote-box">
                <span>"{typedQuote}</span>
                <span className="h-cur" />"
              </div>

              {/* Descripción de Contexto */}
              <p key={`desc-${current.id}`} className="h-context-p">
                {current.descripcion}
              </p>

              {/* Tarjetas de Métricas Dinámicas */}
              <div key={`stats-${current.id}`} className="h-stats-row">
                {current.stats.map((s, idx) => (
                  <div key={idx} className="h-stat-card">
                    <StatIcon icon={s.icon} color={s.color} bgColor={s.bg} />
                    <div style={{ fontSize: "clamp(1.3rem, 2vw, 1.9rem)", fontWeight: 900, color: "#fff", lineHeight: 1 }}>
                      <CountUp to={s.to} suffix={s.s} />
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,.68)",
                        textTransform: "uppercase",
                        letterSpacing: ".5px",
                        marginTop: 4,
                        whiteSpace: "pre-line",
                        lineHeight: 1.25,
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Botones de Acción */}
              <div className="h-cta-row">
                <button
                  type="button"
                  className="h-btn-primary"
                  onClick={() => setCandidatoModal(current)}
                >
                  <span>Conocer Propuestas</span>
                  <ArrowRight size={16} strokeWidth={2.2} />
                </button>

                <a href="#apoyo" className="h-btn-secondary">
                  <Users size={16} strokeWidth={2} />
                  <span>Sumarme al Apoyo</span>
                </a>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: Silueta Recortada en Ultra HD Sin Fondo */}
          <div className="h-right-col" style={{ transform: `translate(${mx}px, ${my}px)` }}>
            {/* Resplandor ambiental bajo el candidato */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: "65%",
                height: 110,
                background: "radial-gradient(ellipse, rgba(233,3,5,.55) 0%, transparent 70%)",
                filter: "blur(24px)",
                zIndex: 0,
              }}
            />

            {/* Silueta sin fondo del candidato activo en Ultra HD */}
            <img
              key={current.id}
              src={current.imageCutout}
              alt={`${current.nombre} ${current.apellido} — ${current.cargoCompleto}`}
              className="h-candidate-cutout"
              loading="eager"
              decoding="async"
            />

            {/* Sello de Partido Flotante */}
            <div className="h-floating-party">
              <img
                src="/assets/images/logo/logo-an.webp"
                alt="Ahora Nación"
                style={{ width: 34, height: 34, objectFit: "contain" }}
              />
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#E90305", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Ahora Nación
                </div>
                <div style={{ fontSize: 9.5, color: "#666", fontWeight: 600 }}>2027–2030</div>
              </div>
            </div>

            {/* Píldora de Ámbito Territorial */}
            <div className="h-floating-region">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={17} color="#E90305" strokeWidth={2.2} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 12.5 }}>{current.ambito}</div>
                  <div style={{ color: "rgba(255,255,255,.68)", fontSize: 10 }}>{current.ambitoSub}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIEL INFERIOR DE CANDIDATOS (SELECTOR DINÁMICO TIPO CAROUSEL TABS) ── */}
        <div className="h-thumb-rail">
          <div className="h-thumb-rail-inner">
            {HERO_CANDIDATES.map((c, idx) => {
              const active = candidateIndex === idx;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`h-thumb-chip ${active ? "active" : ""}`}
                  onClick={() => {
                    setCandidateIndex(idx);
                    if (Math.random() > 0.5) setFlagType((f) => (f === "mdd" ? "peru" : "mdd"));
                  }}
                >
                  <img
                    src={`/assets/images/candidatos/${c.slug}.webp`}
                    alt={c.nombre}
                    className="h-thumb-img"
                  />
                  <div style={{ textAlign: "left", lineHeight: 1.15 }}>
                    <div className="h-thumb-name">
                      {c.nombre} {c.apellido.split(" ")[0]}
                    </div>
                    <div className="h-thumb-role">
                      {c.tipo === "gobernador" ? "👑 Gobernador" : c.ambito}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── TICKER DE COMPROMISOS ── */}
        <div className="h-ticker">
          <div className="h-t-wrap">
            {[0, 1].map((r) => (
              <span key={r}>
                {TICKER_ITEMS.map(({ label, Icon }, i) => (
                  <span key={i} className="h-t-item">
                    <Icon size={12} strokeWidth={2} />
                    {label}
                    <span style={{ opacity: 0.5, margin: "0 10px" }}>›</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODAL DE PROPUESTAS DEL CANDIDATO SELECCIONADO ── */}
      {candidatoModal && (
        <div className="h-modal-overlay" onClick={() => setCandidatoModal(null)}>
          <div className="h-modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="h-modal-close"
              onClick={() => setCandidatoModal(null)}
              aria-label="Cerrar"
            >
              ✕
            </button>

            <div className="h-modal-grid">
              <div style={{ background: "#ece5d6", position: "relative" }}>
                <img
                  src={`/assets/images/candidatos/${candidatoModal.slug}.webp`}
                  alt={candidatoModal.nombre}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%", minHeight: 360 }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 16,
                    left: 16,
                    right: 16,
                    background: "rgba(255,255,255,.95)",
                    padding: "8px 14px",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#111",
                    boxShadow: "0 6px 20px rgba(0,0,0,.15)",
                  }}
                >
                  <img src="/assets/images/logo/logo-an.webp" alt="AN" width={28} height={28} />
                  <span>Ahora Nación · 2026</span>
                </div>
              </div>

              <div style={{ padding: "32px 32px 28px", display: "flex", flexDirection: "column" }}>
                <div style={{ marginBottom: 18 }}>
                  <span
                    style={{
                      background: "rgba(233,3,5,.12)",
                      color: "#E90305",
                      padding: "4px 12px",
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                      marginRight: 8,
                    }}
                  >
                    {candidatoModal.cargoCompleto}
                  </span>
                  <span style={{ background: "#f1ebd9", color: "#333", padding: "4px 12px", borderRadius: 9999, fontSize: 11.5, fontWeight: 700 }}>
                    📍 {candidatoModal.ambito}
                  </span>
                </div>

                <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "#111", margin: "0 0 10px", lineHeight: 1.15 }}>
                  {candidatoModal.nombre}{" "}
                  <span style={{ color: "#E90305" }}>{candidatoModal.apellido}</span>
                </h2>

                <div style={{ background: "#faf6eb", borderLeft: "4px solid #E90305", padding: "12px 16px", borderRadius: "0 10px 10px 0", marginBottom: 20 }}>
                  <p style={{ color: "#444", fontSize: 13.5, fontStyle: "italic", margin: 0, lineHeight: 1.5 }}>
                    "{candidatoModal.cita}"
                  </p>
                </div>

                <h3 style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "#E90305", borderBottom: "2px solid #eee", paddingBottom: 6, marginBottom: 12 }}>
                  Propuestas y Ejes Principales
                </h3>

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {candidatoModal.propuestas.map((p, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5, color: "#222", lineHeight: 1.45 }}>
                      <span style={{ background: "#E90305", color: "#fff", width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0, marginTop: 2 }}>
                        ✓
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>

                <div style={{ marginTop: "auto", borderTop: "1px solid #eee", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <span style={{ fontSize: 11.5, color: "#777", fontWeight: 600 }}>
                    🛡️ Candidatura Oficial inscrita ante el JNE · Madre de Dios 2026
                  </span>
                  <a
                    href="#apoyo"
                    onClick={() => setCandidatoModal(null)}
                    style={{
                      background: "#E90305",
                      color: "#fff",
                      textDecoration: "none",
                      padding: "10px 20px",
                      borderRadius: 10,
                      fontWeight: 700,
                      fontSize: 13,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    Sumarme al Apoyo ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
