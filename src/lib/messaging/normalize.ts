// Normalización de datos de contactos y plantillas. Sin "server-only": se usa
// en el navegador (vista previa de importación) y en el servidor (acciones, motor).
import { foldText, toTitleCase } from "@/lib/text";
import { isDistrictId, type DistrictId } from "@/lib/districts";

export type CellLike = string | number | boolean | Date | null | undefined;

export const TEMPLATE_MAX = 1000;
export const IMPORT_BATCH_SIZE = 500;

const SCI = /^\d+(\.\d+)?e\+?\d+$/i;

function cellToString(v: CellLike): string {
  if (v === null || v === undefined || typeof v === "boolean" || v instanceof Date) return "";
  if (typeof v === "number") return Number.isFinite(v) ? v.toFixed(0) : "";
  const s = String(v).trim();
  return SCI.test(s) ? Number(s).toFixed(0) : s;
}

/** "12345678" | 12345678 | " 1234567 " (cero perdido) | "1.2345678E7" → "12345678"; si no, null. */
export function normalizeDni(v: CellLike): string | null {
  let s = cellToString(v).replace(/\D/g, "");
  if (s.length === 7) s = "0" + s;
  return /^\d{8}$/.test(s) ? s : null;
}

/** Celular peruano → "+519XXXXXXXX". Acepta 9 dígitos, 51…, +51 …, 0051…, notación científica. */
export function normalizePeruPhone(v: CellLike): string | null {
  let s = cellToString(v).replace(/\D/g, "");
  if (s.startsWith("00")) s = s.slice(2);
  if (s.length === 11 && s.startsWith("51")) s = s.slice(2);
  return /^9\d{8}$/.test(s) ? `+51${s}` : null;
}

export function normalizeName(v: CellLike): string {
  if (typeof v !== "string") return "";
  return toTitleCase(v.replace(/\s+/g, " ").trim());
}

export type ColumnMapping = {
  dni: number | null;
  name: number | null;
  phone: number | null;
  paterno: number | null;
  materno: number | null;
};

const HEADERS: Record<keyof ColumnMapping, string[]> = {
  dni: ["dni", "documento", "nro documento", "nro de documento", "numero de documento", "num doc", "num documento", "nro doc", "n documento", "doc", "nrodoc", "numdoc"],
  paterno: ["apellido paterno", "ap paterno", "ap pat", "ap_pat", "paterno", "apellidopaterno", "primer apellido"],
  materno: ["apellido materno", "ap materno", "ap mat", "ap_mat", "materno", "apellidomaterno", "segundo apellido"],
  name: ["nombre", "nombres", "nombre completo", "nombres completos", "nombres y apellidos", "apellidos y nombres", "nombre y apellidos"],
  phone: ["celular", "telefono", "telefono celular", "nro celular", "numero celular", "numero", "whatsapp", "movil", "cel", "fono", "nro telefono", "numero de telefono"],
};

// Orden de resolución: primero exacto, luego "contiene"; dni y apellidos antes que
// nombre y teléfono para que "numero de documento" no se lo lleve "numero".
const ORDER: (keyof ColumnMapping)[] = ["dni", "paterno", "materno", "name", "phone"];

export function detectColumns(headers: CellLike[]): ColumnMapping {
  const folded = headers.map((h) => foldText(typeof h === "string" ? h : h === null || h === undefined ? "" : String(h)));
  const used = new Set<number>();
  const out: ColumnMapping = { dni: null, name: null, phone: null, paterno: null, materno: null };
  for (const key of ORDER) {
    const idx = folded.findIndex((h, i) => !used.has(i) && HEADERS[key].includes(h));
    if (idx >= 0) {
      out[key] = idx;
      used.add(idx);
    }
  }
  for (const key of ORDER) {
    if (out[key] !== null) continue;
    const idx = folded.findIndex((h, i) => !used.has(i) && h !== "" && HEADERS[key].some((k) => h.includes(k)));
    if (idx >= 0) {
      out[key] = idx;
      used.add(idx);
    }
  }
  return out;
}

export type ImportRowInput = { docNumber: string; name: string; phone: string; district?: string };
export type InvalidRow = { row: number; docNumber: string; name: string; phone: string; reason: string };
export type NormalizedSheet = {
  valid: ImportRowInput[];
  invalid: InvalidRow[];
  duplicatedInFile: number;
  totalRows: number;
};

function isEmptyRow(row: CellLike[]): boolean {
  return row.every((c) => c === null || c === undefined || (typeof c === "string" && c.trim() === ""));
}

function pick(row: CellLike[], idx: number | null): CellLike {
  return idx === null ? null : row[idx];
}

