# Avisos (modal en landing) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Los administradores publican avisos (afiche + título + texto + botón, con vigencia) desde `/anuncios`, y la página principal `/` muestra el aviso vigente en un modal flotante que el visitante puede cerrar o descartar permanentemente.

**Architecture:** Modelo `Announcement` en Prisma; módulo admin con el patrón existente (Server Component `page.tsx` + `XClient.tsx` + Server Actions en `actions.ts`, permisos por clave); imágenes guardadas en disco (`UPLOADS_DIR/anuncios`) y servidas por un route handler; endpoint público `GET /api/anuncios/activo` consumido por un componente cliente `AnnouncementModal` montado en `LandingPage`.

**Tech Stack:** Next.js 16.2 (App Router, Server Actions, route handlers), React 19, Prisma 7 + `@prisma/adapter-pg` (PostgreSQL), CSS propio (sin librería de componentes), lucide/`Icon` del admin.

**Spec:** `docs/superpowers/specs/2026-08-23-avisos-modal-landing-design.md`

## Global Constraints

- Este Next.js NO es el del entrenamiento: antes de escribir código de rutas/acciones, lee `node_modules/next/dist/docs/` (route handlers, server actions, `params` es `Promise`).
- Sin zod ni framework de tests: validación manual que devuelve `fieldErrors`; verificación con `npx tsc --noEmit`, `npx eslint <archivos>` y pruebas en navegador.
- Límites: título 3–120, texto 1–1000, `ctaLabel` ≤ 40, `ctaUrl` `^https?://` o `^/`, imagen `image/jpeg|png|webp` ≤ 3 MB (3 145 728 bytes).
- Nombres de archivo de imagen: `^[a-z0-9]+\.(jpg|png|webp)$`.
- Endpoint público con `Cache-Control: no-store`; nunca debe romper la landing (fallo de BD → `{ ok: true, announcement: null }`).
- Textos de UI en español; el módulo se llama "Avisos" en la UI y `anuncios` en rutas/claves.
- Variables de entorno: `UPLOADS_DIR` (opcional, por defecto `<cwd>/uploads`).
- Comandos: `npx prisma db push`, `npx tsx prisma/seed.ts` (con `.env` cargado por `dotenv/config`).

---

### Task 1: Modelo, permisos y navegación

**Files:**
- Modify: `prisma/schema.prisma` (modelo `User` ~línea 14-30; añadir modelo al final)
- Modify: `src/lib/auth/permissions.ts` (array `PERMISSIONS`, `ROLE_DEFS`)
- Modify: `src/components/admin/data.ts` (`SIDEBAR_NAV`)

**Interfaces:**
- Produces: modelo Prisma `Announcement` (campos de la spec), permisos `"anuncios.read" | "anuncios.write"`, ítem de sidebar `/anuncios`.

- [ ] **Step 1: Añadir el modelo y las relaciones en `prisma/schema.prisma`**

En `model User`, junto a `createdPersoneros`/`updatedPersoneros`, añadir:

```prisma
  createdAnnouncements Announcement[] @relation("AnnouncementCreator")
  updatedAnnouncements Announcement[] @relation("AnnouncementUpdater")
```

Al final del archivo:

```prisma
// Avisos de campaña que se muestran en un modal en la página principal.
model Announcement {
  id          String    @id @default(cuid())
  title       String
  body        String
  imagePath   String?   // nombre de archivo dentro de UPLOADS_DIR/anuncios
  ctaLabel    String?
  ctaUrl      String?
  published   Boolean   @default(false)
  startsAt    DateTime?
  endsAt      DateTime?
  createdById String?
  updatedById String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  createdBy User? @relation("AnnouncementCreator", fields: [createdById], references: [id], onDelete: SetNull)
  updatedBy User? @relation("AnnouncementUpdater", fields: [updatedById], references: [id], onDelete: SetNull)

  @@index([published, startsAt, endsAt])
}
```

- [ ] **Step 2: Añadir permisos en `src/lib/auth/permissions.ts`**

Al final del array `PERMISSIONS` (después de `personeros.write`):

```ts
  {
    key: "anuncios.read",
    name: "Ver avisos",
    description: "Consultar los avisos publicados en la página principal",
    category: "Avisos",
  },
  {
    key: "anuncios.write",
    name: "Gestionar avisos",
    description: "Crear, editar, publicar y eliminar avisos de la página principal",
    category: "Avisos",
  },
```

En `ROLE_DEFS`: al rol `admin` añadir `"anuncios.read", "anuncios.write"` al final de su array `permissions`; al rol `viewer` añadir `"anuncios.read"`. (`superadmin` ya usa `PERMISSIONS.map`.) Actualizar también el comentario de cabecera con `- "Avisos" → /anuncios`.

