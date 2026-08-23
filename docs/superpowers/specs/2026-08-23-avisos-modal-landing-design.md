# Avisos: modal flotante en la página principal — Diseño

**Fecha:** 2026-08-23
**Estado:** aprobado por el usuario (diseño en chat)

## Objetivo

El equipo de campaña publica avisos cortos (convocatoria a un mitin, cierre de
inscripciones, etc.) desde el panel de administración. Cualquier persona que
entre a la página principal (`/`) ve el aviso vigente en un **modal flotante**
con afiche, título, texto y un botón de acción. Puede cerrarlo o marcar "No
volver a mostrar".

## Alcance

**Incluye**
- Modelo `Announcement` en Prisma con vigencia (publicado + fechas opcionales).
- Permisos `anuncios.read` / `anuncios.write`.
- Módulo admin `/anuncios`: listar, crear, editar, eliminar, publicar/despublicar,
  subir imagen, vista previa del modal.
- Endpoint público `GET /api/anuncios/activo`.
- Servido de imágenes subidas: `GET /api/uploads/anuncios/[file]`.
- Modal en la landing con recuerdo de descarte en `localStorage`.

**No incluye** (YAGNI)
- Varios avisos simultáneos en carrusel: se muestra **uno**, el más reciente vigente.
- Historial/página pública de avisos, comentarios, notificaciones push.
- Storage externo (S3 etc.). Ver "Despliegue".

## Datos

```prisma
model Announcement {
  id          String    @id @default(cuid())
  title       String                       // ≤ 120
  body        String                       // ≤ 1000, texto plano con saltos de línea
  imagePath   String?                      // nombre de archivo en UPLOADS_DIR/anuncios
  ctaLabel    String?                      // ≤ 40
  ctaUrl      String?                      // http(s):// o ruta interna que empiece por /
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

`User` gana `createdAnnouncements Announcement[] @relation("AnnouncementCreator")`
y `updatedAnnouncements Announcement[] @relation("AnnouncementUpdater")`.

**Aviso vigente** = `published = true` AND (`startsAt` nulo o ≤ ahora) AND
(`endsAt` nulo o ≥ ahora). Si hay varios, el de `createdAt` más reciente.

**Estado calculado** (solo para la lista del admin):
- Borrador: `published = false`
- Programado: publicado y `startsAt > ahora`
- Vencido: publicado y `endsAt < ahora`
- Publicado: el resto

Se aplica con `npx prisma db push` y `npx tsx prisma/seed.ts` (el seed ya hace
upsert de `PERMISSIONS` y re-enlaza `ROLE_DEFS`).

## Permisos

En `src/lib/auth/permissions.ts`:
- `anuncios.read` — "Ver avisos" (categoría "Avisos")
- `anuncios.write` — "Gestionar avisos"

`superadmin` (todo), `admin` (+read, +write), `viewer` (+read).

## Admin `/anuncios`

Mismo patrón que `/personeros`:

- `page.tsx` (Server Component, `force-dynamic`): `requirePermission("anuncios.read")`,
  `prisma.announcement.findMany({ orderBy: { createdAt: "desc" } })`, serializa fechas a
  ISO y pasa `rows` + `perms` a `AnunciosClient`.
- `AnunciosClient.tsx` (`"use client"`):
  - Tabla/tarjetas: miniatura, título, estado (chip), vigencia, autor, acciones.
  - Botón "Nuevo aviso" → modal con formulario: título, texto (textarea), imagen
    (input file, muestra miniatura; permite quitarla), botón opcional (texto + enlace),
    "Mostrar desde" / "Mostrar hasta" (`datetime-local`, opcionales), interruptor
    "Publicado".
  - Acción rápida publicar/despublicar en la fila.
  - Eliminar con `ConfirmDialog` existente.
  - "Vista previa": abre el mismo componente `AnnouncementModal` (modo preview, sin
    localStorage) con los datos del formulario, para ver exactamente lo que verá el
    simpatizante.
  - Feedback con `Toasts` existente; `useTransition` para las acciones.
- `actions.ts` (Server Actions): `createAnnouncement(FormData)`,
  `updateAnnouncement(id, FormData)`, `setPublished(id, bool)`, `deleteAnnouncement(id)`.
  - `authorize("anuncios.write")` con `Denied`, igual que personeros.
  - Validación manual → `fieldErrors`: título 3–120; texto 1–1000; ctaLabel ≤ 40 y
    obligatorio si hay ctaUrl (y viceversa); ctaUrl `^https?://` o `^/`; fechas válidas y
    `startsAt ≤ endsAt`; imagen `image/jpeg|png|webp`, ≤ 3 MB.
  - Imagen: se guarda como `<cuid>.<ext>` en `UPLOADS_DIR/anuncios/` (ver abajo). Al
    reemplazar o eliminar el aviso se borra el archivo anterior (errores de borrado se
    ignoran con log).
  - `revalidatePath("/anuncios")`. El endpoint público no se cachea, así que no hay
    nada más que invalidar.
