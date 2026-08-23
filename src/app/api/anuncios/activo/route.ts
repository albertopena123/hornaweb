import { prisma } from "@/lib/prisma";
import { ok } from "@/app/api/v1/_lib/response";
import { announcementImageUrl, type AnnouncementPublic } from "@/lib/announcements";

export const dynamic = "force-dynamic";

// Devuelve el aviso vigente más reciente (o null). Nunca falla: la landing no
// debe romperse por un aviso.
export async function GET() {
  try {
    const now = new Date();
    const a = await prisma.announcement.findFirst({
      where: {
        published: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { createdAt: "desc" },
    });
    const announcement: AnnouncementPublic | null = a
      ? {
          id: a.id,
          title: a.title,
          body: a.body,
          imageUrl: announcementImageUrl(a.imagePath),
          ctaLabel: a.ctaLabel,
          ctaUrl: a.ctaUrl,
        }
      : null;
    const res = ok({ announcement });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    console.warn("GET /api/anuncios/activo:", e);
    const res = ok({ announcement: null });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}
