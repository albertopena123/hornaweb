"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Vote, Map, Users, Camera } from "lucide-react";

type Props = {
  stats?: {
    mesas: number;
    locales: number;
    personeros: number;
  };
};

export function PersonerosTabs({ stats }: Props) {
  const pathname = usePathname();

  const tabs = [
    {
      href: "/personeros/mesas",
      label: "Padrón de Mesas",
      count: stats?.mesas ?? 511,
      icon: Vote,
    },
    {
      href: "/personeros/mapa",
      label: "Mapa de Cobertura",
      count: stats?.locales ?? 51,
      icon: Map,
    },
    {
      href: "/personeros/directorio",
      label: "Directorio",
      count: stats?.personeros ?? 61,
      icon: Users,
    },
    {
      href: "/actas",
      label: "Subir Acta",
      icon: Camera,
    },
  ];

  return (
    <nav className="page__tabs personeros__tabs" aria-label="Submódulos de Personeros">
      {tabs.map((t) => {
        const isActive =
          pathname.startsWith(t.href) ||
          (t.href === "/personeros/mesas" && pathname === "/personeros");
        const IconCmp = t.icon;

        return (
          <Link
            key={t.href}
            href={t.href}
            className={`tab ${isActive ? "is-active" : ""}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
            }}
          >
            <IconCmp size={16} />
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span
                className="tab-pill-badge"
                style={{
                  fontSize: 11,
                  padding: "2px 7px",
                  borderRadius: 9999,
                  fontWeight: 700,
                  background: isActive ? "var(--accent)" : "var(--bg-soft, rgba(0,0,0,0.06))",
                  color: isActive ? "#ffffff" : "var(--text-muted)",
                  transition: "all 0.15s ease",
                }}
              >
                {t.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
