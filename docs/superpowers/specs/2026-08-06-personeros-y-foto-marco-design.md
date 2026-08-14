# Diseño — Consultor de Mesa para Personeros + Generador de Foto con Marco

**Fecha:** 2026-08-06
**Estado:** Aprobado (pendiente de plan de implementación)

## Contexto

Campaña "Ahora Nación" (Simón Horna Alpaca, Gobierno Regional de Madre de Dios).
La app ya tiene:

- Landing público (plantilla Politicly) en `src/app/page.tsx` + `src/components/landing/`.
- Panel admin bajo `src/app/(admin)/` con RBAC (User ↔ Role ↔ Permission) en Prisma/Postgres.
- API de consulta de DNI reutilizable: `GET /api/dni/:dni` (proxy que solo devuelve el nombre).
- Patrón de formulario público → API: `FloatingRegister` → `POST /api/apoyos`.
- Helpers: `rateLimit` (`src/lib/rate-limit`), `ok`/`fail` (`src/app/api/v1/_lib/response`),
  `DISTRICTS`/`isDistrictId`/`districtLabel` (`src/lib/districts`), `requirePermission`/`userHas`
  (`src/lib/auth/server`), catálogo de permisos (`src/lib/auth/permissions.ts`), `Icon` (`src/components/admin/Icon.tsx`).
- **No hay framework de tests** (solo `npm run build`, `eslint`, `npx prisma validate`).

Se añaden **dos módulos independientes**, ambos públicos y compartibles por WhatsApp.

## Decisiones tomadas (brainstorming)

1. Datos de personeros: **CRUD manual en el admin** (sin import CSV).
2. Marco de la foto: **construido por código** (canvas), no PNG externo.
3. Ubicación pública: **páginas dedicadas** (`/mi-mesa`, `/mi-foto`).
4. Alcance: **ambos módulos ahora**.
5. Marco: **logo Ahora Nación + "Simón Horna Alpaca" + lema corto "#AhoraNación"**.
6. Formatos de foto: **Cuadrado 1080×1080 + Historia 1080×1920**.
7. Consulta pública de personero muestra datos **completos** (nombre, colegio + dirección, mesa, coordinador nombre + teléfono).

## Rutas

| Módulo | Público (compartible) | Admin (gestión) |
|---|---|---|
| Consultor de Mesa | `/mi-mesa` | `/personeros` |
| Foto con marco | `/mi-foto` | — (no requiere admin) |

`/personeros` vive dentro del grupo `(admin)` (ruta real `/personeros`). Las públicas viven fuera
del grupo, sin cargar los scripts pesados de la plantilla Politicly (páginas ligeras).

---

## Módulo 1 — Consultor de Mesa para Personeros

### 1.1 Modelo de datos (Prisma)

Nuevo modelo `Personero` en `prisma/schema.prisma` (reutiliza el enum existente `DocumentType` y `District`):

```prisma
model Personero {
  id               String       @id @default(cuid())
  docType          DocumentType @default(dni)
  docNumber        String
  name             String
  district         District?
  localName        String       // colegio / local de votación
  localAddress     String?
  mesa             String       // número de mesa (string: permite ceros a la izquierda)
  coordinatorName  String
  coordinatorPhone String
  active           Boolean      @default(true)
  notes            String?
  createdById      String?
  updatedById      String?
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  createdBy User? @relation("PersoneroCreator", fields: [createdById], references: [id], onDelete: SetNull)
  updatedBy User? @relation("PersoneroUpdater", fields: [updatedById], references: [id], onDelete: SetNull)

  @@unique([docType, docNumber])
  @@index([district])
  @@index([active])
}
```

Se agregan las relaciones inversas en `model User`:
```prisma
  createdPersoneros Personero[] @relation("PersoneroCreator")
  updatedPersoneros Personero[] @relation("PersoneroUpdater")
```

Requiere `prisma migrate dev --name add_personero` (o `db push` según flujo del repo) + regenerar cliente.

### 1.2 RBAC

En `src/lib/auth/permissions.ts`, categoría nueva **"Personeros"**:

- `personeros.read` — "Ver personeros" — Consultar el listado de personeros y sus asignaciones.
- `personeros.write` — "Gestionar personeros" — Crear, editar y eliminar personeros.

