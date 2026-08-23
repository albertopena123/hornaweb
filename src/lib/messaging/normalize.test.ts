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
  phoneToChatId,
  chatIdToPhone,
  jidToPhone,
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

test("normalizeRows valida, compone nombres, deduplica por DNI (gana la última) y numera filas", () => {
  const mapping = { dni: 0, name: 3, phone: 4, paterno: 1, materno: 2 };
  const rows = [
    ["12345678", "PEREZ", "GOMEZ", "JUAN", "987654321"],
    ["1234567", "LOPEZ", "RUIZ", "ANA", "+51 912 345 678"],
    ["12345678", "PEREZ", "GOMEZ", "JUAN CARLOS", "987654321"],
    ["99999999", "SIN", "FONO", "PEPE", "123"],
    [null, null, null, null, null],
    ["55555555", "", "", "", "955555555"],
  ];
  const r = normalizeRows(rows, mapping, "tambopata");
  assert.equal(r.totalRows, 5); // la fila vacía no cuenta
  assert.equal(r.duplicatedInFile, 1);
  assert.deepEqual(r.valid, [
    { docNumber: "12345678", name: "Juan Carlos Perez Gomez", phone: "+51987654321", district: "tambopata" },
    { docNumber: "01234567", name: "Ana Lopez Ruiz", phone: "+51912345678", district: "tambopata" },
  ]);
  assert.deepEqual(
    r.invalid.map((i) => [i.row, i.reason]),
    [
      [5, "Celular inválido"],
      [7, "Nombre vacío"],
    ],
  );
});

test("renderTemplate reemplaza {nombre} (nombre completo Title Case) y {dni} y añade el pie", () => {
  const out = renderTemplate("Hola {nombre} (DNI {dni}), ¡gracias!", { name: "PEREZ GOMEZ JUAN", docNumber: "12345678" }, "— Equipo · Responde BAJA");
  assert.equal(out, "Hola Perez Gomez Juan (DNI 12345678), ¡gracias!\n\n— Equipo · Responde BAJA");
  assert.equal(renderTemplate("Hola", { name: "X", docNumber: "1" }, ""), "Hola");
});

test("isOptOutText detecta BAJA / STOP / NO al inicio", () => {
  assert.equal(isOptOutText("BAJA"), true);
  assert.equal(isOptOutText("  baja por favor"), true);
  assert.equal(isOptOutText("Stop"), true);
  assert.equal(isOptOutText("No quiero"), true);
  assert.equal(isOptOutText("Nos vemos"), false);
  assert.equal(isOptOutText("gracias"), false);
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
