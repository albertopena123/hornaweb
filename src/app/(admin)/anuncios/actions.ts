"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/server";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, removeUpload, saveUpload } from "@/lib/uploads";
import type { ActionResult } from "./types";

const SUB = "anuncios";

class Denied extends Error {}

async function authorize(perm: "anuncios.read" | "anuncios.write"): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me || !me.permissions.has(perm)) throw new Denied();
  return me;
}

function fail(error: string, fieldErrors?: Partial<Record<string, string>>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

function refresh() {
  revalidatePath("/anuncios");
}

type Validated = {
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  published: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  image: File | null;
  removeImage: boolean;
};

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

// Acepta una fecha ISO-8601 (el cliente convierte su datetime-local a UTC) o vacío.
function parseIsoDate(s: string): Date | null | undefined {
  if (s === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(s)) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function validate(fd: FormData): { data?: Validated; fieldErrors?: Record<string, string> } {
  const fe: Record<string, string> = {};

  const title = str(fd, "title");
  if (title.length < 3 || title.length > 120) fe.title = "Título de 3 a 120 caracteres.";

  const body = str(fd, "body");
  if (body.length < 1 || body.length > 1000) fe.body = "Texto de 1 a 1000 caracteres.";

  const ctaLabelRaw = str(fd, "ctaLabel");
  const ctaUrlRaw = str(fd, "ctaUrl");
  if (ctaLabelRaw.length > 40) fe.ctaLabel = "Máximo 40 caracteres.";
  if (ctaUrlRaw !== "" && !/^(https?:\/\/\S+|\/\S*)$/.test(ctaUrlRaw))
    fe.ctaUrl = "Debe empezar por http://, https:// o /.";
  if (ctaLabelRaw !== "" && ctaUrlRaw === "") fe.ctaUrl = "Indica el enlace del botón.";
  if (ctaUrlRaw !== "" && ctaLabelRaw === "") fe.ctaLabel = "Indica el texto del botón.";

  const startsAt = parseIsoDate(str(fd, "startsAt"));
  if (startsAt === undefined) fe.startsAt = "Fecha inválida.";
  const endsAt = parseIsoDate(str(fd, "endsAt"));
  if (endsAt === undefined) fe.endsAt = "Fecha inválida.";
  if (startsAt && endsAt && startsAt.getTime() > endsAt.getTime())
    fe.endsAt = "Debe ser posterior a 'Mostrar desde'.";

  let image: File | null = null;
  const f = fd.get("image");
  if (f instanceof File && f.size > 0) {
    if (!IMAGE_TYPES[f.type]) fe.image = "Solo JPG, PNG o WebP.";
    else if (f.size > MAX_IMAGE_BYTES) fe.image = "La imagen supera 3 MB.";
    else image = f;
  }

  if (Object.keys(fe).length > 0) return { fieldErrors: fe };
  return {
    data: {
      title,
      body,
      ctaLabel: ctaLabelRaw === "" ? null : ctaLabelRaw,
      ctaUrl: ctaUrlRaw === "" ? null : ctaUrlRaw,
      published: str(fd, "published") === "1",
      startsAt: startsAt ?? null,
      endsAt: endsAt ?? null,
      image,
      removeImage: str(fd, "removeImage") === "1",
    },
  };
}

export async function createAnnouncement(fd: FormData): Promise<ActionResult<{ id: string }>> {
  let savedImage: string | null = null;
  try {
    const me = await authorize("anuncios.write");
    const v = validate(fd);
    if (!v.data) return fail("Revisa los campos marcados.", v.fieldErrors);
    // removeImage no aplica al crear (no hay imagen previa que quitar).
    const { image, removeImage: _removeImage, ...data } = v.data;
    void _removeImage;
    if (image) {
      try {
        savedImage = await saveUpload(image, SUB);
      } catch (e) {
        console.error("createAnnouncement saveUpload", e);
        return fail("No se pudo guardar la imagen.", { image: "Inténtalo de nuevo." });
      }
    }
    const a = await prisma.announcement.create({
      data: { ...data, imagePath: savedImage, createdById: me.id, updatedById: me.id },
    });
    savedImage = null;
    refresh();
    return { ok: true, data: { id: a.id } };
  } catch (e) {
    await removeUpload(SUB, savedImage);
    if (e instanceof Denied) return fail("No tienes permiso para gestionar avisos.");
    console.error("createAnnouncement", e);
    return fail("Error inesperado al crear el aviso.");
  }
}

export async function updateAnnouncement(id: string, fd: FormData): Promise<ActionResult> {
  let savedImage: string | null = null;
  try {
    const me = await authorize("anuncios.write");
    const v = validate(fd);
    if (!v.data) return fail("Revisa los campos marcados.", v.fieldErrors);
    const current = await prisma.announcement.findUnique({ where: { id }, select: { imagePath: true } });
    if (!current) return fail("El aviso ya no existe.");
    const { image, removeImage, ...data } = v.data;

    let imagePath: string | null = current.imagePath;
    if (image) {
      try {
        savedImage = await saveUpload(image, SUB);
      } catch (e) {
        console.error("updateAnnouncement saveUpload", e);
        return fail("No se pudo guardar la imagen.", { image: "Inténtalo de nuevo." });
      }
      imagePath = savedImage;
    } else if (removeImage) {
      imagePath = null;
    }

    await prisma.announcement.update({
      where: { id },
      data: { ...data, imagePath, updatedById: me.id },
    });
    savedImage = null;
    // Borra la imagen anterior solo cuando la nueva quedó registrada.
    if (current.imagePath && current.imagePath !== imagePath) await removeUpload(SUB, current.imagePath);
    refresh();
    return { ok: true };
  } catch (e) {
    await removeUpload(SUB, savedImage);
    if (e instanceof Denied) return fail("No tienes permiso para gestionar avisos.");
    console.error("updateAnnouncement", e);
    return fail("Error inesperado al guardar.");
  }
}

export async function setAnnouncementPublished(id: string, published: boolean): Promise<ActionResult> {
  try {
    const me = await authorize("anuncios.write");
    await prisma.announcement.update({ where: { id }, data: { published, updatedById: me.id } });
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar avisos.");
    console.error("setAnnouncementPublished", e);
    return fail("Error inesperado al cambiar la publicación.");
  }
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  try {
    await authorize("anuncios.write");
    const a = await prisma.announcement.delete({ where: { id }, select: { imagePath: true } });
    await removeUpload(SUB, a.imagePath);
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar avisos.");
    console.error("deleteAnnouncement", e);
    return fail("Error inesperado al eliminar.");
  }
}
