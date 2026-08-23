import { test } from "node:test";
import assert from "node:assert/strict";
import { toTitleCase, foldText } from "./text";

test("toTitleCase capitaliza cada palabra y colapsa espacios", () => {
  assert.equal(toTitleCase("  PEREZ   GOMEZ juan "), "Perez Gomez Juan");
  assert.equal(toTitleCase(""), "");
});

test("foldText quita tildes, baja a minúsculas y colapsa espacios", () => {
  assert.equal(foldText("  Teléfono   CELULAR "), "telefono celular");
  assert.equal(foldText("Ñandú"), "ñandu");
});
