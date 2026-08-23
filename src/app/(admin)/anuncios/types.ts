import type { AnnouncementStatus } from "@/lib/announcements";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> };

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  published: boolean;
  startsAt: string | null; // ISO
  endsAt: string | null; // ISO
  status: AnnouncementStatus;
  createdAt: string; // ISO
  createdByName: string | null;
};

export type PermFlags = { canRead: boolean; canWrite: boolean };
