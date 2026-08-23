import { test } from "node:test";
import assert from "node:assert/strict";
import { limaHour, limaDayKey, isWithinWindow, nextWindowStart, isElectoralSilence, randomBetween } from "./lima-time";

test("limaHour y limaDayKey usan UTC-5 fijo", () => {
  // 2026-10-04T03:30Z = 2026-10-03 22:30 Lima
  const d = new Date("2026-10-04T03:30:00Z");
  assert.equal(limaHour(d), 22);
  assert.equal(limaDayKey(d), "2026-10-03");
  // 2026-10-04T05:00Z = 2026-10-04 00:00 Lima
  assert.equal(limaHour(new Date("2026-10-04T05:00:00Z")), 0);
  assert.equal(limaDayKey(new Date("2026-10-04T05:00:00Z")), "2026-10-04");
});

test("isWithinWindow es inclusivo al inicio y exclusivo al final", () => {
  assert.equal(isWithinWindow(8, 8, 20), true);
  assert.equal(isWithinWindow(19, 8, 20), true);
  assert.equal(isWithinWindow(20, 8, 20), false);
  assert.equal(isWithinWindow(7, 8, 20), false);
});

test("nextWindowStart devuelve la próxima hora de inicio en Lima", () => {
  // 2026-08-23 22:00 Lima = 2026-08-24T03:00Z → próximo 08:00 Lima = 2026-08-24T13:00Z
  assert.equal(nextWindowStart(new Date("2026-08-24T03:00:00Z"), 8).toISOString(), "2026-08-24T13:00:00.000Z");
  // 2026-08-24 06:00 Lima = 11:00Z → hoy 08:00 Lima = 13:00Z
  assert.equal(nextWindowStart(new Date("2026-08-24T11:00:00Z"), 8).toISOString(), "2026-08-24T13:00:00.000Z");
});

test("isElectoralSilence bloquea desde 00:00 Lima del día anterior hasta el fin del día de elección", () => {
  const election = "2026-10-04";
  assert.equal(isElectoralSilence(new Date("2026-10-03T04:59:00Z"), election), false); // 2-oct 23:59 Lima
  assert.equal(isElectoralSilence(new Date("2026-10-03T05:00:00Z"), election), true); // 3-oct 00:00 Lima
  assert.equal(isElectoralSilence(new Date("2026-10-05T04:59:00Z"), election), true); // 4-oct 23:59 Lima
  assert.equal(isElectoralSilence(new Date("2026-10-05T05:00:00Z"), election), false); // 5-oct 00:00 Lima
  assert.equal(isElectoralSilence(new Date("2026-10-03T12:00:00Z"), undefined), false);
  assert.equal(isElectoralSilence(new Date("2026-10-03T12:00:00Z"), "no-es-fecha"), false);
});

test("randomBetween queda dentro del rango", () => {
  for (let i = 0; i < 100; i++) {
    const v = randomBetween(45, 120);
    assert.ok(v >= 45 && v <= 120);
  }
  assert.equal(randomBetween(7, 7), 7);
});
