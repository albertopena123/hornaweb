import type { Metadata } from "next";
import Link from "next/link";
import { getBroadcastConfig } from "@/lib/broadcast";
import DebateSection from "@/components/landing/sections/DebateSection";
import "./debate-page.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getBroadcastConfig();
  const title = `${config.title} · ${config.region} 2026`;
  const description = `Sigue en vivo la transmisión oficial del Debate Electoral Regional ${config.region} 2026 con las propuestas de Simón Horna para el desarrollo de nuestra región.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "video.other",
      url: "/debate",
      siteName: "Simón Horna · Ahora Nación Madre de Dios",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function DebatePage() {
  const config = await getBroadcastConfig();

  // Asegurar que en la página dedicada se muestre incluso si showOnHome está desmarcado
  const dedicatedConfig = {
    ...config,
    enabled: true,
  };

  return (
    <div className="debate-page-wrapper">
      {/* Barra de Navegación Simple y Elegante */}
      <header className="debate-nav">
        <div className="debate-nav__inner">
          <Link href="/" className="debate-nav__brand">
            <span className="debate-nav__badge">AHORA NACIÓN</span>
            <span className="debate-nav__name">Simón Horna · Madre de Dios</span>
          </Link>
          <div className="debate-nav__right">
            <Link href="/" className="debate-nav__back">
              ← Volver al Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Marco de Video Principal */}
      <main>
        <DebateSection broadcast={dedicatedConfig} />

        {/* Sección de Propuestas y Apoyo */}
        <section className="debate-info-section">
          <div className="debate-container">
            <div className="debate-info-grid">
              <div className="debate-info-card">
                <div className="debate-info-icon">🏛️</div>
                <h3>Compromiso y Transparencia</h3>
                <p>
                  El Jurado Nacional de Elecciones (JNE) organiza los debates
                  oficiales para que cada ciudadano emita un voto informado y
                  consciente este 2026.
                </p>
              </div>

              <div className="debate-info-card">
                <div className="debate-info-icon">🌳</div>
                <h3>Desarrollo para Madre de Dios</h3>
                <p>
                  Simón Horna presenta soluciones reales para la reactivación
                  económica, salud digna, carreteras, titulación y protección de
                  nuestra Amazonía.
                </p>
              </div>

              <div className="debate-info-card">
                <div className="debate-info-icon">🗳️</div>
                <h3>Aprende a Votar</h3>
                <p>
                  Marca la <strong>AN de Ahora Nación</strong> en la cédula de
                  sufragio. También puedes practicar en nuestro simulador oficial.
                </p>
                <Link href="/aprende-a-votar" className="debate-card-link">
                  Ver Simulador de Cédula →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Pie de página */}
      <footer className="debate-footer">
        <div className="debate-container">
          <p>
            © 2026 Ahora Nación Madre de Dios · Simón Horna Gobernador Regional.
            Transmisión pública y comunitaria.
          </p>
        </div>
      </footer>
    </div>
  );
}
