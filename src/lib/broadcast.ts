import "server-only";
import { prisma } from "@/lib/prisma";

export type BroadcastStatus = "live" | "upcoming" | "recorded";

export type BroadcastConfig = {
  enabled: boolean;
  showOnHome: boolean;
  status: BroadcastStatus;
  region: string;
  title: string;
  subtitle: string;
  url: string;
  embedUrl: string;
  customMessage: string;
  updatedAt: string | null;
};

// Claves en la tabla SiteSetting
export const SETTING_BROADCAST_ENABLED = "broadcast.enabled";
export const SETTING_BROADCAST_SHOW_HOME = "broadcast.showOnHome";
export const SETTING_BROADCAST_STATUS = "broadcast.status";
export const SETTING_BROADCAST_REGION = "broadcast.region";
export const SETTING_BROADCAST_TITLE = "broadcast.title";
export const SETTING_BROADCAST_SUBTITLE = "broadcast.subtitle";
export const SETTING_BROADCAST_URL = "broadcast.url";
export const SETTING_BROADCAST_MESSAGE = "broadcast.customMessage";

/**
 * Extrae el ID de YouTube o genera la URL de incrustación segura.
 * Soporta formatos:
 * - https://youtube.com/live/ID?feature=share
 * - https://youtu.be/ID
 * - https://www.youtube.com/watch?v=ID
 * - https://www.youtube.com/embed/ID
 * - URL de Facebook o iframe genérico (si ya es embed)
 */
export function parseEmbedUrl(rawUrl: string): string {
  let url = (rawUrl || "").trim();
  if (!url) return "";

  // 1. Si pegan el código iframe completo: <iframe ... src="https://..." ...>
  const iframeSrcMatch = url.match(/src=["']([^"']+)["']/i);
  if (iframeSrcMatch && iframeSrcMatch[1]) {
    url = iframeSrcMatch[1];
  }

  // 2. YouTube matchers
  const youtubeLive = url.match(/youtube\.com\/live\/([a-zA-Z0-9_-]+)/);
  if (youtubeLive && youtubeLive[1]) {
    return `https://www.youtube.com/embed/${youtubeLive[1]}?autoplay=1&rel=0&modestbranding=1`;
  }

  const youtuBe = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (youtuBe && youtuBe[1]) {
    return `https://www.youtube.com/embed/${youtuBe[1]}?autoplay=1&rel=0&modestbranding=1`;
  }

  const youtubeWatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (youtubeWatch && youtubeWatch[1]) {
    return `https://www.youtube.com/embed/${youtubeWatch[1]}?autoplay=1&rel=0&modestbranding=1`;
  }

  const youtubeEmbed = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (youtubeEmbed && youtubeEmbed[1]) {
    return `https://www.youtube.com/embed/${youtubeEmbed[1]}?autoplay=1&rel=0&modestbranding=1`;
  }

  // 3. Facebook Live y Videos de Facebook
  if (url.includes("facebook.com/plugins/video.php")) {
    return url;
  }
  if (url.includes("facebook.com") || url.includes("fb.watch")) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
      url
    )}&show_text=false&autoplay=true`;
  }

  // 4. Si es cualquier otra URL HTTPS de streaming o embed
  if (url.startsWith("https://") || url.startsWith("http://")) {
    return url;
  }

  return "";
}

/**
 * Obtiene la configuración actual de la transmisión desde SiteSetting.
 */
export async function getBroadcastConfig(): Promise<BroadcastConfig> {
  const keys = [
    SETTING_BROADCAST_ENABLED,
    SETTING_BROADCAST_SHOW_HOME,
    SETTING_BROADCAST_STATUS,
    SETTING_BROADCAST_REGION,
    SETTING_BROADCAST_TITLE,
    SETTING_BROADCAST_SUBTITLE,
    SETTING_BROADCAST_URL,
    SETTING_BROADCAST_MESSAGE,
  ];

  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: keys } },
  });

  const map = new Map<string, { value: string; updatedAt: Date }>();
  for (const r of rows) {
    map.set(r.key, { value: r.value, updatedAt: r.updatedAt });
  }

  const rawUrl = map.get(SETTING_BROADCAST_URL)?.value || "";
  const statusVal = (map.get(SETTING_BROADCAST_STATUS)?.value as BroadcastStatus) || "live";
  const validStatus: BroadcastStatus = ["live", "upcoming", "recorded"].includes(statusVal)
    ? statusVal
    : "live";

  // Buscar la fecha de actualización más reciente
  let maxDate: Date | null = null;
  for (const item of map.values()) {
    if (!maxDate || item.updatedAt > maxDate) {
      maxDate = item.updatedAt;
    }
  }

  return {
    enabled: map.get(SETTING_BROADCAST_ENABLED)?.value === "1",
    showOnHome: map.get(SETTING_BROADCAST_SHOW_HOME)?.value !== "0", // por defecto true si está activado
    status: validStatus,
    region: map.get(SETTING_BROADCAST_REGION)?.value || "Madre de Dios",
    title:
      map.get(SETTING_BROADCAST_TITLE)?.value ||
      "Debate Electoral Regional Madre de Dios 2026",
    subtitle:
      map.get(SETTING_BROADCAST_SUBTITLE)?.value ||
      "Jurado Nacional de Elecciones (JNE) · Voto Informado",
    url: rawUrl,
    embedUrl: parseEmbedUrl(rawUrl),
    customMessage:
      map.get(SETTING_BROADCAST_MESSAGE)?.value ||
      "¡Sigue en vivo la participación de Simón Horna y las propuestas para el desarrollo de nuestra región!",
    updatedAt: maxDate ? maxDate.toISOString() : null,
  };
}

/**
 * Guarda las configuraciones de transmisión en SiteSetting.
 */
export async function saveBroadcastConfig(data: {
  enabled: boolean;
  showOnHome: boolean;
  status: BroadcastStatus;
  region: string;
  title: string;
  subtitle: string;
  url: string;
  customMessage: string;
}): Promise<void> {
  const entries: [string, string][] = [
    [SETTING_BROADCAST_ENABLED, data.enabled ? "1" : "0"],
    [SETTING_BROADCAST_SHOW_HOME, data.showOnHome ? "1" : "0"],
    [SETTING_BROADCAST_STATUS, data.status],
    [SETTING_BROADCAST_REGION, data.region.trim()],
    [SETTING_BROADCAST_TITLE, data.title.trim()],
    [SETTING_BROADCAST_SUBTITLE, data.subtitle.trim()],
    [SETTING_BROADCAST_URL, data.url.trim()],
    [SETTING_BROADCAST_MESSAGE, data.customMessage.trim()],
  ];

  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.siteSetting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    )
  );
}
