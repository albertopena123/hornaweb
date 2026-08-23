import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { CampanasClient } from "./CampanasClient";
import type { CampaignRow, PermFlags } from "../types";

export const metadata: Metadata = { title: "Campañas · UNAMAD Admin" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const me = await requirePermission("mensajes.read");
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
  const rows: CampaignRow[] = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    audience: c.audience,
    district: c.district,
    totalRecipients: c.totalRecipients,
    sentCount: c.sentCount,
    failedCount: c.failedCount,
    dailyCap: c.dailyCap,
    pausedReason: c.pausedReason,
    createdAt: c.createdAt.toISOString(),
    startedAt: c.startedAt?.toISOString() ?? null,
    finishedAt: c.finishedAt?.toISOString() ?? null,
    createdByName: c.createdBy?.name ?? null,
  }));
  const perms: PermFlags = {
    canRead: me.permissions.has("mensajes.read"),
    canWrite: me.permissions.has("mensajes.write"),
  };
  return <CampanasClient rows={rows} perms={perms} />;
}
