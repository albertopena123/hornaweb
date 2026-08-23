// Utilidades de texto compartidas por cliente y servidor (sin "server-only").

/** "PEREZ GOMEZ juan" → "Perez Gomez Juan". Colapsa espacios. */
export function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Marcadores temporales para preservar ñ/Ñ durante la descomposición NFD. Escritos como
// escapes \u para que el archivo sea ASCII puro (no pegar caracteres de control literales).
const N_LOWER = "\u0001";
const N_UPPER = "\u0002";

/** Normaliza para comparar: sin tildes (conserva ñ), minúsculas, espacios colapsados. */
export function foldText(s: string): string {
  return s
    .replace(/ñ/g, N_LOWER)
    .replace(/Ñ/g, N_UPPER)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0001/g, "ñ")
    .replace(/\u0002/g, "Ñ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
