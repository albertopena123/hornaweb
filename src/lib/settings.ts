import "server-only";
import { prisma } from "@/lib/prisma";

// Ajustes globales clave/valor persistidos en SiteSetting. Booleanos como "1"/"0".

/** Inscripción pública de personeros desde el landing (formulario flotante). */
export const SETTING_PERSONEROS_PUBLIC = "personeros.publicRegistration";

export async function getSettingBool(key: string, fallback = false): Promise<boolean> {
  const s = await prisma.siteSetting.findUnique({ where: { key } });
  return s ? s.value === "1" : fallback;
}

export async function setSettingBool(key: string, value: boolean): Promise<void> {
  const v = value ? "1" : "0";
  await prisma.siteSetting.upsert({ where: { key }, create: { key, value: v }, update: { value: v } });
}
