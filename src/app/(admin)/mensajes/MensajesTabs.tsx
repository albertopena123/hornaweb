"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/mensajes/campanas", label: "Campañas" },
  { href: "/mensajes/contactos", label: "Contactos" },
  { href: "/mensajes/conexion", label: "Conexión" },
] as const;

export function MensajesTabs() {
  const pathname = usePathname();
  return (
    <nav className="page__tabs mensajes__tabs" aria-label="Secciones de mensajería">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={`tab ${pathname.startsWith(t.href) ? "is-active" : ""}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
