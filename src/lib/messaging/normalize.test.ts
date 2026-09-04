import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDni,
  normalizePeruPhone,
  normalizeName,
  detectColumns,
  normalizeRows,
  renderTemplate,
  isOptOutText,
  composeFooter,
  pickFooterEmoji,
  pickGreeting,
  applyGreeting,
  DEFAULT_FOOTER_EMOJIS,
  DEFAULT_GREETINGS,
  phoneToChatId,
  chatIdToPhone,
  jidToPhone,
  validateManualContact,
  splitUrls,
} from "./normalize";

test("normalizeDni acepta 8 dígitos, número de Excel, 7 dígitos con cero perdido y notación científica", () => {
  assert.equal(normalizeDni("12345678"), "12345678");
  assert.equal(normalizeDni(12345678), "12345678");
  assert.equal(normalizeDni(" 1234567 "), "01234567");
  assert.equal(normalizeDni("1.2345678E7"), "12345678");
  assert.equal(normalizeDni("123456"), null);
  assert.equal(normalizeDni("123456789"), null);
  assert.equal(normalizeDni(null), null);
  assert.equal(normalizeDni(true), null);
});

test("normalizePeruPhone normaliza a +519XXXXXXXX", () => {
  assert.equal(normalizePeruPhone("987654321"), "+51987654321");
  assert.equal(normalizePeruPhone(987654321), "+51987654321");
  assert.equal(normalizePeruPhone("+51 987 654 321"), "+51987654321");
  assert.equal(normalizePeruPhone("51987654321"), "+51987654321");
  assert.equal(normalizePeruPhone("0051987654321"), "+51987654321");
  assert.equal(normalizePeruPhone("9.87654321E8"), "+51987654321");
  assert.equal(normalizePeruPhone("082123456"), null); // fijo
  assert.equal(normalizePeruPhone("98765432"), null);
  assert.equal(normalizePeruPhone(""), null);
});

test("normalizeName limpia y pone Title Case", () => {
  assert.equal(normalizeName("  PEREZ  GOMEZ   JUAN "), "Perez Gomez Juan");
  assert.equal(normalizeName(null), "");
});

test("detectColumns reconoce cabeceras comunes sin distinguir tildes ni mayúsculas", () => {
  const m = detectColumns(["N°", "DNI", "Nombre Completo", "Teléfono", "Distrito"]);
  assert.deepEqual(m, { dni: 1, name: 2, phone: 3, paterno: null, materno: null });
  const m2 = detectColumns(["NUMERO DE DOCUMENTO", "AP PATERNO", "AP MATERNO", "NOMBRES", "CELULAR"]);
  assert.deepEqual(m2, { dni: 0, name: 3, phone: 4, paterno: 1, materno: 2 });
  const m3 = detectColumns(["x", "y"]);
  assert.deepEqual(m3, { dni: null, name: null, phone: null, paterno: null, materno: null });
});

test("normalizeRows exige solo el celular, compone nombres, deduplica por celular (gana la última) y numera filas", () => {
  const mapping = { dni: 0, name: 3, phone: 4, paterno: 1, materno: 2 };
  const rows = [
    ["12345678", "PEREZ", "GOMEZ", "JUAN", "987654321"],
    ["1234567", "LOPEZ", "RUIZ", "ANA", "+51 912 345 678"],
    ["12345678", "PEREZ", "GOMEZ", "JUAN CARLOS", "987654321"], // mismo celular: gana esta fila
    ["99999999", "SIN", "FONO", "PEPE", "123"], // celular inválido
    [null, null, null, null, null],
    ["55555555", "", "", "", "955555555"], // sin nombre: válido
    ["abc", "", "", "SOLO CEL", "966666666"], // DNI mal formado: válido, sin DNI
    [null, null, null, null, "977777777"], // solo celular: válido
  ];
  const r = normalizeRows(rows, mapping, "tambopata");
  assert.equal(r.totalRows, 7); // la fila vacía no cuenta
  assert.equal(r.duplicatedInFile, 1);
  assert.deepEqual(r.valid, [
    { phone: "+51987654321", name: "Juan Carlos Perez Gomez", docNumber: "12345678", district: "tambopata" },
    { phone: "+51912345678", name: "Ana Lopez Ruiz", docNumber: "01234567", district: "tambopata" },
    { phone: "+51955555555", name: "", docNumber: "55555555", district: "tambopata" },
    { phone: "+51966666666", name: "Solo Cel", docNumber: null, district: "tambopata" },
    { phone: "+51977777777", name: "", docNumber: null, district: "tambopata" },
  ]);
  assert.deepEqual(
    r.invalid.map((i) => [i.row, i.reason]),
    [[5, "Celular inválido"]],
  );
});

test("normalizeRows importa con solo la columna del celular mapeada", () => {
  const r = normalizeRows([["987654321"], ["987654321"], ["x"]], { dni: null, name: null, phone: 0, paterno: null, materno: null });
  assert.deepEqual(r.valid, [{ phone: "+51987654321", name: "", docNumber: null }]);
  assert.equal(r.duplicatedInFile, 1);
  assert.equal(r.invalid.length, 1);
});

