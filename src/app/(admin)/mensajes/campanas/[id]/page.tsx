import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { CampaignDetailClient } from "./CampaignDetailClient";
import { getCampaignProgress, getCampaignRecipients } from "../actions";
import type { CampaignDetail, PermFlags } from "../../types";

export const metadata: Metadata = { title: "Campaña · UNAMAD Admin" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePermission("mensajes.read");
  const { id } = await params;
  const c = await prisma.campaign.findUnique({ where: { id }, include: { createdBy: { select: { name: true } } } });
  if (!c) notFound();

  const campaign: CampaignDetail = {
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
    messageTemplate: c.messageTemplate,
    minDelaySec: c.minDelaySec,
    maxDelaySec: c.maxDelaySec,
    windowStart: c.windowStart,
    windowEnd: c.windowEnd,
    lastError: c.lastError,
  };

  const [progress, recipients] = await Promise.all([
    getCampaignProgress(id),
    getCampaignRecipients(id, { status: "all", page: 1, pageSize: 100 }),
  ]);
  if (!progress.ok || !recipients.ok) notFound();

  const perms: PermFlags = {
    canRead: me.permissions.has("mensajes.read"),
    canWrite: me.permissions.has("mensajes.write"),
  };

  return (
    <CampaignDetailClient
      campaign={campaign}
      initialProgress={progress.data!}
      initialRecipients={recipients.data!}
      perms={perms}
    />
  );
}
