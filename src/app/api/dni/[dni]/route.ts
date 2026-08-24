import { NextRequest } from "next/server";
import { ok, fail } from "@/app/api/v1/_lib/response";
import { rateLimit } from "@/lib/rate-limit";
import { toTitleCase } from "@/lib/text";

// GET /api/dni/:dni — proxy de consulta de DNI para autorellenar el nombre.
// Solo devolvemos el nombre completo; el resto de datos personales que expone
// el API externo (dirección, fecha de nacimiento, padres…) no sale de aquí.

const API_BASE = "https://apidatos.unamad.edu.pe/api/consulta";
// El token vive solo en el entorno (.env, fuera de git). Este route corre en el
// servidor, asi que nunca llega al navegador: el cliente pega a /api/dni/:dni.
const API_TOKEN = process.env.DNI_API_TOKEN ?? "";
const MAX_PER_IP = 15;
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
    return fail("DNI inválido.", 400);
  }

  const rl = rateLimit("dni-lookup", clientIp(req), MAX_PER_IP, WINDOW_MS);
  if (!rl.allowed) {
    const res = fail("Demasiadas consultas. Intenta más tarde.", 429);
    res.headers.set("Retry-After", String(rl.retryAfterSec));
    return res;
  }

  // El API de RENIEC/UNAMAD es intermitente: a veces responde 502, a veces
  // tarda ~16 s, a veces <1 s. Damos un timeout amplio y reintentamos una vez
  // ante fallo transitorio (5xx/red/timeout). Además distinguimos "servicio
  // caído" (502) de "DNI inexistente" (404) para dar el mensaje correcto.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const upstream = await fetch(`${API_BASE}/${dni}`, {
        signal: AbortSignal.timeout(20000),
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
        },
      });

      if (upstream.status === 404) {
        return fail("No encontramos ese DNI.", 404);
      }
      // 401/403 no son transitorios: reintentar no arregla un token invalido.
      if (upstream.status === 401 || upstream.status === 403) {
        console.error(
          `dni-lookup: el API respondio ${upstream.status}. Revisa DNI_API_TOKEN en .env.`,
        );
        return fail("Servicio de consulta no disponible.", 502);
      }
      if (!upstream.ok) {
        continue; // 5xx u otro estado transitorio → reintentar
      }

      const data = (await upstream.json().catch(() => null)) as {
        NOMBRES?: string;
        AP_PAT?: string;
        AP_MAT?: string;
      } | null;

      const fullName = [data?.NOMBRES, data?.AP_PAT, data?.AP_MAT]
        .filter((s): s is string => typeof s === "string" && s.trim() !== "")
        .join(" ")
        .trim();

      if (!fullName) {
        return fail("No encontramos ese DNI.", 404);
      }

      return ok({ name: toTitleCase(fullName) });
    } catch {
      // Timeout o red: transitorio → reintentar en la siguiente vuelta.
    }
  }

  // Reintentos agotados por fallo transitorio del API externo: el usuario
  // escribe su nombre a mano.
  return fail("Servicio de consulta no disponible.", 502);
}
