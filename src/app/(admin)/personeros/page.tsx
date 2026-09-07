import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getSettingBool, SETTING_PERSONEROS_PUBLIC } from "@/lib/settings";
import { PersonerosClient } from "./PersonerosClient";
import type { PersoneroRow, PermFlags, LocalOption, ElectoralLocalData } from "./types";

export const metadata: Metadata = { title: "Personeros · Ahora Nación Admin" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const me = await requirePermission("personeros.read");

  // 1. Cargar personeros
  const personeros = await prisma.personero.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  const rows: PersoneroRow[] = personeros.map((p) => ({
    id: p.id,
    docType: p.docType,
    docNumber: p.docNumber,
    name: p.name,
    phone: p.phone,
    source: p.source,
    district: p.district,
    localName: p.localName,
    localAddress: p.localAddress,
    mesa: p.mesa,
    aula: p.aula,
    role: p.role,
    isSuplente: p.isSuplente || p.role === "suplente",
    coordinatorName: p.coordinatorName,
    coordinatorPhone: p.coordinatorPhone,
    active: p.active,
    notes: p.notes,
    whatsappNotifiedAt: p.whatsappNotifiedAt?.toISOString() ?? null,
    credentialToken: p.credentialToken,
    isMesaMember: p.isMesaMember,
    createdAt: p.createdAt.toISOString(),
    createdByName: p.createdBy?.name ?? null,
  }));

  // Mapear personeros por número de mesa: Titular y Suplente
  const titularByMesa = new Map<string, (typeof rows)[0]>();
  const suplenteByMesa = new Map<string, (typeof rows)[0]>();
  for (const r of rows) {
    if (r.mesa && r.active) {
      if (r.isSuplente || r.role === "suplente") {
        if (!suplenteByMesa.has(r.mesa)) suplenteByMesa.set(r.mesa, r);
      } else {
        if (!titularByMesa.has(r.mesa)) titularByMesa.set(r.mesa, r);
      }
    }
  }

  // 2. Cargar Locales Electorales y sus Mesas
  const electoralLocales = await prisma.electoralLocal.findMany({
    orderBy: { name: "asc" },
    include: {
      mesas: {
        orderBy: { number: "asc" },
      },
    },
  });

  const electoralLocalesData: ElectoralLocalData[] = electoralLocales.map((loc) => {
    let cubiertasCount = 0;
    let cubiertasSuplenteCount = 0;
    const mesasData = loc.mesas.map((m) => {
      const titular = titularByMesa.get(m.number);
      const suplente = suplenteByMesa.get(m.number);
      if (titular) cubiertasCount++;
      if (suplente) cubiertasSuplenteCount++;

      const mainPersonero = titular || suplente;

      return {
        id: m.id,
        number: m.number,
        localId: m.localId,
        aula: m.aula || titular?.aula || suplente?.aula || null,
        onpePresidente: m.onpePresidente,
        onpeSecretario: m.onpeSecretario,
        onpeSuplentes: m.onpeSuplentes,
        titular: titular
          ? {
              id: titular.id,
              name: titular.name,
              phone: titular.phone,
              aula: titular.aula,
              role: "titular",
              isSuplente: false,
              whatsappNotifiedAt: titular.whatsappNotifiedAt,
            }
          : null,
        suplente: suplente
          ? {
              id: suplente.id,
              name: suplente.name,
              phone: suplente.phone,
              aula: suplente.aula,
              role: "suplente",
              isSuplente: true,
              whatsappNotifiedAt: suplente.whatsappNotifiedAt,
            }
          : null,
        personero: mainPersonero
          ? {
              id: mainPersonero.id,
              name: mainPersonero.name,
              phone: mainPersonero.phone,
              aula: mainPersonero.aula,
              role: mainPersonero.role,
              isSuplente: mainPersonero.isSuplente,
              whatsappNotifiedAt: mainPersonero.whatsappNotifiedAt,
            }
          : null,
      };
    });

    return {
      id: loc.id,
      code: loc.code,
      name: loc.name,
      address: loc.address,
      district: loc.district,
      province: loc.province,
      latitude: loc.latitude,
      longitude: loc.longitude,
      totalMesas: loc.mesas.length,
      coordinatorName: loc.coordinatorName,
      coordinatorPhone: loc.coordinatorPhone,
      mesas: mesasData,
      cubiertasCount,
      cubiertasSuplenteCount,
    };
  });

  const perms: PermFlags = {
    canRead: me.permissions.has("personeros.read") || me.permissions.has("users.read"),
    canWrite:
      me.permissions.has("personeros.write") ||
      me.permissions.has("locales.write") ||
      me.permissions.has("mesas.write") ||
      me.permissions.has("users.write"),
  };

  // Opciones de autocompletado de locales
  const locales: LocalOption[] = electoralLocales.map((l) => ({
    id: l.id,
    name: l.name,
    address: l.address,
    locality: l.province,
    district: l.district,
  }));

  const publicRegistration = await getSettingBool(SETTING_PERSONEROS_PUBLIC);

  return (
    <PersonerosClient
      rows={rows}
      perms={perms}
      locales={locales}
      electoralLocales={electoralLocalesData}
      publicRegistration={publicRegistration}
    />
  );
}
