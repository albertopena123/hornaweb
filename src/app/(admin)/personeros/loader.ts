import { requirePermission } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getSettingBool, SETTING_PERSONEROS_PUBLIC } from "@/lib/settings";
import type { PersoneroRow, PermFlags, LocalOption, ElectoralLocalData } from "./types";

export async function getPersonerosData() {
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

  let totalMesasCount = 0;
  let totalMesasCubiertas = 0;
  let totalColegiosConCoord = 0;

  const electoralLocalesData: ElectoralLocalData[] = electoralLocales.map((loc) => {
    let cubiertasCount = 0;
    let cubiertasSuplenteCount = 0;

    if (loc.coordinatorName && loc.coordinatorName.trim() !== "") {
      totalColegiosConCoord++;
    }

    const mesasData = loc.mesas.map((m) => {
      totalMesasCount++;
      const titular = titularByMesa.get(m.number);
      const suplente = suplenteByMesa.get(m.number);
      if (titular) {
        cubiertasCount++;
        totalMesasCubiertas++;
      }
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
      coordinatorDni: loc.coordinatorDni ?? null,
      mesas: mesasData,
      cubiertasCount,
      cubiertasSuplenteCount,
    };
  });

  const canReadPersoneros = me.permissions.has("personeros.read") || me.permissions.has("users.read");
  const canWritePersoneros = me.permissions.has("personeros.write") || me.permissions.has("users.write");
  const canReadLocales = me.permissions.has("locales.read") || canReadPersoneros;
  const canWriteLocales = me.permissions.has("locales.write") || me.permissions.has("users.write");
  const canReadMesas = me.permissions.has("mesas.read") || canReadPersoneros;
  const canWriteMesas = me.permissions.has("mesas.write") || me.permissions.has("users.write");
  const canReadActas = me.permissions.has("actas.read");
  const canWriteActas = me.permissions.has("actas.write");
  const canVerifyActas = me.permissions.has("actas.verify");
  const canReadCandidatos = me.permissions.has("candidatos.read");

  const perms: PermFlags = {
    canRead: canReadPersoneros,
    canWrite: canWritePersoneros || canWriteLocales || canWriteMesas,
    canReadPersoneros,
    canWritePersoneros,
    canReadLocales,
    canWriteLocales,
    canReadMesas,
    canWriteMesas,
    canReadActas,
    canWriteActas,
    canVerifyActas,
    canReadCandidatos,
  };

  const locales: LocalOption[] = electoralLocales.map((l) => ({
    id: l.id,
    name: l.name,
    address: l.address,
    locality: l.province,
    district: l.district,
  }));

  const publicRegistration = await getSettingBool(SETTING_PERSONEROS_PUBLIC);

  const notificadosCount = rows.filter((r) => !!r.whatsappNotifiedAt).length;
  const faltantesCount = Math.max(0, totalMesasCount - totalMesasCubiertas);
  const pctCubiertas = totalMesasCount > 0 ? Math.round((totalMesasCubiertas / totalMesasCount) * 100) : 0;

  const stats = {
    totalMesas: totalMesasCount,
    mesasCubiertas: totalMesasCubiertas,
    mesasFaltantes: faltantesCount,
    pctCubiertas,
    totalPersoneros: rows.length,
    notificadosCount,
    colegiosTotal: electoralLocales.length,
    colegiosConCoord: totalColegiosConCoord,
  };

  return {
    rows,
    electoralLocales: electoralLocalesData,
    locales,
    perms,
    publicRegistration,
    stats,
  };
}
