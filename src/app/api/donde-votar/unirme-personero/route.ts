import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isDistrictId } from "@/lib/districts";
import type { District } from "@/generated/prisma/enums";

const MAX_PER_IP = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit("unirme-personero", ip, MAX_PER_IP, WINDOW_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "Demasiados intentos de registro. Intenta más tarde." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo de solicitud inválido." }, { status: 400 });
  }

  const dni = typeof body.dni === "string" ? body.dni.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim().replace(/\D/g, "") : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const mesa = typeof body.mesa === "string" ? body.mesa.trim() : "";
  const localName = typeof body.localName === "string" ? body.localName.trim() : "";
  const localAddress = typeof body.localAddress === "string" ? body.localAddress.trim() : null;
  const rawDistrict = typeof body.district === "string" ? body.district.trim().toLowerCase() : "";

  if (!/^\d{8}$/.test(dni)) {
    return NextResponse.json({ ok: false, error: "El DNI debe tener 8 dígitos numéricos." }, { status: 400 });
  }

  if (!/^9\d{8}$/.test(phone)) {
    return NextResponse.json(
      { ok: false, error: "Ingresa un número de celular o WhatsApp válido de 9 dígitos (ej. 9XXXXXXXX)." },
      { status: 400 }
    );
  }

  if (!name || !mesa || !localName) {
    return NextResponse.json(
      { ok: false, error: "Faltan datos obligatorios de la mesa electoral." },
      { status: 400 }
    );
  }

  // Buscar si el colegio tiene coordinador asignado en ElectoralLocal
  const matchedLocal = await prisma.electoralLocal.findFirst({
    where: {
      OR: [
        { name: { contains: localName, mode: "insensitive" } },
        { name: { equals: localName, mode: "insensitive" } },
      ],
    },
    select: {
      coordinatorName: true,
      coordinatorPhone: true,
      district: true,
    },
  });

  const coordinatorName =
    matchedLocal?.coordinatorName || "Coordinación Regional Ahora Nación";
  const coordinatorPhone = matchedLocal?.coordinatorPhone || "982555123";

  // Identificar distrito válido para el Enum de Prisma
  let districtEnum: District | null = null;
  if (matchedLocal?.district) {
    districtEnum = matchedLocal.district;
  } else if (rawDistrict && isDistrictId(rawDistrict)) {
    districtEnum = rawDistrict as District;
  }

  try {
    // Comprobar si ya existe registrado
    const existing = await prisma.personero.findUnique({
      where: { docType_docNumber: { docType: "dni", docNumber: dni } },
    });

    if (existing) {
      // Actualizar teléfono y mesa si no los tenía
      const updated = await prisma.personero.update({
        where: { id: existing.id },
        data: {
          phone: phone || existing.phone,
          mesa: mesa || existing.mesa,
          localName: localName || existing.localName,
          localAddress: localAddress || existing.localAddress,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        ok: true,
        alreadyRegistered: true,
        message: `¡Ya estabas registrado como personero! Hemos actualizado tu número de contacto.`,
        data: {
          name: updated.name,
          mesa: updated.mesa,
          localName: updated.localName,
          coordinatorName: updated.coordinatorName || coordinatorName,
          coordinatorPhone: updated.coordinatorPhone || coordinatorPhone,
        },
      });
    }

    // Crear nueva inscripción de personero
    const created = await prisma.personero.create({
      data: {
        docType: "dni",
        docNumber: dni,
        name,
        phone,
        district: districtEnum,
        localName,
        localAddress,
        mesa,
        role: "titular",
        coordinatorName,
        coordinatorPhone,
        source: "public",
        active: true,
        notes: `Inscripción rápida voluntaria desde consulta de mesa (/mi-mesa). IP: ${ip}`,
      },
    });

    return NextResponse.json({
      ok: true,
      alreadyRegistered: false,
      message: "¡Inscripción exitosa! Ahora formas parte del equipo de personeros de Simón Horna.",
      data: {
        id: created.id,
        name: created.name,
        mesa: created.mesa,
        localName: created.localName,
        coordinatorName: created.coordinatorName,
        coordinatorPhone: created.coordinatorPhone,
        token: created.credentialToken || created.id,
      },
    });
  } catch (err: unknown) {
    console.error("Error al registrar personero rápido:", err);
    return NextResponse.json(
      { ok: false, error: "No se pudo procesar la inscripción. Por favor intenta de nuevo." },
      { status: 500 }
    );
  }
}
