import { getPersonerosData } from "../loader";
import { MesasView } from "../MesasView";

export const metadata = { title: "Padrón de Mesas · Módulo de Personeros" };
export const dynamic = "force-dynamic";

export default async function MesasPage() {
  const data = await getPersonerosData();

  return (
    <MesasView
      locales={data.electoralLocales}
      personeros={data.rows}
      perms={data.perms}
    />
  );
}
