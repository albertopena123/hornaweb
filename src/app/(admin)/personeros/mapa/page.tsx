import { getPersonerosData } from "../loader";
import { CoverageMap } from "../CoverageMap";

export const metadata = { title: "Mapa de Cobertura · Módulo de Personeros" };
export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const data = await getPersonerosData();

  return (
    <CoverageMap
      locales={data.electoralLocales}
      personeros={data.rows}
      perms={data.perms}
    />
  );
}