test("renderTemplate reemplaza {nombre} (nombre completo Title Case) y {dni} y añade el pie", () => {
  const out = renderTemplate("Hola {nombre} (DNI {dni}), ¡gracias!", { name: "PEREZ GOMEZ JUAN", docNumber: "12345678" }, "— Equipo · Responde BAJA");
  assert.equal(out, "Hola Perez Gomez Juan (DNI 12345678), ¡gracias!\n\n— Equipo · Responde BAJA");
  assert.equal(renderTemplate("Hola", { name: "X", docNumber: "1" }, ""), "Hola");
});

test("renderTemplate cierra los huecos cuando el contacto no tiene nombre ni DNI", () => {
  assert.equal(renderTemplate("Hola {nombre}, tu DNI es {dni}. ¡Vota!", { name: "", docNumber: null }, ""), "Hola, tu DNI es. ¡Vota!");
  assert.equal(renderTemplate("Hola {nombre} 👋", { name: "", docNumber: null }, "Pie"), "Hola 👋\n\nPie");
});

test("isOptOutText detecta BAJA / STOP / NO al inicio", () => {
  assert.equal(isOptOutText("BAJA"), true);
  assert.equal(isOptOutText("  baja por favor"), true);
  assert.equal(isOptOutText("Stop"), true);
  assert.equal(isOptOutText("No quiero"), true);
  assert.equal(isOptOutText("Nos vemos"), false);
  assert.equal(isOptOutText("gracias"), false);
});

test("isOptOutText tambien acepta emojis y frases de rechazo (el pie ya no explica la baja)", () => {
  assert.equal(isOptOutText("\u{1F515}"), true);
  assert.equal(isOptOutText("ya \u{1F6AB}"), true);
  assert.equal(isOptOutText("\u274C"), true);
  assert.equal(isOptOutText("no me escriban mas"), true);
  assert.equal(isOptOutText("por favor eliminame de la lista"), true);
  assert.equal(isOptOutText("basta"), true);
  // No confundir con respuestas normales, incluidas las de apoyo con emoji.
  assert.equal(isOptOutText("\u{1F44D} gracias"), false);
  assert.equal(isOptOutText("alli estare"), false);
  assert.equal(isOptOutText("normal, cuenta conmigo"), false);
});

test("pickFooterEmoji rota entre los emojis y es estable para el mismo destinatario", () => {
  const emojis = ["A", "B", "C"];
  const uno = pickFooterEmoji(emojis, "recipient-1");
  assert.equal(uno, pickFooterEmoji(emojis, "recipient-1")); // un reintento repite el mismo texto
  assert.ok(emojis.includes(uno));
  const usados = new Set(Array.from({ length: 60 }, (_, i) => pickFooterEmoji(emojis, `r-${i}`)));
  assert.equal(usados.size, emojis.length); // reparte entre todos
  assert.equal(pickFooterEmoji([], "r"), ""); // sin emojis configurados, pie sin emoji
  assert.ok(DEFAULT_FOOTER_EMOJIS.length > 1);
});

test("composeFooter une emoji y firma, y aguanta que falte cualquiera de los dos", () => {
  assert.equal(composeFooter("Equipo Simon Horna", "\u{1F1F5}\u{1F1EA}"), "\u{1F1F5}\u{1F1EA} Equipo Simon Horna");
  assert.equal(composeFooter("Equipo Simon Horna", ""), "Equipo Simon Horna");
  assert.equal(composeFooter("", "\u2728"), "\u2728");
  assert.equal(composeFooter("  ", "  "), "");
});

test("phoneToChatId / chatIdToPhone / jidToPhone", () => {
  assert.equal(phoneToChatId("+51987654321"), "51987654321@c.us");
  assert.equal(chatIdToPhone("51987654321@c.us"), "+51987654321");
  assert.equal(chatIdToPhone("123@lid"), null);
  assert.equal(jidToPhone("51987654321@s.whatsapp.net"), "+51987654321");
  assert.equal(jidToPhone("51987654321:12@s.whatsapp.net"), "+51987654321");
  assert.equal(jidToPhone("51987654321@c.us"), "+51987654321");
  assert.equal(jidToPhone("123456789012345@lid"), null);
  assert.equal(jidToPhone(undefined), null);
});

test("validateManualContact normaliza DNI, celular y nombre de un alta válida", () => {
  const res = validateManualContact({
    docNumber: " 1234567 ",
    name: "  juan   carlos   perez ",
    phone: "987 654 321",
    district: "tambopata",
    source: "Feria de Puerto Maldonado",
    consentConfirmed: true,
  });
  assert.equal(res.fieldErrors, undefined);
  assert.deepEqual(res.data, {
    docNumber: "01234567",
    name: "Juan Carlos Perez",
    phone: "+51987654321",
    district: "tambopata",
    source: "Feria de Puerto Maldonado",
  });
});

