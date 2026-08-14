import {
  Mail,
  Phone,
  MapPin,
  Send,
  HeartPulse,
  TrendingUp,
  Leaf,
  Landmark,
  FileText,
} from "lucide-react";

// Lucide retiró los iconos de marcas; se usan los glifos oficiales
// (Simple Icons) como SVG inline con fill=currentColor.
const BrandIcon = ({ path, size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);

const BRAND_PATHS = {
  facebook:
    "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  x: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
  instagram:
    "M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z",
  youtube:
    "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
};

const SECTIONS = [
  { label: "Inicio", href: "#inicio" },
  { label: "Apoyo", href: "#apoyo" },
];

const DIMENSIONS = [
  { icon: HeartPulse, label: "Dimensión Social" },
  { icon: TrendingUp, label: "Dimensión Económica" },
  { icon: Leaf, label: "Dimensión Ambiental" },
  { icon: Landmark, label: "Dimensión Institucional" },
  { icon: FileText, label: "Plan Completo 2027–2030" },
];

const SOCIALS = [
  { path: BRAND_PATHS.facebook, label: "Facebook", href: "https://www.facebook.com/" },
  { path: BRAND_PATHS.x, label: "X (Twitter)", href: "https://www.twitter.com/" },
  { path: BRAND_PATHS.instagram, label: "Instagram", href: "https://www.instagram.com/" },
  { path: BRAND_PATHS.youtube, label: "YouTube", href: "https://www.youtube.com/" },
];

const Footer = () => {
  return (
    <footer className="footer-area anf position-relative z-1 mt-auto">
      <div className="anf-container">
        {/* Franja CTA */}
        <div className="anf-cta">
          <h2 className="anf-cta-title">
            Trabajemos juntos por <span>Madre de Dios</span>
          </h2>
          <a className="anf-cta-mail" href="mailto:simon.horna@ahoranacion.pe">
            <Mail size={16} strokeWidth={2} aria-hidden="true" />
            simon.horna@ahoranacion.pe
          </a>
        </div>

        {/* Columnas */}
        <div className="anf-grid">
          {/* Marca + boletín */}
          <div className="anf-col anf-col-brand">
            <div className="anf-brand">
              <img src="/assets/images/logo/logo-an.webp" alt="Ahora Nación" />
              <div>
                <span className="anf-brand-name">Ahora Nación</span>
                <span className="anf-brand-sub">Madre de Dios · Perú</span>
              </div>
            </div>
            <p className="anf-desc">
              Recibe las noticias y avances del plan de gobierno de Simón Horna
              Alpaca.
            </p>
            <form className="anf-form" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Tu correo electrónico"
                aria-label="Correo electrónico"
              />
              <button type="submit" aria-label="Suscribirse al boletín">
                <Send size={15} strokeWidth={2} aria-hidden="true" />
              </button>
            </form>
            <label className="anf-check">
              <input type="checkbox" />
              <span>Acepto la Política de Privacidad.</span>
            </label>
          </div>

          {/* Secciones */}
          <div className="anf-col">
            <h3 className="anf-heading">Secciones</h3>
            <ul className="anf-list">
              {SECTIONS.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Dimensiones del plan */}
          <div className="anf-col">
            <h3 className="anf-heading">Dimensiones del plan</h3>
            <ul className="anf-list">
              {DIMENSIONS.map(({ icon: Icon, label }) => (
                <li key={label}>
                  <a href="#plan">
                    <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div className="anf-col">
            <h3 className="anf-heading">Contacto</h3>
            <ul className="anf-list anf-list-contact">
              <li>
                <a href="mailto:simon.horna@ahoranacion.pe">
                  <Mail size={15} strokeWidth={1.75} aria-hidden="true" />
                  simon.horna@ahoranacion.pe
                </a>
              </li>
              <li>
                <a href="tel:+51999999999">
                  <Phone size={15} strokeWidth={1.75} aria-hidden="true" />
                  +51 999 999 999
                </a>
              </li>
              <li>
                <span>
                  <MapPin size={15} strokeWidth={1.75} aria-hidden="true" />
                  Puerto Maldonado, Madre de Dios
                </span>
              </li>
            </ul>
            <p className="anf-provinces">Tambopata · Manu · Tahuamanu</p>
            <div className="anf-social">
              {SOCIALS.map(({ path, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <BrandIcon path={path} size={15} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Barra inferior */}
      <div className="anf-bottom">
        <div className="anf-container anf-bottom-inner">
          <p>
            © 2026{" "}
            <a href="#inicio">Simón Horna Alpaca — Ahora Nación</a>. Todos los
            derechos reservados.
          </p>
          <nav aria-label="Enlaces legales">
            <a href="#">Política de Privacidad</a>
            <a href="#">Términos y Condiciones</a>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