- [ ] **Step 3: Añadir el ítem al sidebar en `src/components/admin/data.ts`**

```ts
  { id: "anuncios", label: "Avisos", icon: "bell", href: "/anuncios" },
```

al final de `SIDEBAR_NAV`.

- [ ] **Step 4: Aplicar a la base de datos y sincronizar permisos**

Run: `npx prisma db push` → Expected: "Your database is now in sync with your Prisma schema" y cliente regenerado en `src/generated/prisma`.
Run: `npx tsx prisma/seed.ts` → Expected: log "Sincronizando permisos…" sin errores.
Run: `npx tsc --noEmit -p .` → Expected: sin salida (0 errores).

- [ ] **Step 5: Verificar en navegador**

Abrir `http://localhost:3001/roles` logueado como superadmin: la categoría "Avisos" aparece con "Ver avisos" y "Gestionar avisos". El sidebar muestra "Avisos" (el enlace dará 404 hasta la Task 5).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/lib/auth/permissions.ts src/components/admin/data.ts
git commit -m "feat(anuncios): modelo Announcement, permisos y entrada de menú"
```

---

### Task 2: Utilidades de vigencia y de archivos subidos

**Files:**
- Create: `src/lib/announcements.ts`
- Create: `src/lib/uploads.ts`
- Create: `src/app/api/uploads/anuncios/[file]/route.ts`

**Interfaces:**
- Produces:
  - `isLive(a: { published: boolean; startsAt: Date | null; endsAt: Date | null }, now?: Date): boolean`
  - `statusOf(a, now?): "draft" | "scheduled" | "expired" | "live"`
  - `STATUS_LABEL: Record<AnnouncementStatus, string>`
  - `announcementImageUrl(imagePath: string | null): string | null` → `/api/uploads/anuncios/<file>`
  - `saveUpload(file: File, sub: string): Promise<string>` (devuelve nombre de archivo)
  - `removeUpload(sub: string, filename: string | null | undefined): Promise<void>`
  - `isSafeFilename(name: string): boolean`
  - `uploadsDir(sub: string): string`

- [ ] **Step 1: Crear `src/lib/announcements.ts`**

```ts
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
```

- [ ] **Step 2: Crear `src/lib/uploads.ts`**

```ts
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
```

- [ ] **Step 3: Crear `src/app/api/uploads/anuncios/[file]/route.ts`**

```ts
import { readFile } from "fs/promises";
import path from "path";
import { NextResponse, type NextRequest } from "next/server";
import { contentTypeFor, isSafeFilename, uploadsDir } from "@/lib/uploads";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!isSafeFilename(file)) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await readFile(path.join(uploadsDir("anuncios"), file));
    return new NextResponse(data, {
      headers: {
        "Content-Type": contentTypeFor(file),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit -p .` → Expected: 0 errores.
Run (Git Bash): `mkdir -p uploads/anuncios && cp public/assets/images/campaign/photo1.jpg uploads/anuncios/test1.jpg && curl -sI http://localhost:3001/api/uploads/anuncios/test1.jpg | head -5` → Expected: `HTTP/1.1 200`, `content-type: image/jpeg`.
Run: `curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/api/uploads/anuncios/..%2F..%2Fpackage.json"` → Expected: `404`.
Luego: `rm uploads/anuncios/test1.jpg`.

- [ ] **Step 5: Añadir `uploads/` a `.gitignore` y commit**

```bash
printf '\n# Archivos subidos desde el admin (afiches de avisos)\n/uploads\n' >> .gitignore
git add .gitignore src/lib/announcements.ts src/lib/uploads.ts "src/app/api/uploads/anuncios/[file]/route.ts"
git commit -m "feat(anuncios): vigencia, guardado y servido de imágenes subidas"
```

---

### Task 3: Endpoint público `GET /api/anuncios/activo`

**Files:**
- Create: `src/app/api/anuncios/activo/route.ts`

**Interfaces:**
- Consumes: `prisma`, `announcementImageUrl`, `ok` de `@/app/api/v1/_lib/response`.
- Produces: JSON `{ ok: true, announcement: AnnouncementPublic | null }`.

- [ ] **Step 1: Crear el route handler**

```ts
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
```

- [ ] **Step 2: Verificar con un registro insertado a mano**

Run: `npx tsc --noEmit -p .` → 0 errores.
Run: `curl -s http://localhost:3001/api/anuncios/activo` → Expected: `{"ok":true,"announcement":null}`.
Run (crea un aviso vigente y uno vencido):
```bash
npx tsx -e "import 'dotenv/config'; import {PrismaPg} from '@prisma/adapter-pg'; import {PrismaClient} from './src/generated/prisma/client'; const p=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})}); (async()=>{ await p.announcement.create({data:{title:'Vencido',body:'x',published:true,endsAt:new Date(Date.now()-3600e3)}}); await p.announcement.create({data:{title:'Gran mitin en Puerto Maldonado',body:'Este sábado 7 pm, plaza de armas.',published:true,ctaLabel:'Cómo llegar',ctaUrl:'https://maps.google.com'}}); console.log('ok'); await p.\$disconnect(); })()"
```
Run: `curl -s http://localhost:3001/api/anuncios/activo` → Expected: `announcement.title` = "Gran mitin en Puerto Maldonado" (no el vencido), header `cache-control: no-store` (ver con `-i`).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/anuncios/activo/route.ts
git commit -m "feat(anuncios): endpoint público del aviso vigente"
```

---

### Task 4: Server Actions del admin

**Files:**
- Create: `src/app/(admin)/anuncios/types.ts`
- Create: `src/app/(admin)/anuncios/actions.ts`

**Interfaces:**
- Produces:
  - `AnnouncementRow` (fechas ISO string, `imageUrl` ya resuelto, `status`).
  - `createAnnouncement(fd: FormData): Promise<ActionResult<{ id: string }>>`
  - `updateAnnouncement(id: string, fd: FormData): Promise<ActionResult>`
  - `setAnnouncementPublished(id: string, published: boolean): Promise<ActionResult>`
  - `deleteAnnouncement(id: string): Promise<ActionResult>`
- Campos del `FormData`: `title`, `body`, `ctaLabel`, `ctaUrl`, `startsAt`, `endsAt` (valor de `datetime-local`, p. ej. `2026-09-05T19:00`), `published` (`"1"` o ausente), `image` (File, opcional), `removeImage` (`"1"` para quitar la imagen actual al editar).

- [ ] **Step 1: Crear `types.ts`**

```ts
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
```

- [ ] **Step 2: Crear `actions.ts`**

```ts
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

// Acepta el valor de un <input type="datetime-local"> ("YYYY-MM-DDTHH:mm") interpretado
// en la zona horaria del servidor, o vacío.
function parseLocalDate(s: string): Date | null | undefined {
  if (s === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(s)) return undefined;
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

  const startsAt = parseLocalDate(str(fd, "startsAt"));
  if (startsAt === undefined) fe.startsAt = "Fecha inválida.";
  const endsAt = parseLocalDate(str(fd, "endsAt"));
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
    const { image, removeImage: _r, ...data } = v.data;
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
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit -p .` → 0 errores. Run: `npx eslint "src/app/(admin)/anuncios"` → 0 errores (si avisa de `_r` sin usar, renombrar la desestructuración a `const { image, ...data } = v.data;` y leer `removeImage` por separado).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(admin)/anuncios/types.ts" "src/app/(admin)/anuncios/actions.ts"
git commit -m "feat(anuncios): server actions de avisos con subida de imagen"
```

---

### Task 5: Modal público `AnnouncementModal` (también usado como vista previa)

**Files:**
- Create: `src/components/landing/ui/AnnouncementModal.tsx`
- Create: `src/components/landing/ui/announcement-modal.css`
- Modify: `src/components/landing/LandingPage.tsx` (imports líneas 6-12; montaje junto a `<FloatingRegister />` línea ~124)

**Interfaces:**
- Consumes: `AnnouncementPublic` de `@/lib/announcements`; `GET /api/anuncios/activo`.
- Produces: `export default function AnnouncementModal(props: { preview?: AnnouncementPublic; onClose?: () => void })`. Sin `preview` hace fetch y gestiona `localStorage`; con `preview` muestra los datos tal cual y llama `onClose` al cerrar.
- Clave de `localStorage`: `an-aviso-descartado` (valor = id del aviso).

- [ ] **Step 1: Crear `announcement-modal.css`**

```css
.anm {
  position: fixed; inset: 0; z-index: 9000;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  background: rgba(13, 27, 42, 0.72);
  backdrop-filter: blur(4px);
  animation: anm-fade 0.25s ease-out;
}
.anm__card {
  position: relative;
  width: min(520px, 100%);
  max-height: calc(100vh - 32px);
  overflow: auto;
  border-radius: 20px;
  background: #fff;
  color: #0d1b2a;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
  animation: anm-pop 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.2);
  font-family: 'Inter', system-ui, sans-serif;
}
.anm__close {
  position: absolute; top: 10px; right: 10px; z-index: 2;
  width: 38px; height: 38px; border: 0; border-radius: 50%;
  background: rgba(13, 27, 42, 0.75); color: #fff; cursor: pointer;
  display: grid; place-items: center; font-size: 20px; line-height: 1;
}
.anm__close:hover { background: #e90305; }
.anm__close:focus-visible { outline: 2px solid #ffd400; outline-offset: 2px; }
.anm__img {
  display: block; width: 100%; max-height: 45vh; object-fit: contain;
  background: #0d1b2a;
}
.anm__body { padding: 22px 24px 20px; }
.anm__eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  margin-bottom: 10px; padding: 4px 10px 4px 6px;
  border-radius: 999px; background: rgba(233, 3, 5, 0.1); color: #b50204;
  font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase;
}
.anm__eyebrow i { width: 8px; height: 8px; border-radius: 50%; background: #e90305; }
.anm__title {
  margin: 0 0 10px;
  font-family: 'Staatliches', 'Inter', sans-serif; font-weight: 400;
  font-size: clamp(26px, 5vw, 34px); line-height: 1; letter-spacing: 0.5px; text-transform: uppercase;
}
.anm__text { margin: 0 0 18px; font-size: 15px; line-height: 1.55; color: #3b4754; white-space: pre-line; }
.anm__cta {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; min-height: 48px; padding: 0 18px; border-radius: 12px;
  background: #e90305; color: #fff; font-weight: 700; font-size: 15px; text-decoration: none;
  box-shadow: 0 10px 24px rgba(233, 3, 5, 0.35);
}
.anm__cta:hover { background: #ff2426; color: #fff; }
.anm__cta:focus-visible { outline: 2px solid #ffd400; outline-offset: 2px; }
.anm__foot {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  margin-top: 16px; font-size: 13px; color: #5f6b78;
}
.anm__foot label { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
.anm__foot input { width: 16px; height: 16px; accent-color: #e90305; }
.anm__later { border: 0; background: none; color: #0d1b2a; font-weight: 600; cursor: pointer; text-decoration: underline; }
@keyframes anm-fade { from { opacity: 0; } }
@keyframes anm-pop { from { opacity: 0; transform: translateY(16px) scale(0.97); } }
@media (prefers-reduced-motion: reduce) { .anm, .anm__card { animation: none; } }
@media (max-width: 480px) {
  .anm { padding: 12px; align-items: flex-end; }
  .anm__card { border-radius: 18px 18px 14px 14px; }
  .anm__body { padding: 18px 18px 16px; }
}
```

- [ ] **Step 2: Crear `AnnouncementModal.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import type { AnnouncementPublic } from '@/lib/announcements'
import './announcement-modal.css'

export const DISMISS_KEY = 'an-aviso-descartado'
const OPEN_DELAY_MS = 1000

type Props = {
  // Con `preview` no hay fetch ni localStorage: se muestra tal cual (admin).
  preview?: AnnouncementPublic
  onClose?: () => void
}

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY)
  } catch {
    return null
  }
}

function writeDismissed(id: string) {
  try {
    localStorage.setItem(DISMISS_KEY, id)
  } catch {
    /* modo privado o almacenamiento bloqueado */
  }
}

export default function AnnouncementModal({ preview, onClose }: Props) {
  const [data, setData] = useState<AnnouncementPublic | null>(preview ?? null)
  const [open, setOpen] = useState(!!preview)
  const [dontShow, setDontShow] = useState(false)
  const closeRef = useRef<HTMLButtonElement | null>(null)

  // Carga del aviso vigente (solo en modo público).
  useEffect(() => {
    if (preview) return
    const ctrl = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    ;(async () => {
      try {
        const res = await fetch('/api/anuncios/activo', { signal: ctrl.signal, cache: 'no-store' })
        const json = await res.json().catch(() => null)
        const a: AnnouncementPublic | null = json?.ok ? json.announcement : null
        if (!a || readDismissed() === a.id) return
        setData(a)
        timer = setTimeout(() => setOpen(true), OPEN_DELAY_MS)
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') console.warn('AnnouncementModal', e)
      }
    })()
    return () => {
      ctrl.abort()
      if (timer) clearTimeout(timer)
    }
  }, [preview])

  // Bloqueo de scroll, foco inicial y Escape.
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function close() {
    if (!preview && dontShow && data) writeDismissed(data.id)
    setOpen(false)
    onClose?.()
  }

  if (!open || !data) return null

  const external = !!data.ctaUrl && /^https?:\/\//.test(data.ctaUrl)

  return (
    <div className="anm" onClick={close} role="presentation">
      <div
        className="anm__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="anm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="anm__close" onClick={close} aria-label="Cerrar aviso">
          ×
        </button>
        {data.imageUrl && <img className="anm__img" src={data.imageUrl} alt="" />}
        <div className="anm__body">
          <span className="anm__eyebrow"><i /> Aviso de campaña</span>
          <h2 id="anm-title" className="anm__title">{data.title}</h2>
          <p className="anm__text">{data.body}</p>
          {data.ctaUrl && data.ctaLabel && (
            <a
              className="anm__cta"
              href={data.ctaUrl}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
            >
              {data.ctaLabel} →
            </a>
          )}
          <div className="anm__foot">
            {!preview && (
              <label>
                <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
                No volver a mostrar este aviso
              </label>
            )}
            <button type="button" className="anm__later" onClick={close}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Montar en `LandingPage.tsx`**

Añadir `import AnnouncementModal from "./ui/AnnouncementModal";` junto a los otros imports de `./ui/...`, y `<AnnouncementModal />` en la línea siguiente a `<FloatingRegister />`.

- [ ] **Step 4: Verificar en navegador (extensión de Chrome)**

- `npx tsc --noEmit -p .` y `npx eslint src/components/landing/ui/AnnouncementModal.tsx` → 0 errores.
- Abrir `http://localhost:3001/` (con el aviso creado en Task 3): ~1 s tras cargar aparece el modal con "Gran mitin…", botón "Cómo llegar →" que abre en pestaña nueva.
- Escape cierra; recargar → vuelve a aparecer.
- Marcar "No volver a mostrar" y cerrar; recargar → no aparece. `localStorage.getItem('an-aviso-descartado')` = id.
- Vista móvil 390 px: la tarjeta ocupa el ancho con márgenes y se ancla abajo.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/ui/AnnouncementModal.tsx src/components/landing/ui/announcement-modal.css src/components/landing/LandingPage.tsx
git commit -m "feat(landing): modal flotante del aviso vigente"
```

---

### Task 6: Página y cliente del admin `/anuncios`

**Files:**
- Create: `src/app/(admin)/anuncios/page.tsx`
- Create: `src/app/(admin)/anuncios/AnunciosClient.tsx`
- Create: `src/app/(admin)/anuncios/anuncios.css`

**Interfaces:**
- Consumes: `AnnouncementRow`, `PermFlags` (Task 4); acciones de Task 4; `statusOf`, `STATUS_LABEL`, `announcementImageUrl`, `AnnouncementPublic` (Task 2); `AnnouncementModal` (Task 5); `Icon`, `ConfirmDialog`, `Toasts`, `useEscClose` existentes.

- [ ] **Step 1: Crear `page.tsx`**

```tsx
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
```

- [ ] **Step 2: Crear `anuncios.css`**

```css
/* Módulo Avisos — complementa las clases globales del admin */
.anuncios { display: flex; flex-direction: column; gap: 16px; padding: 0 24px 80px; max-width: 1600px; }
@media (max-width: 1024px) { .anuncios { padding: 0 16px 80px; } }
@media (max-width: 900px) { .anuncios { padding: 0 12px 64px; } }
.anuncios__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.anuncios__head h1 { margin: 0; font-size: 22px; }
.anuncios__sub { margin: 4px 0 0; color: var(--text-muted, #7a8699); font-size: 13px; }
.anuncios__thumb { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; background: #0d1b2a; display: block; }
.anuncios__thumb--empty { display: grid; place-items: center; color: var(--text-faint, #9aa4b2); background: var(--bg-sunken, #f1f3f4); }
.anuncios__title { font-weight: 600; color: var(--text, #16232f); }
.anuncios__body { color: var(--text-muted, #7a8699); font-size: 12px; margin-top: 2px; max-width: 420px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.anuncios__dates { font-size: 12.5px; white-space: nowrap; }
.anuncios__dates div + div { margin-top: 2px; }
.anuncios__actions { display: flex; gap: 6px; align-items: center; white-space: nowrap; }
.anuncios .btn--sm { padding: 5px 10px; font-size: 13px; }
.anuncios__empty { text-align: center; color: var(--text-muted, #7a8699); padding: 40px 0 !important; }
.anuncios__empty svg { display: block; margin: 0 auto 8px; opacity: 0.6; }
.anuncios__row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 560px) { .anuncios__row { grid-template-columns: 1fr; } }
.field--check { flex-direction: row; align-items: center; gap: 8px; }
.field--check input { width: 16px; height: 16px; }
.anuncios__imgfield { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.anuncios__imgprev { width: 96px; height: 96px; border-radius: 10px; object-fit: cover; background: #0d1b2a; border: 1px solid var(--border, #e5e7eb); }
.anuncios__imgbtns { display: flex; gap: 8px; flex-wrap: wrap; }
.badge--amber { background: #fef3c7; color: #92400e; }
.badge--gray { background: #f1f3f4; color: #5f6368; }
```

- [ ] **Step 3: Crear `AnunciosClient.tsx`**

```tsx
"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import "./anuncios.css";
import { Icon } from "@/components/admin/Icon";
import { ConfirmDialog } from "../usuarios/ConfirmDialog";
import { Toasts, type Toast } from "../usuarios/Toasts";
import { useEscClose } from "@/lib/ui/useEscClose";
import { STATUS_LABEL, type AnnouncementPublic, type AnnouncementStatus } from "@/lib/announcements";
import AnnouncementModal from "@/components/landing/ui/AnnouncementModal";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  setAnnouncementPublished,
} from "./actions";
import type { AnnouncementRow, PermFlags, ActionResult } from "./types";

const STATUS_BADGE: Record<AnnouncementStatus, string> = {
  live: "badge--green",
  scheduled: "badge--amber",
  expired: "badge--gray",
  draft: "badge--neutral",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
}

// ISO (UTC) → valor para <input type="datetime-local"> en hora local.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AnunciosClient({ rows, perms }: { rows: AnnouncementRow[]; perms: PermFlags }) {
  const [modal, setModal] = useState<null | { mode: "create" } | { mode: "edit"; row: AnnouncementRow }>(null);
  const [preview, setPreview] = useState<AnnouncementPublic | null>(null);
  const [toDelete, setToDelete] = useState<AnnouncementRow | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, startTransition] = useTransition();

  function toast(kind: Toast["kind"], message: string) {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), kind, message }]);
  }

  function run(action: () => Promise<ActionResult<unknown>>, okMsg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) toast("success", okMsg);
      else toast("error", res.error);
    });
  }

  return (
    <div className="anuncios">
      <header className="anuncios__head">
        <div>
          <h1>Avisos</h1>
          <p className="anuncios__sub">Se muestran en un modal al entrar a la página principal. Solo se muestra el aviso vigente más reciente.</p>
        </div>
        {perms.canWrite && (
          <button className="btn btn--primary" onClick={() => setModal({ mode: "create" })}>
            <Icon name="plus" size={16} /> Nuevo aviso
          </button>
        )}
      </header>

      <div className="tablewrap density-comfy">
        <div className="tablewrap__scroll">
          <table className="dtable">
            <thead>
              <tr>
                <th></th>
                <th>Aviso</th>
                <th>Estado</th>
                <th>Vigencia</th>
                <th>Creado por</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="anuncios__empty">
                    <Icon name="bell" size={22} />
                    <span>Aún no hay avisos. Crea el primero.</span>
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.imageUrl ? (
                      <img className="anuncios__thumb" src={r.imageUrl} alt="" />
                    ) : (
                      <div className="anuncios__thumb anuncios__thumb--empty"><Icon name="bell" size={18} /></div>
                    )}
                  </td>
                  <td>
                    <div className="anuncios__title">{r.title}</div>
                    <div className="anuncios__body">{r.body}</div>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                  </td>
                  <td className="anuncios__dates">
                    <div>Desde: {fmtDate(r.startsAt)}</div>
                    <div>Hasta: {fmtDate(r.endsAt)}</div>
                  </td>
                  <td>{r.createdByName ?? <span className="dtable__muted">—</span>}</td>
                  <td>
                    <div className="anuncios__actions">
                      <button
                        className="iconbtn"
                        title="Vista previa"
                        onClick={() =>
                          setPreview({ id: r.id, title: r.title, body: r.body, imageUrl: r.imageUrl, ctaLabel: r.ctaLabel, ctaUrl: r.ctaUrl })
                        }
                      >
                        <Icon name="eye" size={16} />
                      </button>
                      {perms.canWrite && (
                        <>
                          <button
                            className="btn btn--ghost btn--sm"
                            disabled={pending}
                            onClick={() =>
                              run(
                                () => setAnnouncementPublished(r.id, !r.published),
                                r.published ? "Aviso despublicado." : "Aviso publicado.",
                              )
                            }
                          >
                            {r.published ? "Despublicar" : "Publicar"}
                          </button>
                          <button className="iconbtn" title="Editar" onClick={() => setModal({ mode: "edit", row: r })}>
                            <Icon name="settings" size={16} />
                          </button>
                          <button className="iconbtn" title="Eliminar" onClick={() => setToDelete(r)}>
                            <Icon name="trash" size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tablefoot">
          <span>{rows.length} aviso{rows.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      {modal && (
        <AnuncioModal
          initial={modal.mode === "edit" ? modal.row : null}
          onClose={() => setModal(null)}
          onPreview={setPreview}
          onSubmit={async (fd) => {
            const res = modal.mode === "edit" ? await updateAnnouncement(modal.row.id, fd) : await createAnnouncement(fd);
            if (res.ok) {
              toast("success", modal.mode === "edit" ? "Aviso actualizado." : "Aviso creado.");
              setModal(null);
            }
            return res;
          }}
        />
      )}

      {preview && <AnnouncementModal preview={preview} onClose={() => setPreview(null)} />}

      {toDelete && (
        <ConfirmDialog
          title="Eliminar aviso"
          description={<>Se eliminará <strong>{toDelete.title}</strong> y su imagen. Esta acción no se puede deshacer.</>}
          confirmLabel="Eliminar"
          tone="danger"
          busy={pending}
          onConfirm={async () => {
            const res = await deleteAnnouncement(toDelete.id);
            if (res.ok) toast("success", "Aviso eliminado.");
            else toast("error", res.error);
            setToDelete(null);
          }}
          onClose={() => setToDelete(null)}
        />
      )}

      <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}

function AnuncioModal({
  initial,
  onClose,
  onPreview,
  onSubmit,
}: {
  initial: AnnouncementRow | null;
  onClose: () => void;
  onPreview: (a: AnnouncementPublic) => void;
  onSubmit: (fd: FormData) => Promise<ActionResult<unknown>>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [ctaLabel, setCtaLabel] = useState(initial?.ctaLabel ?? "");
  const [ctaUrl, setCtaUrl] = useState(initial?.ctaUrl ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(initial?.endsAt ?? null));
  const [published, setPublished] = useState(initial?.published ?? true);
  const [image, setImage] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  useEscClose(true, onClose, busy);

  // Miniatura de la imagen elegida (object URL liberado al cambiar/cerrar).
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!image) {
      setLocalUrl(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setLocalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const shownImage = localUrl ?? (removeImage ? null : initial?.imageUrl ?? null);
  const errStyle = { color: "#b91c1c", fontSize: 12, marginTop: 4 } as const;
  const hintMuted = { color: "#7a8699", fontSize: 12, marginTop: 4 } as const;

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.set("title", title);
    fd.set("body", body);
    fd.set("ctaLabel", ctaLabel);
    fd.set("ctaUrl", ctaUrl);
    fd.set("startsAt", startsAt);
    fd.set("endsAt", endsAt);
    if (published) fd.set("published", "1");
    if (image) fd.set("image", image);
    if (removeImage && !image) fd.set("removeImage", "1");
    return fd;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setTopError(null);
    setFieldErrors({});
    const res = await onSubmit(buildFormData());
    if (!res.ok) {
      setTopError(res.error);
      setFieldErrors(res.fieldErrors ?? {});
    }
    setBusy(false);
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <header className="modal__head">
          <h2>{initial ? "Editar aviso" : "Nuevo aviso"}</h2>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="modal__body">
          {topError && (
            <div className="login__error" role="alert" style={{ marginBottom: 16 }}>
              <Icon name="info" size={16} />
              <span>{topError}</span>
            </div>
          )}

          <label className="field">
            <span className="field__label">Título<span className="field__req">*</span></span>
            <input type="text" autoFocus value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!fieldErrors.title} />
            {fieldErrors.title && <span style={errStyle}>{fieldErrors.title}</span>}
          </label>

          <label className="field">
            <span className="field__label">Texto<span className="field__req">*</span></span>
            <textarea value={body} maxLength={1000} rows={4} onChange={(e) => setBody(e.target.value)} aria-invalid={!!fieldErrors.body} />
            <span style={hintMuted}>{body.length}/1000</span>
            {fieldErrors.body && <span style={errStyle}>{fieldErrors.body}</span>}
          </label>

          <div className="field">
            <span className="field__label">Imagen (afiche)</span>
            <div className="anuncios__imgfield">
              {shownImage ? (
                <img className="anuncios__imgprev" src={shownImage} alt="" />
              ) : (
                <div className="anuncios__imgprev anuncios__thumb--empty" />
              )}
              <div className="anuncios__imgbtns">
                <label className="btn btn--ghost btn--sm">
                  {shownImage ? "Cambiar imagen" : "Subir imagen"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(e) => {
                      setImage(e.target.files?.[0] ?? null);
                      setRemoveImage(false);
                      e.target.value = "";
                    }}
                  />
                </label>
                {shownImage && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setImage(null);
                      setRemoveImage(true);
                    }}
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>
            <span style={hintMuted}>JPG, PNG o WebP, máximo 3 MB. Recomendado: vertical o cuadrada.</span>
            {fieldErrors.image && <span style={errStyle}>{fieldErrors.image}</span>}
          </div>

          <div className="anuncios__row">
            <label className="field">
              <span className="field__label">Texto del botón</span>
              <input type="text" value={ctaLabel} maxLength={40} placeholder="Ej. Cómo llegar" onChange={(e) => setCtaLabel(e.target.value)} aria-invalid={!!fieldErrors.ctaLabel} />
              {fieldErrors.ctaLabel && <span style={errStyle}>{fieldErrors.ctaLabel}</span>}
            </label>
            <label className="field">
              <span className="field__label">Enlace del botón</span>
              <input type="url" value={ctaUrl} placeholder="https://…" onChange={(e) => setCtaUrl(e.target.value)} aria-invalid={!!fieldErrors.ctaUrl} />
              {fieldErrors.ctaUrl && <span style={errStyle}>{fieldErrors.ctaUrl}</span>}
            </label>
          </div>

          <div className="anuncios__row">
            <label className="field">
              <span className="field__label">Mostrar desde</span>
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} aria-invalid={!!fieldErrors.startsAt} />
              {fieldErrors.startsAt && <span style={errStyle}>{fieldErrors.startsAt}</span>}
            </label>
            <label className="field">
              <span className="field__label">Mostrar hasta</span>
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} aria-invalid={!!fieldErrors.endsAt} />
              {fieldErrors.endsAt && <span style={errStyle}>{fieldErrors.endsAt}</span>}
            </label>
          </div>
          <span style={hintMuted}>Si dejas las fechas vacías, el aviso se muestra mientras esté publicado.</span>

          <label className="field field--check">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            <span>Publicado (visible en la página principal)</span>
          </label>
        </div>
        <footer className="modal__foot">
          <button
            type="button"
            className="btn btn--ghost"
            disabled={busy || title.trim().length < 3}
            onClick={() =>
              onPreview({
                id: initial?.id ?? "preview",
                title,
                body,
                imageUrl: shownImage,
                ctaLabel: ctaLabel || null,
                ctaUrl: ctaUrl || null,
              })
            }
          >
            <Icon name="eye" size={16} /> Vista previa
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy || title.trim().length < 3 || body.trim() === ""}>
            {busy ? "Guardando…" : initial ? "Guardar cambios" : "Crear aviso"}
          </button>
        </footer>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Verificar**

- `npx tsc --noEmit -p .` → 0 errores; `npx eslint "src/app/(admin)/anuncios"` → 0 errores (warnings de `<img>` aceptados, igual que el resto del admin).
- En Chrome (extensión), logueado como admin:
  1. `/anuncios` lista los dos avisos de Task 3 con estados "Publicado" y "Vencido".
  2. "Nuevo aviso": título "Cierre de inscripciones de personeros", texto, subir `public/assets/images/campaign/cover.jpg`, botón "Inscríbete" → `/personeros`, sin fechas, publicado. "Vista previa" abre el modal con la imagen local. "Crear aviso" → toast y fila nueva con miniatura; el archivo existe en `uploads/anuncios/`.
  3. Editar: poner "Mostrar desde" mañana → estado "Programado". Quitar imagen y guardar → miniatura vacía y archivo borrado de `uploads/anuncios/`.
  4. "Despublicar" → "Borrador"; "Publicar" → vuelve.
  5. Eliminar el aviso "Vencido" → desaparece.
  6. `/` muestra en el modal el aviso vigente más reciente.
  7. Con un usuario `viewer`: ve la lista y "Vista previa", sin botones de edición.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/anuncios/page.tsx" "src/app/(admin)/anuncios/AnunciosClient.tsx" "src/app/(admin)/anuncios/anuncios.css"
git commit -m "feat(anuncios): módulo de administración de avisos con vista previa"
```

---

### Task 7: Verificación final de extremo a extremo

**Files:** ninguno nuevo.

- [ ] **Step 1: Calidad estática**

Run: `npx tsc --noEmit -p .` → 0 errores. Run: `npx eslint src/lib/announcements.ts src/lib/uploads.ts src/app/api/anuncios src/app/api/uploads "src/app/(admin)/anuncios" src/components/landing/ui/AnnouncementModal.tsx src/components/landing/LandingPage.tsx` → 0 errores.

- [ ] **Step 2: Flujo completo en Chrome**

1. Admin crea un aviso con imagen y botón, publicado, sin fechas.
2. En una pestaña nueva `/`: aparece el modal ~1 s después; imagen, título en Staatliches, botón rojo. Clic fuera cierra. Recargar: reaparece.
3. Marcar "No volver a mostrar" → cerrar → recargar: no aparece.
4. Admin crea un segundo aviso publicado → `/` muestra el nuevo (id distinto al descartado).
5. Admin lo despublica → `/` no muestra modal (`/api/anuncios/activo` devuelve `null` si el primero sigue descartado y no hay otro vigente).
6. Móvil 390 px: tarjeta anclada abajo, imagen `max-height: 45vh`, botón de 48 px, sin scroll horizontal.
7. Consola de `/` sin errores.

- [ ] **Step 3: Limpieza de datos de prueba**

Desde `/anuncios` eliminar los avisos de prueba que no se quieran conservar; comprobar que `uploads/anuncios/` queda sin archivos huérfanos.

- [ ] **Step 4: Commit final (si quedó algo por commitear)**

```bash
git status --short
git add -A docs/superpowers
git commit -m "docs(anuncios): spec y plan del módulo de avisos"
```