- `types.ts`: `AnnouncementRow`, `PermFlags`, `ActionResult<T>`.
- Sidebar: `{ id: "anuncios", label: "Avisos", icon: "bell", href: "/anuncios" }` en
  `SIDEBAR_NAV`.

## Subida y servido de imágenes

- `UPLOADS_DIR` (env, por defecto `<cwd>/uploads`). Helper `src/lib/uploads.ts`:
  `uploadsDir(sub)`, `saveUpload(file, sub) → filename`, `removeUpload(sub, filename)`,
  `safeFilename(name)` (solo `[a-z0-9]+\.(jpg|png|webp)`).
- `GET /api/uploads/anuncios/[file]`: valida el nombre con `safeFilename`, lee el archivo
  con `fs/promises`, responde con `Content-Type` por extensión y
  `Cache-Control: public, max-age=31536000, immutable` (los nombres son únicos). 404 si no
  existe.
- `imageUrl` público = `/api/uploads/anuncios/<imagePath>`.

**Despliegue:** requiere disco persistente (VPS/contenedor con volumen). En serverless
(Vercel) el disco no persiste; en ese caso se sustituiría `saveUpload`/`removeUpload`
por un storage externo sin tocar el resto.

## Endpoint público

`GET /api/anuncios/activo` → `ok({ announcement: {...} | null })` con
`id, title, body, imageUrl, ctaLabel, ctaUrl`. `Cache-Control: no-store`. Sin auth. Si
la BD falla responde `ok({ announcement: null })` (la landing nunca debe romperse por
un aviso, igual que `/api/apoyos/mapa`).

## Landing: `AnnouncementModal`

`src/components/landing/ui/AnnouncementModal.tsx` + `announcement-modal.css`, montado en
`LandingPage.tsx` junto a `FloatingRegister`.

- Al montar: `fetch("/api/anuncios/activo")`. Si no hay aviso o
  `localStorage["an-aviso-descartado"] === id` → no se muestra.
- Se abre ~1 s después de recibir la respuesta (deja pasar el preloader).
- Contenido: imagen (si hay) arriba, etiqueta "Aviso de campaña", título, texto con
  saltos de línea, botón de acción (abre `ctaUrl`; `target=_blank` si es externo), X,
  casilla "No volver a mostrar este aviso".
- Cerrar: X, Escape, clic en el fondo. Al cerrar con la casilla marcada se guarda el `id`.
- Bloquea el scroll del `body` mientras está abierto; `role="dialog"`, `aria-modal`,
  `aria-labelledby`; foco inicial en el botón de cerrar; foco vuelve al `body` al cerrar.
- Estilo coherente con la landing (navy, rojo `#e90305`, Staatliches para el título,
  Inter para el cuerpo). En móvil ocupa ancho completo con márgenes y la imagen se
  adapta (`max-height: 45vh`, `object-fit: contain`).
- Prop `preview?: AnnouncementData` para que el admin lo use sin fetch ni localStorage.

## Errores

- Acciones admin: `Denied` → `{ ok:false, error:"Sin permiso" }`; validación →
  `fieldErrors`; fallo de escritura de archivo → `{ ok:false, error:"No se pudo guardar la
  imagen" }` y no se crea/actualiza el registro.
- Landing: cualquier error de red/JSON → no se muestra el modal, sin ruido en consola
  (solo `console.warn` en desarrollo).

## Verificación

El proyecto no tiene framework de tests; no se añade. Verificación:
- `npx tsc --noEmit`, `npx eslint` sobre los archivos nuevos.
- Chrome (extensión): crear aviso con imagen en `/anuncios`, ver estado, vista previa;
  abrir `/` y comprobar el modal, cierre, "No volver a mostrar" y que un aviso nuevo
  reaparece; despublicar y comprobar que desaparece; móvil 390 px.
