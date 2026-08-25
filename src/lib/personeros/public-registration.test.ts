import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePublicPersonero } from "./public-registration";
import { DISTRICTS } from "@/lib/districts";

const district = DISTRICTS[0].id;
const base = {
  docType: "dni",
  docNumber: " 12345678 ",
  name: "  Juan Perez ",
  phone: "987 654 321",
  district,
  localName: "IE Nuestra Señora",
};

test("validatePublicPersonero acepta el mínimo (documento, nombre, celular, distrito, local) y deja opcionales vacíos", () => {
  const r = validatePublicPersonero(base);
  assert.equal(r.fieldErrors, undefined);
  assert.deepEqual(r.data, {
    docType: "dni",
    docNumber: "12345678",
    name: "Juan Perez",
    phone: "987 654 321",
    district,
    localName: "IE Nuestra Señora",
    localAddress: null,
    mesa: "",
    coordinatorName: "",
    coordinatorPhone: "",
  });
});

test("validatePublicPersonero exige DNI de 8 dígitos, celular, distrito válido y local", () => {
  const r = validatePublicPersonero({ ...base, docNumber: "123", phone: "x", district: "narnia", localName: "" });
  assert.equal(r.data, undefined);
  assert.deepEqual(Object.keys(r.fieldErrors ?? {}).sort(), ["district", "docNumber", "localName", "phone"]);
});

test("validatePublicPersonero normaliza CE en mayúsculas y valida opcionales solo si vienen", () => {
  const ok = validatePublicPersonero({
    ...base,
    docType: "ce",
    docNumber: "ab12345",
    mesa: "012345",
    coordinatorName: "Ana",
    coordinatorPhone: "+51 999 999 999",
  });
  assert.equal(ok.data?.docNumber, "AB12345");
  assert.equal(ok.data?.mesa, "012345");
  const bad = validatePublicPersonero({ ...base, coordinatorPhone: "abc", mesa: "12345678901" });
  assert.deepEqual(Object.keys(bad.fieldErrors ?? {}).sort(), ["coordinatorPhone", "mesa"]);
});
