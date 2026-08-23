import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyWahaSignature } from "./webhook-signature";

test("verifyWahaSignature acepta el HMAC sha512 hex correcto y rechaza el resto", () => {
  const body = '{"event":"message.ack","payload":{"id":"x"}}';
  const secret = "clave-secreta";
  const good = createHmac("sha512", secret).update(body).digest("hex");
  assert.equal(verifyWahaSignature(body, good, secret), true);
  assert.equal(verifyWahaSignature(body, good.toUpperCase(), secret), true);
  assert.equal(verifyWahaSignature(body, good, "otra"), false);
  assert.equal(verifyWahaSignature(body + " ", good, secret), false);
  assert.equal(verifyWahaSignature(body, null, secret), false);
  assert.equal(verifyWahaSignature(body, "abc", secret), false);
  assert.equal(verifyWahaSignature(body, good, ""), false);
});
