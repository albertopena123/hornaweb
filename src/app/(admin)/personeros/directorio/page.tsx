import { getPersonerosData } from "../loader";
import { DirectorioView } from "./DirectorioView";

export const metadata = { title: "Directorio · Módulo de Personeros" };
export const dynamic = "force-dynamic";

export default async function DirectorioPage() {
  const data = await getPersonerosData();

  return (
    <DirectorioView
      rows={data.rows}
      perms={data.perms}
      locales={data.locales}
    />
  );
}
