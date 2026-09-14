import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { toTitleCase } from "@/lib/text";

const MAX_PER_IP = 25;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutos

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ dni: string }> }
) {
  const { dni } = await params;

  if (!/^\d{8}$/.test(dni)) {
    return NextResponse.json(
      { ok: false, error: "El DNI debe tener 8 dígitos numéricos." },
      { status: 400 }
    );
  }

  const rl = rateLimit("donde-votar", clientIp(req), MAX_PER_IP, WINDOW_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: `Demasiadas consultas. Intenta de nuevo en ${rl.retryAfterSec} segundos.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  // Comprobar si también es personero asignado de Ahora Nación
  const personero = await prisma.personero.findFirst({
    where: { docType: "dni", docNumber: dni, active: true },
  });

  // 1. Revisar si ya lo tenemos en caché de base de datos PostgreSQL
  const cached = await prisma.electorConsulta.findUnique({
    where: { dni },
  });

  if (cached) {
    const fullName = toTitleCase(`${cached.nombres} ${cached.apellidos}`.trim());
    return NextResponse.json({
      ok: true,
      source: "cache",
      data: {
        dni: cached.dni,
        nombres: toTitleCase(cached.nombres),
        apellidos: toTitleCase(cached.apellidos),
        fullName,
        miembroMesa: cached.miembroMesa,
        cargo: cached.cargo ?? (cached.miembroMesa ? "ERES MIEMBRO DE MESA" : "NO ERES MIEMBRO DE MESA"),
        localVotacion: cached.localVotacion ?? "Por asignar",
        direccion: cached.direccion ?? "",
        referencia: cached.referencia ?? "",
        ubigeo: cached.ubigeo ?? "",
        mesaSufragio: cached.mesaSufragio ?? "",
        orden: cached.orden ?? "",
        tipoVoto: cached.tipoVoto ?? "CONVENCIONAL",
        localLatitud: cached.localLatitud ?? null,
        localLongitud: cached.localLongitud ?? null,
        // Información del personero si aplica
        isPersonero: Boolean(personero),
        personeroRole: personero?.role ?? null,
        coordinatorName: personero?.coordinatorName ?? null,
        coordinatorPhone: personero?.coordinatorPhone ?? null,
        credentialToken: personero?.credentialToken || personero?.id || null,
      },
    });
  }

  // 2. Si no está en BD, consultar vía proxy a EligePerú (con auto-reintento interno si el scraper está en proceso)
  try {
    let payload: any = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      try {
        const upstream = await fetch("https://eligeperu.pe/onpe.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Referer: "https://eligeperu.pe/",
            Origin: "https://eligeperu.pe",
            Accept: "application/json, text/javascript, */*; q=0.01",
          },
          body: `dni=${encodeURIComponent(dni)}`,
          signal: controller.signal,
          cache: "no-store",
        });

        clearTimeout(timeoutId);

        if (upstream.ok) {
          const json = await upstream.json().catch(() => null);
          if (json && json.status === "success" && json.data) {
            payload = json;
            break; // ¡Éxito!
          }
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (attempts >= maxAttempts && err?.name === "AbortError") {
          throw err;
        }
      }

      // Si no obtuvo datos todavía y quedan intentos, esperar 1.2s antes de reintentar
      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    }

    if (!payload || payload.status !== "success" || !payload.data) {
      const msg = payload?.message || "No se encontraron datos para este DNI en el padrón electoral.";
      return NextResponse.json({ ok: false, error: msg }, { status: 404 });
    }

    const d = payload.data;
    const isMiembro = Boolean(d.miembroMesa === true);
    const cargoTexto = d.cargo || (isMiembro ? "ERES MIEMBRO DE MESA" : "NO ERES MIEMBRO DE MESA");

    // Guardar en la base de datos para construir nuestro propio padrón enriquecido
    const saved = await prisma.electorConsulta.upsert({
      where: { dni },
      update: {
        nombres: d.nombres || "",
        apellidos: d.apellidos || "",
        miembroMesa: isMiembro,
        cargo: cargoTexto,
        localVotacion: d.localVotacion || "",
        direccion: d.direccion || "",
        referencia: d.referencia || "",
        ubigeo: d.ubigeo || "",
        mesaSufragio: d.mesaSufragio || "",
        orden: String(d.orden || ""),
        tipoVoto: d.tipoVoto || "CONVENCIONAL",
        localLatitud: d.localLatitud ? String(d.localLatitud) : null,
        localLongitud: d.localLongitud ? String(d.localLongitud) : null,
        codigoLocal: d.codigoLocal ? String(d.codigoLocal) : null,
        rawPayload: d,
      },
      create: {
        dni,
        nombres: d.nombres || "",
        apellidos: d.apellidos || "",
        miembroMesa: isMiembro,
        cargo: cargoTexto,
        localVotacion: d.localVotacion || "",
        direccion: d.direccion || "",
        referencia: d.referencia || "",
        ubigeo: d.ubigeo || "",
        mesaSufragio: d.mesaSufragio || "",
        orden: String(d.orden || ""),
        tipoVoto: d.tipoVoto || "CONVENCIONAL",
        localLatitud: d.localLatitud ? String(d.localLatitud) : null,
        localLongitud: d.localLongitud ? String(d.localLongitud) : null,
        codigoLocal: d.codigoLocal ? String(d.codigoLocal) : null,
        rawPayload: d,
      },
    });

    const fullName = toTitleCase(`${saved.nombres} ${saved.apellidos}`.trim());

    return NextResponse.json({
      ok: true,
      source: "live",
      data: {
        dni: saved.dni,
        nombres: toTitleCase(saved.nombres),
        apellidos: toTitleCase(saved.apellidos),
        fullName,
        miembroMesa: saved.miembroMesa,
        cargo: saved.cargo,
        localVotacion: saved.localVotacion,
        direccion: saved.direccion,
        referencia: saved.referencia,
        ubigeo: saved.ubigeo,
        mesaSufragio: saved.mesaSufragio,
        orden: saved.orden,
        tipoVoto: saved.tipoVoto,
        localLatitud: saved.localLatitud,
        localLongitud: saved.localLongitud,
        isPersonero: Boolean(personero),
        personeroRole: personero?.role ?? null,
        coordinatorName: personero?.coordinatorName ?? null,
        coordinatorPhone: personero?.coordinatorPhone ?? null,
        credentialToken: personero?.credentialToken || personero?.id || null,
      },
    });
  } catch (err: unknown) {
    console.error("Error al consultar EligePerú:", err);
    const isTimeout = (err as Error)?.name === "AbortError";
    const errorMessage = isTimeout
      ? "El servicio electoral tardó en responder debido a alta demanda. Por favor presiona 'Consultar Mesa' nuevamente."
      : "No se pudo conectar con el servicio electoral en este momento. Por favor intenta de nuevo.";

    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: isTimeout ? 504 : 502 }
    );
  }
}
