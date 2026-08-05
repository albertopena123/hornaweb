import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/app/api/v1/_lib/response";
import { isDistrictId } from "@/lib/districts";
import { rateLimit } from "@/lib/rate-limit";

const MAX_PER_IP = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail("Cuerpo inválido.", 400);
  }

  // Honeypot: los bots llenan "website"; respondemos OK sin guardar nada.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return ok({});
  }

  const fieldErrors: Record<string, string> = {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 120) {
    fieldErrors.name = "Escribe tu nombre (2 a 120 caracteres).";
  }
  const district = body.district;
  if (!isDistrictId(district)) {
    fieldErrors.district = "Elige tu distrito.";
  }
  let phone: string | null = null;
  if (typeof body.phone === "string" && body.phone.trim() !== "") {
    const p = body.phone.trim();
    if (!/^[0-9+\s-]{6,15}$/.test(p)) {
      fieldErrors.phone = "Teléfono inválido.";
    } else {
      phone = p;
    }
  }
  if (Object.keys(fieldErrors).length > 0 || !isDistrictId(district)) {
    return fail("Revisa los campos marcados.", 400, fieldErrors);
  }

  const ip = clientIp(req);
  const rl = rateLimit("apoyos", ip, MAX_PER_IP, WINDOW_MS);
  if (!rl.allowed) {
    const res = fail("Demasiados registros desde esta conexión. Intenta más tarde.", 429);
    res.headers.set("Retry-After", String(rl.retryAfterSec));
    return res;
  }

  try {
    await prisma.supporter.create({
      data: {
        name,
        phone,
        district,
        source: "public",
        status: "pending",
        ip,
      },
    });
    return ok({});
  } catch (e) {
    console.error("POST /api/apoyos", e);
    return fail("No se pudo registrar. Intenta de nuevo.", 500);
  }
}
