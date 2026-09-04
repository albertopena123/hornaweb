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

/** Solo el celular es obligatorio; DNI y nombre son opcionales (si el DNI viene mal formado se guarda sin DNI). */
export type ImportRowInput = { phone: string; name: string; docNumber: string | null; district?: string };
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
  const byPhone = new Map<string, ImportRowInput>();
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

    const docNumber = normalizeDni(rawDni); // opcional
    const phone = normalizePeruPhone(rawPhone);
    if (!phone) {
      invalid.push({ row: rowNumber, docNumber: rawDni, name, phone: rawPhone, reason: "Celular inválido" });
      return;
    }
    if (byPhone.has(phone)) duplicatedInFile += 1;
    const item: ImportRowInput = { phone, name, docNumber };
    if (district) item.district = district;
    byPhone.set(phone, item);
  });

  return { valid: [...byPhone.values()], invalid, duplicatedInFile, totalRows };
}

// Variación por destinatario para que una campaña de cientos de envíos no sean cientos de
// mensajes byte a byte idénticos: rota el saludo inicial, el emoji del pie y la posición del
// emoji (delante o detrás de la firma). Todo es determinista por destinatario: un reintento
// repite exactamente el mismo texto.
// Configurable: MESSAGING_FOOTER_EMOJIS ("🇵🇪,🙌,✨") y MESSAGING_GREETINGS ("Hola|Buenas|Buen día").
export const DEFAULT_FOOTER_EMOJIS = ["🇵🇪", "🙌", "✨", "🤝", "⭐", "💪", "👋", "🙏", "🌟", "❤️", "💙", "✅", "📣", "🎉", "👏", "🔴"];
export const DEFAULT_GREETINGS = ["Hola", "Buenas", "Buen día", "Qué tal", "Saludos", "Hola, qué tal", "Hola, buenas"];

/** Hash estable (djb2) con sal: el mismo destinatario recibe siempre la misma variante, también al reintentar. */
function hashSeed(seed: string, salt = 0): number {
  let h = 5381 + salt;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  return h;
}

function pickFrom(list: string[], seed: string, salt: number): string {
  const l = list.map((x) => x.trim()).filter(Boolean);
  if (l.length === 0) return "";
  return l[hashSeed(seed, salt) % l.length];
}

export function pickFooterEmoji(emojis: string[], seed: string): string {
  return pickFrom(emojis, seed, 0);
}

export function pickGreeting(greetings: string[], seed: string): string {
  return pickFrom(greetings, seed, 7919);
}

/** Pie final: emoji + firma, con el emoji delante o detrás según el destinatario. Cualquiera de las partes puede faltar. */
export function composeFooter(footer: string, emoji: string, seed = ""): string {
  const e = emoji.trim();
  const f = footer.trim();
  if (!e || !f) return e || f;
  return hashSeed(seed, 104729) % 2 === 0 ? `${e} ${f}` : `${f} ${e}`;
}

// Saludos que el motor reconoce al principio de la plantilla para rotarlos aunque el admin
// no haya escrito {saludo}: "Hola {nombre}, ..." → "Buenas Juan, ...".
const LEADING_GREETING = /^(hola|buenas|buen d[ií]a|buenos d[ií]as|buenas tardes|buenas noches|saludos|qu[eé] tal)\b[,!]?\s*/i;

/** Sustituye {saludo} (o el saludo inicial de la plantilla) por el saludo elegido. */
export function applyGreeting(template: string, greeting: string): string {
  const g = greeting.trim();
  if (!g) return template.replace(/\{saludo\}/gi, "Hola");
  if (/\{saludo\}/i.test(template)) return template.replace(/\{saludo\}/gi, g);
  return template.replace(LEADING_GREETING, `${g} `);
}

/**
 * Reemplaza {saludo}, {nombre} (nombre completo en Title Case) y {dni}; añade el pie separado por
 * línea en blanco. Nombre y DNI son opcionales: si faltan, se cierran los huecos ("Hola , …" → "Hola, …").
 * `greeting` es el saludo de este destinatario (si no se pasa, se deja "Hola").
 */
export function renderTemplate(
  template: string,
  contact: { name: string; docNumber: string | null },
  footer: string,
  greeting = "Hola",
): string {
  const body = applyGreeting(template, greeting)
    .replace(/\{nombre\}/gi, toTitleCase(contact.name ?? ""))
    .replace(/\{dni\}/gi, contact.docNumber ?? "")
    .replace(/[ \t]+([,.;:!?)])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  const f = footer.trim();
  return f ? `${body}\n\n${f}` : body;
}

// Palabras y emojis que valen como baja. El pie ya no anuncia "responde BAJA", pero la
// puerta de salida sigue abierta: quien conteste cualquiera de estas cosas deja de recibir.
const OPT_OUT_EMOJIS = ["\u{1F515}", "\u{1F507}", "\u{1F6AB}", "\u274C", "\u{1F44E}", "\u{1F621}", "\u{1F92C}"];

// Al principio del mensaje ("BAJA", "stop", "no quiero"…): la respuesta corta de siempre.
const OPT_OUT_START = /^(baja|stop|unsubscribe|no|salir|basta|elimina|eliminame|borrame)\b/;
// En cualquier parte: frases inequívocas, para no perder un "por favor elimíname de la lista".
const OPT_OUT_ANY = /\b(eliminame|borrame|no quiero recibir|no me (escriban|manden|envien|molesten)|dejen de (enviar|escribir|molestar))\b/;

export function isOptOutText(body: string): boolean {
  const t = foldText(body);
  return OPT_OUT_START.test(t) || OPT_OUT_ANY.test(t) || OPT_OUT_EMOJIS.some((e) => t.includes(e));
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
  docNumber: string | null;
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

  // Solo el celular es obligatorio. El DNI, si se indica, debe ser válido; el nombre puede ir vacío.
  const rawDoc = cellToString(input.docNumber);
  const docNumber = rawDoc ? normalizeDni(rawDoc) : null;
  if (rawDoc && !docNumber) fieldErrors.docNumber = "Si indicas el DNI, debe tener 8 dígitos.";

  const name = normalizeName(input.name);

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
      docNumber,
      name,
      phone: phone!,
      district: input.district && isDistrictId(input.district) ? input.district : undefined,
      source,
    },
  };
}

export type TextPart = { type: "text" | "url"; value: string };

// Detección de enlaces al estilo WhatsApp: https://, http:// o www. seguido de caracteres sin espacios.
// La puntuación de cierre habitual (. , ; : ! ? ) ] ' ") no forma parte del enlace.
const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const TRAILING_PUNCT = /[.,;:!?)\]'"]+$/;

/** Parte un texto en tramos de texto plano y enlaces, para pintarlos igual que lo hará WhatsApp. */
export function splitUrls(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    let url = m[0];
    // Un paréntesis de cierre sólo se conserva si el enlace también abrió uno (p. ej. Wikipedia).
    const trailing = TRAILING_PUNCT.exec(url)?.[0] ?? "";
    const keepParen = trailing.includes(")") && url.includes("(");
    if (trailing && !keepParen) url = url.slice(0, -trailing.length);
    const start = m.index ?? 0;
    if (start > last) parts.push({ type: "text", value: text.slice(last, start) });
    parts.push({ type: "url", value: url });
    last = start + url.length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}
