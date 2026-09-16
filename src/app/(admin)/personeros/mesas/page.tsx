import { Suspense } from "react";
import { getPersonerosData } from "../loader";
import { MesasView } from "../MesasView";

export const metadata = { title: "Padrón de Mesas · Módulo de Personeros" };
export const dynamic = "force-dynamic";

export default async function MesasPage(props: {
  searchParams?: Promise<{ local?: string; q?: string }>;
}) {
  const resolvedParams = props.searchParams ? await props.searchParams : undefined;
  const initialLocal = resolvedParams?.local || resolvedParams?.q || undefined;
  const data = await getPersonerosData();

  return (
    <Suspense fallback={<div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>Cargando padrón de mesas...</div>}>
      <MesasView
        locales={data.electoralLocales}
        personeros={data.rows}
        perms={data.perms}
        initialLocal={initialLocal}
      />
    </Suspense>
  );
}