Asignación en `ROLE_DEFS`:
- `superadmin`: hereda todo (usa `PERMISSIONS.map`).
- `admin`: `+ personeros.read`, `personeros.write`.
- `editor`: `+ personeros.read`.
- `viewer`: `+ personeros.read`.

Re-seed: `PERMISSIONS` se upsertea y roles se sincronizan (ya lo hace `prisma/seed.ts`).

### 1.3 Módulo admin `/personeros`

Espejo del patrón de Simpatizantes. Archivos en `src/app/(admin)/personeros/`:

- **`page.tsx`** (server component): `requirePermission("personeros.read")`, `prisma.personero.findMany`
  (orderBy createdAt desc, include createdBy/updatedBy name), mapea a `PersoneroRow[]`, calcula
  `PermFlags { canRead, canWrite }`, renderiza `<PersonerosClient>`. `export const dynamic = "force-dynamic"`.
- **`PersonerosClient.tsx`** (client): tabla (`dtable`/`tablewrap`), buscar por nombre o DNI, filtro por
  distrito, botón "Registrar personero" (si `canWrite`), modal crear/editar, eliminar con `ConfirmDialog`,
  `Toasts`. Columnas: Nombre, Documento, Distrito, Local, Mesa, Coordinador, Estado (activo/inactivo), acciones.
- **`actions.ts`** (server actions): `createPersonero`, `updatePersonero`, `deletePersonero`, `togglePersoneroActive`.
  Todas hacen `requirePermission("personeros.write")`, validan (fieldErrors), setean `createdById`/`updatedById`,
  y `revalidatePath("/personeros")`. Devuelven `ActionResult<T>` (mismo shape que Simpatizantes).
- **`types.ts`**: `PersoneroRow`, `PersoneroInput`, `PermFlags`, `ActionResult`.
- **`personeros.css`**: **incluye el padding correcto desde el inicio** (`padding: 0 24px 80px; max-width: 1600px`
  + overrides responsivos a 1024/900px), como sí hace `.page`. Aprendizaje del bug de `/simpatizantes`.

Navegación: nuevo ítem en `SIDEBAR_NAV` (`src/components/admin/data.ts`):
`{ id: "personeros", label: "Personeros", icon: "<nuevo>", href: "/personeros" }`.
Se agrega un ícono nuevo a `Icon.tsx` (p. ej. `school` o `id-card`; SVG inline, mismo estilo que los existentes).

**Validación (actions + API):**
- `docNumber`: dni = 8 dígitos; ce/passport = 6–12 alfanum. Se guarda en mayúsculas. Único por (docType, docNumber) → error amable en colisión.
- `name`, `localName`, `coordinatorName`: 2–120 chars.
- `mesa`: 1–10 chars (no vacío).
- `coordinatorPhone`: `^[0-9+\s-]{6,15}$`.
- `district`: opcional pero si viene debe ser `isDistrictId`.

### 1.4 Consulta pública `/mi-mesa` + API

- **API `GET /api/personeros/:dni`** (`src/app/api/personeros/[dni]/route.ts`):
  - Valida DNI (`^\d{8}$`) → 400 si no.
  - `rateLimit("personero-lookup", ip, 20, 10*60*1000)` → 429 con `Retry-After`.
  - Busca `prisma.personero.findFirst({ where: { docType: "dni", docNumber, active: true } })`.
  - 404 amable si no existe/está inactivo: "Aún no apareces asignado. Contacta a tu coordinador."
  - 200 `ok({...})` con: `name, district (label), localName, localAddress, mesa, coordinatorName, coordinatorPhone`.
  - No expone `id`, `notes`, ni auditoría. Solo `active`.

- **UI `/mi-mesa`** (`src/app/mi-mesa/page.tsx` + `MesaLookupClient.tsx` + css):
  - Cabecera de campaña (logo, color rojo). Input DNI grande (inputMode numeric, maxLength 8) + botón "Consultar mi mesa".
  - Al responder: tarjeta con **N° de mesa destacado** (grande), colegio + dirección con link "Cómo llegar"
    (`https://www.google.com/maps?q=<dirección o local>`), y coordinador con botones **Llamar** (`tel:`) y
    **WhatsApp** (`https://wa.me/51<phone>`).
  - Estados: loading, no encontrado (mensaje amable), error/red, rate-limit.
  - Página ligera (sin scripts Politicly).

