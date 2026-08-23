import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { announcementImageUrl, statusOf } from "@/lib/announcements";
import { AnunciosClient } from "./AnunciosClient";
import type { AnnouncementRow, PermFlags } from "./types";

export const metadata: Metadata = { title: "Avisos · UNAMAD Admin" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const me = await requirePermission("anuncios.read");

  const list = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  const now = new Date();
  const rows: AnnouncementRow[] = list.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    imageUrl: announcementImageUrl(a.imagePath),
    ctaLabel: a.ctaLabel,
    ctaUrl: a.ctaUrl,
    published: a.published,
    startsAt: a.startsAt?.toISOString() ?? null,
    endsAt: a.endsAt?.toISOString() ?? null,
    status: statusOf(a, now),
    createdAt: a.createdAt.toISOString(),
    createdByName: a.createdBy?.name ?? null,
  }));

  const perms: PermFlags = {
    canRead: me.permissions.has("anuncios.read"),
    canWrite: me.permissions.has("anuncios.write"),
  };

  return <AnunciosClient rows={rows} perms={perms} />;
}
