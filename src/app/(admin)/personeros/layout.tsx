import type { ReactNode } from "react";
import { getPersonerosData } from "./loader";
import { PersonerosTabs } from "./PersonerosTabs";
import { PersonerosHeaderActions } from "./PersonerosHeaderActions";
import { Icon, type IconName } from "@/components/admin/Icon";
import "../inicio/dashboard.css";
import "./personeros.css";

export const dynamic = "force-dynamic";

function KpiCard({
  icon,
  tone,
  value,
  label,
  sub,
}: {
  icon: IconName;
  tone: "blue" | "green" | "red" | "violet" | "amber";
  value: ReactNode;
  label: string;
  sub?: string;
}) {
  return (
    <div className="kpi">
      <span className={`kpi__icon kpi__icon--${tone}`}>
        <Icon name={icon} size={22} />
      </span>
      <div className="kpi__body">
        <div className="kpi__val">{value}</div>
        <div className="kpi__label">{label}</div>
        {sub && <div className="kpi__sub">{sub}</div>}
      </div>
    </div>
  );
}

export default async function PersonerosLayout({ children }: { children: ReactNode }) {
  const { stats, perms, publicRegistration } = await getPersonerosData();

  return (
    <div className="page personeros-page">
      {/* Encabezado estándar de la plantilla admin */}
      <header className="page__head" style={{ marginBottom: 16 }}>
        <div className="page__title">
          <h1>Módulo de Personeros</h1>
          <span className="page__sub">
            Gestión electoral integral · Cobertura de {stats.totalMesas} mesas y {stats.colegiosTotal} colegios en Madre de Dios
          </span>
        </div>
        <div className="page__actions">
          <PersonerosHeaderActions perms={perms} publicRegistration={publicRegistration} />
        </div>
      </header>

      {/* Grid de KPIs estándar de la plantilla admin */}
      <section className="kpi-grid" aria-label="Resumen electoral">
        <KpiCard
          icon="id-card"
          tone="blue"
          value={stats.totalMesas}
          label="Total Mesas MDD"
          sub={`${stats.colegiosTotal} Colegios en Región`}
        />
        <KpiCard
          icon="check"
          tone="green"
          value={
            <>
              {stats.mesasCubiertas}{" "}
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--st-resolved-fg, #10b981)" }}>
                ({stats.pctCubiertas}%)
              </span>
            </>
          }
          label="Mesas Cubiertas"
          sub="Personero Asignado"
        />
        <KpiCard
          icon="alert"
          tone="red"
          value={stats.mesasFaltantes}
          label="Mesas Faltantes"
          sub="Por cubrir en región"
        />
        <KpiCard
          icon="users"
          tone="violet"
          value={stats.totalPersoneros}
          label="Registrados"
          sub={`${stats.notificadosCount} con WhatsApp`}
        />
        <KpiCard
          icon="shield"
          tone="amber"
          value={`${stats.colegiosConCoord} / ${stats.colegiosTotal}`}
          label="Coordinadores de Colegio"
          sub={
            stats.colegiosTotal - stats.colegiosConCoord > 0
              ? `${stats.colegiosTotal - stats.colegiosConCoord} pendientes`
              : "100% colegios asignados"
          }
        />
      </section>

      {/* Pestañas de Navegación de Submódulos (Google Admin style) */}
      <PersonerosTabs
        stats={{
          mesas: stats.totalMesas,
          locales: stats.colegiosTotal,
          personeros: stats.totalPersoneros,
        }}
      />

      {/* Contenido del Submódulo Activo */}
      <main className="personeros-submodule-content">
        {children}
      </main>
    </div>
  );
}
