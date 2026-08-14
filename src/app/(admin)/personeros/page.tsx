import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { PersonerosClient } from "./PersonerosClient";
import type { PersoneroRow, PermFlags, LocalOption } from "./types";

export const metadata: Metadata = { title: "Personeros · UNAMAD Admin" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const me = await requirePermission("personeros.read");

  const personeros = await prisma.personero.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  const rows: PersoneroRow[] = personeros.map((p) => ({
    id: p.id,
    docType: p.docType,
    docNumber: p.docNumber,
    name: p.name,
    district: p.district,
    localName: p.localName,
    localAddress: p.localAddress,
    mesa: p.mesa,
    coordinatorName: p.coordinatorName,
    coordinatorPhone: p.coordinatorPhone,
    active: p.active,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    createdByName: p.createdBy?.name ?? null,
  }));

  const perms: PermFlags = {
    canRead: me.permissions.has("personeros.read"),
    canWrite: me.permissions.has("personeros.write"),
  };

  // Locales educativos (padrón MINEDU) para el autocompletado del formulario.
  const locales: LocalOption[] = await prisma.local.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, address: true, locality: true, district: true },
  });

  return <PersonerosClient rows={rows} perms={perms} locales={locales} />;
}
