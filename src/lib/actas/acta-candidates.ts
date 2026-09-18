import { prisma } from "@/lib/prisma";

/** Provincias de Madre de Dios tal como están guardadas en Candidate.province. */
export const ACTA_PROVINCES = ["Tambopata", "Manu", "Tahuamanu"] as const;

/**
 * Lleva cualquier variante ("TAMBOPATA", " manu ") a la forma canónica de
 * Candidate.province. ElectoralLocal.province viene en MAYÚSCULAS desde el
 * padrón de la ONPE, y ese valor es el que llega aquí cuando la mesa ya está
 * cargada en pantalla.
 */
export function canonicalProvince(province: string | null | undefined): string {
  const p = (province ?? "").trim().toLowerCase();
  return ACTA_PROVINCES.find((x) => x.toLowerCase() === p) ?? (province ?? "").trim();
}

/**
 * Candidatos contra los que se empareja la lectura de un acta. Única fuente
 * para los tres motores de extracción (Claude API, Claude CLI y Gemini).
 *
 * La provincia se compara sin distinguir mayúsculas: con coincidencia exacta,
 * "TAMBOPATA" no encontraba ningún candidato y la extracción de Alcaldía
 * Provincial volvía vacía sin ningún error visible.
 */
export async function getActaCandidates(electionType: string, province: string) {
  const isProvincial = electionType === "provincial";
  const target = canonicalProvince(province);

  const candidates = await prisma.candidate.findMany({
    where: {
      cargo: isProvincial ? "provincial" : "gobernador",
      ...(isProvincial ? { province: { equals: target, mode: "insensitive" as const } } : {}),
      active: true,
    },
    orderBy: { order: "asc" },
  });

  if (candidates.length === 0) {
    throw new Error(
      isProvincial
        ? `No hay candidatos activos de Alcaldía Provincial para la provincia "${province}".`
        : "No hay candidatos activos de Gobernador Regional.",
    );
  }

  return { candidates, province: target };
}