test("validateManualContact: solo el celular es obligatorio; el DNI, si viene, debe ser válido", () => {
  const res = validateManualContact({ docNumber: "123", name: "   ", phone: "12345", source: "Feria", consentConfirmed: true });
  assert.equal(res.data, undefined);
  assert.ok(res.fieldErrors?.docNumber);
  assert.equal(res.fieldErrors?.name, undefined);
  assert.ok(res.fieldErrors?.phone);

  const soloCel = validateManualContact({ docNumber: "", name: "", phone: "987654321", source: "Feria", consentConfirmed: true });
  assert.equal(soloCel.fieldErrors, undefined);
  assert.deepEqual(soloCel.data, { docNumber: null, name: "", phone: "+51987654321", district: undefined, source: "Feria" });
});

test("validateManualContact exige origen de 3 a 120 caracteres y consentimiento marcado", () => {
  const base = { docNumber: "12345678", name: "Ana Lopez", phone: "987654321" };
  assert.ok(validateManualContact({ ...base, source: "ab", consentConfirmed: true }).fieldErrors?.source);
  assert.ok(validateManualContact({ ...base, source: "x".repeat(121), consentConfirmed: true }).fieldErrors?.source);
  assert.ok(validateManualContact({ ...base, source: "Alta manual", consentConfirmed: false }).fieldErrors?.consentConfirmed);
});

test("validateManualContact descarta un distrito que no está en el catálogo", () => {
  const res = validateManualContact({
    docNumber: "12345678",
    name: "Ana Lopez",
    phone: "987654321",
    district: "narnia",
    source: "Alta manual",
    consentConfirmed: true,
  });
  assert.equal(res.fieldErrors, undefined);
  assert.equal(res.data?.district, undefined);
});

test("splitUrls separa texto y enlaces (https, http y www.) sin comerse la puntuación final", () => {
  assert.deepEqual(splitUrls("Mira https://www.facebook.com/100054144776426/posts/pfbid0H7M/ y responde"), [
    { type: "text", value: "Mira " },
    { type: "url", value: "https://www.facebook.com/100054144776426/posts/pfbid0H7M/" },
    { type: "text", value: " y responde" },
  ]);
  assert.deepEqual(splitUrls("Entra a www.simonhorna.pe."), [
    { type: "text", value: "Entra a " },
    { type: "url", value: "www.simonhorna.pe" },
    { type: "text", value: "." },
  ]);
  assert.deepEqual(splitUrls("(http://a.com/x?y=1)"), [
    { type: "text", value: "(" },
    { type: "url", value: "http://a.com/x?y=1" },
    { type: "text", value: ")" },
  ]);
  assert.deepEqual(splitUrls("sin enlaces"), [{ type: "text", value: "sin enlaces" }]);
  assert.deepEqual(splitUrls(""), []);
});

test("applyGreeting sustituye {saludo} o el saludo inicial de la plantilla, y respeta el resto", () => {
  assert.equal(applyGreeting("{saludo} {nombre}, te invitamos", "Buenas"), "Buenas {nombre}, te invitamos");
  assert.equal(applyGreeting("Hola {nombre}, te invitamos", "Buen dia"), "Buen dia {nombre}, te invitamos");
  assert.equal(applyGreeting("hola, {nombre}! te invitamos", "Que tal"), "Que tal {nombre}! te invitamos");
  assert.equal(applyGreeting("Buenos dias {nombre}", "Saludos"), "Saludos {nombre}");
  // Sin saludo reconocible al inicio ni {saludo}: no se toca el texto.
  assert.equal(applyGreeting("Te invitamos {nombre}", "Buenas"), "Te invitamos {nombre}");
  // Saludo vacio: {saludo} cae a "Hola".
  assert.equal(applyGreeting("{saludo} {nombre}", ""), "Hola {nombre}");
});

test("pickGreeting rota entre los saludos y es estable por destinatario", () => {
  const uno = pickGreeting(DEFAULT_GREETINGS, "r-1");
  assert.equal(uno, pickGreeting(DEFAULT_GREETINGS, "r-1"));
  assert.ok(DEFAULT_GREETINGS.includes(uno));
  const usados = new Set(Array.from({ length: 200 }, (_, i) => pickGreeting(DEFAULT_GREETINGS, `r-${i}`)));
  assert.equal(usados.size, DEFAULT_GREETINGS.length);
});

test("composeFooter alterna la posicion del emoji segun el destinatario", () => {
  const posiciones = new Set(Array.from({ length: 50 }, (_, i) => composeFooter("Equipo", "X", `r-${i}`)));
  assert.deepEqual([...posiciones].sort(), ["Equipo X", "X Equipo"]);
});

test("renderTemplate combina saludo, nombre y pie: dos destinatarios distintos no reciben el mismo texto", () => {
  const tpl = "Hola {nombre}, te invitamos a la inauguracion.";
  const textos = new Set(
    Array.from({ length: 30 }, (_, i) =>
      renderTemplate(tpl, { name: "Ana", docNumber: null }, composeFooter("Equipo", pickFooterEmoji(DEFAULT_FOOTER_EMOJIS, `r-${i}`), `r-${i}`), pickGreeting(DEFAULT_GREETINGS, `r-${i}`)),
    ),
  );
  assert.ok(textos.size >= 20, `solo ${textos.size} variantes distintas de 30`);
});
