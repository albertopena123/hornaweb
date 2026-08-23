import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "./csv";

test("toCsv usa ; como separador, escapa comillas y tolera null", () => {
  const out = toCsv(["DNI", "Nombre"], [["12345678", 'Juan "Pepe" Perez'], ["1", null], ["2", "a;b"]]);
  assert.equal(out, 'DNI;Nombre\r\n12345678;"Juan ""Pepe"" Perez"\r\n1;\r\n2;"a;b"');
});
