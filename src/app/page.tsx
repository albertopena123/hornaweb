import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title:
    "Simón Horna Alpaca | Candidato Gobierno Regional Madre de Dios — Ahora Nación",
  description:
    "Simón Horna Alpaca — Candidato al Gobierno Regional de Madre de Dios 2027-2030. Ahora Nación: Todo el poder a las regiones para conquistar los mercados del mundo.",
  keywords:
    "Simón Horna Alpaca, Ahora Nación, Gobierno Regional, Madre de Dios, Perú, elecciones 2026, candidato regional, Puerto Maldonado",
  robots: "INDEX,FOLLOW",
  icons: { icon: "/assets/images/logo/logo-an.webp" },
};

// CSS de la plantilla Politicly, en el mismo orden que el index.html original.
const TEMPLATE_STYLES = [
  "/assets/css/bootstrap.min.css",
  "/assets/css/animate.css",
  "/assets/css/swiper-bundle.css",
  "/assets/css/aos.css",
  "/assets/css/magnific-popup.css",
  "/assets/css/main.css",
];

export default function Page() {
  return (
    <>
      {TEMPLATE_STYLES.map((href) => (
        // eslint-disable-next-line @next/next/no-css-tags
        <link key={href} rel="stylesheet" href={href} precedence="default" />
      ))}
      <LandingPage />
    </>
  );
}
