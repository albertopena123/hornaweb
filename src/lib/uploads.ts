import "server-only";
import { mkdir, writeFile, unlink } from "fs/promises";
import { randomBytes } from "crypto";
import path from "path";

// Carpeta raíz de archivos subidos (fuera de /public para no depender del build).
export function uploadsRoot(): string {
  return process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.join(process.cwd(), "uploads");
}

export function uploadsDir(sub: string): string {
  return path.join(uploadsRoot(), sub);
}

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export function isSafeFilename(name: string): boolean {
  return /^[a-z0-9]+\.(jpg|png|webp)$/.test(name);
}

export function contentTypeFor(name: string): string {
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

// Guarda una imagen ya validada (tipo y tamaño) y devuelve su nombre único.
export async function saveUpload(file: File, sub: string): Promise<string> {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new Error("Tipo de imagen no permitido");
  const dir = uploadsDir(sub);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now().toString(36)}${randomBytes(6).toString("hex")}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export async function removeUpload(sub: string, filename: string | null | undefined): Promise<void> {
  if (!filename || !isSafeFilename(filename)) return;
  try {
    await unlink(path.join(uploadsDir(sub), filename));
  } catch (e) {
    console.warn("removeUpload", sub, filename, e);
  }
}