/** `rows` sin la cabecera. `row` en los inválidos es 1-based contando la cabecera como fila 1. */
export function normalizeRows(rows: CellLike[][], mapping: ColumnMapping, district?: string): NormalizedSheet {
  const byDni = new Map<string, ImportRowInput>();
  const invalid: InvalidRow[] = [];
  let totalRows = 0;
  let duplicatedInFile = 0;

  rows.forEach((row, i) => {
    if (isEmptyRow(row)) return;
    totalRows += 1;
    const rowNumber = i + 2;
    const rawDni = cellToString(pick(row, mapping.dni));
    const rawPhone = cellToString(pick(row, mapping.phone));
    const nombres = normalizeName(pick(row, mapping.name));
    const paterno = normalizeName(pick(row, mapping.paterno));
    const materno = normalizeName(pick(row, mapping.materno));
    const name = [nombres, paterno, materno].filter(Boolean).join(" ");

    const docNumber = normalizeDni(rawDni);
    const phone = normalizePeruPhone(rawPhone);
    const reason = !docNumber ? "DNI inválido" : !phone ? "Celular inválido" : name === "" ? "Nombre vacío" : null;
    if (reason) {
      invalid.push({ row: rowNumber, docNumber: rawDni, name, phone: rawPhone, reason });
      return;
    }
    if (byDni.has(docNumber!)) duplicatedInFile += 1;
    const item: ImportRowInput = { docNumber: docNumber!, name, phone: phone! };
    if (district) item.district = district;
    byDni.set(docNumber!, item);
  });

  return { valid: [...byDni.values()], invalid, duplicatedInFile, totalRows };
}

/** Reemplaza {nombre} (nombre completo en Title Case) y {dni}; añade el pie separado por línea en blanco. */
export function renderTemplate(template: string, contact: { name: string; docNumber: string }, footer: string): string {
  const body = template
    .replace(/\{nombre\}/gi, toTitleCase(contact.name))
    .replace(/\{dni\}/gi, contact.docNumber)
    .trim();
  const f = footer.trim();
  return f ? `${body}\n\n${f}` : body;
}

export function isOptOutText(body: string): boolean {
  return /^(baja|stop|no)\b/.test(foldText(body));
}

export function phoneToChatId(phoneE164: string): string {
  return `${phoneE164.replace(/\D/g, "")}@c.us`;
}

export function chatIdToPhone(chatId: string): string | null {
  const m = /^(\d{8,15})@c\.us$/.exec(chatId);
  return m ? `+${m[1]}` : null;
}

/** Acepta chatId de WAHA (`NNN@c.us`) o JID crudo de Baileys (`NNN[:device]@s.whatsapp.net`, como llega en `_data.key.remoteJidAlt`). `@lid` → null. */
export function jidToPhone(jid: string | undefined | null): string | null {
  if (!jid) return null;
  return chatIdToPhone(jid.replace(/:\d+(?=@)/, "").replace(/@s\.whatsapp\.net$/, "@c.us"));
}

export type ManualContactInput = {
  docNumber: CellLike;
  name: CellLike;
  phone: CellLike;
  district?: string;
  source: string;
  consentConfirmed: boolean;
};
export type ManualContactData = {
  docNumber: string;
  name: string;
  phone: string;
  district?: DistrictId;
  source: string;
};

export const SOURCE_MIN = 3;
export const SOURCE_MAX = 120;

/**
 * Valida un alta manual reusando la misma normalización que la importación, para que
 * tecleado y Excel no tengan dos reglas distintas. Devuelve `data` o `fieldErrors`.
 */
export function validateManualContact(
  input: ManualContactInput,
): { data?: ManualContactData; fieldErrors?: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};

  const docNumber = normalizeDni(input.docNumber);
  if (!docNumber) fieldErrors.docNumber = "El DNI debe tener 8 dígitos.";

  const name = normalizeName(input.name);
  if (!name) fieldErrors.name = "Escribe el nombre completo.";

  const phone = normalizePeruPhone(input.phone);
  if (!phone) fieldErrors.phone = "El celular debe ser un número peruano de 9 dígitos (empieza con 9).";

  const source = (input.source ?? "").trim();
  if (source.length < SOURCE_MIN || source.length > SOURCE_MAX) {
    fieldErrors.source = `Indica el origen del contacto (${SOURCE_MIN} a ${SOURCE_MAX} caracteres).`;
  }

  if (!input.consentConfirmed) {
    fieldErrors.consentConfirmed = "Debes confirmar el consentimiento de la persona.";
  }

  if (Object.keys(fieldErrors).length) return { fieldErrors };
  return {
    data: {
      docNumber: docNumber!,
      name,
      phone: phone!,
      district: input.district && isDistrictId(input.district) ? input.district : undefined,
      source,
    },
  };
}
