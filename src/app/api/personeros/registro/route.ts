import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/app/api/v1/_lib/response";
import { rateLimit } from "@/lib/rate-limit";
import { getSettingBool, SETTING_PERSONEROS_PUBLIC } from "@/lib/settings";
import { validatePublicPersonero } from "@/lib/personeros/public-registration";

// Inscripción pública de personeros desde el formulario flotante del landing.
//  GET  → { enabled } (el switch está en Admin → Personeros)
//  POST → crea el personero como INACTIVO (pendiente de que el admin lo revise y asigne),
//         con source = public. Misma protección que /api/apoyos: honeypot + rate-limit por IP.

const MAX_PER_IP = 3;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora
const DISABLED_MSG = "La inscripción de personeros no está habilitada por ahora.";
const DUP_MSG = "Este documento ya está inscrito como personero.";

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function GET() {
  try {
    const enabled = await getSettingBool(SETTING_PERSONEROS_PUBLIC);
    return ok({ enabled });
  } catch (e) {
    console.error("GET /api/personeros/registro", e);
    return ok({ enabled: false });
  }
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

  try {
    if (!(await getSettingBool(SETTING_PERSONEROS_PUBLIC))) return fail(DISABLED_MSG, 403);
  } catch (e) {
    console.error("POST /api/personeros/registro (setting)", e);
    return fail("No se pudo registrar. Intenta de nuevo.", 500);
  }

  const v = validatePublicPersonero(body);
  if (!v.data) return fail("Revisa los campos marcados.", 400, v.fieldErrors);
  const d = v.data;

  const ip = clientIp(req);
  const rl = rateLimit("personero-registro", ip, MAX_PER_IP, WINDOW_MS);
  if (!rl.allowed) {
    const res = fail("Demasiados registros desde esta conexión. Intenta más tarde.", 429);
    res.headers.set("Retry-After", String(rl.retryAfterSec));
    return res;
  }

  try {
    const existing = await prisma.personero.findUnique({
      where: { docType_docNumber: { docType: d.docType, docNumber: d.docNumber } },
      select: { id: true },
    });
    if (existing) return fail(DUP_MSG, 409, { docNumber: DUP_MSG });

    await prisma.personero.create({
      data: {
        docType: d.docType,
        docNumber: d.docNumber,
        name: d.name,
        phone: d.phone,
        district: d.district,
        localName: d.localName,
        localAddress: d.localAddress,
        mesa: d.mesa,
        coordinatorName: d.coordinatorName,
        coordinatorPhone: d.coordinatorPhone,
        source: "public",
        active: false,
        notes: `Inscripción desde la web (IP ${ip})`,
      },
    });
    return ok({});
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      return fail(DUP_MSG, 409, { docNumber: DUP_MSG });
    }
    console.error("POST /api/personeros/registro", e);
    return fail("No se pudo registrar. Intenta de nuevo.", 500);
  }
}
