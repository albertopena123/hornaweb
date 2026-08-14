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

  const docType =
    body.docType === "ce" || body.docType === "passport" ? body.docType : "dni";
  const docNumber =
    typeof body.docNumber === "string" ? body.docNumber.trim().toUpperCase() : "";
  if (docType === "dni") {
    if (!/^\d{8}$/.test(docNumber)) {
      fieldErrors.docNumber = "El DNI debe tener 8 dígitos.";
    }
  } else if (!/^[A-Z0-9]{6,12}$/.test(docNumber)) {
    fieldErrors.docNumber = "Documento inválido (6 a 12 letras o números).";
  }

  // Coordenadas GPS: referenciales. Si faltan o están fuera de rango se
  // descartan sin bloquear el registro.
  let latitude: number | null = null;
  let longitude: number | null = null;
  let gpsAccuracy: number | null = null;
  const lat = Number(body.latitude);
  const lng = Number(body.longitude);
  if (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
    (lat !== 0 || lng !== 0)
  ) {
    latitude = lat;
    longitude = lng;
    const acc = Number(body.gpsAccuracy);
    if (Number.isFinite(acc) && acc >= 0) gpsAccuracy = Math.round(acc);
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
    const existing = await prisma.supporter.findFirst({
      where: { docType, docNumber },
      select: { id: true },
    });
    if (existing) {
      return fail("Este documento ya está registrado. ¡Gracias por tu apoyo!", 409, {
        docNumber: "Este documento ya está registrado.",
      });
    }

    await prisma.supporter.create({
      data: {
        name,
        phone,
        docType,
        docNumber,
        latitude,
        longitude,
        gpsAccuracy,
        district,
        source: "public",
        status: "pending",
        ip,
      },
    });
    return ok({});
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return fail("Este documento ya está registrado. ¡Gracias por tu apoyo!", 409, {
        docNumber: "Este documento ya está registrado.",
      });
    }
    console.error("POST /api/apoyos", e);
    return fail("No se pudo registrar. Intenta de nuevo.", 500);
  }
}
