import type { Metadata } from "next";
import { THEME_INIT_SCRIPT } from "@/lib/ui/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simón Horna Alpaca | Candidato Gobierno Regional Madre de Dios — Ahora Nación",
  description:
    "Simón Horna Alpaca — Candidato al Gobierno Regional de Madre de Dios 2027-2030. Ahora Nación: Todo el poder a las regiones para conquistar los mercados del mundo.",
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
