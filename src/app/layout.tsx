import type { Metadata } from "next";
import { THEME_INIT_SCRIPT } from "@/lib/ui/theme";
import {
  CANDIDATE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    // Las páginas internas (login, panel) heredan la firma del candidato.
    template: `%s | ${CANDIDATE.name}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: "Ahora Nación Madre de Dios",
  authors: [{ name: CANDIDATE.name, url: SITE_URL }],
  creator: CANDIDATE.name,
  publisher: "Ahora Nación",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_PE",
    url: SITE_URL,
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  category: "politics",
  icons: {
    icon: "/assets/images/logo/logo-an.webp",
    shortcut: "/assets/images/logo/logo-an.webp",
    apple: "/assets/images/logo/logo-an.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/webp" href="/assets/images/logo/logo-an.webp" />
        <link rel="shortcut icon" href="/assets/images/logo/logo-an.webp" />
        <link rel="apple-touch-icon" href="/assets/images/logo/logo-an.webp" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;600;700&family=Google+Sans+Text:wght@400;500;600&family=Roboto:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
