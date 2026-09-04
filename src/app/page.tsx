import type { Metadata } from "next";
import LandingPage from "@/components/landing/LandingPage";
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_TITLE,
  landingJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = {
  // `title.absolute` evita que la plantilla del layout duplique el nombre.
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd()) }}
      />
      {TEMPLATE_STYLES.map((href) => (
        // eslint-disable-next-line @next/next/no-css-tags
        <link key={href} rel="stylesheet" href={href} precedence="default" />
      ))}
      <LandingPage />
    </>
  );
}
