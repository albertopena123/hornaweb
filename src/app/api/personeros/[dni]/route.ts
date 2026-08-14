import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/app/api/v1/_lib/response";
import { rateLimit } from "@/lib/rate-limit";
import { districtLabel, isDistrictId } from "@/lib/districts";

// GET /api/personeros/:dni — consulta pública de asignación de mesa para personeros.
// Solo devuelve registros activos. Rate-limited para evitar scraping por enumeración.

const MAX_PER_IP = 20;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutos

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ dni: string }> },
) {
  const { dni } = await params;
  if (!/^\d{8}$/.test(dni)) {
    return fail("DNI inválido. Debe tener 8 dígitos.", 400);
  }

  const rl = rateLimit("personero-lookup", clientIp(req), MAX_PER_IP, WINDOW_MS);
  if (!rl.allowed) {
    const res = fail("Demasiadas consultas. Intenta más tarde.", 429);
    res.headers.set("Retry-After", String(rl.retryAfterSec));
    return res;
  }

  const p = await prisma.personero.findFirst({
    where: { docType: "dni", docNumber: dni, active: true },
  });

  if (!p) {
    return fail("Aún no apareces asignado. Contacta a tu coordinador de local.", 404);
  }

  return ok({
    name: p.name,
    district: isDistrictId(p.district) ? districtLabel(p.district) : null,
    localName: p.localName,
    localAddress: p.localAddress,
    mesa: p.mesa,
    coordinatorName: p.coordinatorName,
    coordinatorPhone: p.coordinatorPhone,
  });
}
