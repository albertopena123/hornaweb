import { redirect } from "next/navigation";
import { getPersonerosData } from "../loader";
import { CoordinadoresView } from "./CoordinadoresView";

export const metadata = {
  title: "Coordinadores de Colegio · Módulo de Personeros",
  description: "Directorio, asignación y monitoreo de coordinadores de centros de votación en Madre de Dios",
};

export const dynamic = "force-dynamic";

export default async function CoordinadoresPage() {
  const data = await getPersonerosData();

  if (!data.perms.canManageCoordinators) {
    redirect("/personeros/mesas");
  }

  return (
    <CoordinadoresView
      locales={data.electoralLocales}
      personeros={data.rows}
      perms={data.perms}
      stats={data.stats}
    />
  );
}