---

## Módulo 2 — Generador de Foto con Marco `/mi-foto`

100% del lado del cliente. **La foto nunca se sube a ningún servidor** (privacidad + costo cero).

Archivos: `src/app/mi-foto/page.tsx` (metadata) + `PhotoFrameClient.tsx` (client) + css.

### 2.1 Flujo

1. Subir foto: `<input type="file" accept="image/*" capture="environment">` (abre cámara en móvil).
2. Render en `<canvas>`: dibuja la foto (escalado *cover*) + marco por encima.
3. Controles:
   - Formato: **Cuadrado (1080×1080)** / **Historia (1080×1920)** — cambia el viewBox del canvas.
   - Zoom: slider (escala la foto).
   - Reencuadre: arrastrar la foto (mouse/touch) para moverla dentro del marco.
4. Acciones:
   - **Descargar**: `canvas.toBlob` → `<a download>` (`ahora-nacion-<formato>.png`).
   - **Compartir**: `navigator.share({ files: [file] })` si `navigator.canShare` lo soporta (móvil);
     fallback: descarga automática + botones para abrir WhatsApp/Facebook.

### 2.2 Marco (por código, aislado y sustituible)

Función pura `drawFrame(ctx, w, h, format)` — dibuja sobre el canvas ya pintado con la foto:

- Franja/gradiente rojo (`#e90305`) en el borde inferior.
- **Logo Ahora Nación** (`/assets/images/logo/logo-white.png`, precargado vía `Image`) dentro de la franja.
- Texto **"Simón Horna Alpaca"** (bold) + lema corto **"#AhoraNación"**.
- Márgenes/tamaños proporcionales a `w`/`h` para que se vea igual en cuadrado y en historia.

Al estar aislada, un PNG oficial puede reemplazarla después dibujando `ctx.drawImage(framePng, 0,0,w,h)`.

### 2.3 Notas técnicas

- Precargar el logo con `new Image()` + `onload` antes de permitir descargar (evita marco sin logo).
- `canvas` a 1080px del lado corto para calidad de descarga; el preview se escala vía CSS.
- Sin dependencias nuevas (canvas nativo).

---

## Integración en el landing

- Enlaces a `/mi-mesa` y `/mi-foto` en el menú (`src/components/landing/layout/Header.jsx`) y/o CTAs.
- Rutas fuera del grupo `(admin)` → layout raíz simple, sin los scripts de Politicly.

## Alcance excluido (YAGNI)

- Import CSV/Excel de personeros (se eligió CRUD manual).
- Almacenamiento de fotos en servidor / galería.
- Versión de foto de perfil circular.
- Historial de consultas de mesa.
- Autenticación del personero (la consulta es abierta, protegida solo por rate-limit).

## Verificación (convención del repo — sin tests automatizados)

1. `npx prisma validate` y migración aplicada; `npx prisma generate`.
2. `npm run build` sin errores; `eslint` limpio.
3. Navegador (móvil y escritorio):
   - `/mi-mesa`: DNI válido asignado → tarjeta correcta; DNI válido no asignado → 404 amable;
     DNI inválido → validación; botones Llamar/WhatsApp/Cómo llegar funcionan.
   - `/personeros` (admin): crear, editar, activar/desactivar, eliminar; permisos ocultan acciones sin `write`;
     padding correcto en móvil.
   - `/mi-foto`: subir foto, cambiar formato, zoom, arrastrar, descargar (ambos formatos), compartir en móvil.

## Archivos afectados (resumen)

**Nuevos:**
- `prisma/` migración `add_personero`.
- `src/app/(admin)/personeros/{page.tsx,PersonerosClient.tsx,actions.ts,types.ts,personeros.css}`
- `src/app/api/personeros/[dni]/route.ts`
- `src/app/mi-mesa/{page.tsx,MesaLookupClient.tsx,mi-mesa.css}`
- `src/app/mi-foto/{page.tsx,PhotoFrameClient.tsx,mi-foto.css}`

**Modificados:**
- `prisma/schema.prisma` (modelo `Personero` + relaciones en `User`)
- `src/lib/auth/permissions.ts` (permisos + roles)
- `src/components/admin/data.ts` (nav) y `src/components/admin/Icon.tsx` (ícono nuevo)
- `src/components/landing/layout/Header.jsx` (enlaces)
