import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { SupportersClient } from "./SupportersClient";
import type { SupporterRow, PermFlags } from "./types";

export const metadata: Metadata = { title: "Simpatizantes · UNAMAD Admin" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const me = await requirePermission("supporters.read");

  const supporters = await prisma.supporter.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
    },
  });

  const rows: SupporterRow[] = supporters.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    docType: s.docType,
    docNumber: s.docNumber,
    latitude: s.latitude,
    longitude: s.longitude,
    district: s.district,
    source: s.source,
    status: s.status,
    notes: s.notes,
    createdAt: s.createdAt.toISOString(),
    createdByName: s.createdBy?.name ?? null,
    reviewedByName: s.reviewedBy?.name ?? null,
  }));

  const perms: PermFlags = {
    canRead: me.permissions.has("supporters.read"),
    canWrite: me.permissions.has("supporters.write"),
  };

  return <SupportersClient rows={rows} perms={perms} />;
}
