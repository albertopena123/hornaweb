import { createHmac, timingSafeEqual } from "node:crypto";

/** WAHA firma el cuerpo crudo con HMAC-SHA512 (hex) en el header X-Webhook-Hmac. */
export function verifyWahaSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const given = header.trim().toLowerCase();
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(given, "utf8"));
}
