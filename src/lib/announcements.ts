// Reglas de vigencia de un aviso. Compartido por admin, API pública y landing.
export type AnnouncementStatus = "draft" | "scheduled" | "expired" | "live";

export type AnnouncementWindow = {
  published: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

export const STATUS_LABEL: Record<AnnouncementStatus, string> = {
  draft: "Borrador",
  scheduled: "Programado",
  expired: "Vencido",
  live: "Publicado",
};

export function statusOf(a: AnnouncementWindow, now: Date = new Date()): AnnouncementStatus {
  if (!a.published) return "draft";
  if (a.startsAt && a.startsAt.getTime() > now.getTime()) return "scheduled";
  if (a.endsAt && a.endsAt.getTime() < now.getTime()) return "expired";
  return "live";
}

export function isLive(a: AnnouncementWindow, now: Date = new Date()): boolean {
  return statusOf(a, now) === "live";
}

export function announcementImageUrl(imagePath: string | null | undefined): string | null {
  return imagePath ? `/api/uploads/anuncios/${imagePath}` : null;
}

// Datos que viajan al modal público (y a la vista previa del admin).
export type AnnouncementPublic = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
};
