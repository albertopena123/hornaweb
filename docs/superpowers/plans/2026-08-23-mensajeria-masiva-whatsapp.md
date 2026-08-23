# Mensajería masiva por WhatsApp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Módulo admin "Mensajería": importar Excel (DNI, nombre, celular) a una base única de contactos deduplicada por DNI y enviar campañas de WhatsApp de forma automática y pausada vía WAHA (Docker), con seguimiento de entrega, bajas ("BAJA"), tope diario, ventana horaria y veda electoral.

**Architecture:** Next.js 16 App Router (grupo `(admin)`) con Server Actions para toda la UI; un planificador en el propio proceso de Next (`src/instrumentation.ts` → `src/lib/messaging/scheduler.ts`) que cada 5 s toma un destinatario pendiente de Postgres y lo envía por HTTP a WAHA; un Route Handler `/api/waha/webhook` (HMAC sha512) recibe acks, respuestas y estado de sesión. El `.xlsx` se parsea en el navegador y llegan filas JSON por lotes de 500.

**Tech Stack:** Next.js 16.2.6, React 19.2, Prisma 7 (`@prisma/adapter-pg`, cliente generado en `src/generated/prisma`), Postgres, TypeScript 5, `read-excel-file` 9.3.10 (cliente), WAHA (`devlikeapro/waha`, engine NOWEB) en Docker, `tsx` + `node:test` para pruebas unitarias de los módulos puros.

**Spec:** `docs/superpowers/specs/2026-08-23-mensajeria-masiva-whatsapp-design.md`

## Global Constraints

- Next.js 16: `cookies()`, `headers()`, `params`, `searchParams` son **async**; `middleware.ts` se llama `src/proxy.ts`; Server Actions tienen body máx. **1 MB** (los lotes de 500 filas pesan ~60 KB).
- Base de datos: **`npx prisma db push` + `npx prisma generate`** (sin carpeta `migrations`). El cliente generado vive en `src/generated/prisma` y **se commitea**.
- Patrón de módulo admin (copiar de `src/app/(admin)/personeros/`): `page.tsx` server con `export const dynamic = "force-dynamic"` y `requirePermission("mensajes.read")`; `actions.ts` con `"use server"`, `authorize()` que lanza `Denied`, devuelve siempre `ActionResult` (nunca lanza); `XClient.tsx` con `"use client"`, importa `./mensajes.css`, usa `ConfirmDialog`/`Toasts` de `../usuarios/`, `Icon` de `@/components/admin/Icon`, `useEscClose` de `@/lib/ui/useEscClose`.
- Clases CSS globales reutilizables (`src/app/globals.css`): `btn btn--primary|--ghost`, `iconbtn`, `badge badge--green|--red|--amber|--neutral`, `tablewrap density-comfy|density-compact > tablewrap__scroll > table.dtable`, `tablefoot`, `dtable__muted`, `linkbtn`, `modal-backdrop > .modal > modal__head|modal__body|modal__foot`, `field > field__label` + `field__req`, `page__tabs > .tab.is-active`, `banner`, `stat > stat__v|stat__l`, `empty`. `btn--danger`, `login__error`, `.confirm*` y `.toast*` hoy están duplicados en `users.css`/`roles.css`/`login.css`; la Task 7 (Step 8b) los mueve a `globals.css`.
- Permisos: `mensajes.read` / `mensajes.write`, categoría `"Mensajería"`. `superadmin` recibe todo automáticamente; `admin` → ambos; `viewer` → `mensajes.read`.
- Textos de UI en **español**. Títulos de página: `"<Pantalla> · UNAMAD Admin"` (convención heredada del panel).
- Teléfonos se guardan en E.164 `+519XXXXXXXX`; DNI siempre 8 dígitos; `chatId` de WAHA = `51XXXXXXXXX@c.us`.
- Veda electoral: `ELECTION_DATE` (default `2026-10-04`) → sin envíos desde las 00:00 Lima del día anterior hasta las 00:00 Lima del día siguiente. Perú no tiene horario de verano: **Lima = UTC−5 fijo**.
- Pie obligatorio en cada mensaje: `MESSAGING_SENDER_FOOTER` (default `— Equipo Simón Horna · Responde BAJA para no recibir más mensajes`).
- `{nombre}` en la plantilla = **nombre completo en Title Case** (los padrones vienen "APELLIDOS NOMBRES"); `{dni}` = DNI.
- Pruebas: módulos puros (`src/lib/text.ts`, `src/lib/messaging/normalize.ts`, `lima-time.ts`, `csv.ts`, `webhook-signature.ts`) con `node:test` vía `npm test`. UI, Prisma y WAHA: `npm run build`, eslint **acotado a los archivos que el plan toca** y verificación manual. `npx eslint .` sobre el repo actual ya reporta cientos de errores preexistentes (`public/assets/js` vendor y `react-hooks/set-state-in-effect` en componentes existentes): quedan fuera de alcance y no deben "arreglarse" en este plan.
- Commits: mensajes convencionales `feat(mensajes): …`, `chore: …`, `test(mensajes): …`. Commitear también `src/generated/prisma` cuando cambie.

## File Structure

**Nuevos**
- `docker-compose.waha.yml` — WAHA en Docker (NOWEB), puerto `127.0.0.1:3001`.
- `.env.example` — variables documentadas (se des-ignora en `.gitignore`).
- `src/instrumentation.ts` — arranca el scheduler en runtime Node.
- `src/lib/text.ts` — `toTitleCase`, `foldText` (compartido cliente/servidor).
- `src/lib/text.test.ts`
- `src/lib/ui/csv.ts` — `downloadCsv(filename, header, rows)` (cliente).
- `src/lib/messaging/normalize.ts` — DNI/teléfono/nombre, detección de columnas, filas de importación, plantilla, BAJA, chatId.
- `src/lib/messaging/normalize.test.ts`
- `src/lib/messaging/lima-time.ts` — hora/día Lima, ventana horaria, veda.
- `src/lib/messaging/lima-time.test.ts`
- `src/lib/messaging/waha.ts` — cliente HTTP de WAHA (`server-only`).
- `src/lib/messaging/webhook-signature.ts` — `verifyWahaSignature`.
- `src/lib/messaging/webhook-signature.test.ts`
- `src/lib/messaging/scheduler.ts` — motor de envío (`server-only`).
- `scripts/waha-check.ts` — diagnóstico manual de conexión a WAHA.
- `src/app/api/waha/webhook/route.ts` — webhook de WAHA.
- `src/app/(admin)/mensajes/layout.tsx`, `MensajesTabs.tsx`, `page.tsx`, `mensajes.css`, `types.ts`
- `src/app/(admin)/mensajes/conexion/{page.tsx, ConexionClient.tsx, actions.ts}`
- `src/app/(admin)/mensajes/contactos/{page.tsx, ContactosClient.tsx, ImportModal.tsx, actions.ts}`
- `src/app/(admin)/mensajes/campanas/{page.tsx, CampanasClient.tsx, NewCampaignModal.tsx, actions.ts}`
- `src/app/(admin)/mensajes/campanas/[id]/{page.tsx, CampaignDetailClient.tsx}`

**Modificados**
- `package.json` (deps `read-excel-file`, devDep `tsx`; scripts `test`, `seed`), `.gitignore`
- `prisma/schema.prisma` (+ `src/generated/prisma/**` regenerado)
- `src/lib/auth/permissions.ts`, `src/app/(admin)/roles/category-icons.ts`
- `src/components/admin/Icon.tsx`, `src/components/admin/data.ts`, `src/components/admin/Sidebar.tsx`
- `src/app/api/dni/[dni]/route.ts` (usa `toTitleCase`)
- `src/app/api/admin/search/route.ts` (grupo Contactos)
- `src/proxy.ts` (`/api/waha/` público)

---

### Task 1: Dependencias, scripts, Docker de WAHA y variables de entorno

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `docker-compose.waha.yml`
- Create: `.env.example`

**Interfaces:**
- Produces: `npm test` (node:test vía tsx), `npm run seed`, imagen WAHA accesible en `http://127.0.0.1:3001`, variables `WAHA_URL`, `WAHA_API_KEY`, `WAHA_SESSION`, `WAHA_WEBHOOK_URL`, `WAHA_WEBHOOK_SECRET`, `MESSAGING_SENDER_FOOTER`, `ELECTION_DATE`, `MESSAGING_SCHEDULER`.

- [ ] **Step 1: Instalar dependencias**

Run:
```bash
npm install read-excel-file@^9.3.10
npm install -D tsx@^4
```
Expected: `package.json` lista `"read-excel-file": "^9.3.10"` en `dependencies` y `"tsx": "^4.x"` en `devDependencies`.

- [ ] **Step 2: Añadir scripts**

En `package.json`, dentro de `"scripts"`, dejar:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "tsx --test \"src/**/*.test.ts\"",
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 3: Des-ignorar `.env.example` e ignorar sesiones de WAHA**

Añadir al final de `.gitignore`:

```gitignore

# Plantilla de variables (sí se commitea)
!.env.example

# Sesiones de WhatsApp de WAHA (credenciales del número)
/.waha/
```

- [ ] **Step 4: Crear `docker-compose.waha.yml`**

```yaml
# WAHA — WhatsApp HTTP API (self-hosted). Arrancar: docker compose -f docker-compose.waha.yml up -d
# Lee WAHA_API_KEY del .env del proyecto (docker compose carga .env automáticamente).
services:
  waha:
    image: devlikeapro/waha
    container_name: waha
    restart: unless-stopped
    ports:
      - "127.0.0.1:3001:3000"
    environment:
      WAHA_API_KEY: ${WAHA_API_KEY}
      WHATSAPP_DEFAULT_ENGINE: NOWEB
      WAHA_PRINT_QR: "false"
      WHATSAPP_RESTART_ALL_SESSIONS: "true"
      WHATSAPP_HOOK_EVENTS: ""
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - ./.waha/sessions:/app/.sessions
```

- [ ] **Step 5: Crear `.env.example`**

```dotenv
# ── Base de datos / sesión (ya existentes en .env) ──
DATABASE_URL=postgresql://user:pass@localhost:5432/conadis
SESSION_SECRET=cambia-esto

# ── Mensajería (WAHA) ──
WAHA_URL=http://127.0.0.1:3001
WAHA_API_KEY=cambia-esto-por-un-secreto-largo
WAHA_SESSION=default
# URL con la que el contenedor de WAHA alcanza a Next (mismo VPS):
WAHA_WEBHOOK_URL=http://host.docker.internal:3000/api/waha/webhook
WAHA_WEBHOOK_SECRET=cambia-esto-por-otro-secreto-largo
MESSAGING_SENDER_FOOTER=— Equipo Simón Horna · Responde BAJA para no recibir más mensajes
# Veda: sin envíos desde 24 h antes de esta fecha (hora Lima) hasta el final del día de la elección.
ELECTION_DATE=2026-10-04
# "off" desactiva el bucle de envío en este proceso (p. ej. en desarrollo sin WAHA).
MESSAGING_SCHEDULER=on
```

Añadir las mismas claves de la sección "Mensajería" al `.env` real con valores propios (`WAHA_API_KEY` y `WAHA_WEBHOOK_SECRET`: `openssl rand -hex 32` o cualquier cadena larga aleatoria).

- [ ] **Step 6: Verificar**

Run: `npm ls read-excel-file tsx`
Expected: ambos listados sin `UNMET`.

Run: `git status --short`
Expected: aparece `.env.example` como nuevo (no ignorado), `docker-compose.waha.yml`, `package.json`, `package-lock.json`, `.gitignore`; **no** aparece `.env`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore docker-compose.waha.yml .env.example
git commit -m "chore(mensajes): deps read-excel-file y tsx, scripts test/seed, docker-compose de WAHA y .env.example"
```

---

### Task 2: Modelo de datos Prisma

**Files:**
- Modify: `prisma/schema.prisma` (al final del archivo y relaciones en `model User`)
- Regenerate: `src/generated/prisma/**`

**Interfaces:**
- Produces (modelos Prisma): `Contact`, `ContactImport`, `Campaign`, `CampaignRecipient`, `MessagingDailyCounter`; enums `WhatsappStatus {unknown,yes,no}`, `MessageChannel {whatsapp}`, `CampaignStatus {draft,running,paused,finished,cancelled}`, `CampaignAudience {all,not_contacted,district}`, `RecipientStatus {pending,sent,delivered,read,failed,no_whatsapp,opted_out,skipped}`.

- [ ] **Step 1: Añadir relaciones inversas en `model User`**

En `prisma/schema.prisma`, dentro de `model User`, después de `updatedPersoneros  Personero[] @relation("PersoneroUpdater")` (y de cualquier relación de anuncios que exista), añadir:

```prisma
  createdContacts       Contact[]       @relation("ContactCreator")
  createdContactImports ContactImport[] @relation("ContactImportCreator")
  createdCampaigns      Campaign[]      @relation("CampaignCreator")
```

- [ ] **Step 2: Añadir enums y modelos al final de `prisma/schema.prisma`**

```prisma

// ─────────────────────────── Mensajería (contactos + campañas WhatsApp) ───────────────────────────

enum WhatsappStatus {
  unknown
  yes
  no
}

enum MessageChannel {
  whatsapp
}

enum CampaignStatus {
  draft
  running
  paused
  finished
  cancelled
}

enum CampaignAudience {
  all // todos los contactos activos (sin baja y con WhatsApp ≠ no)
  not_contacted // contactos sin lastMessagedAt
  district // contactos de un distrito (campaign.district)
}

enum RecipientStatus {
  pending
  sent // aceptado por WAHA (ack SERVER pendiente)
  delivered // ack DEVICE
  read // ack READ / PLAYED
  failed // error de envío tras reintentos, o ack ERROR
  no_whatsapp // check-exists = false
  opted_out // el contacto pidió baja antes del envío
  skipped // campaña cancelada con el destinatario aún pendiente
}

model Contact {
  id             String         @id @default(cuid())
  docType        DocumentType   @default(dni)
  docNumber      String
  name           String
  phone          String // E.164: +519XXXXXXXX
  district       District?
  source         String // origen de la lista (texto de la importación)
  whatsappStatus WhatsappStatus @default(unknown)
  checkedAt      DateTime? // último check-exists
  optedOut       Boolean        @default(false)
  optedOutAt     DateTime?
  optedOutReason String? // "reply:<texto>" | "manual:<userId>"
  lastMessagedAt DateTime?
  importId       String? // última importación que lo creó/actualizó
  createdById    String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  import     ContactImport?      @relation(fields: [importId], references: [id], onDelete: SetNull)
  createdBy  User?               @relation("ContactCreator", fields: [createdById], references: [id], onDelete: SetNull)
  recipients CampaignRecipient[]

  @@unique([docType, docNumber])
  @@index([phone])
  @@index([optedOut])
  @@index([whatsappStatus])
  @@index([district])
}

model ContactImport {
  id               String   @id @default(cuid())
  fileName         String
  source           String // "Padrón de personeros 2026", "Inscritos feria Puerto Maldonado"…
  consentConfirmed Boolean // checkbox obligatorio en la UI
  totalRows        Int
  inserted         Int      @default(0)
  updated          Int      @default(0)
  invalid          Int // DNI/teléfono inválidos (no se importan)
  duplicatedInFile Int // DNI repetidos dentro del archivo (se conserva la última fila)
  finishedAt       DateTime?
  createdById      String?
  createdAt        DateTime @default(now())

  createdBy User?     @relation("ContactImportCreator", fields: [createdById], references: [id], onDelete: SetNull)
  contacts  Contact[]
}

model Campaign {
  id              String           @id @default(cuid())
  name            String
  channel         MessageChannel   @default(whatsapp)
  messageTemplate String // admite {nombre} y {dni}
  audience        CampaignAudience
  district        District? // solo si audience = district
  status          CampaignStatus   @default(draft)
  dailyCap        Int              @default(150)
  minDelaySec     Int              @default(45)
  maxDelaySec     Int              @default(120)
  windowStart     Int              @default(8) // hora Lima (0-23) inclusive
  windowEnd       Int              @default(20) // hora Lima exclusiva
  totalRecipients Int              @default(0)
  sentCount       Int              @default(0) // sent+delivered+read
  failedCount     Int              @default(0) // failed+no_whatsapp
  lastError       String?
  pausedReason    String? // "session_down" | "manual" | "waha_error" | "veda"
  startedAt       DateTime?
  finishedAt      DateTime?
  createdById     String?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  createdBy  User?               @relation("CampaignCreator", fields: [createdById], references: [id], onDelete: SetNull)
  recipients CampaignRecipient[]

  @@index([status])
}

model CampaignRecipient {
  id            String          @id @default(cuid())
  campaignId    String
  contactId     String
  status        RecipientStatus @default(pending)
  attempts      Int             @default(0)
  wahaMessageId String?
  error         String?
  sentAt        DateTime?
  deliveredAt   DateTime?
  readAt        DateTime?
  updatedAt     DateTime        @updatedAt

  campaign Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  contact  Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@unique([campaignId, contactId])
  @@unique([wahaMessageId])
  @@index([campaignId, status])
}

model MessagingDailyCounter {
  day   String @id // "YYYY-MM-DD" en hora Lima
  count Int    @default(0)
}
```

- [ ] **Step 3: Validar, aplicar y generar**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

Run: `npx prisma db push`
Expected: `Your database is now in sync with your Prisma schema.`

Run: `npx prisma generate`
Expected: `Generated Prisma Client` hacia `src/generated/prisma`.

- [ ] **Step 4: Comprobar tipos generados**

Run: `grep -n "export const RecipientStatus\|export const CampaignStatus\|export const WhatsappStatus" src/generated/prisma/enums.ts`
Expected: tres líneas con los enums.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/generated/prisma
git commit -m "feat(mensajes): modelos Contact, ContactImport, Campaign, CampaignRecipient y MessagingDailyCounter"
```

---

### Task 3: Permisos RBAC, icono de categoría y seed

**Files:**
- Modify: `src/lib/auth/permissions.ts`
- Modify: `src/app/(admin)/roles/category-icons.ts`
- Modify: `src/components/admin/Icon.tsx` (tipo `IconName` + SVG `message`)

**Interfaces:**
- Produces: `PermissionKey` incluye `"mensajes.read" | "mensajes.write"`; `IconName` incluye `"message"`.

- [ ] **Step 1: Añadir el icono `message` en `Icon.tsx`**

En el tipo `IconName`, antes de `| "logo";` añadir `| "message"`. En el `switch`, antes de `case "logo":` añadir:

```tsx
    case "message":
      return (
        <svg {...props}>
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9l-4.2 3.4c-.4.3-.8 0-.8-.4V6.5Z" />
          <path d="M8 9h8M8 12.5h5" />
        </svg>
      );
```

- [ ] **Step 2: Añadir permisos**

En `src/lib/auth/permissions.ts`, en el comentario de cabecera añadir la línea `// - "Mensajería"     → /mensajes (contactos, campañas WhatsApp)`. En el array `PERMISSIONS`, después del bloque de `anuncios.write`, añadir:

```ts
  {
    key: "mensajes.read",
    name: "Ver mensajería",
    description: "Consultar contactos, campañas y estado de la conexión de WhatsApp",
    category: "Mensajería",
  },
  {
    key: "mensajes.write",
    name: "Gestionar mensajería",
    description:
      "Importar contactos, crear y controlar campañas, conectar WhatsApp y dar de baja contactos",
    category: "Mensajería",
  },
```

En `ROLE_DEFS`: al rol `admin` añadir `"mensajes.read", "mensajes.write",` después de `"anuncios.write",`; al rol `viewer` añadir `"mensajes.read",` después de `"anuncios.read",`.

- [ ] **Step 3: Icono de categoría**

En `src/app/(admin)/roles/category-icons.ts` añadir a `MAP`:

```ts
  Personeros: "id-card",
  Mensajería: "message",
```

(`Personeros` se añade de paso porque faltaba; es una sola línea y no cambia comportamiento para otras categorías.)

- [ ] **Step 4: Seed y verificación**

Run: `npm run seed`
Expected: `→ Sincronizando permisos…`, `→ Sincronizando roles…` sin `⚠`.

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sin errores.

En el navegador: `/roles` → el rol Administrador muestra la categoría **Mensajería** con icono de burbuja y los dos permisos.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/permissions.ts "src/app/(admin)/roles/category-icons.ts" src/components/admin/Icon.tsx
git commit -m "feat(mensajes): permisos mensajes.read/write, icono message y categoría Mensajería"
```

---

### Task 4: `src/lib/text.ts` y `src/lib/messaging/normalize.ts` (TDD)

**Files:**
- Create: `src/lib/text.ts`, `src/lib/text.test.ts`
- Create: `src/lib/messaging/normalize.ts`, `src/lib/messaging/normalize.test.ts`
- Modify: `src/app/api/dni/[dni]/route.ts` (usa `toTitleCase`)

**Interfaces:**
- Produces (`src/lib/text.ts`): `toTitleCase(s: string): string`, `foldText(s: string): string` (sin tildes, minúsculas, espacios colapsados).
- Produces (`src/lib/messaging/normalize.ts`):
  - `type CellLike = string | number | boolean | Date | null | undefined`
  - `normalizeDni(v: CellLike): string | null`
  - `normalizePeruPhone(v: CellLike): string | null` → `+519XXXXXXXX`
  - `normalizeName(v: CellLike): string`
  - `type ColumnMapping = { dni: number | null; name: number | null; phone: number | null; paterno: number | null; materno: number | null }`
  - `detectColumns(headers: CellLike[]): ColumnMapping`
  - `type ImportRowInput = { docNumber: string; name: string; phone: string; district?: string }`
  - `type InvalidRow = { row: number; docNumber: string; name: string; phone: string; reason: string }`
  - `type NormalizedSheet = { valid: ImportRowInput[]; invalid: InvalidRow[]; duplicatedInFile: number; totalRows: number }`
  - `normalizeRows(rows: CellLike[][], mapping: ColumnMapping, district?: string): NormalizedSheet` (rows SIN cabecera; `row` en `InvalidRow` es 1-based contando la cabecera como fila 1)
  - `renderTemplate(template: string, contact: { name: string; docNumber: string }, footer: string): string`
  - `isOptOutText(body: string): boolean`
  - `phoneToChatId(phoneE164: string): string` → `51987654321@c.us`
  - `chatIdToPhone(chatId: string): string | null` → `+51987654321` o `null` si no es `@c.us`
  - `jidToPhone(jid: string | undefined | null): string | null` → acepta `@c.us` y `NNN[:dev]@s.whatsapp.net`; `@lid` → `null`
  - `TEMPLATE_MAX = 1000`, `IMPORT_BATCH_SIZE = 500`

- [ ] **Step 1: Escribir `src/lib/text.test.ts` (falla: módulo no existe)**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { toTitleCase, foldText } from "./text";

test("toTitleCase capitaliza cada palabra y colapsa espacios", () => {
  assert.equal(toTitleCase("  PEREZ   GOMEZ juan "), "Perez Gomez Juan");
  assert.equal(toTitleCase(""), "");
});

test("foldText quita tildes, baja a minúsculas y colapsa espacios", () => {
  assert.equal(foldText("  Teléfono   CELULAR "), "telefono celular");
  assert.equal(foldText("Ñandú"), "ñandu");
});
```

- [ ] **Step 2: Ejecutar y ver fallo**

Run: `npm test`
Expected: FAIL — `Cannot find module './text'` (o similar).

- [ ] **Step 3: Crear `src/lib/text.ts`**

```ts
// Utilidades de texto compartidas por cliente y servidor (sin "server-only").

/** "PEREZ GOMEZ juan" → "Perez Gomez Juan". Colapsa espacios. */
export function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Marcadores temporales para preservar ñ/Ñ durante la descomposición NFD. Escritos como
// escapes \u para que el archivo sea ASCII puro (no pegar caracteres de control literales).
const N_LOWER = "\u0001";
const N_UPPER = "\u0002";

/** Normaliza para comparar: sin tildes (conserva ñ), minúsculas, espacios colapsados. */
export function foldText(s: string): string {
  return s
    .replace(/ñ/g, N_LOWER)
    .replace(/Ñ/g, N_UPPER)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0001/g, "ñ")
    .replace(/\u0002/g, "Ñ")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
```

- [ ] **Step 4: Ejecutar y ver paso**

Run: `npm test`
Expected: 2 tests PASS.

- [ ] **Step 5: Usar `toTitleCase` en `src/app/api/dni/[dni]/route.ts`**

Eliminar la función local `titleCase` (líneas `function titleCase(s: string): string { … }`), añadir `import { toTitleCase } from "@/lib/text";` y cambiar `return ok({ name: titleCase(fullName) });` por `return ok({ name: toTitleCase(fullName) });`.

- [ ] **Step 6: Escribir `src/lib/messaging/normalize.test.ts` (falla)**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDni,
  normalizePeruPhone,
  normalizeName,
  detectColumns,
  normalizeRows,
  renderTemplate,
  isOptOutText,
  phoneToChatId,
  chatIdToPhone,
  jidToPhone,
} from "./normalize";

test("normalizeDni acepta 8 dígitos, número de Excel, 7 dígitos con cero perdido y notación científica", () => {
  assert.equal(normalizeDni("12345678"), "12345678");
  assert.equal(normalizeDni(12345678), "12345678");
  assert.equal(normalizeDni(" 1234567 "), "01234567");
  assert.equal(normalizeDni("1.2345678E7"), "12345678");
  assert.equal(normalizeDni("123456"), null);
  assert.equal(normalizeDni("123456789"), null);
  assert.equal(normalizeDni(null), null);
  assert.equal(normalizeDni(true), null);
});

test("normalizePeruPhone normaliza a +519XXXXXXXX", () => {
  assert.equal(normalizePeruPhone("987654321"), "+51987654321");
  assert.equal(normalizePeruPhone(987654321), "+51987654321");
  assert.equal(normalizePeruPhone("+51 987 654 321"), "+51987654321");
  assert.equal(normalizePeruPhone("51987654321"), "+51987654321");
  assert.equal(normalizePeruPhone("0051987654321"), "+51987654321");
  assert.equal(normalizePeruPhone("9.87654321E8"), "+51987654321");
  assert.equal(normalizePeruPhone("082123456"), null); // fijo
  assert.equal(normalizePeruPhone("98765432"), null);
  assert.equal(normalizePeruPhone(""), null);
});

test("normalizeName limpia y pone Title Case", () => {
  assert.equal(normalizeName("  PEREZ  GOMEZ   JUAN "), "Perez Gomez Juan");
  assert.equal(normalizeName(null), "");
});

test("detectColumns reconoce cabeceras comunes sin distinguir tildes ni mayúsculas", () => {
  const m = detectColumns(["N°", "DNI", "Nombre Completo", "Teléfono", "Distrito"]);
  assert.deepEqual(m, { dni: 1, name: 2, phone: 3, paterno: null, materno: null });
  const m2 = detectColumns(["NUMERO DE DOCUMENTO", "AP PATERNO", "AP MATERNO", "NOMBRES", "CELULAR"]);
  assert.deepEqual(m2, { dni: 0, name: 3, phone: 4, paterno: 1, materno: 2 });
  const m3 = detectColumns(["x", "y"]);
  assert.deepEqual(m3, { dni: null, name: null, phone: null, paterno: null, materno: null });
});

test("normalizeRows valida, compone nombres, deduplica por DNI (gana la última) y numera filas", () => {
  const mapping = { dni: 0, name: 3, phone: 4, paterno: 1, materno: 2 };
  const rows = [
    ["12345678", "PEREZ", "GOMEZ", "JUAN", "987654321"],
    ["1234567", "LOPEZ", "RUIZ", "ANA", "+51 912 345 678"],
    ["12345678", "PEREZ", "GOMEZ", "JUAN CARLOS", "987654321"],
    ["99999999", "SIN", "FONO", "PEPE", "123"],
    [null, null, null, null, null],
    ["55555555", "", "", "", "955555555"],
  ];
  const r = normalizeRows(rows, mapping, "tambopata");
  assert.equal(r.totalRows, 5); // la fila vacía no cuenta
  assert.equal(r.duplicatedInFile, 1);
  assert.deepEqual(r.valid, [
    { docNumber: "12345678", name: "Juan Carlos Perez Gomez", phone: "+51987654321", district: "tambopata" },
    { docNumber: "01234567", name: "Ana Lopez Ruiz", phone: "+51912345678", district: "tambopata" },
  ]);
  assert.deepEqual(
    r.invalid.map((i) => [i.row, i.reason]),
    [
      [5, "Celular inválido"],
      [7, "Nombre vacío"],
    ],
  );
});

test("renderTemplate reemplaza {nombre} (nombre completo Title Case) y {dni} y añade el pie", () => {
  const out = renderTemplate("Hola {nombre} (DNI {dni}), ¡gracias!", { name: "PEREZ GOMEZ JUAN", docNumber: "12345678" }, "— Equipo · Responde BAJA");
  assert.equal(out, "Hola Perez Gomez Juan (DNI 12345678), ¡gracias!\n\n— Equipo · Responde BAJA");
  assert.equal(renderTemplate("Hola", { name: "X", docNumber: "1" }, ""), "Hola");
});

test("isOptOutText detecta BAJA / STOP / NO al inicio", () => {
  assert.equal(isOptOutText("BAJA"), true);
  assert.equal(isOptOutText("  baja por favor"), true);
  assert.equal(isOptOutText("Stop"), true);
  assert.equal(isOptOutText("No quiero"), true);
  assert.equal(isOptOutText("Nos vemos"), false);
  assert.equal(isOptOutText("gracias"), false);
});

test("phoneToChatId / chatIdToPhone / jidToPhone", () => {
  assert.equal(phoneToChatId("+51987654321"), "51987654321@c.us");
  assert.equal(chatIdToPhone("51987654321@c.us"), "+51987654321");
  assert.equal(chatIdToPhone("123@lid"), null);
  assert.equal(jidToPhone("51987654321@s.whatsapp.net"), "+51987654321");
  assert.equal(jidToPhone("51987654321:12@s.whatsapp.net"), "+51987654321");
  assert.equal(jidToPhone("51987654321@c.us"), "+51987654321");
  assert.equal(jidToPhone("123456789012345@lid"), null);
  assert.equal(jidToPhone(undefined), null);
});
```

- [ ] **Step 7: Ejecutar y ver fallo**

Run: `npm test`
Expected: FAIL — `Cannot find module './normalize'`.

- [ ] **Step 8: Crear `src/lib/messaging/normalize.ts`**

```ts
// Normalización de datos de contactos y plantillas. Sin "server-only": se usa
// en el navegador (vista previa de importación) y en el servidor (acciones, motor).
import { foldText, toTitleCase } from "@/lib/text";

export type CellLike = string | number | boolean | Date | null | undefined;

export const TEMPLATE_MAX = 1000;
export const IMPORT_BATCH_SIZE = 500;

const SCI = /^\d+(\.\d+)?e\+?\d+$/i;

function cellToString(v: CellLike): string {
  if (v === null || v === undefined || typeof v === "boolean" || v instanceof Date) return "";
  if (typeof v === "number") return Number.isFinite(v) ? v.toFixed(0) : "";
  const s = String(v).trim();
  return SCI.test(s) ? Number(s).toFixed(0) : s;
}

/** "12345678" | 12345678 | " 1234567 " (cero perdido) | "1.2345678E7" → "12345678"; si no, null. */
export function normalizeDni(v: CellLike): string | null {
  let s = cellToString(v).replace(/\D/g, "");
  if (s.length === 7) s = "0" + s;
  return /^\d{8}$/.test(s) ? s : null;
}

/** Celular peruano → "+519XXXXXXXX". Acepta 9 dígitos, 51…, +51 …, 0051…, notación científica. */
export function normalizePeruPhone(v: CellLike): string | null {
  let s = cellToString(v).replace(/\D/g, "");
  if (s.startsWith("00")) s = s.slice(2);
  if (s.length === 11 && s.startsWith("51")) s = s.slice(2);
  return /^9\d{8}$/.test(s) ? `+51${s}` : null;
}

export function normalizeName(v: CellLike): string {
  if (typeof v !== "string") return "";
  return toTitleCase(v.replace(/\s+/g, " ").trim());
}

export type ColumnMapping = {
  dni: number | null;
  name: number | null;
  phone: number | null;
  paterno: number | null;
  materno: number | null;
};

const HEADERS: Record<keyof ColumnMapping, string[]> = {
  dni: ["dni", "documento", "nro documento", "nro de documento", "numero de documento", "num doc", "num documento", "nro doc", "n documento", "doc", "nrodoc", "numdoc"],
  paterno: ["apellido paterno", "ap paterno", "ap pat", "ap_pat", "paterno", "apellidopaterno", "primer apellido"],
  materno: ["apellido materno", "ap materno", "ap mat", "ap_mat", "materno", "apellidomaterno", "segundo apellido"],
  name: ["nombre", "nombres", "nombre completo", "nombres completos", "nombres y apellidos", "apellidos y nombres", "nombre y apellidos"],
  phone: ["celular", "telefono", "telefono celular", "nro celular", "numero celular", "numero", "whatsapp", "movil", "cel", "fono", "nro telefono", "numero de telefono"],
};

// Orden de resolución: primero exacto, luego "contiene"; dni y apellidos antes que
// nombre y teléfono para que "numero de documento" no se lo lleve "numero".
const ORDER: (keyof ColumnMapping)[] = ["dni", "paterno", "materno", "name", "phone"];

export function detectColumns(headers: CellLike[]): ColumnMapping {
  const folded = headers.map((h) => foldText(typeof h === "string" ? h : h === null || h === undefined ? "" : String(h)));
  const used = new Set<number>();
  const out: ColumnMapping = { dni: null, name: null, phone: null, paterno: null, materno: null };
  for (const key of ORDER) {
    const idx = folded.findIndex((h, i) => !used.has(i) && HEADERS[key].includes(h));
    if (idx >= 0) {
      out[key] = idx;
      used.add(idx);
    }
  }
  for (const key of ORDER) {
    if (out[key] !== null) continue;
    const idx = folded.findIndex((h, i) => !used.has(i) && h !== "" && HEADERS[key].some((k) => h.includes(k)));
    if (idx >= 0) {
      out[key] = idx;
      used.add(idx);
    }
  }
  return out;
}

export type ImportRowInput = { docNumber: string; name: string; phone: string; district?: string };
export type InvalidRow = { row: number; docNumber: string; name: string; phone: string; reason: string };
export type NormalizedSheet = {
  valid: ImportRowInput[];
  invalid: InvalidRow[];
  duplicatedInFile: number;
  totalRows: number;
};

function isEmptyRow(row: CellLike[]): boolean {
  return row.every((c) => c === null || c === undefined || (typeof c === "string" && c.trim() === ""));
}

function pick(row: CellLike[], idx: number | null): CellLike {
  return idx === null ? null : row[idx];
}

/** `rows` sin la cabecera. `row` en los inválidos es 1-based contando la cabecera como fila 1. */
export function normalizeRows(rows: CellLike[][], mapping: ColumnMapping, district?: string): NormalizedSheet {
  const byDni = new Map<string, ImportRowInput>();
  const invalid: InvalidRow[] = [];
  let totalRows = 0;
  let duplicatedInFile = 0;

  rows.forEach((row, i) => {
    if (isEmptyRow(row)) return;
    totalRows += 1;
    const rowNumber = i + 2;
    const rawDni = cellToString(pick(row, mapping.dni));
    const rawPhone = cellToString(pick(row, mapping.phone));
    const nombres = normalizeName(pick(row, mapping.name));
    const paterno = normalizeName(pick(row, mapping.paterno));
    const materno = normalizeName(pick(row, mapping.materno));
    const name = [nombres, paterno, materno].filter(Boolean).join(" ");

    const docNumber = normalizeDni(rawDni);
    const phone = normalizePeruPhone(rawPhone);
    const reason = !docNumber ? "DNI inválido" : !phone ? "Celular inválido" : name === "" ? "Nombre vacío" : null;
    if (reason) {
      invalid.push({ row: rowNumber, docNumber: rawDni, name, phone: rawPhone, reason });
      return;
    }
    if (byDni.has(docNumber!)) duplicatedInFile += 1;
    const item: ImportRowInput = { docNumber: docNumber!, name, phone: phone! };
    if (district) item.district = district;
    byDni.set(docNumber!, item);
  });

  return { valid: [...byDni.values()], invalid, duplicatedInFile, totalRows };
}

/** Reemplaza {nombre} (nombre completo en Title Case) y {dni}; añade el pie separado por línea en blanco. */
export function renderTemplate(template: string, contact: { name: string; docNumber: string }, footer: string): string {
  const body = template
    .replace(/\{nombre\}/gi, toTitleCase(contact.name))
    .replace(/\{dni\}/gi, contact.docNumber)
    .trim();
  const f = footer.trim();
  return f ? `${body}\n\n${f}` : body;
}

export function isOptOutText(body: string): boolean {
  return /^(baja|stop|no)\b/.test(foldText(body));
}

export function phoneToChatId(phoneE164: string): string {
  return `${phoneE164.replace(/\D/g, "")}@c.us`;
}

export function chatIdToPhone(chatId: string): string | null {
  const m = /^(\d{8,15})@c\.us$/.exec(chatId);
  return m ? `+${m[1]}` : null;
}

/** Acepta chatId de WAHA (`NNN@c.us`) o JID crudo de Baileys (`NNN[:device]@s.whatsapp.net`, como llega en `_data.key.remoteJidAlt`). `@lid` → null. */
export function jidToPhone(jid: string | undefined | null): string | null {
  if (!jid) return null;
  return chatIdToPhone(jid.replace(/:\d+(?=@)/, "").replace(/@s\.whatsapp\.net$/, "@c.us"));
}
```

- [ ] **Step 9: Ejecutar pruebas**

Run: `npm test`
Expected: todos PASS (2 de text + 8 de normalize).

- [ ] **Step 10: Lint y tipos**

Run: `npx eslint src/lib/text.ts src/lib/messaging/normalize.ts "src/app/api/dni/[dni]/route.ts" && npx tsc --noEmit -p tsconfig.json`
Expected: sin errores.

- [ ] **Step 11: Commit**

```bash
git add src/lib/text.ts src/lib/text.test.ts src/lib/messaging/normalize.ts src/lib/messaging/normalize.test.ts "src/app/api/dni/[dni]/route.ts"
git commit -m "feat(mensajes): normalización de DNI/celular/nombres, detección de columnas y plantillas (con tests)"
```

---

### Task 5: `src/lib/messaging/lima-time.ts` (TDD)

**Files:**
- Create: `src/lib/messaging/lima-time.ts`, `src/lib/messaging/lima-time.test.ts`

**Interfaces:**
- Produces: `limaHour(d?: Date): number` (0–23), `limaDayKey(d?: Date): string` ("YYYY-MM-DD"), `isWithinWindow(hour: number, start: number, end: number): boolean`, `nextWindowStart(now: Date, startHour: number): Date`, `isElectoralSilence(now: Date, electionDate: string | undefined): boolean`, `randomBetween(minInclusive: number, maxInclusive: number): number`.

- [ ] **Step 1: Escribir `src/lib/messaging/lima-time.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { limaHour, limaDayKey, isWithinWindow, nextWindowStart, isElectoralSilence, randomBetween } from "./lima-time";

test("limaHour y limaDayKey usan UTC-5 fijo", () => {
  // 2026-10-04T03:30Z = 2026-10-03 22:30 Lima
  const d = new Date("2026-10-04T03:30:00Z");
  assert.equal(limaHour(d), 22);
  assert.equal(limaDayKey(d), "2026-10-03");
  // 2026-10-04T05:00Z = 2026-10-04 00:00 Lima
  assert.equal(limaHour(new Date("2026-10-04T05:00:00Z")), 0);
  assert.equal(limaDayKey(new Date("2026-10-04T05:00:00Z")), "2026-10-04");
});

test("isWithinWindow es inclusivo al inicio y exclusivo al final", () => {
  assert.equal(isWithinWindow(8, 8, 20), true);
  assert.equal(isWithinWindow(19, 8, 20), true);
  assert.equal(isWithinWindow(20, 8, 20), false);
  assert.equal(isWithinWindow(7, 8, 20), false);
});

test("nextWindowStart devuelve la próxima hora de inicio en Lima", () => {
  // 2026-08-23 22:00 Lima = 2026-08-24T03:00Z → próximo 08:00 Lima = 2026-08-24T13:00Z
  assert.equal(nextWindowStart(new Date("2026-08-24T03:00:00Z"), 8).toISOString(), "2026-08-24T13:00:00.000Z");
  // 2026-08-24 06:00 Lima = 11:00Z → hoy 08:00 Lima = 13:00Z
  assert.equal(nextWindowStart(new Date("2026-08-24T11:00:00Z"), 8).toISOString(), "2026-08-24T13:00:00.000Z");
});

test("isElectoralSilence bloquea desde 00:00 Lima del día anterior hasta el fin del día de elección", () => {
  const election = "2026-10-04";
  assert.equal(isElectoralSilence(new Date("2026-10-03T04:59:00Z"), election), false); // 2-oct 23:59 Lima
  assert.equal(isElectoralSilence(new Date("2026-10-03T05:00:00Z"), election), true); // 3-oct 00:00 Lima
  assert.equal(isElectoralSilence(new Date("2026-10-05T04:59:00Z"), election), true); // 4-oct 23:59 Lima
  assert.equal(isElectoralSilence(new Date("2026-10-05T05:00:00Z"), election), false); // 5-oct 00:00 Lima
  assert.equal(isElectoralSilence(new Date("2026-10-03T12:00:00Z"), undefined), false);
  assert.equal(isElectoralSilence(new Date("2026-10-03T12:00:00Z"), "no-es-fecha"), false);
});

test("randomBetween queda dentro del rango", () => {
  for (let i = 0; i < 100; i++) {
    const v = randomBetween(45, 120);
    assert.ok(v >= 45 && v <= 120);
  }
  assert.equal(randomBetween(7, 7), 7);
});
```

- [ ] **Step 2: Ejecutar y ver fallo**

Run: `npm test`
Expected: FAIL — `Cannot find module './lima-time'`.

- [ ] **Step 3: Crear `src/lib/messaging/lima-time.ts`**

```ts
// Perú no aplica horario de verano: Lima es UTC-5 fijo. Evitamos librerías de zonas horarias.
const LIMA_OFFSET_MS = -5 * 3600 * 1000;

function toLima(d: Date): Date {
  return new Date(d.getTime() + LIMA_OFFSET_MS);
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function limaHour(d: Date = new Date()): number {
  return toLima(d).getUTCHours();
}

export function limaDayKey(d: Date = new Date()): string {
  const l = toLima(d);
  return `${l.getUTCFullYear()}-${pad(l.getUTCMonth() + 1)}-${pad(l.getUTCDate())}`;
}

/** Ventana [start, end) en horas Lima. */
export function isWithinWindow(hour: number, start: number, end: number): boolean {
  return hour >= start && hour < end;
}

/** Próximo instante (UTC) en que son las `startHour:00` en Lima, estrictamente después de `now`. */
export function nextWindowStart(now: Date, startHour: number): Date {
  const l = toLima(now);
  let candidate = Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate(), startHour, 0, 0) - LIMA_OFFSET_MS;
  if (candidate <= now.getTime()) candidate += 86_400_000;
  return new Date(candidate);
}

/** Veda: desde 00:00 Lima del día anterior a la elección hasta 00:00 Lima del día siguiente. */
export function isElectoralSilence(now: Date, electionDate: string | undefined): boolean {
  if (!electionDate) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(electionDate.trim());
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const start = Date.UTC(y, mo, d - 1, 0, 0, 0) - LIMA_OFFSET_MS;
  const end = Date.UTC(y, mo, d + 1, 0, 0, 0) - LIMA_OFFSET_MS;
  const t = now.getTime();
  return t >= start && t < end;
}

export function randomBetween(minInclusive: number, maxInclusive: number): number {
  const lo = Math.min(minInclusive, maxInclusive);
  const hi = Math.max(minInclusive, maxInclusive);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}
```

- [ ] **Step 4: Ejecutar pruebas**

Run: `npm test`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/messaging/lima-time.ts src/lib/messaging/lima-time.test.ts
git commit -m "feat(mensajes): helpers de hora Lima, ventana horaria y veda electoral (con tests)"
```

---

### Task 6: Cliente HTTP de WAHA y script de diagnóstico

**Files:**
- Create: `src/lib/messaging/waha.ts`
- Create: `scripts/waha-check.ts`

**Interfaces:**
- Produces (`src/lib/messaging/waha.ts`, `server-only`):
  - `type WahaSessionStatus = "STOPPED" | "STARTING" | "SCAN_QR_CODE" | "WORKING" | "FAILED" | "UNKNOWN"`
  - `type WahaSessionInfo = { status: WahaSessionStatus; me: { id: string; pushName: string } | null }`
  - `class WahaError extends Error { status: number; body: string }` (respuesta HTTP no-2xx). Errores de red/timeout se propagan como `Error` normal (`TypeError`/`AbortError`). `class WahaConfigError` (variables de entorno incompletas). `describeWahaError(e: unknown): string` (mensaje legible para la UI; síncrono).
  - `getSession(): Promise<WahaSessionInfo>` (404 → `STOPPED`)
  - `startSession(): Promise<void>`
  - `getQr(): Promise<{ mimetype: string; data: string } | null>` (`null` si no está en `SCAN_QR_CODE`)
  - `logoutSession(): Promise<void>`, `stopSession(): Promise<void>`
  - `checkExists(phoneE164: string): Promise<{ exists: boolean; chatId: string | null }>`
  - `sendText(chatId: string, text: string): Promise<{ id: string }>`
  - `wahaConfig(): { url: string; apiKey: string; session: string; webhookUrl: string; webhookSecret: string }`

- [ ] **Step 1: Crear `src/lib/messaging/waha.ts`**

```ts
import "server-only";

// Cliente mínimo de WAHA (https://waha.devlike.pro). Todas las llamadas llevan
// X-Api-Key y un timeout de 15 s. Los errores HTTP se devuelven como WahaError;
// los de red/timeout como Error normal (TypeError/AbortError).

export type WahaSessionStatus = "STOPPED" | "STARTING" | "SCAN_QR_CODE" | "WORKING" | "FAILED" | "UNKNOWN";
export type WahaSessionInfo = { status: WahaSessionStatus; me: { id: string; pushName: string } | null };

export class WahaError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`WAHA ${status}: ${body.slice(0, 300)}`);
    this.name = "WahaError";
    this.status = status;
    this.body = body;
  }
}

/** Configuración incompleta (variables de entorno). */
export class WahaConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WahaConfigError";
  }
}

/** Mensaje legible para la UI a partir de cualquier error del cliente WAHA. */
export function describeWahaError(e: unknown): string {
  if (e instanceof WahaConfigError) return e.message;
  if (e instanceof WahaError) {
    if (e.status === 401) return "API key de WAHA inválida (revisa WAHA_API_KEY).";
    return `WAHA respondió ${e.status}.`;
  }
  if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) return "WAHA no responde (timeout).";
  return "WAHA no responde. ¿Está levantado el contenedor?";
}

const TIMEOUT_MS = 15_000;

export function wahaConfig() {
  return {
    url: (process.env.WAHA_URL ?? "http://127.0.0.1:3001").replace(/\/+$/, ""),
    apiKey: process.env.WAHA_API_KEY ?? "",
    session: process.env.WAHA_SESSION ?? "default",
    webhookUrl: process.env.WAHA_WEBHOOK_URL ?? "http://host.docker.internal:3000/api/waha/webhook",
    webhookSecret: process.env.WAHA_WEBHOOK_SECRET ?? "",
  };
}

async function wahaFetch(path: string, init?: { method?: string; body?: unknown; accept?: string }): Promise<Response> {
  const cfg = wahaConfig();
  const res = await fetch(`${cfg.url}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      "X-Api-Key": cfg.apiKey,
      Accept: init?.accept ?? "application/json",
      ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  return res;
}

async function expectOk(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!res.ok) throw new WahaError(res.status, text);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const STATUSES: WahaSessionStatus[] = ["STOPPED", "STARTING", "SCAN_QR_CODE", "WORKING", "FAILED"];

export async function getSession(): Promise<WahaSessionInfo> {
  const { session } = wahaConfig();
  const res = await wahaFetch(`/api/sessions/${encodeURIComponent(session)}`);
  if (res.status === 404) {
    await res.text();
    return { status: "STOPPED", me: null };
  }
  const data = (await expectOk(res)) as { status?: string; me?: { id?: string; pushName?: string } | null } | null;
  const status = (STATUSES as string[]).includes(data?.status ?? "") ? (data!.status as WahaSessionStatus) : "UNKNOWN";
  const me = data?.me && data.me.id ? { id: data.me.id, pushName: data.me.pushName ?? "" } : null;
  return { status, me };
}

export async function startSession(): Promise<void> {
  const cfg = wahaConfig();
  if (!cfg.webhookSecret) {
    throw new WahaConfigError("WAHA_WEBHOOK_SECRET no está configurado: el webhook quedaría sin firma y se perderían acks y bajas.");
  }
  const webhooks = [
    {
      url: cfg.webhookUrl,
      events: ["message", "message.ack", "session.status"],
      hmac: { key: cfg.webhookSecret },
      retries: { policy: "constant", delaySeconds: 2, attempts: 15 },
    },
  ];
  const exists = await wahaFetch(`/api/sessions/${encodeURIComponent(cfg.session)}`);
  await exists.text();
  if (exists.status === 404) {
    const res = await wahaFetch(`/api/sessions`, { method: "POST", body: { name: cfg.session, start: true, config: { webhooks } } });
    await expectOk(res);
    return;
  }
  // Existe: actualizamos config (webhooks) y arrancamos.
  const upd = await wahaFetch(`/api/sessions/${encodeURIComponent(cfg.session)}`, { method: "PUT", body: { config: { webhooks } } });
  await upd.text(); // si el PUT no está soportado por la versión, seguimos igualmente
  const res = await wahaFetch(`/api/sessions/${encodeURIComponent(cfg.session)}/start`, { method: "POST" });
  if (res.status === 422) {
    await res.text(); // ya estaba iniciada
    return;
  }
  await expectOk(res);
}

export async function getQr(): Promise<{ mimetype: string; data: string } | null> {
  const { session } = wahaConfig();
  const res = await wahaFetch(`/api/${encodeURIComponent(session)}/auth/qr`, { accept: "application/json" });
  if (res.status === 422 || res.status === 404) {
    await res.text();
    return null;
  }
  const data = (await expectOk(res)) as { mimetype?: string; data?: string } | null;
  if (!data?.data) return null;
  return { mimetype: data.mimetype ?? "image/png", data: data.data };
}

export async function logoutSession(): Promise<void> {
  const { session } = wahaConfig();
  const res = await wahaFetch(`/api/sessions/${encodeURIComponent(session)}/logout`, { method: "POST" });
  await expectOk(res);
  // WAHA vuelve a arrancar la sesión tras el logout (queda en SCAN_QR_CODE). La detenemos para que
  // quede STOPPED ("Desconectado") y el usuario decida cuándo volver a vincular.
  await stopSession();
}

export async function stopSession(): Promise<void> {
  const { session } = wahaConfig();
  const res = await wahaFetch(`/api/sessions/${encodeURIComponent(session)}/stop`, { method: "POST" });
  await expectOk(res);
}

export async function checkExists(phoneE164: string): Promise<{ exists: boolean; chatId: string | null }> {
  const { session } = wahaConfig();
  const phone = phoneE164.replace(/\D/g, "");
  const res = await wahaFetch(`/api/contacts/check-exists?phone=${encodeURIComponent(phone)}&session=${encodeURIComponent(session)}`);
  const data = (await expectOk(res)) as { numberExists?: boolean; chatId?: string | null } | null;
  return { exists: !!data?.numberExists, chatId: data?.chatId ?? null };
}

// WAHA devuelve formatos distintos según engine:
//  - WEBJS/GOWS: { id: "true_519…@c.us_AAA" } o { id: { _serialized: "…" } }
//  - NOWEB: el WAMessage crudo de Baileys { key: { remoteJid, fromMe, id } } sin id de nivel superior.
// El evento message.ack siempre trae el id serializado `${fromMe}_${chatId}_${id}`; normalizamos
// aquí para que el webhook pueda hacer match por wahaMessageId.
function extractMessageId(data: unknown, fallbackChatId: string): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { id?: unknown; key?: { id?: unknown; remoteJid?: unknown; fromMe?: unknown } };
  if (typeof d.id === "string") return d.id;
  if (d.id && typeof d.id === "object" && typeof (d.id as { _serialized?: unknown })._serialized === "string") {
    return (d.id as { _serialized: string })._serialized;
  }
  if (d.key && typeof d.key.id === "string") {
    const remote =
      typeof d.key.remoteJid === "string" ? d.key.remoteJid.replace(/@s\.whatsapp\.net$/, "@c.us") : fallbackChatId;
    const fromMe = d.key.fromMe === undefined ? true : Boolean(d.key.fromMe);
    return `${fromMe}_${remote}_${d.key.id}`;
  }
  return null;
}

export async function sendText(chatId: string, text: string): Promise<{ id: string }> {
  const { session } = wahaConfig();
  const res = await wahaFetch(`/api/sendText`, { method: "POST", body: { session, chatId, text } });
  const data = await expectOk(res);
  const id = extractMessageId(data, chatId);
  if (!id) throw new WahaError(res.status, `Respuesta sin id de mensaje: ${JSON.stringify(data).slice(0, 200)}`);
  return { id };
}
```

- [ ] **Step 2: Crear `scripts/waha-check.ts` (diagnóstico manual)**

```ts
// Uso: npx tsx scripts/waha-check.ts            → estado de la sesión
//      npx tsx scripts/waha-check.ts +51987654321 → además verifica si el número tiene WhatsApp
import "dotenv/config";

async function main() {
  const url = (process.env.WAHA_URL ?? "http://127.0.0.1:3001").replace(/\/+$/, "");
  const key = process.env.WAHA_API_KEY ?? "";
  const session = process.env.WAHA_SESSION ?? "default";
  const headers = { "X-Api-Key": key, Accept: "application/json" };

  const s = await fetch(`${url}/api/sessions/${session}`, { headers });
  console.log("GET /api/sessions/%s →", session, s.status, await s.text());

  const phone = process.argv[2];
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    const c = await fetch(`${url}/api/contacts/check-exists?phone=${digits}&session=${session}`, { headers });
    console.log("check-exists →", c.status, await c.text());
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
```

- [ ] **Step 3: Tipos y lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint src/lib/messaging/waha.ts scripts/waha-check.ts`
Expected: sin errores.

- [ ] **Step 4: Verificación manual (si hay Docker disponible)**

Run: `docker compose -f docker-compose.waha.yml up -d && npx tsx scripts/waha-check.ts`
Expected: `GET /api/sessions/default → 404 …` (sesión aún no creada) o `200 {"name":"default","status":"STOPPED"...}`. Si WAHA no está levantado, el script falla con `ECONNREFUSED`; es aceptable en este paso (la pantalla de Conexión lo mostrará como "WAHA no responde").

- [ ] **Step 5: Commit**

```bash
git add src/lib/messaging/waha.ts scripts/waha-check.ts
git commit -m "feat(mensajes): cliente HTTP de WAHA (sesión, QR, check-exists, sendText) y script de diagnóstico"
```

---

### Task 7: Navegación, esqueleto del módulo `/mensajes`, tipos compartidos y helper CSV

**Files:**
- Modify: `src/components/admin/data.ts`, `src/components/admin/Sidebar.tsx`
- Create: `src/lib/messaging/types.ts`, `src/lib/ui/csv.ts`, `src/lib/ui/csv.test.ts`
- Create: `src/app/(admin)/mensajes/layout.tsx`, `MensajesTabs.tsx`, `page.tsx`, `mensajes.css`, `types.ts`
- Create (provisionales): `src/app/(admin)/mensajes/{campanas,contactos,conexion}/page.tsx`

**Interfaces:**
- Produces (`src/lib/messaging/types.ts`): `SchedulerReason`, `SchedulerSnapshot` (compartidos por el motor y la UI, sin `server-only`).
- Produces (`src/lib/ui/csv.ts`): `toCsv(header: string[], rows: CsvCell[][]): string` (separador `;`), `downloadCsv(filename, header, rows): void`.
- Produces (`src/app/(admin)/mensajes/types.ts`): `ActionResult`, `PermFlags`, `SessionStatus`, `SessionInfo`, `WhatsappStatusKey`, `ContactRow`, `ImportSummary`, `CampaignStatusKey`, `AudienceKey`, `RecipientStatusKey`, `CampaignRow`, `CampaignDetail`, `CampaignInput`, `RecipientRow`, `CampaignProgress`, constantes `CAMPAIGN_STATUS_LABEL`, `AUDIENCE_LABEL`, `RECIPIENT_STATUS_LABEL`, `PAUSED_REASON_LABEL`.
- Layout `/mensajes/*` exige `mensajes.read` y pinta cabecera + pestañas; `/mensajes` redirige a `/mensajes/campanas`.

- [ ] **Step 1: Tipos compartidos del motor — `src/lib/messaging/types.ts`**

```ts
// Tipos compartidos entre el motor de envío (servidor) y la UI. Sin "server-only".
export type SchedulerReason =
  | "disabled" // MESSAGING_SCHEDULER=off o proceso sin scheduler
  | "idle" // sin campañas en curso
  | "waiting" // pausa aleatoria entre envíos
  | "out_of_window" // fuera de la ventana horaria de la campaña
  | "daily_cap" // tope diario alcanzado
  | "session_down" // WhatsApp no está WORKING
  | "veda"; // veda electoral

export type SchedulerSnapshot = {
  active: boolean;
  reason: SchedulerReason;
  campaignId: string | null;
  nextSendAt: string | null; // ISO
  sessionStatus: string | null;
  lastTickAt: string | null; // ISO
};
```

- [ ] **Step 2: Test del helper CSV — `src/lib/ui/csv.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "./csv";

test("toCsv usa ; como separador, escapa comillas y tolera null", () => {
  const out = toCsv(["DNI", "Nombre"], [["12345678", 'Juan "Pepe" Perez'], ["1", null], ["2", "a;b"]]);
  assert.equal(out, 'DNI;Nombre\r\n12345678;"Juan ""Pepe"" Perez"\r\n1;\r\n2;"a;b"');
});
```

- [ ] **Step 3: Ejecutar y ver fallo**

Run: `npm test`
Expected: FAIL — `Cannot find module './csv'`.

- [ ] **Step 4: Crear `src/lib/ui/csv.ts`**

```ts
// Exportación CSV en el navegador (separador ";" para que Excel en español lo abra en columnas).
export type CsvCell = string | number | null | undefined;

function esc(v: CsvCell): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: CsvCell[][]): string {
  return [header, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
}

export function downloadCsv(filename: string, header: string[], rows: CsvCell[][]): void {
  const blob = new Blob(["\ufeff" + toCsv(header, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

Run: `npm test` → Expected: PASS.

- [ ] **Step 5: Ítem del sidebar — `src/components/admin/data.ts`**

En `SIDEBAR_NAV`, después del ítem `personeros` y antes de `anuncios`, añadir:

```ts
  {
    id: "mensajes",
    label: "Mensajería",
    icon: "message",
    href: "/mensajes", // usado cuando la barra está colapsada (redirige a /mensajes/campanas)
    expandable: true,
    children: [
      { id: "mensajes/campanas", label: "Campañas", href: "/mensajes/campanas" },
      { id: "mensajes/contactos", label: "Contactos", href: "/mensajes/contactos" },
      { id: "mensajes/conexion", label: "Conexión", href: "/mensajes/conexion" },
    ],
  },
```

- [ ] **Step 6: Resaltar el hijo activo por los dos primeros segmentos — `src/components/admin/Sidebar.tsx`**

Reemplazar la función `pathToActiveId` por:

```ts
function pathToIds(pathname: string): { top: string; sub: string } {
  const segs = pathname.replace(/^\/+/, "").split("/").filter(Boolean);
  return { top: segs[0] ?? "", sub: segs.slice(0, 2).join("/") };
}
```

Dentro de `Sidebar`, reemplazar `const activeId = pathToActiveId(pathname);` por:

```ts
  const { top: activeId, sub: activeSubId } = pathToIds(pathname);
```

Reemplazar el bloque `const [openId, setOpenId] = useState<string | null>(parentOfActive);` + el `useEffect` que le sigue por el patrón "estado derivado durante el render" (mismo comportamiento, y pasa la regla `react-hooks/set-state-in-effect` de eslint-config-next 16, que el `useEffect` actual incumple):

```ts
  const [openId, setOpenId] = useState<string | null>(parentOfActive);
  const [prevParent, setPrevParent] = useState(parentOfActive);
  if (parentOfActive !== prevParent) {
    setPrevParent(parentOfActive);
    if (parentOfActive) setOpenId(parentOfActive);
  }
```

y cambiar el import `import { useEffect, useState } from "react";` por `import { useState } from "react";`.

Con la barra colapsada (escritorio) el submenú está oculto por CSS, así que un ítem expandible renderizado como `<button>` no permitiría llegar a `/mensajes`. Reemplazar el bloque `{item.expandable ? ( <button …>{inner}</button> ) : ( <Link …>{inner}</Link> )}` por:

```tsx
              {item.expandable && !collapsed ? (
                <button className={itemClass} onClick={() => setOpenId(isOpen ? null : item.id)}>
                  {inner}
                </button>
              ) : (
                <Link
                  href={item.href ?? item.children?.[0]?.href ?? `/${item.id}`}
                  className={itemClass}
                  title={collapsed ? item.label : undefined}
                >
                  {inner}
                </Link>
              )}
```

Reemplazar las tres comparaciones con hijos:
- `g.children?.some((c) => c.id === activeId)` → `g.children?.some((c) => c.id === activeSubId)`
- `item.children?.some((c) => c.id === activeId) ?? false` → `item.children?.some((c) => c.id === activeSubId) ?? false`
- en el `Link` de cada hijo: `activeId === child.id ? "is-active" : ""` → `activeSubId === child.id ? "is-active" : ""`

(`isSelf = activeId === item.id` se mantiene: el padre `mensajes` queda resaltado y el hijo también.)

- [ ] **Step 7: Tipos del módulo — `src/app/(admin)/mensajes/types.ts`**

```ts
import type { SchedulerSnapshot } from "@/lib/messaging/types";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> };

export type PermFlags = { canRead: boolean; canWrite: boolean };

// ── Conexión ──
export type SessionStatus = "STOPPED" | "STARTING" | "SCAN_QR_CODE" | "WORKING" | "FAILED" | "UNKNOWN";
export type SessionInfo = {
  status: SessionStatus;
  me: { id: string; pushName: string } | null;
  error: string | null;
};

// ── Contactos ──
export type WhatsappStatusKey = "unknown" | "yes" | "no";
export type ContactRow = {
  id: string;
  docNumber: string;
  name: string;
  phone: string; // +519XXXXXXXX
  district: string | null;
  source: string;
  whatsappStatus: WhatsappStatusKey;
  optedOut: boolean;
  optedOutAt: string | null;
  lastMessagedAt: string | null;
  createdAt: string;
};
export type ImportSummary = {
  inserted: number;
  updated: number;
  invalid: number;
  duplicatedInFile: number;
  totalRows: number;
};

// ── Campañas ──
export type CampaignStatusKey = "draft" | "running" | "paused" | "finished" | "cancelled";
export type AudienceKey = "all" | "not_contacted" | "district";
export type RecipientStatusKey =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "no_whatsapp"
  | "opted_out"
  | "skipped";

export type CampaignRow = {
  id: string;
  name: string;
  status: CampaignStatusKey;
  audience: AudienceKey;
  district: string | null;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  dailyCap: number;
  pausedReason: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdByName: string | null;
};

export type CampaignDetail = CampaignRow & {
  messageTemplate: string;
  minDelaySec: number;
  maxDelaySec: number;
  windowStart: number;
  windowEnd: number;
  lastError: string | null;
};

export type CampaignInput = {
  name: string;
  messageTemplate: string;
  audience: AudienceKey;
  district?: string;
  dailyCap: number;
  minDelaySec: number;
  maxDelaySec: number;
  windowStart: number;
  windowEnd: number;
};

export type RecipientRow = {
  id: string;
  docNumber: string;
  name: string;
  phone: string;
  status: RecipientStatusKey;
  attempts: number;
  error: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
};

export type CampaignProgress = {
  status: CampaignStatusKey;
  pausedReason: string | null;
  lastError: string | null;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  counts: Record<RecipientStatusKey, number>;
  todayCount: number;
  dailyCap: number;
  scheduler: SchedulerSnapshot;
};

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatusKey, string> = {
  draft: "Borrador",
  running: "En curso",
  paused: "Pausada",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

export const AUDIENCE_LABEL: Record<AudienceKey, string> = {
  all: "Todos los contactos",
  not_contacted: "Solo no contactados",
  district: "Por distrito",
};

export const RECIPIENT_STATUS_LABEL: Record<RecipientStatusKey, string> = {
  pending: "Pendiente",
  sent: "Enviado",
  delivered: "Entregado",
  read: "Leído",
  failed: "Fallido",
  no_whatsapp: "Sin WhatsApp",
  opted_out: "Baja",
  skipped: "Omitido",
};

export const PAUSED_REASON_LABEL: Record<string, string> = {
  manual: "Pausada manualmente",
  session_down: "WhatsApp se desconectó: reconecta en Conexión y reanuda",
  waha_error: "WAHA no responde: revisa el contenedor y reanuda",
  veda: "Veda electoral: no se permiten envíos",
};
```

- [ ] **Step 8: Hoja de estilos — `src/app/(admin)/mensajes/mensajes.css`**

```css
/* Módulo Mensajería — complementa las clases globales del admin */
.mensajes {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 24px 80px;
  max-width: 1600px;
}
@media (max-width: 1024px) { .mensajes { padding: 0 16px 80px; } }
@media (max-width: 900px) { .mensajes { padding: 0 12px 64px; } }

.mensajes__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.mensajes__head h1 { margin: 0; font-size: 22px; }
.mensajes__head h2 { margin: 0; font-size: 18px; }
.mensajes__sub { margin: 4px 0 0; color: var(--text-muted, #7a8699); font-size: 13px; }
.mensajes__tabs { margin-bottom: 0; }
.mensajes__actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.mensajes__section { display: flex; flex-direction: column; gap: 16px; }

.mensajes__filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.mensajes__search {
  flex: 1 1 240px; max-width: 360px; height: 36px; padding: 0 14px;
  border: 1px solid var(--border-strong, #c9d1dc); border-radius: 18px;
  background: transparent; color: inherit; font-size: 13px;
  font-family: "Google Sans Text", sans-serif; outline: none;
}
.mensajes__search:focus { border-color: var(--accent); background: var(--surface); }
.mensajes__select {
  height: 36px; padding: 0 12px; border: 1px solid var(--border-strong, #c9d1dc);
  border-radius: 18px; background: transparent; color: var(--text-muted, #7a8699);
  font-size: 13px; font-family: "Google Sans Text", sans-serif; cursor: pointer; outline: none;
}
.mensajes__select:focus { border-color: var(--accent); }

.mensajes__stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
.mensajes__statcard {
  background: var(--surface, #fff); border: 1px solid var(--border, #e3e8ef);
  border-radius: var(--radius-lg, 14px); padding: 12px 14px;
}

.mensajes__name { font-weight: 500; color: var(--text, #16232f); }
.mensajes__muted { color: var(--text-muted, #7a8699); font-size: 12px; margin-top: 2px; }
.mensajes__mono { font-variant-numeric: tabular-nums; white-space: nowrap; }
.mensajes__rowactions { display: flex; gap: 6px; align-items: center; white-space: nowrap; }
.mensajes .btn--sm { padding: 5px 10px; font-size: 13px; }
.mensajes__empty { text-align: center; color: var(--text-muted, #7a8699); padding: 40px 0 !important; }
.mensajes__empty svg { display: block; margin: 0 auto 8px; opacity: 0.6; }
.mensajes__row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.mensajes__row--3 { grid-template-columns: 1fr 1fr 1fr; }
@media (max-width: 560px) { .mensajes__row, .mensajes__row--3 { grid-template-columns: 1fr; } }
.field--check { flex-direction: row; align-items: center; gap: 8px; }
.field--check input { width: 16px; height: 16px; }
.mensajes__hint { color: var(--text-muted, #7a8699); font-size: 12px; margin-top: 4px; }
.mensajes__err { color: #b91c1c; font-size: 12px; margin-top: 4px; }

/* Conexión */
.mensajes__conn { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; align-items: start; }
@media (max-width: 900px) { .mensajes__conn { grid-template-columns: 1fr; } }
.mensajes__card {
  background: var(--surface, #fff); border: 1px solid var(--border, #e3e8ef);
  border-radius: var(--radius-lg, 14px); padding: 18px 20px; display: flex; flex-direction: column; gap: 12px;
}
.mensajes__qr { width: 256px; height: 256px; border-radius: 12px; border: 1px solid var(--border, #e3e8ef); background: #fff; display: block; }
.mensajes__qrbox { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
.mensajes__status { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 500; flex-wrap: wrap; }
.mensajes__warn { border-color: #f59e0b; background: #fffbeb; }
html[data-theme="dark"] .mensajes__warn { background: #3a2a08; border-color: #b45309; }
.mensajes__warn ul { margin: 6px 0 0 18px; padding: 0; font-size: 13px; line-height: 1.5; }

/* Campañas */
.mensajes__progress { height: 10px; border-radius: 999px; background: var(--bg-soft, #eef2f7); overflow: hidden; display: flex; }
.mensajes__progress span { display: block; height: 100%; }
.mensajes__progress .is-read { background: #15803d; }
.mensajes__progress .is-delivered { background: #22c55e; }
.mensajes__progress .is-sent { background: #86efac; }
.mensajes__progress .is-failed { background: #ef4444; }
.mensajes__preview {
  white-space: pre-wrap; font-size: 13.5px; line-height: 1.5; padding: 12px 14px; border-radius: 12px;
  background: #dcf8c6; color: #111; border: 1px solid #b7e4a0; max-width: 420px;
}
.mensajes__preview--empty { background: var(--bg-soft, #eef2f7); color: var(--text-muted, #7a8699); border-color: var(--border, #e3e8ef); }
.mensajes__steps { display: flex; gap: 6px; font-size: 12px; color: var(--text-muted, #7a8699); margin-bottom: 8px; }
.mensajes__steps .is-active { color: var(--accent); font-weight: 600; }
.mensajes__dropzone {
  display: block; border: 2px dashed var(--border-strong, #c9d1dc); border-radius: 12px; padding: 28px; text-align: center;
  color: var(--text-muted, #7a8699); cursor: pointer;
}
.mensajes__dropzone:hover { border-color: var(--accent); }
.mensajes__dropzone input { display: none; }
.mensajes__pager { display: flex; gap: 8px; align-items: center; justify-content: flex-end; }
.mensajes__linkrow { cursor: pointer; }
.mensajes__linkrow:hover td { background: var(--bg-soft, #eef2f7); }
.mensajes__tpl-btns { display: flex; gap: 6px; margin: 6px 0; }
.mensajes__modal--wide { width: min(920px, 96vw); max-width: none; }
.mensajes__table-sm td, .mensajes__table-sm th { padding: 6px 8px; font-size: 12.5px; }
```

- [ ] **Step 8b: Mover a `globals.css` los estilos compartidos de `ConfirmDialog`, `Toasts`, `.btn--danger` y `.login__error`**

Hoy viven duplicados en `src/app/(admin)/usuarios/users.css` (líneas "Confirm dialog" y "Toast stack") y `src/app/(admin)/roles/roles.css` ("Confirm dialog (shared)"), y `.login__error` solo en `src/app/login/login.css`. Next divide el CSS por ruta, así que en una carga directa de `/mensajes/*` esos componentes saldrían sin estilo. En `src/app/globals.css`, **antes** de la línea `/* ─────────── Responsive ─────────── */` (el bloque móvil `@media (max-width: 900px)` ya contiene overrides de `.toasts`/`.toast` y debe seguir ganando por orden), insertar:

```css
/* ─────────── Error banner (login + formularios admin) ─────────── */
.login__error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13.5px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ─────────── Confirm dialog (compartido) ─────────── */
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(32, 33, 36, 0.5);
  z-index: 210;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: fade 0.14s;
}
.confirm {
  width: 100%;
  max-width: 460px;
  background: var(--surface);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: slideUp 0.16s ease-out;
}
.confirm__head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 22px 24px 8px;
}
.confirm__icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fee2e2;
  color: #b91c1c;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.confirm__icon--info {
  background: var(--accent-soft);
  color: var(--accent);
}
.confirm__title {
  font-family: "Google Sans", sans-serif;
  font-size: 17px;
  font-weight: 500;
  margin: 0;
}
.confirm__body {
  padding: 0 24px 20px 78px;
  color: var(--text-muted);
  font-size: 13.5px;
  line-height: 1.55;
}
.confirm__foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-soft);
}
.btn--danger {
  background: #b91c1c;
  color: #fff;
}
.btn--danger:hover {
  background: #991b1b;
}

/* ─────────── Toast stack (compartido) ─────────── */
.toasts {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 300;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  background: #202124;
  color: #fff;
  padding: 12px 16px;
  border-radius: 10px;
  box-shadow: var(--shadow-lg);
  font-size: 13.5px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 240px;
  max-width: 380px;
  animation: toast-in 0.2s ease-out;
}
.toast--success {
  background: #065f46;
}
.toast--error {
  background: #991b1b;
}
@keyframes toast-in {
  from {
    transform: translateY(8px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

Después, eliminar los bloques equivalentes de `src/app/(admin)/usuarios/users.css` (desde el comentario `/* ──────────────── Confirm dialog ──────────────── */` hasta el cierre de `@keyframes toast-in`), de `src/app/(admin)/roles/roles.css` (desde `/* … Confirm dialog (shared) … */` hasta el cierre de `@keyframes toast-in`, sin tocar `.field__err` que viene después) y `.login__error` de `src/app/login/login.css` (`login/page.tsx` ya recibe `globals.css` desde el root layout). `@keyframes fade` y `slideUp` ya existen en `globals.css`.

Verificación: `/usuarios`, `/roles`, `/personeros` y `/login` siguen mostrando diálogo de confirmación, toasts y banner de error con el mismo aspecto; una carga directa (F5) de `/mensajes/contactos` muestra el `ConfirmDialog` de eliminar con backdrop y caja.

- [ ] **Step 9: Pestañas — `src/app/(admin)/mensajes/MensajesTabs.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/mensajes/campanas", label: "Campañas" },
  { href: "/mensajes/contactos", label: "Contactos" },
  { href: "/mensajes/conexion", label: "Conexión" },
] as const;

export function MensajesTabs() {
  const pathname = usePathname();
  return (
    <nav className="page__tabs mensajes__tabs" aria-label="Secciones de mensajería">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={`tab ${pathname.startsWith(t.href) ? "is-active" : ""}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 10: Layout y redirección**

`src/app/(admin)/mensajes/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth/server";
import { MensajesTabs } from "./MensajesTabs";
import "./mensajes.css";

export const dynamic = "force-dynamic";

export default async function MensajesLayout({ children }: { children: ReactNode }) {
  await requirePermission("mensajes.read");
  return (
    <div className="mensajes">
      <header className="mensajes__head">
        <div>
          <h1>Mensajería</h1>
          <p className="mensajes__sub">Contactos por DNI y campañas de WhatsApp</p>
        </div>
      </header>
      <MensajesTabs />
      {children}
    </div>
  );
}
```

`src/app/(admin)/mensajes/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/mensajes/campanas");
}
```

- [ ] **Step 11: Páginas provisionales para que el build pase**

Crear `src/app/(admin)/mensajes/campanas/page.tsx`, `src/app/(admin)/mensajes/contactos/page.tsx` y `src/app/(admin)/mensajes/conexion/page.tsx`, cada una con este contenido (las tareas 8, 9 y 11 las reemplazan por completo):

```tsx
export const dynamic = "force-dynamic";

export default function Page() {
  return <p className="mensajes__sub">Pendiente de implementación.</p>;
}
```

- [ ] **Step 12: Verificar**

Run: `npm test && npx tsc --noEmit -p tsconfig.json && npx eslint src/components/admin/Sidebar.tsx src/components/admin/data.ts src/lib/ui src/lib/messaging/types.ts "src/app/(admin)/mensajes"`
Expected: tests PASS, sin errores. (No lintear `src/components/admin` completo: `AdminShell.tsx`, `ThemeToggle.tsx` y `TopBar.tsx` tienen errores preexistentes de `react-hooks/set-state-in-effect` ajenos a este plan; no corregirlos aquí.)

Run: `npm run dev` → abrir `/mensajes`: redirige a `/mensajes/campanas`; el sidebar muestra **Mensajería** expandida con *Campañas* resaltado; las tres pestañas navegan; con un usuario sin `mensajes.read` → `/403`.

- [ ] **Step 13: Commit**

```bash
git add src/components/admin/data.ts src/components/admin/Sidebar.tsx src/lib/messaging/types.ts src/lib/ui/csv.ts src/lib/ui/csv.test.ts "src/app/(admin)/mensajes" src/app/globals.css "src/app/(admin)/usuarios/users.css" "src/app/(admin)/roles/roles.css" src/app/login/login.css
git commit -m "feat(mensajes): navegación, layout con pestañas, tipos del módulo, helper CSV y estilos compartidos en globals"
```

---

### Task 8: Pantalla Conexión (QR y estado de WAHA)

**Files:**
- Create: `src/app/(admin)/mensajes/conexion/actions.ts`
- Create: `src/app/(admin)/mensajes/conexion/ConexionClient.tsx`
- Replace: `src/app/(admin)/mensajes/conexion/page.tsx`

**Interfaces:**
- Consumes: `getSession/getQr/startSession/logoutSession/describeWahaError` de `@/lib/messaging/waha`; `SessionInfo`, `ActionResult`, `PermFlags` de `../types`.
- Produces (server actions): `getSessionAction(): Promise<SessionInfo>`, `getQrAction(): Promise<ActionResult<{ dataUrl: string | null }>>`, `startSessionAction(): Promise<ActionResult>`, `logoutSessionAction(): Promise<ActionResult>`.

- [ ] **Step 1: `src/app/(admin)/mensajes/conexion/actions.ts`**

```ts
"use server";

import { getCurrentUser, type CurrentUser } from "@/lib/auth/server";
import { getSession, getQr, startSession, logoutSession, describeWahaError } from "@/lib/messaging/waha";
import type { ActionResult, SessionInfo } from "../types";

class Denied extends Error {}

async function authorize(perm: "mensajes.read" | "mensajes.write"): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me || !me.permissions.has(perm)) throw new Denied();
  return me;
}

function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

export async function getSessionAction(): Promise<SessionInfo> {
  try {
    await authorize("mensajes.read");
    const s = await getSession();
    return { status: s.status, me: s.me, error: null };
  } catch (e) {
    if (e instanceof Denied) return { status: "UNKNOWN", me: null, error: "Sin permiso." };
    return { status: "UNKNOWN", me: null, error: describeWahaError(e) };
  }
}

export async function getQrAction(): Promise<ActionResult<{ dataUrl: string | null }>> {
  try {
    await authorize("mensajes.read");
    const qr = await getQr();
    return { ok: true, data: { dataUrl: qr ? `data:${qr.mimetype};base64,${qr.data}` : null } };
  } catch (e) {
    if (e instanceof Denied) return fail("Sin permiso.");
    return fail(describeWahaError(e));
  }
}

export async function startSessionAction(): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    await startSession();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar la conexión.");
    console.error("startSessionAction", e);
    return fail(describeWahaError(e));
  }
}

export async function logoutSessionAction(): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    await logoutSession();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar la conexión.");
    console.error("logoutSessionAction", e);
    return fail(describeWahaError(e));
  }
}
```

- [ ] **Step 2: `src/app/(admin)/mensajes/conexion/ConexionClient.tsx`**

```tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/admin/Icon";
import { ConfirmDialog } from "../../usuarios/ConfirmDialog";
import { Toasts, type Toast } from "../../usuarios/Toasts";
import { getSessionAction, getQrAction, startSessionAction, logoutSessionAction } from "./actions";
import type { SessionInfo, PermFlags, ActionResult } from "../types";

const STATUS_LABEL: Record<SessionInfo["status"], { text: string; badge: string }> = {
  STOPPED: { text: "Desconectado", badge: "badge--neutral" },
  STARTING: { text: "Iniciando…", badge: "badge--amber" },
  SCAN_QR_CODE: { text: "Escanea el código QR", badge: "badge--amber" },
  WORKING: { text: "Conectado", badge: "badge--green" },
  FAILED: { text: "Error en la sesión", badge: "badge--red" },
  UNKNOWN: { text: "Sin conexión con WAHA", badge: "badge--red" },
};

export function ConexionClient({ initial, perms }: { initial: SessionInfo; perms: PermFlags }) {
  const [info, setInfo] = useState<SessionInfo>(initial);
  const [qr, setQr] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [pending, startTransition] = useTransition();

  function toast(kind: Toast["kind"], message: string) {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), kind, message }]);
  }

  // Sondeo: cada 3 s mientras no esté conectado (para refrescar el QR), cada 15 s si está WORKING.
  useEffect(() => {
    let cancelled = false;
    const delay = info.status === "WORKING" ? 15_000 : 3_000;
    const t = setTimeout(async () => {
      const s = await getSessionAction();
      if (cancelled) return;
      if (s.status === "SCAN_QR_CODE") {
        const q = await getQrAction();
        if (!cancelled) setQr(q.ok ? (q.data?.dataUrl ?? null) : null);
      } else {
        setQr(null);
      }
      if (!cancelled) setInfo(s);
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [info]);

  function run(action: () => Promise<ActionResult>, okMsg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) toast("success", okMsg);
      else toast("error", res.error);
      setInfo(await getSessionAction());
    });
  }

  const st = STATUS_LABEL[info.status];
  const canConnect = info.status === "STOPPED" || info.status === "FAILED" || info.status === "UNKNOWN";
  const canLogout = info.status === "WORKING" || info.status === "SCAN_QR_CODE" || info.status === "STARTING";

  return (
    <div className="mensajes__conn">
      <section className="mensajes__card">
        <div className="mensajes__status">
          <span className={`badge ${st.badge}`}>{st.text}</span>
          {info.me && (
            <span className="mensajes__muted">
              {info.me.pushName ? `${info.me.pushName} · ` : ""}+{info.me.id.replace(/@.*$/, "")}
            </span>
          )}
        </div>
        {info.error && (
          <div className="login__error" role="alert">
            <Icon name="info" size={16} />
            <span>{info.error}</span>
          </div>
        )}

        {info.status === "SCAN_QR_CODE" && (
          <div className="mensajes__qrbox">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL generada por WAHA
              <img className="mensajes__qr" src={qr} alt="Código QR para vincular WhatsApp" />
            ) : (
              <div className="mensajes__qr" aria-busy="true" />
            )}
            <p className="mensajes__muted">
              En el celular de campaña: WhatsApp → Menú (⋮) → <strong>Dispositivos vinculados</strong> →{" "}
              <strong>Vincular un dispositivo</strong> y escanea este código. Se actualiza solo.
            </p>
          </div>
        )}

        {info.status === "WORKING" && (
          <p className="mensajes__muted">El número está listo para enviar. Las campañas en curso continúan automáticamente.</p>
        )}

        {perms.canWrite && (
          <div className="mensajes__actions">
            {canConnect && (
              <button className="btn btn--primary" disabled={pending} onClick={() => run(startSessionAction, "Sesión iniciada. Escanea el QR.")}>
                <Icon name="plus" size={16} /> Conectar WhatsApp
              </button>
            )}
            {canLogout && (
              <button className="btn btn--ghost" disabled={pending} onClick={() => setConfirmLogout(true)}>
                Cerrar sesión
              </button>
            )}
            <button className="btn btn--ghost" disabled={pending} onClick={() => startTransition(async () => setInfo(await getSessionAction()))}>
              Actualizar
            </button>
          </div>
        )}
      </section>

      <aside className="mensajes__card mensajes__warn">
        <strong>Riesgo de bloqueo del número</strong>
        <p className="mensajes__sub" style={{ margin: 0 }}>
          Este envío usa un cliente no oficial. Meta puede suspender el número aunque se respeten los límites.
        </p>
        <ul>
          <li>Usa un número dedicado a la campaña, con chip peruano y perfil completo (foto y nombre).</li>
          <li>«Caliéntalo» 1–2 semanas con conversaciones reales antes de la primera campaña.</li>
          <li>Tope diario bajo (≤150), pausas de 45–120 s y horario de 8:00 a 20:00.</li>
          <li>Si muchos destinatarios bloquean o reportan, pausa la campaña.</li>
        </ul>
      </aside>

      {confirmLogout && (
        <ConfirmDialog
          title="Cerrar sesión de WhatsApp"
          description="El número dejará de estar vinculado y las campañas en curso se pausarán. Tendrás que escanear el QR de nuevo."
          confirmLabel="Cerrar sesión"
          tone="danger"
          busy={pending}
          onConfirm={async () => {
            const res = await logoutSessionAction();
            if (res.ok) toast("success", "Sesión cerrada.");
            else toast("error", res.error);
            setConfirmLogout(false);
            setInfo(await getSessionAction());
          }}
          onClose={() => setConfirmLogout(false)}
        />
      )}

      <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
```

- [ ] **Step 3: Reemplazar `src/app/(admin)/mensajes/conexion/page.tsx`**

```tsx
import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/server";
import { ConexionClient } from "./ConexionClient";
import { getSessionAction } from "./actions";
import type { PermFlags } from "../types";

export const metadata: Metadata = { title: "Conexión WhatsApp · UNAMAD Admin" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const me = await requirePermission("mensajes.read");
  const initial = await getSessionAction();
  const perms: PermFlags = {
    canRead: me.permissions.has("mensajes.read"),
    canWrite: me.permissions.has("mensajes.write"),
  };
  return <ConexionClient initial={initial} perms={perms} />;
}
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint "src/app/(admin)/mensajes/conexion"`
Expected: sin errores.

Manual (con WAHA levantado): `/mensajes/conexion` → "Desconectado" → **Conectar WhatsApp** → en ≤ 6 s aparece el QR → escanear → "Conectado" con nombre y número. **Cerrar sesión** → "Desconectado". Sin WAHA: "Sin conexión con WAHA" + "WAHA no responde…". Con `WAHA_WEBHOOK_SECRET` vacío, **Conectar** muestra el error de configuración. Con usuario `viewer`: sin botones.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/mensajes/conexion"
git commit -m "feat(mensajes): pantalla de conexión con QR y estado de la sesión WAHA"
```

---

### Task 9: Contactos — acciones, listado e importación de Excel

**Files:**
- Create: `src/app/(admin)/mensajes/contactos/actions.ts`
- Create: `src/app/(admin)/mensajes/contactos/ImportModal.tsx`
- Create: `src/app/(admin)/mensajes/contactos/ContactosClient.tsx`
- Replace: `src/app/(admin)/mensajes/contactos/page.tsx`

**Interfaces:**
- Consumes: `normalizeDni/normalizePeruPhone/normalizeName/detectColumns/normalizeRows/IMPORT_BATCH_SIZE/ImportRowInput/CellLike/ColumnMapping` de `@/lib/messaging/normalize`; `isDistrictId/DISTRICTS/districtLabel` de `@/lib/districts`; `foldText` de `@/lib/text`; `downloadCsv` de `@/lib/ui/csv`; `readSheet` de `read-excel-file/browser`.
- Produces (server actions):
  - `createImport(input: { fileName: string; source: string; consentConfirmed: boolean; totalRows: number; invalid: number; duplicatedInFile: number }): Promise<ActionResult<{ importId: string }>>`
  - `importContactsBatch(importId: string, rows: ImportRowInput[]): Promise<ActionResult<{ inserted: number; updated: number }>>`
  - `finishImport(importId: string): Promise<ActionResult<ImportSummary>>`
  - `setContactOptedOut(id: string, optedOut: boolean): Promise<ActionResult>`
  - `deleteContact(id: string): Promise<ActionResult>`

- [ ] **Step 1: `src/app/(admin)/mensajes/contactos/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/server";
import { isDistrictId, type DistrictId } from "@/lib/districts";
import {
  IMPORT_BATCH_SIZE,
  normalizeDni,
  normalizeName,
  normalizePeruPhone,
  type ImportRowInput,
} from "@/lib/messaging/normalize";
import type { ActionResult, ImportSummary } from "../types";

class Denied extends Error {}

async function authorize(perm: "mensajes.read" | "mensajes.write"): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me || !me.permissions.has(perm)) throw new Denied();
  return me;
}

function fail(error: string, fieldErrors?: Partial<Record<string, string>>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

function refresh() {
  revalidatePath("/mensajes/contactos");
}

const NO_PERM = "No tienes permiso para gestionar contactos.";
// Prisma cierra las transacciones interactivas a los 5 s por defecto; un lote de 500 updates
// secuenciales contra un Postgres remoto supera ese límite. Presupuesto proporcional al lote.
const IMPORT_TX_OPTIONS = { timeout: 60_000, maxWait: 10_000 } as const;

export async function createImport(input: {
  fileName: string;
  source: string;
  consentConfirmed: boolean;
  totalRows: number;
  invalid: number;
  duplicatedInFile: number;
}): Promise<ActionResult<{ importId: string }>> {
  try {
    const me = await authorize("mensajes.write");
    const fe: Record<string, string> = {};
    const source = (input.source ?? "").trim();
    if (source.length < 3 || source.length > 120) fe.source = "Indica el origen de la lista (3 a 120 caracteres).";
    if (!input.consentConfirmed) fe.consentConfirmed = "Debes confirmar el consentimiento de las personas.";
    if (Object.keys(fe).length) return fail("Revisa los campos marcados.", fe);
    const imp = await prisma.contactImport.create({
      data: {
        fileName: (input.fileName ?? "archivo.xlsx").slice(0, 200),
        source,
        consentConfirmed: true,
        totalRows: Math.max(0, Math.floor(input.totalRows || 0)),
        invalid: Math.max(0, Math.floor(input.invalid || 0)),
        duplicatedInFile: Math.max(0, Math.floor(input.duplicatedInFile || 0)),
        createdById: me.id,
      },
    });
    return { ok: true, data: { importId: imp.id } };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("createImport", e);
    return fail("Error inesperado al iniciar la importación.");
  }
}

export async function importContactsBatch(
  importId: string,
  rows: ImportRowInput[],
): Promise<ActionResult<{ inserted: number; updated: number }>> {
  try {
    const me = await authorize("mensajes.write");
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > IMPORT_BATCH_SIZE) return fail("Lote inválido.");
    const imp = await prisma.contactImport.findUnique({ where: { id: importId } });
    if (!imp || imp.finishedAt) return fail("Importación no encontrada o ya cerrada.");

    // Re-validación en servidor: nunca confiamos en lo que normalizó el navegador.
    const byDoc = new Map<string, { docNumber: string; name: string; phone: string; district?: DistrictId }>();
    for (const r of rows) {
      const docNumber = normalizeDni(r?.docNumber);
      const phone = normalizePeruPhone(r?.phone);
      const name = normalizeName(r?.name);
      if (!docNumber || !phone || !name) continue;
      const district = r.district && isDistrictId(r.district) ? r.district : undefined;
      byDoc.set(docNumber, { docNumber, name, phone, district });
    }
    if (byDoc.size === 0) return { ok: true, data: { inserted: 0, updated: 0 } };

    const existing = await prisma.contact.findMany({
      where: { docType: "dni", docNumber: { in: [...byDoc.keys()] } },
      select: { id: true, docNumber: true, phone: true },
    });
    const existingByDoc = new Map(existing.map((e) => [e.docNumber, e]));
    const all = [...byDoc.values()];
    const toCreate = all.filter((c) => !existingByDoc.has(c.docNumber));
    const toUpdate = all
      .filter((c) => existingByDoc.has(c.docNumber))
      .map((c) => ({ c, ex: existingByDoc.get(c.docNumber)! }));

    await prisma.$transaction(async (tx) => {
      if (toCreate.length) {
        await tx.contact.createMany({
          data: toCreate.map((c) => ({
            docType: "dni" as const,
            docNumber: c.docNumber,
            name: c.name,
            phone: c.phone,
            district: c.district ?? null,
            source: imp.source,
            importId,
            createdById: me.id,
          })),
          skipDuplicates: true,
        });
      }
      for (const { c, ex } of toUpdate) {
        await tx.contact.update({
          where: { id: ex.id },
          data: {
            name: c.name,
            phone: c.phone,
            ...(c.district ? { district: c.district } : {}),
            source: imp.source,
            importId,
            ...(ex.phone !== c.phone ? { whatsappStatus: "unknown" as const, checkedAt: null } : {}),
          },
        });
      }
      await tx.contactImport.update({
        where: { id: importId },
        data: { inserted: { increment: toCreate.length }, updated: { increment: toUpdate.length } },
      });
    }, IMPORT_TX_OPTIONS);

    return { ok: true, data: { inserted: toCreate.length, updated: toUpdate.length } };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("importContactsBatch", e);
    return fail("Error inesperado al importar un lote.");
  }
}

export async function finishImport(importId: string): Promise<ActionResult<ImportSummary>> {
  try {
    await authorize("mensajes.write");
    const imp = await prisma.contactImport.update({
      where: { id: importId },
      data: { finishedAt: new Date() },
    });
    refresh();
    return {
      ok: true,
      data: {
        inserted: imp.inserted,
        updated: imp.updated,
        invalid: imp.invalid,
        duplicatedInFile: imp.duplicatedInFile,
        totalRows: imp.totalRows,
      },
    };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("finishImport", e);
    return fail("Error inesperado al cerrar la importación.");
  }
}

export async function setContactOptedOut(id: string, optedOut: boolean): Promise<ActionResult> {
  try {
    const me = await authorize("mensajes.write");
    await prisma.$transaction(async (tx) => {
      await tx.contact.update({
        where: { id },
        data: optedOut
          ? { optedOut: true, optedOutAt: new Date(), optedOutReason: `manual:${me.id}` }
          : { optedOut: false, optedOutAt: null, optedOutReason: null },
      });
      if (optedOut) {
        await tx.campaignRecipient.updateMany({
          where: { contactId: id, status: "pending" },
          data: { status: "opted_out" },
        });
      }
    });
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("setContactOptedOut", e);
    return fail("Error inesperado al cambiar la baja.");
  }
}

export async function deleteContact(id: string): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    await prisma.contact.delete({ where: { id } });
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("deleteContact", e);
    return fail("Error inesperado al eliminar.");
  }
}
```

- [ ] **Step 2: `src/app/(admin)/mensajes/contactos/ImportModal.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/admin/Icon";
import { useEscClose } from "@/lib/ui/useEscClose";
import { DISTRICTS } from "@/lib/districts";
import { downloadCsv } from "@/lib/ui/csv";
import {
  detectColumns,
  normalizeRows,
  IMPORT_BATCH_SIZE,
  type CellLike,
  type ColumnMapping,
} from "@/lib/messaging/normalize";
import { createImport, importContactsBatch, finishImport } from "./actions";
import type { ImportSummary } from "../types";

type Step = "file" | "map" | "importing" | "done";

const MAP_FIELDS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: "dni", label: "DNI", required: true },
  { key: "name", label: "Nombre(s)", required: true },
  { key: "paterno", label: "Apellido paterno (opcional)", required: false },
  { key: "materno", label: "Apellido materno (opcional)", required: false },
  { key: "phone", label: "Celular", required: true },
];

const EMPTY_MAPPING: ColumnMapping = { dni: null, name: null, phone: null, paterno: null, materno: null };

export function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: (s: ImportSummary, error: string | null) => void }) {
  const [step, setStep] = useState<Step>("file");
  const [reading, setReading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CellLike[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [district, setDistrict] = useState("");
  const [source, setSource] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const busy = reading || step === "importing";
  useEscClose(true, onClose, busy);

  const normalized = useMemo(
    () => (step === "file" ? null : normalizeRows(rows, mapping, district || undefined)),
    [rows, mapping, district, step],
  );

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setReading(true);
    try {
      const { readSheet } = await import("read-excel-file/browser");
      const data = await readSheet(file);
      if (data.length < 2) {
        setError("El archivo no tiene filas de datos (se espera una fila de cabecera y al menos una de datos).");
        return;
      }
      const hdr = data[0].map((c) => (c === null || c === undefined ? "" : String(c)));
      setHeaders(hdr);
      setRows(data.slice(1) as unknown as CellLike[][]);
      setMapping(detectColumns(hdr));
      setFileName(file.name);
      setStep("map");
    } catch {
      setError("No se pudo leer el archivo. ¿Es un .xlsx válido?");
    } finally {
      setReading(false);
    }
  }

  async function runImport() {
    if (!normalized) return;
    setError(null);
    setFieldErrors({});
    const fe: Record<string, string> = {};
    if (mapping.dni === null) fe.dni = "Elige la columna del DNI.";
    if (mapping.name === null) fe.name = "Elige la columna del nombre.";
    if (mapping.phone === null) fe.phone = "Elige la columna del celular.";
    if (source.trim().length < 3) fe.source = "Indica el origen de la lista.";
    if (!consent) fe.consentConfirmed = "Debes confirmar el consentimiento.";
    if (Object.keys(fe).length) {
      setFieldErrors(fe);
      return;
    }
    if (normalized.valid.length === 0) {
      setError("No hay filas válidas para importar.");
      return;
    }
    setStep("importing");
    setProgress({ done: 0, total: normalized.valid.length });
    const created = await createImport({
      fileName,
      source: source.trim(),
      consentConfirmed: consent,
      totalRows: normalized.totalRows,
      invalid: normalized.invalid.length,
      duplicatedInFile: normalized.duplicatedInFile,
    });
    if (!created.ok) {
      setError(created.error);
      setFieldErrors(created.fieldErrors ?? {});
      setStep("map");
      return;
    }
    const importId = created.data!.importId;
    const total = normalized.valid.length;
    let done = 0;
    let failed: string | null = null;
    for (let i = 0; i < total; i += IMPORT_BATCH_SIZE) {
      const batch = normalized.valid.slice(i, i + IMPORT_BATCH_SIZE);
      const res = await importContactsBatch(importId, batch);
      if (!res.ok) {
        failed = `${res.error} Se importaron ${done} de ${total} filas.`;
        break;
      }
      done += batch.length;
      setProgress({ done, total });
    }
    // Cerrar siempre la importación (aunque un lote haya fallado) para no dejar ContactImport abiertos.
    const fin = await finishImport(importId);
    if (!fin.ok) {
      setError(fin.error);
      setStep("map");
      return;
    }
    setSummary(fin.data!);
    setStep("done");
    if (failed) setError(failed);
    onDone(fin.data!, failed);
  }

  function exportInvalid() {
    if (!normalized) return;
    downloadCsv(
      `filas-invalidas-${fileName.replace(/\.xlsx$/i, "")}.csv`,
      ["Fila", "DNI", "Nombre", "Celular", "Motivo"],
      normalized.invalid.map((r) => [r.row, r.docNumber, r.name, r.phone, r.reason]),
    );
  }

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <div className="modal mensajes__modal--wide" onClick={(e) => e.stopPropagation()}>
        <header className="modal__head">
          <h2>Importar contactos desde Excel</h2>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Cerrar" disabled={busy}>
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="modal__body">
          <div className="mensajes__steps">
            <span className={step === "file" ? "is-active" : ""}>1. Archivo</span>
            <span>›</span>
            <span className={step === "map" ? "is-active" : ""}>2. Columnas y revisión</span>
            <span>›</span>
            <span className={step === "importing" || step === "done" ? "is-active" : ""}>3. Importar</span>
          </div>

          {error && (
            <div className="login__error" role="alert" style={{ marginBottom: 12 }}>
              <Icon name="info" size={16} />
              <span>{error}</span>
            </div>
          )}

          {step === "file" && (
            <label className="mensajes__dropzone">
              <input type="file" accept=".xlsx" onChange={(e) => onFile(e.target.files?.[0])} disabled={reading} />
              <Icon name="download" size={22} />
              <div style={{ marginTop: 8 }}>{reading ? "Leyendo archivo…" : "Haz clic para elegir un archivo .xlsx"}</div>
              <div className="mensajes__hint">
                La primera fila debe ser la cabecera (DNI, Nombre, Celular…). El archivo no se sube: se procesa en tu navegador.
              </div>
            </label>
          )}

          {step === "map" && normalized && (
            <>
              <p className="mensajes__hint" style={{ marginTop: 0 }}>
                <strong>{fileName}</strong> · {normalized.totalRows} filas con datos
              </p>
              <div className="mensajes__row mensajes__row--3">
                {MAP_FIELDS.map((f) => (
                  <label className="field" key={f.key}>
                    <span className="field__label">
                      {f.label}
                      {f.required && <span className="field__req">*</span>}
                    </span>
                    <select
                      value={mapping[f.key] === null ? "" : String(mapping[f.key])}
                      onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value === "" ? null : Number(e.target.value) })}
                      aria-invalid={!!fieldErrors[f.key]}
                    >
                      <option value="">— No usar —</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Columna ${i + 1}`}
                        </option>
                      ))}
                    </select>
                    {fieldErrors[f.key] && <span className="mensajes__err">{fieldErrors[f.key]}</span>}
                  </label>
                ))}
                <label className="field">
                  <span className="field__label">Distrito (para todo el archivo)</span>
                  <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                    <option value="">Sin distrito</option>
                    {DISTRICTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mensajes__stats" style={{ margin: "12px 0" }}>
                <div className="mensajes__statcard stat"><div className="stat__v">{normalized.valid.length}</div><div className="stat__l">Válidas</div></div>
                <div className="mensajes__statcard stat"><div className="stat__v">{normalized.invalid.length}</div><div className="stat__l">Inválidas</div></div>
                <div className="mensajes__statcard stat"><div className="stat__v">{normalized.duplicatedInFile}</div><div className="stat__l">DNI repetidos</div></div>
              </div>

              <div className="tablewrap density-compact">
                <div className="tablewrap__scroll">
                  <table className="dtable mensajes__table-sm">
                    <thead>
                      <tr><th>DNI</th><th>Nombre</th><th>Celular</th><th>Estado</th></tr>
                    </thead>
                    <tbody>
                      {normalized.valid.slice(0, 8).map((r) => (
                        <tr key={`v-${r.docNumber}`}>
                          <td className="mensajes__mono">{r.docNumber}</td>
                          <td>{r.name}</td>
                          <td className="mensajes__mono">{r.phone}</td>
                          <td><span className="badge badge--green">OK</span></td>
                        </tr>
                      ))}
                      {normalized.invalid.slice(0, 8).map((r) => (
                        <tr key={`i-${r.row}`}>
                          <td className="mensajes__mono">{r.docNumber || "—"}</td>
                          <td>{r.name || "—"}</td>
                          <td className="mensajes__mono">{r.phone || "—"}</td>
                          <td><span className="badge badge--red">Fila {r.row}: {r.reason}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="tablefoot">
                  <span>Vista previa (hasta 8 válidas y 8 inválidas)</span>
                  {normalized.invalid.length > 0 && (
                    <button className="linkbtn" type="button" onClick={exportInvalid}>Descargar inválidas (CSV)</button>
                  )}
                </div>
              </div>

              <label className="field" style={{ marginTop: 12 }}>
                <span className="field__label">Origen de la lista<span className="field__req">*</span></span>
                <input
                  type="text"
                  maxLength={120}
                  placeholder="Ej. Inscritos en la feria de Puerto Maldonado, 10/08/2026"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  aria-invalid={!!fieldErrors.source}
                />
                {fieldErrors.source && <span className="mensajes__err">{fieldErrors.source}</span>}
              </label>
              <label className="field field--check">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>Confirmo que estas personas autorizaron recibir mensajes de la campaña (Ley 29733).</span>
              </label>
              {fieldErrors.consentConfirmed && <span className="mensajes__err">{fieldErrors.consentConfirmed}</span>}
            </>
          )}

          {step === "importing" && (
            <div>
              <p>Importando {progress.done} de {progress.total} contactos…</p>
              <div className="mensajes__progress">
                <span className="is-delivered" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          {step === "done" && summary && (
            <div className="mensajes__stats">
              <div className="mensajes__statcard stat"><div className="stat__v">{summary.inserted}</div><div className="stat__l">Nuevos</div></div>
              <div className="mensajes__statcard stat"><div className="stat__v">{summary.updated}</div><div className="stat__l">Actualizados</div></div>
              <div className="mensajes__statcard stat"><div className="stat__v">{summary.invalid}</div><div className="stat__l">Inválidos</div></div>
              <div className="mensajes__statcard stat"><div className="stat__v">{summary.duplicatedInFile}</div><div className="stat__l">Repetidos</div></div>
            </div>
          )}
        </div>
        <footer className="modal__foot">
          {step === "map" && (
            <button type="button" className="btn btn--ghost" onClick={() => { setStep("file"); setError(null); }}>
              Cambiar archivo
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>
            {step === "done" ? "Cerrar" : "Cancelar"}
          </button>
          {step === "map" && (
            <button type="button" className="btn btn--primary" onClick={runImport} disabled={busy || !normalized || normalized.valid.length === 0}>
              Importar {normalized?.valid.length ?? 0} contactos
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `src/app/(admin)/mensajes/contactos/ContactosClient.tsx`**

```tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/admin/Icon";
import { ConfirmDialog } from "../../usuarios/ConfirmDialog";
import { Toasts, type Toast } from "../../usuarios/Toasts";
import { districtLabel, type DistrictId } from "@/lib/districts";
import { foldText } from "@/lib/text";
import { formatDateOnly } from "@/lib/ui/dates";
import { ImportModal } from "./ImportModal";
import { setContactOptedOut, deleteContact } from "./actions";
import type { ContactRow, PermFlags, ActionResult } from "../types";

const PAGE_SIZE = 50;

// formatDateOnly fija America/Lima y normaliza espacios ICU: SSR y navegador coinciden (sin error de hidratación).
function fmtDate(iso: string | null): string {
  return iso ? formatDateOnly(iso) : "—";
}

export function ContactosClient({ rows, perms, initialQuery }: { rows: ContactRow[]; perms: PermFlags; initialQuery: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [wa, setWa] = useState<"" | "yes" | "no" | "unknown">("");
  const [baja, setBaja] = useState<"" | "yes" | "no">("");
  const [contacted, setContacted] = useState<"" | "yes" | "no">("");
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const [toDelete, setToDelete] = useState<ContactRow | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, startTransition] = useTransition();

  function toast(kind: Toast["kind"], message: string) {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), kind, message }]);
  }

  const stats = useMemo(
    () => ({
      total: rows.length,
      yes: rows.filter((r) => r.whatsappStatus === "yes").length,
      no: rows.filter((r) => r.whatsappStatus === "no").length,
      optedOut: rows.filter((r) => r.optedOut).length,
      never: rows.filter((r) => !r.lastMessagedAt).length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const term = foldText(q);
    const digits = q.replace(/\D/g, "");
    return rows.filter(
      (r) =>
        (wa === "" || r.whatsappStatus === wa) &&
        (baja === "" || (baja === "yes") === r.optedOut) &&
        (contacted === "" || (contacted === "yes") === !!r.lastMessagedAt) &&
        (term === "" ||
          foldText(r.name).includes(term) ||
          r.docNumber.includes(term) ||
          (digits.length >= 4 && r.phone.replace(/\D/g, "").includes(digits))),
    );
  }, [rows, q, wa, baja, contacted]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function run(action: () => Promise<ActionResult<unknown>>, okMsg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) toast("success", okMsg);
      else toast("error", res.error);
    });
  }

  return (
    <div className="mensajes__section">
      <header className="mensajes__head">
        <div>
          <h2>Contactos</h2>
          <p className="mensajes__sub">Base única por DNI. Importar de nuevo un DNI actualiza sus datos, nunca lo duplica.</p>
        </div>
        {perms.canWrite && (
          <button className="btn btn--primary" onClick={() => setImporting(true)}>
            <Icon name="download" size={16} /> Importar Excel
          </button>
        )}
      </header>

      <div className="mensajes__stats">
        <div className="mensajes__statcard stat"><div className="stat__v">{stats.total}</div><div className="stat__l">Contactos</div></div>
        <div className="mensajes__statcard stat"><div className="stat__v">{stats.yes}</div><div className="stat__l">Con WhatsApp</div></div>
        <div className="mensajes__statcard stat"><div className="stat__v">{stats.no}</div><div className="stat__l">Sin WhatsApp</div></div>
        <div className="mensajes__statcard stat"><div className="stat__v">{stats.optedOut}</div><div className="stat__l">Bajas</div></div>
        <div className="mensajes__statcard stat"><div className="stat__v">{stats.never}</div><div className="stat__l">Nunca contactados</div></div>
      </div>

      <div className="mensajes__filters">
        <input className="mensajes__search" placeholder="Buscar por DNI, nombre o celular…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="mensajes__select" value={wa} onChange={(e) => { setWa(e.target.value as typeof wa); setPage(1); }}>
          <option value="">WhatsApp: todos</option>
          <option value="yes">Con WhatsApp</option>
          <option value="no">Sin WhatsApp</option>
          <option value="unknown">Sin verificar</option>
        </select>
        <select className="mensajes__select" value={baja} onChange={(e) => { setBaja(e.target.value as typeof baja); setPage(1); }}>
          <option value="">Baja: todos</option>
          <option value="yes">Solo bajas</option>
          <option value="no">Sin baja</option>
        </select>
        <select className="mensajes__select" value={contacted} onChange={(e) => { setContacted(e.target.value as typeof contacted); setPage(1); }}>
          <option value="">Contactados: todos</option>
          <option value="yes">Ya contactados</option>
          <option value="no">Nunca contactados</option>
        </select>
      </div>

      <div className="tablewrap density-comfy">
        <div className="tablewrap__scroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>DNI</th>
                <th>Nombre</th>
                <th>Celular</th>
                <th>Distrito</th>
                <th>WhatsApp</th>
                <th>Último envío</th>
                <th>Baja</th>
                <th>Origen</th>
                {perms.canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 && (
                <tr>
                  <td colSpan={perms.canWrite ? 9 : 8} className="mensajes__empty">
                    <Icon name="users" size={22} />
                    <span>{rows.length === 0 ? "Aún no hay contactos. Importa un Excel para empezar." : "No hay contactos con estos filtros."}</span>
                  </td>
                </tr>
              )}
              {slice.map((r) => (
                <tr key={r.id}>
                  <td className="mensajes__mono">{r.docNumber}</td>
                  <td><div className="mensajes__name">{r.name}</div></td>
                  <td className="mensajes__mono">{r.phone}</td>
                  <td>{r.district ? districtLabel(r.district as DistrictId) : <span className="dtable__muted">—</span>}</td>
                  <td>
                    {r.whatsappStatus === "yes" && <span className="badge badge--green">Sí</span>}
                    {r.whatsappStatus === "no" && <span className="badge badge--red">No</span>}
                    {r.whatsappStatus === "unknown" && <span className="badge badge--neutral">?</span>}
                  </td>
                  <td>{fmtDate(r.lastMessagedAt)}</td>
                  <td>{r.optedOut ? <span className="badge badge--amber">Baja</span> : <span className="dtable__muted">—</span>}</td>
                  <td><span className="mensajes__muted">{r.source}</span></td>
                  {perms.canWrite && (
                    <td>
                      <div className="mensajes__rowactions">
                        <button
                          className="btn btn--ghost btn--sm"
                          disabled={pending}
                          onClick={() => run(() => setContactOptedOut(r.id, !r.optedOut), r.optedOut ? "Contacto reactivado." : "Contacto dado de baja.")}
                        >
                          {r.optedOut ? "Reactivar" : "Dar de baja"}
                        </button>
                        <button className="iconbtn" title="Eliminar" onClick={() => setToDelete(r)}>
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tablefoot">
          <span>{visible.length} de {rows.length} contacto{rows.length === 1 ? "" : "s"}</span>
          <div className="mensajes__pager">
            <button className="btn btn--ghost btn--sm" disabled={current <= 1} onClick={() => setPage(current - 1)}>‹</button>
            <span className="mensajes__muted">Página {current} de {pages}</span>
            <button className="btn btn--ghost btn--sm" disabled={current >= pages} onClick={() => setPage(current + 1)}>›</button>
          </div>
        </div>
      </div>

      {importing && (
        <ImportModal
          onClose={() => setImporting(false)}
          onDone={(s, err) => {
            if (err) toast("error", `Importación incompleta: ${err}`);
            else toast("success", `${s.inserted} nuevos · ${s.updated} actualizados · ${s.invalid} inválidos · ${s.duplicatedInFile} repetidos`);
            router.refresh();
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Eliminar contacto"
          description={<>Se eliminará <strong>{toDelete.name}</strong> ({toDelete.docNumber}) y su historial de envíos. Esta acción no se puede deshacer.</>}
          confirmLabel="Eliminar"
          tone="danger"
          busy={pending}
          onConfirm={async () => {
            const res = await deleteContact(toDelete.id);
            if (res.ok) toast("success", "Contacto eliminado.");
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
```

- [ ] **Step 4: Reemplazar `src/app/(admin)/mensajes/contactos/page.tsx`**

```tsx
import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { ContactosClient } from "./ContactosClient";
import type { ContactRow, PermFlags } from "../types";

export const metadata: Metadata = { title: "Contactos · UNAMAD Admin" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requirePermission("mensajes.read");
  const { q } = await searchParams;

  const contacts = await prisma.contact.findMany({ orderBy: { createdAt: "desc" } });
  const rows: ContactRow[] = contacts.map((c) => ({
    id: c.id,
    docNumber: c.docNumber,
    name: c.name,
    phone: c.phone,
    district: c.district,
    source: c.source,
    whatsappStatus: c.whatsappStatus,
    optedOut: c.optedOut,
    optedOutAt: c.optedOutAt?.toISOString() ?? null,
    lastMessagedAt: c.lastMessagedAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
  }));

  const perms: PermFlags = {
    canRead: me.permissions.has("mensajes.read"),
    canWrite: me.permissions.has("mensajes.write"),
  };

  return <ContactosClient rows={rows} perms={perms} initialQuery={q ?? ""} />;
}
```

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint "src/app/(admin)/mensajes/contactos"`
Expected: sin errores.

Manual: crear un `.xlsx` con cabecera `DNI | NOMBRE | CELULAR` y estas filas: `12345678 / JUAN PEREZ / 987654321`, `1234567 / ANA LOPEZ / +51 912 345 678`, `12345678 / JUAN C PEREZ / 987654321` (repetido), `99999999 / PEPE / 123` (celular inválido), una fila vacía, `55555555 / (vacío) / 955555555` (nombre vacío). Importar con origen y consentimiento → toast "2 nuevos · 0 actualizados · 2 inválidos · 1 repetidos"; la tabla muestra `01234567` y `12345678` con nombre "Juan C Perez". Reimportar el mismo archivo → "0 nuevos · 2 actualizados". Dar de baja a uno → badge "Baja"; reactivar. Sin consentimiento → error bajo el checkbox. Usuario `viewer` → sin botones. Buscar "9876" encuentra por celular.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(admin)/mensajes/contactos"
git commit -m "feat(mensajes): contactos — importación de Excel por lotes con dedup por DNI, bajas y listado"
```

---

### Task 10: Motor de envío (`scheduler.ts`) e `instrumentation.ts`

**Files:**
- Create: `src/lib/messaging/scheduler.ts`
- Create: `src/instrumentation.ts`

**Interfaces:**
- Consumes: `prisma`; `getSession/checkExists/sendText/WahaError` (`./waha`); `renderTemplate/phoneToChatId` (`./normalize`); `limaHour/limaDayKey/isWithinWindow/nextWindowStart/isElectoralSilence/randomBetween` (`./lima-time`); `SchedulerReason/SchedulerSnapshot` (`./types`).
- Produces (`src/lib/messaging/scheduler.ts`, `server-only`):
  - `startScheduler(): void` (idempotente por proceso)
  - `getSchedulerSnapshot(): SchedulerSnapshot`
  - `configuredElectionDate(): string` (`ELECTION_DATE` o `"2026-10-04"`)
  - `senderFooter(): string` (`MESSAGING_SENDER_FOOTER` o el default)
  - `pauseCampaign(campaignId: string, reason: string, lastError?: string): Promise<void>`
  - `MAX_ATTEMPTS = 3`

- [ ] **Step 1: Crear `src/lib/messaging/scheduler.ts`**

```ts
import "server-only";

// Motor de envío. Vive en el proceso de Next (arrancado desde src/instrumentation.ts).
// Cada TICK_MS mira en la BD si hay una campaña en curso y, si toca, envía UN mensaje
// por WAHA y programa una pausa aleatoria. Todo el estado persistente está en Postgres;
// en memoria solo quedan la pausa en curso y el diagnóstico para la UI.

import { prisma } from "@/lib/prisma";
import { getSession, checkExists, sendText, WahaError } from "./waha";
import { renderTemplate, phoneToChatId } from "./normalize";
import {
  isElectoralSilence,
  isWithinWindow,
  limaDayKey,
  limaHour,
  nextWindowStart,
  randomBetween,
} from "./lima-time";
import type { SchedulerReason, SchedulerSnapshot } from "./types";

const TICK_MS = 5_000;
export const MAX_ATTEMPTS = 3;
const DEFAULT_FOOTER = "— Equipo Simón Horna · Responde BAJA para no recibir más mensajes";

type State = {
  started: boolean;
  reason: SchedulerReason;
  campaignId: string | null;
  nextAllowedAt: number; // epoch ms
  sessionStatus: string | null;
  lastTickAt: number;
  consecutiveWahaErrors: number;
  ticking: boolean;
};

declare global {
  var __messagingScheduler: State | undefined;
  var __messagingSchedulerTimer: ReturnType<typeof setTimeout> | undefined;
}

function state(): State {
  if (!globalThis.__messagingScheduler) {
    globalThis.__messagingScheduler = {
      started: false,
      reason: "disabled",
      campaignId: null,
      nextAllowedAt: 0,
      sessionStatus: null,
      lastTickAt: 0,
      consecutiveWahaErrors: 0,
      ticking: false,
    };
  }
  return globalThis.__messagingScheduler;
}

export function configuredElectionDate(): string {
  return process.env.ELECTION_DATE?.trim() || "2026-10-04";
}

export function senderFooter(): string {
  return process.env.MESSAGING_SENDER_FOOTER?.trim() || DEFAULT_FOOTER;
}

export function getSchedulerSnapshot(): SchedulerSnapshot {
  const s = state();
  return {
    active: s.started,
    reason: s.started ? s.reason : "disabled",
    campaignId: s.campaignId,
    nextSendAt: s.reason === "waiting" && s.nextAllowedAt > Date.now() ? new Date(s.nextAllowedAt).toISOString() : null,
    sessionStatus: s.sessionStatus,
    lastTickAt: s.lastTickAt ? new Date(s.lastTickAt).toISOString() : null,
  };
}

export function startScheduler(): void {
  const s = state();
  if (s.started) return;
  s.started = true;
  s.reason = "idle";
  console.log("[mensajes] scheduler iniciado");
  repairInterrupted().catch((e) => console.error("[mensajes] repair", e));
  schedule(TICK_MS);
}

function schedule(ms: number): void {
  if (globalThis.__messagingSchedulerTimer) clearTimeout(globalThis.__messagingSchedulerTimer);
  const t = setTimeout(() => {
    tick()
      .catch((e) => console.error("[mensajes] tick", e))
      .finally(() => schedule(TICK_MS));
  }, ms);
  // No mantener vivo el proceso solo por el timer (permite apagado limpio).
  t.unref?.();
  globalThis.__messagingSchedulerTimer = t;
}

/** Destinatarios reclamados (status sent) cuyo envío se interrumpió (sin id de mensaje) vuelven a pending. */
async function repairInterrupted(): Promise<void> {
  const r = await prisma.campaignRecipient.updateMany({
    where: { status: "sent", wahaMessageId: null, sentAt: null },
    data: { status: "pending" },
  });
  if (r.count) console.log(`[mensajes] ${r.count} envíos interrumpidos devueltos a pendiente`);
}

export async function pauseCampaign(campaignId: string, reason: string, lastError?: string): Promise<void> {
  await prisma.campaign.updateMany({
    where: { id: campaignId, status: "running" },
    data: { status: "paused", pausedReason: reason, ...(lastError ? { lastError } : {}) },
  });
}

type Claimed = { id: string; contactId: string; attempts: number };

/** Reclama atómicamente el siguiente pendiente (FOR UPDATE SKIP LOCKED) y lo marca como sent. */
async function claimNext(campaignId: string): Promise<Claimed | null> {
  const rows = await prisma.$queryRaw<Claimed[]>`
    UPDATE "CampaignRecipient"
    SET status = 'sent', attempts = attempts + 1, "updatedAt" = NOW()
    WHERE id = (
      SELECT id FROM "CampaignRecipient"
      WHERE "campaignId" = ${campaignId} AND status = 'pending'
      ORDER BY id
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "contactId", attempts`;
  return rows[0] ?? null;
}

async function tick(): Promise<void> {
  const s = state();
  if (s.ticking) return; // un tick anterior sigue esperando a WAHA
  s.ticking = true;
  try {
    await tickInner(s);
  } finally {
    s.ticking = false;
  }
}

async function tickInner(s: State): Promise<void> {
  const now = new Date();
  s.lastTickAt = now.getTime();

  if (s.nextAllowedAt > now.getTime()) {
    if (s.reason !== "out_of_window") s.reason = "waiting";
    return;
  }

  const campaign = await prisma.campaign.findFirst({
    where: { status: "running" },
    orderBy: { startedAt: "asc" },
  });
  if (!campaign) {
    s.reason = "idle";
    s.campaignId = null;
    s.consecutiveWahaErrors = 0;
    return;
  }
  s.campaignId = campaign.id;

  if (isElectoralSilence(now, configuredElectionDate())) {
    await pauseCampaign(campaign.id, "veda");
    s.reason = "veda";
    return;
  }

  if (!isWithinWindow(limaHour(now), campaign.windowStart, campaign.windowEnd)) {
    s.reason = "out_of_window";
    // Dormimos hasta la próxima apertura de ventana (como mucho 1 h, por si cambian la campaña).
    s.nextAllowedAt = Math.min(nextWindowStart(now, campaign.windowStart).getTime(), now.getTime() + 3_600_000);
    return;
  }

  const day = limaDayKey(now);
  const counter = await prisma.messagingDailyCounter.findUnique({ where: { day } });
  if ((counter?.count ?? 0) >= campaign.dailyCap) {
    s.reason = "daily_cap";
    return;
  }

  let sessionStatus: string;
  try {
    sessionStatus = (await getSession()).status;
  } catch (e) {
    sessionStatus = "UNREACHABLE";
    s.consecutiveWahaErrors += 1;
    if (s.consecutiveWahaErrors >= 3) {
      await pauseCampaign(campaign.id, "waha_error", e instanceof Error ? e.message : String(e));
      s.consecutiveWahaErrors = 0;
    }
  }
  s.sessionStatus = sessionStatus;
  if (sessionStatus !== "WORKING") {
    if (sessionStatus === "STARTING") {
      // WAHA arrancando (reinicio del contenedor): toleramos ~1 min (12 ticks de 5 s) antes de pausar.
      s.consecutiveWahaErrors += 1;
      if (s.consecutiveWahaErrors >= 12) {
        await pauseCampaign(campaign.id, "session_down", "WAHA lleva demasiado tiempo en STARTING");
        s.consecutiveWahaErrors = 0;
      }
    } else if (sessionStatus !== "UNREACHABLE") {
      await pauseCampaign(campaign.id, "session_down");
    }
    s.reason = "session_down";
    return;
  }
  s.consecutiveWahaErrors = 0;

  const claimed = await claimNext(campaign.id);
  if (!claimed) {
    await prisma.campaign.updateMany({
      where: { id: campaign.id, status: "running" },
      data: { status: "finished", finishedAt: now, pausedReason: null },
    });
    s.reason = "idle";
    return;
  }

  const contact = await prisma.contact.findUnique({ where: { id: claimed.contactId } });
  if (!contact) {
    await prisma.campaignRecipient.update({ where: { id: claimed.id }, data: { status: "failed", error: "Contacto eliminado" } });
    await prisma.campaign.update({ where: { id: campaign.id }, data: { failedCount: { increment: 1 } } });
    return;
  }
  if (contact.optedOut) {
    await prisma.campaignRecipient.update({ where: { id: claimed.id }, data: { status: "opted_out" } });
    return;
  }
  if (contact.whatsappStatus === "no") {
    // Marcado sin WhatsApp por otra campaña después de materializar esta audiencia: no llamar a WAHA.
    await prisma.campaignRecipient.update({ where: { id: claimed.id }, data: { status: "no_whatsapp", error: "El número no tiene WhatsApp" } });
    await prisma.campaign.update({ where: { id: campaign.id }, data: { failedCount: { increment: 1 } } });
    return;
  }

  let chatId = phoneToChatId(contact.phone);
  let sent: { id: string };
  try {
    if (contact.whatsappStatus === "unknown") {
      const r = await checkExists(contact.phone);
      await prisma.contact.update({
        where: { id: contact.id },
        data: { whatsappStatus: r.exists ? "yes" : "no", checkedAt: now },
      });
      if (!r.exists) {
        await prisma.campaignRecipient.update({ where: { id: claimed.id }, data: { status: "no_whatsapp", error: "El número no tiene WhatsApp" } });
        await prisma.campaign.update({ where: { id: campaign.id }, data: { failedCount: { increment: 1 } } });
        s.nextAllowedAt = Date.now() + randomBetween(3, 8) * 1000;
        s.reason = "waiting";
        return;
      }
      if (r.chatId) chatId = r.chatId;
    }

    const text = renderTemplate(campaign.messageTemplate, contact, senderFooter());
    sent = await sendText(chatId, text);
  } catch (e) {
    // Todavía no se envió nada: reencolar es seguro.
    await handleSendError(s, campaign.id, claimed, e);
    return;
  }

  // A partir de aquí WAHA ya aceptó el mensaje: pase lo que pase con la BD, NUNCA reencolar
  // (el ciudadano recibiría el mensaje repetido).
  s.consecutiveWahaErrors = 0;
  try {
    await prisma.$transaction([
      prisma.campaignRecipient.update({
        where: { id: claimed.id },
        data: { status: "sent", wahaMessageId: sent.id, sentAt: new Date(), error: null },
      }),
      prisma.contact.update({ where: { id: contact.id }, data: { lastMessagedAt: new Date() } }),
      prisma.campaign.update({ where: { id: campaign.id }, data: { sentCount: { increment: 1 } } }),
      prisma.messagingDailyCounter.upsert({
        where: { day },
        create: { day, count: 1 },
        update: { count: { increment: 1 } },
      }),
    ]);
  } catch (e) {
    // Enviado pero no registrado del todo: dejamos el destinatario en "sent" con el error anotado.
    console.error("[mensajes] enviado pero no persistido", e);
    await prisma.campaignRecipient
      .update({ where: { id: claimed.id }, data: { status: "sent", wahaMessageId: sent.id, sentAt: new Date(), error: "Enviado; fallo al registrar contadores" } })
      .catch(() => undefined);
  }
  s.nextAllowedAt = Date.now() + randomBetween(campaign.minDelaySec, campaign.maxDelaySec) * 1000;
  s.reason = "waiting";
}

async function handleSendError(s: State, campaignId: string, claimed: Claimed, e: unknown): Promise<void> {
  const msg = e instanceof Error ? e.message : String(e);
  // Solo un 4xx es error "del cliente" (número/petición inválida) y no cuenta para pausar la campaña.
  // Red/timeout, 5xx y respuestas 2xx malformadas (sin id) son fallos de WAHA y sí cuentan.
  const isClientError = e instanceof WahaError && e.status >= 400 && e.status < 500;
  console.error(`[mensajes] envío fallido (intento ${claimed.attempts})`, msg);

  if (claimed.attempts < MAX_ATTEMPTS) {
    await prisma.campaignRecipient.update({ where: { id: claimed.id }, data: { status: "pending", error: msg.slice(0, 300) } });
    s.nextAllowedAt = Date.now() + 60_000 * claimed.attempts;
  } else {
    await prisma.campaignRecipient.update({ where: { id: claimed.id }, data: { status: "failed", error: msg.slice(0, 300) } });
    await prisma.campaign.update({ where: { id: campaignId }, data: { failedCount: { increment: 1 }, lastError: msg.slice(0, 300) } });
    s.nextAllowedAt = Date.now() + randomBetween(5, 15) * 1000;
  }
  s.reason = "waiting";

  if (!isClientError) {
    s.consecutiveWahaErrors += 1;
    if (s.consecutiveWahaErrors >= 3) {
      await pauseCampaign(campaignId, "waha_error", msg.slice(0, 300));
      s.consecutiveWahaErrors = 0;
    }
  } else {
    s.consecutiveWahaErrors = 0;
  }
}
```

- [ ] **Step 2: Crear `src/instrumentation.ts`**

```ts
// Se ejecuta una vez al arrancar el servidor de Next. Arranca el motor de envío
// solo en runtime Node.js (nunca en edge) y solo si MESSAGING_SCHEDULER != "off".
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.MESSAGING_SCHEDULER !== "off") {
    const { startScheduler } = await import("./lib/messaging/scheduler");
    startScheduler();
  }
}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint src/lib/messaging src/instrumentation.ts`
Expected: sin errores.

Run: `npm run dev` → en la consola del servidor aparece `[mensajes] scheduler iniciado` una sola vez. Con `MESSAGING_SCHEDULER=off` no aparece.

Comprobación del claim en SQL (opcional, con `psql`): `UPDATE "CampaignRecipient" SET status='sent' WHERE id=(SELECT id FROM "CampaignRecipient" WHERE status='pending' LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING id;` se ejecuta sin error de tipos (el enum acepta el literal).

- [ ] **Step 4: Commit**

```bash
git add src/lib/messaging/scheduler.ts src/instrumentation.ts
git commit -m "feat(mensajes): motor de envío con pausas aleatorias, tope diario, ventana horaria y veda"
```

---

### Task 11: Campañas — acciones, listado y creación

**Files:**
- Create: `src/app/(admin)/mensajes/campanas/actions.ts`
- Create: `src/app/(admin)/mensajes/campanas/NewCampaignModal.tsx`
- Create: `src/app/(admin)/mensajes/campanas/CampanasClient.tsx`
- Replace: `src/app/(admin)/mensajes/campanas/page.tsx`

**Interfaces:**
- Consumes: `getSession`, `describeWahaError` (`@/lib/messaging/waha`); `getSchedulerSnapshot/configuredElectionDate/senderFooter` (`@/lib/messaging/scheduler`); `renderTemplate/TEMPLATE_MAX` (`@/lib/messaging/normalize`); `isElectoralSilence/limaDayKey` (`@/lib/messaging/lima-time`); `Prisma` (`@/generated/prisma/client`).
- Produces (server actions, todas devuelven `ActionResult`):
  - `previewAudience(audience: AudienceKey, district?: string): Promise<ActionResult<{ count: number; sample: { name: string; docNumber: string } | null; footer: string }>>`
  - `createCampaign(input: CampaignInput): Promise<ActionResult<{ id: string }>>`
  - `startCampaign(id)`, `pauseCampaign(id)`, `resumeCampaign(id)`, `cancelCampaign(id)`, `deleteCampaign(id)`, `retryFailed(id): Promise<ActionResult<{ retried: number }>>`
  - `getCampaignProgress(id): Promise<ActionResult<CampaignProgress>>`
  - `getCampaignRecipients(id, opts: { status: RecipientStatusKey | "all"; page: number; pageSize: number }): Promise<ActionResult<{ rows: RecipientRow[]; total: number }>>`

- [ ] **Step 1: `src/app/(admin)/mensajes/campanas/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/server";
import { isDistrictId, type DistrictId } from "@/lib/districts";
import { getSession, describeWahaError } from "@/lib/messaging/waha";
import { TEMPLATE_MAX } from "@/lib/messaging/normalize";
import { isElectoralSilence, limaDayKey } from "@/lib/messaging/lima-time";
import { getSchedulerSnapshot, configuredElectionDate, senderFooter, pauseCampaign as enginePause } from "@/lib/messaging/scheduler";
import type {
  ActionResult,
  AudienceKey,
  CampaignInput,
  CampaignProgress,
  RecipientRow,
  RecipientStatusKey,
} from "../types";

class Denied extends Error {}

async function authorize(perm: "mensajes.read" | "mensajes.write"): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me || !me.permissions.has(perm)) throw new Denied();
  return me;
}

function fail(error: string, fieldErrors?: Partial<Record<string, string>>): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

function refresh(id?: string) {
  revalidatePath("/mensajes/campanas");
  if (id) revalidatePath(`/mensajes/campanas/${id}`);
}

const NO_PERM = "No tienes permiso para gestionar campañas.";
const AUDIENCES: AudienceKey[] = ["all", "not_contacted", "district"];
const RECIPIENT_STATUSES: RecipientStatusKey[] = ["pending", "sent", "delivered", "read", "failed", "no_whatsapp", "opted_out", "skipped"];

function audienceWhere(audience: AudienceKey, district: DistrictId | null): Prisma.ContactWhereInput {
  return {
    optedOut: false,
    whatsappStatus: { not: "no" },
    ...(audience === "not_contacted" ? { lastMessagedAt: null } : {}),
    ...(audience === "district" && district ? { district } : {}),
  };
}

export async function previewAudience(
  audience: AudienceKey,
  district?: string,
): Promise<ActionResult<{ count: number; sample: { name: string; docNumber: string } | null; footer: string }>> {
  try {
    await authorize("mensajes.read");
    if (!AUDIENCES.includes(audience)) return fail("Audiencia inválida.");
    const d = audience === "district" && district && isDistrictId(district) ? district : null;
    if (audience === "district" && !d) return { ok: true, data: { count: 0, sample: null, footer: senderFooter() } };
    const where = audienceWhere(audience, d);
    const [count, sample] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findFirst({ where, orderBy: { createdAt: "asc" }, select: { name: true, docNumber: true } }),
    ]);
    return { ok: true, data: { count, sample, footer: senderFooter() } };
  } catch (e) {
    if (e instanceof Denied) return fail("Sin permiso.");
    console.error("previewAudience", e);
    return fail("Error inesperado.");
  }
}

type Validated = {
  name: string;
  messageTemplate: string;
  audience: AudienceKey;
  district: DistrictId | null;
  dailyCap: number;
  minDelaySec: number;
  maxDelaySec: number;
  windowStart: number;
  windowEnd: number;
};

function int(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.floor(n) : NaN;
}

function validate(input: CampaignInput): { data?: Validated; fieldErrors?: Record<string, string> } {
  const fe: Record<string, string> = {};
  const name = (input.name ?? "").trim();
  if (name.length < 3 || name.length > 80) fe.name = "Nombre de 3 a 80 caracteres.";
  const messageTemplate = (input.messageTemplate ?? "").trim();
  if (messageTemplate.length < 10 || messageTemplate.length > TEMPLATE_MAX) fe.messageTemplate = `Mensaje de 10 a ${TEMPLATE_MAX} caracteres.`;
  const audience = AUDIENCES.includes(input.audience) ? input.audience : null;
  if (!audience) fe.audience = "Audiencia inválida.";
  let district: DistrictId | null = null;
  if (audience === "district") {
    if (input.district && isDistrictId(input.district)) district = input.district;
    else fe.district = "Elige un distrito.";
  }
  const dailyCap = int(input.dailyCap);
  if (!(dailyCap >= 10 && dailyCap <= 500)) fe.dailyCap = "Tope diario entre 10 y 500.";
  const minDelaySec = int(input.minDelaySec);
  const maxDelaySec = int(input.maxDelaySec);
  if (!(minDelaySec >= 20 && minDelaySec <= 600)) fe.minDelaySec = "Pausa mínima entre 20 y 600 s.";
  if (!(maxDelaySec >= 20 && maxDelaySec <= 600)) fe.maxDelaySec = "Pausa máxima entre 20 y 600 s.";
  if (!fe.minDelaySec && !fe.maxDelaySec && maxDelaySec < minDelaySec) fe.maxDelaySec = "La pausa máxima debe ser ≥ la mínima.";
  const windowStart = int(input.windowStart);
  const windowEnd = int(input.windowEnd);
  if (!(windowStart >= 0 && windowStart <= 23)) fe.windowStart = "Hora de inicio entre 0 y 23.";
  if (!(windowEnd >= 1 && windowEnd <= 24)) fe.windowEnd = "Hora de fin entre 1 y 24.";
  if (!fe.windowStart && !fe.windowEnd && windowEnd <= windowStart) fe.windowEnd = "La hora de fin debe ser mayor que la de inicio.";
  if (Object.keys(fe).length) return { fieldErrors: fe };
  return { data: { name, messageTemplate, audience: audience!, district, dailyCap, minDelaySec, maxDelaySec, windowStart, windowEnd } };
}

export async function createCampaign(input: CampaignInput): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await authorize("mensajes.write");
    const v = validate(input);
    if (!v.data) return fail("Revisa los campos marcados.", v.fieldErrors);
    const d = v.data;
    const contacts = await prisma.contact.findMany({ where: audienceWhere(d.audience, d.district), select: { id: true } });
    if (contacts.length === 0) return fail("La audiencia está vacía: no hay contactos activos que cumplan el criterio.");

    const id = await prisma.$transaction(async (tx) => {
      const c = await tx.campaign.create({
        data: {
          name: d.name,
          messageTemplate: d.messageTemplate,
          audience: d.audience,
          district: d.district,
          dailyCap: d.dailyCap,
          minDelaySec: d.minDelaySec,
          maxDelaySec: d.maxDelaySec,
          windowStart: d.windowStart,
          windowEnd: d.windowEnd,
          totalRecipients: contacts.length,
          createdById: me.id,
        },
      });
      await tx.campaignRecipient.createMany({
        data: contacts.map((k) => ({ campaignId: c.id, contactId: k.id })),
      });
      return c.id;
    });
    refresh();
    return { ok: true, data: { id } };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("createCampaign", e);
    return fail("Error inesperado al crear la campaña.");
  }
}

async function canSendNow(): Promise<string | null> {
  if (isElectoralSilence(new Date(), configuredElectionDate())) return "Estamos en veda electoral: no se pueden iniciar envíos.";
  try {
    const s = await getSession();
    if (s.status !== "WORKING") return "Conecta WhatsApp (pestaña Conexión) antes de iniciar.";
  } catch (e) {
    return describeWahaError(e);
  }
  return null;
}

export async function startCampaign(id: string): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    const c = await prisma.campaign.findUnique({ where: { id } });
    if (!c) return fail("Campaña no encontrada.");
    if (c.status !== "draft" && c.status !== "paused") return fail("Solo se puede iniciar una campaña en borrador o pausada.");
    const blocked = await canSendNow();
    if (blocked) return fail(blocked);
    await prisma.campaign.update({
      where: { id },
      data: { status: "running", startedAt: c.startedAt ?? new Date(), pausedReason: null, lastError: null },
    });
    refresh(id);
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("startCampaign", e);
    return fail("Error inesperado al iniciar.");
  }
}

export async function resumeCampaign(id: string): Promise<ActionResult> {
  return startCampaign(id);
}

export async function pauseCampaign(id: string): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    await enginePause(id, "manual");
    refresh(id);
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("pauseCampaign", e);
    return fail("Error inesperado al pausar.");
  }
}

export async function cancelCampaign(id: string): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    await prisma.$transaction([
      prisma.campaign.updateMany({
        where: { id, status: { in: ["draft", "running", "paused"] } },
        data: { status: "cancelled", finishedAt: new Date(), pausedReason: null },
      }),
      prisma.campaignRecipient.updateMany({ where: { campaignId: id, status: "pending" }, data: { status: "skipped" } }),
    ]);
    refresh(id);
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("cancelCampaign", e);
    return fail("Error inesperado al cancelar.");
  }
}

export async function deleteCampaign(id: string): Promise<ActionResult> {
  try {
    await authorize("mensajes.write");
    const r = await prisma.campaign.deleteMany({ where: { id, status: { in: ["draft", "cancelled", "finished"] } } });
    if (r.count === 0) return fail("Solo se pueden eliminar campañas en borrador, canceladas o finalizadas.");
    refresh();
    return { ok: true };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("deleteCampaign", e);
    return fail("Error inesperado al eliminar.");
  }
}

export async function retryFailed(id: string): Promise<ActionResult<{ retried: number }>> {
  try {
    await authorize("mensajes.write");
    const c = await prisma.campaign.findUnique({ where: { id }, select: { status: true } });
    if (!c) return fail("Campaña no encontrada.");
    if (c.status !== "paused" && c.status !== "finished") {
      return fail("Solo se pueden reintentar fallidos en campañas pausadas o finalizadas.");
    }
    const retried = await prisma.$transaction(async (tx) => {
      const r = await tx.campaignRecipient.updateMany({
        where: { campaignId: id, status: "failed" },
        data: { status: "pending", attempts: 0, error: null, wahaMessageId: null },
      });
      if (r.count > 0) {
        await tx.campaign.update({
          where: { id },
          data: { failedCount: { decrement: r.count }, lastError: null },
        });
        // Una campaña finalizada vuelve a "pausada" para que el usuario la reanude conscientemente.
        await tx.campaign.updateMany({ where: { id, status: "finished" }, data: { status: "paused", pausedReason: "manual", finishedAt: null } });
      }
      return r.count;
    });
    refresh(id);
    return { ok: true, data: { retried } };
  } catch (e) {
    if (e instanceof Denied) return fail(NO_PERM);
    console.error("retryFailed", e);
    return fail("Error inesperado al reintentar.");
  }
}

export async function getCampaignProgress(id: string): Promise<ActionResult<CampaignProgress>> {
  try {
    await authorize("mensajes.read");
    const c = await prisma.campaign.findUnique({ where: { id } });
    if (!c) return fail("Campaña no encontrada.");
    const [grouped, counter] = await Promise.all([
      prisma.campaignRecipient.groupBy({ by: ["status"], where: { campaignId: id }, _count: { _all: true } }),
      prisma.messagingDailyCounter.findUnique({ where: { day: limaDayKey(new Date()) } }),
    ]);
    const counts = Object.fromEntries(RECIPIENT_STATUSES.map((s) => [s, 0])) as Record<RecipientStatusKey, number>;
    for (const g of grouped) counts[g.status] = g._count._all;
    return {
      ok: true,
      data: {
        status: c.status,
        pausedReason: c.pausedReason,
        lastError: c.lastError,
        totalRecipients: c.totalRecipients,
        sentCount: c.sentCount,
        failedCount: c.failedCount,
        counts,
        todayCount: counter?.count ?? 0,
        dailyCap: c.dailyCap,
        scheduler: getSchedulerSnapshot(),
      },
    };
  } catch (e) {
    if (e instanceof Denied) return fail("Sin permiso.");
    console.error("getCampaignProgress", e);
    return fail("Error inesperado.");
  }
}

export async function getCampaignRecipients(
  id: string,
  opts: { status: RecipientStatusKey | "all"; page: number; pageSize: number },
): Promise<ActionResult<{ rows: RecipientRow[]; total: number }>> {
  try {
    await authorize("mensajes.read");
    const pageSize = Math.min(Math.max(int(opts.pageSize) || 100, 1), 1000);
    const page = Math.max(int(opts.page) || 1, 1);
    const where: Prisma.CampaignRecipientWhereInput = {
      campaignId: id,
      ...(opts.status !== "all" && RECIPIENT_STATUSES.includes(opts.status) ? { status: opts.status } : {}),
    };
    const [total, items] = await Promise.all([
      prisma.campaignRecipient.count({ where }),
      prisma.campaignRecipient.findMany({
        where,
        orderBy: { id: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { contact: { select: { docNumber: true, name: true, phone: true } } },
      }),
    ]);
    const rows: RecipientRow[] = items.map((r) => ({
      id: r.id,
      docNumber: r.contact.docNumber,
      name: r.contact.name,
      phone: r.contact.phone,
      status: r.status,
      attempts: r.attempts,
      error: r.error,
      sentAt: r.sentAt?.toISOString() ?? null,
      deliveredAt: r.deliveredAt?.toISOString() ?? null,
      readAt: r.readAt?.toISOString() ?? null,
    }));
    return { ok: true, data: { rows, total } };
  } catch (e) {
    if (e instanceof Denied) return fail("Sin permiso.");
    console.error("getCampaignRecipients", e);
    return fail("Error inesperado.");
  }
}
```

- [ ] **Step 2: `src/app/(admin)/mensajes/campanas/NewCampaignModal.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/admin/Icon";
import { useEscClose } from "@/lib/ui/useEscClose";
import { DISTRICTS } from "@/lib/districts";
import { renderTemplate, TEMPLATE_MAX } from "@/lib/messaging/normalize";
import { previewAudience } from "./actions";
import type { ActionResult, AudienceKey, CampaignInput } from "../types";

const HOURS = Array.from({ length: 25 }, (_, i) => i);

export function NewCampaignModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: CampaignInput) => Promise<ActionResult<unknown>>;
}) {
  const [name, setName] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("Hola {nombre}, te saluda el equipo de Simón Horna. ");
  const [audience, setAudience] = useState<AudienceKey>("not_contacted");
  const [district, setDistrict] = useState("");
  const [dailyCap, setDailyCap] = useState(150);
  const [minDelaySec, setMinDelaySec] = useState(45);
  const [maxDelaySec, setMaxDelaySec] = useState(120);
  const [windowStart, setWindowStart] = useState(8);
  const [windowEnd, setWindowEnd] = useState(20);
  const [preview, setPreview] = useState<{ count: number; sample: { name: string; docNumber: string } | null; footer: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEscClose(true, onClose, busy);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await previewAudience(audience, district || undefined);
      if (!cancelled) setPreview(res.ok ? (res.data ?? null) : null);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [audience, district]);

  function insertToken(token: string) {
    const el = textareaRef.current;
    if (!el) {
      setMessageTemplate((m) => m + token);
      return;
    }
    const start = el.selectionStart ?? messageTemplate.length;
    const end = el.selectionEnd ?? start;
    const next = messageTemplate.slice(0, start) + token + messageTemplate.slice(end);
    setMessageTemplate(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setTopError(null);
    setFieldErrors({});
    const res = await onSubmit({
      name,
      messageTemplate,
      audience,
      district: audience === "district" ? district || undefined : undefined,
      dailyCap,
      minDelaySec,
      maxDelaySec,
      windowStart,
      windowEnd,
    });
    if (!res.ok) {
      setTopError(res.error);
      setFieldErrors(res.fieldErrors ?? {});
    }
    setBusy(false);
  }

  const sample = preview?.sample ?? { name: "Juan Perez Gomez", docNumber: "12345678" };
  const rendered = messageTemplate.trim() ? renderTemplate(messageTemplate, sample, preview?.footer ?? "") : "";
  const days = preview && preview.count > 0 ? Math.ceil(preview.count / Math.max(dailyCap, 1)) : 0;

  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <form className="modal mensajes__modal--wide" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <header className="modal__head">
          <h2>Nueva campaña</h2>
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
            <span className="field__label">Nombre de la campaña<span className="field__req">*</span></span>
            <input type="text" autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} aria-invalid={!!fieldErrors.name} />
            {fieldErrors.name && <span className="mensajes__err">{fieldErrors.name}</span>}
          </label>

          <div className="mensajes__row">
            <div className="field">
              <span className="field__label">Mensaje<span className="field__req">*</span></span>
              <div className="mensajes__tpl-btns">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => insertToken("{nombre}")}>+ {"{nombre}"}</button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => insertToken("{dni}")}>+ {"{dni}"}</button>
              </div>
              <textarea
                ref={textareaRef}
                rows={8}
                maxLength={TEMPLATE_MAX}
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                aria-invalid={!!fieldErrors.messageTemplate}
              />
              <span className="mensajes__hint">{messageTemplate.length}/{TEMPLATE_MAX} · El pie con «Responde BAJA» se añade automáticamente.</span>
              {fieldErrors.messageTemplate && <span className="mensajes__err">{fieldErrors.messageTemplate}</span>}
            </div>
            <div className="field">
              <span className="field__label">Vista previa ({preview?.sample ? "contacto real" : "ejemplo"})</span>
              <div className={`mensajes__preview ${rendered ? "" : "mensajes__preview--empty"}`}>{rendered || "Escribe el mensaje para ver la vista previa."}</div>
            </div>
          </div>

          <div className="mensajes__row">
            <label className="field">
              <span className="field__label">Audiencia</span>
              <select value={audience} onChange={(e) => setAudience(e.target.value as AudienceKey)} aria-invalid={!!fieldErrors.audience}>
                <option value="not_contacted">Solo contactos nunca contactados</option>
                <option value="all">Todos los contactos activos</option>
                <option value="district">Contactos de un distrito</option>
              </select>
              <span className="mensajes__hint">Se excluyen siempre las bajas y los números sin WhatsApp.</span>
            </label>
            {audience === "district" && (
              <label className="field">
                <span className="field__label">Distrito<span className="field__req">*</span></span>
                <select value={district} onChange={(e) => setDistrict(e.target.value)} aria-invalid={!!fieldErrors.district}>
                  <option value="">Elige…</option>
                  {DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
                {fieldErrors.district && <span className="mensajes__err">{fieldErrors.district}</span>}
              </label>
            )}
          </div>

          <div className="mensajes__row mensajes__row--3">
            <label className="field">
              <span className="field__label">Tope diario</span>
              <input type="number" min={10} max={500} value={dailyCap} onChange={(e) => setDailyCap(Number(e.target.value))} aria-invalid={!!fieldErrors.dailyCap} />
              {fieldErrors.dailyCap && <span className="mensajes__err">{fieldErrors.dailyCap}</span>}
            </label>
            <label className="field">
              <span className="field__label">Pausa mínima (s)</span>
              <input type="number" min={20} max={600} value={minDelaySec} onChange={(e) => setMinDelaySec(Number(e.target.value))} aria-invalid={!!fieldErrors.minDelaySec} />
              {fieldErrors.minDelaySec && <span className="mensajes__err">{fieldErrors.minDelaySec}</span>}
            </label>
            <label className="field">
              <span className="field__label">Pausa máxima (s)</span>
              <input type="number" min={20} max={600} value={maxDelaySec} onChange={(e) => setMaxDelaySec(Number(e.target.value))} aria-invalid={!!fieldErrors.maxDelaySec} />
              {fieldErrors.maxDelaySec && <span className="mensajes__err">{fieldErrors.maxDelaySec}</span>}
            </label>
          </div>
          <div className="mensajes__row">
            <label className="field">
              <span className="field__label">Enviar desde (hora Lima)</span>
              <select value={windowStart} onChange={(e) => setWindowStart(Number(e.target.value))} aria-invalid={!!fieldErrors.windowStart}>
                {HOURS.slice(0, 24).map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
              </select>
              {fieldErrors.windowStart && <span className="mensajes__err">{fieldErrors.windowStart}</span>}
            </label>
            <label className="field">
              <span className="field__label">Hasta (hora Lima)</span>
              <select value={windowEnd} onChange={(e) => setWindowEnd(Number(e.target.value))} aria-invalid={!!fieldErrors.windowEnd}>
                {HOURS.slice(1).map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
              </select>
              {fieldErrors.windowEnd && <span className="mensajes__err">{fieldErrors.windowEnd}</span>}
            </label>
          </div>

          <div className="banner" style={{ marginTop: 4 }}>
            <p>
              {preview === null
                ? "Calculando destinatarios…"
                : preview.count === 0
                  ? "No hay contactos para esta audiencia."
                  : `${preview.count} destinatario${preview.count === 1 ? "" : "s"} · ≈ ${days} día${days === 1 ? "" : "s"} al ritmo de ${dailyCap}/día.`}
            </p>
          </div>
        </div>
        <footer className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy || name.trim().length < 3 || messageTemplate.trim().length < 10 || (preview?.count ?? 0) === 0}>
            {busy ? "Creando…" : "Crear campaña (borrador)"}
          </button>
        </footer>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: `src/app/(admin)/mensajes/campanas/CampanasClient.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/admin/Icon";
import { ConfirmDialog } from "../../usuarios/ConfirmDialog";
import { Toasts, type Toast } from "../../usuarios/Toasts";
import { districtLabel, type DistrictId } from "@/lib/districts";
import { formatDateOnly } from "@/lib/ui/dates";
import { NewCampaignModal } from "./NewCampaignModal";
import { createCampaign, deleteCampaign } from "./actions";
import { CAMPAIGN_STATUS_LABEL, AUDIENCE_LABEL, PAUSED_REASON_LABEL, type CampaignRow, type PermFlags } from "../types";

const STATUS_BADGE: Record<CampaignRow["status"], string> = {
  draft: "badge--neutral",
  running: "badge--green",
  paused: "badge--amber",
  finished: "badge--neutral",
  cancelled: "badge--red",
};

function fmtDate(iso: string | null): string {
  return iso ? formatDateOnly(iso) : "—";
}

export function CampanasClient({ rows, perms }: { rows: CampaignRow[]; perms: PermFlags }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<CampaignRow | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function toast(kind: Toast["kind"], message: string) {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), kind, message }]);
  }

  return (
    <div className="mensajes__section">
      <header className="mensajes__head">
        <div>
          <h2>Campañas</h2>
          <p className="mensajes__sub">Cada campaña congela su lista de destinatarios al crearse y se envía de forma pausada.</p>
        </div>
        {perms.canWrite && (
          <button className="btn btn--primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} /> Nueva campaña
          </button>
        )}
      </header>

      <div className="tablewrap density-comfy">
        <div className="tablewrap__scroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Audiencia</th>
                <th>Destinatarios</th>
                <th>Enviados</th>
                <th>Fallidos</th>
                <th>Creada</th>
                {perms.canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={perms.canWrite ? 8 : 7} className="mensajes__empty">
                    <Icon name="message" size={22} />
                    <span>Aún no hay campañas.</span>
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="mensajes__linkrow" onClick={() => router.push(`/mensajes/campanas/${r.id}`)}>
                  <td>
                    <div className="mensajes__name">{r.name}</div>
                    {r.pausedReason && r.status === "paused" && (
                      <div className="mensajes__muted">{PAUSED_REASON_LABEL[r.pausedReason] ?? r.pausedReason}</div>
                    )}
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[r.status]}`}>{CAMPAIGN_STATUS_LABEL[r.status]}</span></td>
                  <td>
                    {AUDIENCE_LABEL[r.audience]}
                    {r.district && <div className="mensajes__muted">{districtLabel(r.district as DistrictId)}</div>}
                  </td>
                  <td className="mensajes__mono">{r.totalRecipients}</td>
                  <td className="mensajes__mono">{r.sentCount}</td>
                  <td className="mensajes__mono">{r.failedCount}</td>
                  <td>
                    {fmtDate(r.createdAt)}
                    {r.createdByName && <div className="mensajes__muted">{r.createdByName}</div>}
                  </td>
                  {perms.canWrite && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="mensajes__rowactions">
                        {(r.status === "draft" || r.status === "cancelled" || r.status === "finished") && (
                          <button className="iconbtn" title="Eliminar" onClick={() => setToDelete(r)}>
                            <Icon name="trash" size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tablefoot">
          <span>{rows.length} campaña{rows.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      {creating && (
        <NewCampaignModal
          onClose={() => setCreating(false)}
          onSubmit={async (input) => {
            const res = await createCampaign(input);
            if (res.ok) {
              toast("success", "Campaña creada en borrador.");
              setCreating(false);
              router.push(`/mensajes/campanas/${res.data!.id}`);
            }
            return res;
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Eliminar campaña"
          description={<>Se eliminará <strong>{toDelete.name}</strong> y su historial de destinatarios.</>}
          confirmLabel="Eliminar"
          tone="danger"
          onConfirm={async () => {
            const res = await deleteCampaign(toDelete.id);
            if (res.ok) toast("success", "Campaña eliminada.");
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
```

- [ ] **Step 4: Reemplazar `src/app/(admin)/mensajes/campanas/page.tsx`**

```tsx
import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { CampanasClient } from "./CampanasClient";
import type { CampaignRow, PermFlags } from "../types";

export const metadata: Metadata = { title: "Campañas · UNAMAD Admin" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const me = await requirePermission("mensajes.read");
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
  const rows: CampaignRow[] = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    audience: c.audience,
    district: c.district,
    totalRecipients: c.totalRecipients,
    sentCount: c.sentCount,
    failedCount: c.failedCount,
    dailyCap: c.dailyCap,
    pausedReason: c.pausedReason,
    createdAt: c.createdAt.toISOString(),
    startedAt: c.startedAt?.toISOString() ?? null,
    finishedAt: c.finishedAt?.toISOString() ?? null,
    createdByName: c.createdBy?.name ?? null,
  }));
  const perms: PermFlags = {
    canRead: me.permissions.has("mensajes.read"),
    canWrite: me.permissions.has("mensajes.write"),
  };
  return <CampanasClient rows={rows} perms={perms} />;
}
```

- [ ] **Step 5: Verificar**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint "src/app/(admin)/mensajes/campanas"`
Expected: sin errores.

Manual: `/mensajes/campanas` → **Nueva campaña**: al escribir, la vista previa muestra el nombre de un contacto real y el pie; audiencia "no contactados" muestra "N destinatarios · ≈ D días"; crear → redirige al detalle (Task 12, de momento 404 hasta implementarla; volver atrás y comprobar que la campaña aparece en la lista como "Borrador").

- [ ] **Step 6: Commit**

```bash
git add "src/app/(admin)/mensajes/campanas"
git commit -m "feat(mensajes): campañas — creación con audiencia, ritmo y vista previa; acciones de control y progreso"
```

---

### Task 12: Detalle de campaña (progreso en vivo, controles, destinatarios, CSV)

**Files:**
- Create: `src/app/(admin)/mensajes/campanas/[id]/page.tsx`
- Create: `src/app/(admin)/mensajes/campanas/[id]/CampaignDetailClient.tsx`

**Interfaces:**
- Consumes: `startCampaign/pauseCampaign/resumeCampaign/cancelCampaign/retryFailed/getCampaignProgress/getCampaignRecipients` (`../actions`); `downloadCsv`; `nextWindowStart` **no** (se calcula en cliente con `windowStart`); tipos `CampaignDetail`, `CampaignProgress`, `RecipientRow`, `RECIPIENT_STATUS_LABEL`, `CAMPAIGN_STATUS_LABEL`, `PAUSED_REASON_LABEL`.

- [ ] **Step 1: `src/app/(admin)/mensajes/campanas/[id]/page.tsx`**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { CampaignDetailClient } from "./CampaignDetailClient";
import { getCampaignProgress, getCampaignRecipients } from "../actions";
import type { CampaignDetail, PermFlags } from "../../types";

export const metadata: Metadata = { title: "Campaña · UNAMAD Admin" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePermission("mensajes.read");
  const { id } = await params;
  const c = await prisma.campaign.findUnique({ where: { id }, include: { createdBy: { select: { name: true } } } });
  if (!c) notFound();

  const campaign: CampaignDetail = {
    id: c.id,
    name: c.name,
    status: c.status,
    audience: c.audience,
    district: c.district,
    totalRecipients: c.totalRecipients,
    sentCount: c.sentCount,
    failedCount: c.failedCount,
    dailyCap: c.dailyCap,
    pausedReason: c.pausedReason,
    createdAt: c.createdAt.toISOString(),
    startedAt: c.startedAt?.toISOString() ?? null,
    finishedAt: c.finishedAt?.toISOString() ?? null,
    createdByName: c.createdBy?.name ?? null,
    messageTemplate: c.messageTemplate,
    minDelaySec: c.minDelaySec,
    maxDelaySec: c.maxDelaySec,
    windowStart: c.windowStart,
    windowEnd: c.windowEnd,
    lastError: c.lastError,
  };

  const [progress, recipients] = await Promise.all([
    getCampaignProgress(id),
    getCampaignRecipients(id, { status: "all", page: 1, pageSize: 100 }),
  ]);
  if (!progress.ok || !recipients.ok) notFound();

  const perms: PermFlags = {
    canRead: me.permissions.has("mensajes.read"),
    canWrite: me.permissions.has("mensajes.write"),
  };

  return (
    <CampaignDetailClient
      campaign={campaign}
      initialProgress={progress.data!}
      initialRecipients={recipients.data!}
      perms={perms}
    />
  );
}
```

- [ ] **Step 2: `src/app/(admin)/mensajes/campanas/[id]/CampaignDetailClient.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/admin/Icon";
import { ConfirmDialog } from "../../../usuarios/ConfirmDialog";
import { Toasts, type Toast } from "../../../usuarios/Toasts";
import { downloadCsv } from "@/lib/ui/csv";
import { startCampaign, pauseCampaign, resumeCampaign, cancelCampaign, retryFailed, getCampaignProgress, getCampaignRecipients } from "../actions";
import {
  CAMPAIGN_STATUS_LABEL,
  PAUSED_REASON_LABEL,
  RECIPIENT_STATUS_LABEL,
  type ActionResult,
  type CampaignDetail,
  type CampaignProgress,
  type PermFlags,
  type RecipientRow,
  type RecipientStatusKey,
} from "../../types";

const PAGE_SIZE = 100;
const STATUS_BADGE: Record<CampaignDetail["status"], string> = {
  draft: "badge--neutral",
  running: "badge--green",
  paused: "badge--amber",
  finished: "badge--neutral",
  cancelled: "badge--red",
};
const RECIPIENT_BADGE: Record<RecipientStatusKey, string> = {
  pending: "badge--neutral",
  sent: "badge--amber",
  delivered: "badge--green",
  read: "badge--green",
  failed: "badge--red",
  no_whatsapp: "badge--red",
  opted_out: "badge--amber",
  skipped: "badge--neutral",
};
const STATUS_FILTERS: (RecipientStatusKey | "all")[] = ["all", "pending", "sent", "delivered", "read", "failed", "no_whatsapp", "opted_out", "skipped"];

// Fijado a Lima y con espacios ICU normalizados para que SSR y navegador coincidan.
const SHORT_DT: Intl.DateTimeFormatOptions = { timeZone: "America/Lima", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" };
function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PE", SHORT_DT).replace(/[\u00A0\u202F]/g, " ");
}
function hh(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

export function CampaignDetailClient({
  campaign,
  initialProgress,
  initialRecipients,
  perms,
}: {
  campaign: CampaignDetail;
  initialProgress: CampaignProgress;
  initialRecipients: { rows: RecipientRow[]; total: number };
  perms: PermFlags;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState<CampaignProgress>(initialProgress);
  const [recipients, setRecipients] = useState(initialRecipients);
  const [filter, setFilter] = useState<RecipientStatusKey | "all">("all");
  const [page, setPage] = useState(1);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState<number | null>(null); // null en SSR; el reloj arranca al montar

  function toast(kind: Toast["kind"], message: string) {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), kind, message }]);
  }

  const loadRecipients = useCallback(async (f: RecipientStatusKey | "all", p: number) => {
    const res = await getCampaignRecipients(campaign.id, { status: f, page: p, pageSize: PAGE_SIZE });
    if (res.ok && res.data) setRecipients(res.data);
  }, [campaign.id]);

  // Sondeo de progreso: 5 s en curso, 30 s en otro estado. Refresca destinatarios si cambian los conteos.
  useEffect(() => {
    let cancelled = false;
    const delay = progress.status === "running" ? 5_000 : 30_000;
    const t = setTimeout(async () => {
      const res = await getCampaignProgress(campaign.id);
      if (cancelled || !res.ok || !res.data) return;
      const changed = JSON.stringify(res.data.counts) !== JSON.stringify(progress.counts);
      setProgress(res.data);
      if (changed) await loadRecipients(filter, page);
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [progress, campaign.id, filter, page, loadRecipients]);

  // Reloj para la cuenta atrás del próximo envío.
  useEffect(() => {
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  function run(action: () => Promise<ActionResult<unknown>>, okMsg: string) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) toast("success", okMsg);
      else toast("error", res.error);
      const p = await getCampaignProgress(campaign.id);
      if (p.ok && p.data) setProgress(p.data);
      await loadRecipients(filter, page);
      router.refresh();
    });
  }

  async function exportCsv() {
    const all: RecipientRow[] = [];
    for (let p = 1; ; p++) {
      const res = await getCampaignRecipients(campaign.id, { status: "all", page: p, pageSize: 1000 });
      if (!res.ok || !res.data) break;
      all.push(...res.data.rows);
      if (all.length >= res.data.total || res.data.rows.length === 0) break;
    }
    downloadCsv(
      `campana-${campaign.name.replace(/[^\w-]+/g, "_")}.csv`,
      ["DNI", "Nombre", "Celular", "Estado", "Intentos", "Enviado", "Entregado", "Leído", "Error"],
      all.map((r) => [r.docNumber, r.name, r.phone, RECIPIENT_STATUS_LABEL[r.status], r.attempts, r.sentAt, r.deliveredAt, r.readAt, r.error]),
    );
  }

  const c = progress.counts;
  const total = Math.max(progress.totalRecipients, 1);
  const pct = (n: number) => `${(n / total) * 100}%`;
  const done = c.sent + c.delivered + c.read + c.failed + c.no_whatsapp + c.opted_out + c.skipped;
  const pages = Math.max(1, Math.ceil(recipients.total / PAGE_SIZE));

  let schedulerText = "";
  const sch = progress.scheduler;
  const isMine = sch.campaignId === campaign.id;
  if (progress.status === "running") {
    if (!sch.active) schedulerText = "El motor de envío no está activo en este servidor (MESSAGING_SCHEDULER=off o proceso sin arrancar).";
    else if (!isMine && sch.campaignId) schedulerText = "Otra campaña está en curso; esta espera su turno.";
    else if (sch.reason === "waiting" && sch.nextSendAt)
      schedulerText = now === null ? "Esperando el próximo envío…" : `Próximo envío en ~${Math.max(0, Math.round((new Date(sch.nextSendAt).getTime() - now) / 1000))} s.`;
    else if (sch.reason === "out_of_window") schedulerText = `Fuera de horario (${hh(campaign.windowStart)}–${hh(campaign.windowEnd)} Lima). Reanuda sola a las ${hh(campaign.windowStart)}.`;
    else if (sch.reason === "daily_cap") schedulerText = `Tope diario alcanzado (${progress.todayCount}/${progress.dailyCap}). Continúa mañana.`;
    else if (sch.reason === "session_down") schedulerText = "WhatsApp no está conectado.";
    else if (sch.reason === "veda") schedulerText = "Veda electoral.";
    else schedulerText = "Enviando…";
  }

  return (
    <div className="mensajes__section">
      <p className="mensajes__muted" style={{ marginTop: 0 }}>
        <Link href="/mensajes/campanas">‹ Campañas</Link>
      </p>
      <header className="mensajes__head">
        <div>
          <h2>
            {campaign.name} <span className={`badge ${STATUS_BADGE[progress.status]}`}>{CAMPAIGN_STATUS_LABEL[progress.status]}</span>
          </h2>
          <p className="mensajes__sub">
            {campaign.totalRecipients} destinatarios · tope {campaign.dailyCap}/día · pausas {campaign.minDelaySec}–{campaign.maxDelaySec} s · {hh(campaign.windowStart)}–{hh(campaign.windowEnd)} Lima
          </p>
        </div>
        {perms.canWrite && (
          <div className="mensajes__actions">
            {progress.status === "draft" && (
              <button className="btn btn--primary" disabled={pending} onClick={() => run(() => startCampaign(campaign.id), "Campaña iniciada.")}>Iniciar</button>
            )}
            {progress.status === "running" && (
              <button className="btn btn--ghost" disabled={pending} onClick={() => run(() => pauseCampaign(campaign.id), "Campaña pausada.")}>Pausar</button>
            )}
            {progress.status === "paused" && (
              <button className="btn btn--primary" disabled={pending} onClick={() => run(() => resumeCampaign(campaign.id), "Campaña reanudada.")}>Reanudar</button>
            )}
            {(progress.status === "draft" || progress.status === "running" || progress.status === "paused") && (
              <button className="btn btn--ghost" disabled={pending} onClick={() => setConfirmCancel(true)}>Cancelar</button>
            )}
            {c.failed > 0 && (progress.status === "paused" || progress.status === "finished") && (
              <button className="btn btn--ghost" disabled={pending} onClick={() => run(() => retryFailed(campaign.id), "Fallidos devueltos a pendiente.")}>Reintentar fallidos ({c.failed})</button>
            )}
            <button className="btn btn--ghost" onClick={exportCsv}><Icon name="download" size={16} /> CSV</button>
          </div>
        )}
      </header>

      {progress.status === "paused" && progress.pausedReason && (
        <div className="banner"><p>{PAUSED_REASON_LABEL[progress.pausedReason] ?? progress.pausedReason}{progress.lastError ? ` — ${progress.lastError}` : ""}</p></div>
      )}
      {progress.status === "running" && schedulerText && (
        <div className="banner"><p>{schedulerText} Hoy: {progress.todayCount}/{progress.dailyCap}.</p></div>
      )}

      <div className="mensajes__progress" title={`${done} de ${progress.totalRecipients}`}>
        <span className="is-read" style={{ width: pct(c.read) }} />
        <span className="is-delivered" style={{ width: pct(c.delivered) }} />
        <span className="is-sent" style={{ width: pct(c.sent) }} />
        <span className="is-failed" style={{ width: pct(c.failed + c.no_whatsapp) }} />
      </div>

      <div className="mensajes__stats">
        {(["pending", "sent", "delivered", "read", "failed", "no_whatsapp", "opted_out"] as RecipientStatusKey[]).map((k) => (
          <div className="mensajes__statcard stat" key={k}>
            <div className="stat__v">{c[k]}</div>
            <div className="stat__l">{RECIPIENT_STATUS_LABEL[k]}</div>
          </div>
        ))}
      </div>

      <div className="mensajes__card">
        <strong>Mensaje</strong>
        <div className="mensajes__preview">{campaign.messageTemplate}</div>
      </div>

      <div className="mensajes__filters">
        <select className="mensajes__select" value={filter} onChange={(e) => { const f = e.target.value as RecipientStatusKey | "all"; setFilter(f); setPage(1); loadRecipients(f, 1); }}>
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === "all" ? "Todos los estados" : RECIPIENT_STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>

      <div className="tablewrap density-comfy">
        <div className="tablewrap__scroll">
          <table className="dtable">
            <thead>
              <tr><th>DNI</th><th>Nombre</th><th>Celular</th><th>Estado</th><th>Enviado</th><th>Entregado</th><th>Leído</th><th>Error</th></tr>
            </thead>
            <tbody>
              {recipients.rows.length === 0 && (
                <tr><td colSpan={8} className="mensajes__empty"><span>Sin destinatarios en este estado.</span></td></tr>
              )}
              {recipients.rows.map((r) => (
                <tr key={r.id}>
                  <td className="mensajes__mono">{r.docNumber}</td>
                  <td><div className="mensajes__name">{r.name}</div></td>
                  <td className="mensajes__mono">{r.phone}</td>
                  <td><span className={`badge ${RECIPIENT_BADGE[r.status]}`}>{RECIPIENT_STATUS_LABEL[r.status]}</span></td>
                  <td>{fmt(r.sentAt)}</td>
                  <td>{fmt(r.deliveredAt)}</td>
                  <td>{fmt(r.readAt)}</td>
                  <td><span className="mensajes__muted">{r.error ?? ""}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tablefoot">
          <span>{recipients.total} destinatario{recipients.total === 1 ? "" : "s"}</span>
          <div className="mensajes__pager">
            <button className="btn btn--ghost btn--sm" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); loadRecipients(filter, p); }}>‹</button>
            <span className="mensajes__muted">Página {page} de {pages}</span>
            <button className="btn btn--ghost btn--sm" disabled={page >= pages} onClick={() => { const p = page + 1; setPage(p); loadRecipients(filter, p); }}>›</button>
          </div>
        </div>
      </div>

      {confirmCancel && (
        <ConfirmDialog
          title="Cancelar campaña"
          description="Los destinatarios pendientes quedarán como omitidos. No se puede deshacer."
          confirmLabel="Cancelar campaña"
          tone="danger"
          busy={pending}
          onConfirm={async () => {
            setConfirmCancel(false);
            run(() => cancelCampaign(campaign.id), "Campaña cancelada.");
          }}
          onClose={() => setConfirmCancel(false)}
        />
      )}

      <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint "src/app/(admin)/mensajes/campanas"`
Expected: sin errores.

Manual (WAHA conectado, 3 contactos propios importados): crear campaña con tope 3, pausas 20–25 s, ventana que incluya la hora actual → **Iniciar** → banner "Próximo envío en ~N s" → en ≤ 90 s los 3 pasan a Enviado; el contador "Hoy: 3/3"; al agotar pendientes la campaña pasa a **Finalizada** (los acks Entregado/Leído llegan con la Task 13). **Pausar/Reanudar** funcionan; **Cancelar** marca pendientes como Omitido; **CSV** descarga con 3 filas. Con `ELECTION_DATE` = mañana → Iniciar devuelve error de veda.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(admin)/mensajes/campanas/[id]"
git commit -m "feat(mensajes): detalle de campaña con progreso en vivo, controles, destinatarios y exportación CSV"
```

---

### Task 13: Webhook de WAHA (acks, BAJA, estado de sesión) + firma HMAC (TDD)

**Files:**
- Create: `src/lib/messaging/webhook-signature.ts`, `src/lib/messaging/webhook-signature.test.ts`
- Create: `src/app/api/waha/webhook/route.ts`
- Modify: `src/proxy.ts`

**Interfaces:**
- Produces: `verifyWahaSignature(rawBody: string, header: string | null, secret: string): boolean`; `POST /api/waha/webhook` (público, 401 sin firma válida, siempre `200 {ok:true}` tras procesar).
- Consumes: `isOptOutText/jidToPhone` (`@/lib/messaging/normalize`), `sendText` (`@/lib/messaging/waha`), `wahaConfig`.

- [ ] **Step 1: Test — `src/lib/messaging/webhook-signature.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyWahaSignature } from "./webhook-signature";

test("verifyWahaSignature acepta el HMAC sha512 hex correcto y rechaza el resto", () => {
  const body = '{"event":"message.ack","payload":{"id":"x"}}';
  const secret = "clave-secreta";
  const good = createHmac("sha512", secret).update(body).digest("hex");
  assert.equal(verifyWahaSignature(body, good, secret), true);
  assert.equal(verifyWahaSignature(body, good.toUpperCase(), secret), true);
  assert.equal(verifyWahaSignature(body, good, "otra"), false);
  assert.equal(verifyWahaSignature(body + " ", good, secret), false);
  assert.equal(verifyWahaSignature(body, null, secret), false);
  assert.equal(verifyWahaSignature(body, "abc", secret), false);
  assert.equal(verifyWahaSignature(body, good, ""), false);
});
```

- [ ] **Step 2: Ejecutar y ver fallo**

Run: `npm test`
Expected: FAIL — `Cannot find module './webhook-signature'`.

- [ ] **Step 3: Crear `src/lib/messaging/webhook-signature.ts`**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

/** WAHA firma el cuerpo crudo con HMAC-SHA512 (hex) en el header X-Webhook-Hmac. */
export function verifyWahaSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const given = header.trim().toLowerCase();
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(given, "utf8"));
}
```

Run: `npm test` → Expected: PASS.

- [ ] **Step 4: Ruta pública en `src/proxy.ts`**

En la expresión `isPublic`, añadir después de `pathname.startsWith("/api/dni/") ||`:

```ts
    pathname.startsWith("/api/waha/") ||
```

- [ ] **Step 5: Crear `src/app/api/waha/webhook/route.ts`**

```ts
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWahaSignature } from "@/lib/messaging/webhook-signature";
import { isOptOutText, jidToPhone } from "@/lib/messaging/normalize";
import { sendText, wahaConfig } from "@/lib/messaging/waha";

export const dynamic = "force-dynamic";

// POST /api/waha/webhook — eventos de WAHA (message.ack, message, session.status).
// Público pero verificado por HMAC; responde siempre 200 tras procesar para que WAHA no reintente.

type WahaEvent = { id?: string; event?: string; session?: string; payload?: unknown };
type AckPayload = { id?: string; ack?: number; ackName?: string };
type MessagePayload = { id?: string; from?: string; fromMe?: boolean; body?: string; _data?: { key?: { remoteJidAlt?: string; senderPn?: string } } };
type SessionPayload = { status?: string };

const OPT_OUT_REPLY = "Listo, no recibirás más mensajes de la campaña de Simón Horna. Gracias.";

// Idempotencia simple en memoria (WAHA reintenta si no respondemos 200 a tiempo).
const seen = new Set<string>();
const seenOrder: string[] = [];
function remember(id: string): boolean {
  if (seen.has(id)) return false;
  seen.add(id);
  seenOrder.push(id);
  if (seenOrder.length > 1000) seen.delete(seenOrder.shift()!);
  return true;
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWahaSignature(raw, req.headers.get("x-webhook-hmac"), wahaConfig().webhookSecret)) {
    return Response.json({ ok: false, error: "Firma inválida." }, { status: 401 });
  }
  let evt: WahaEvent;
  try {
    evt = JSON.parse(raw) as WahaEvent;
  } catch {
    return Response.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }
  if (evt.session && evt.session !== wahaConfig().session) return Response.json({ ok: true, ignored: true });
  if (evt.id && !remember(evt.id)) return Response.json({ ok: true, duplicate: true });

  try {
    switch (evt.event) {
      case "message.ack":
        await onAck((evt.payload ?? {}) as AckPayload);
        break;
      case "message":
        await onMessage((evt.payload ?? {}) as MessagePayload);
        break;
      case "session.status":
        await onSessionStatus((evt.payload ?? {}) as SessionPayload);
        break;
    }
  } catch (e) {
    console.error("[waha webhook]", evt.event, e);
  }
  return Response.json({ ok: true });
}

// ack: -1 ERROR, 0 PENDING, 1 SERVER, 2 DEVICE, 3 READ, 4 PLAYED. Nunca retrocede de estado.
async function onAck(p: AckPayload): Promise<void> {
  if (!p.id || typeof p.ack !== "number") return;
  const r = await prisma.campaignRecipient.findFirst({ where: { wahaMessageId: p.id } });
  if (!r) return;
  const now = new Date();
  if (p.ack === -1) {
    if (r.status === "sent" || r.status === "delivered") {
      await prisma.$transaction([
        prisma.campaignRecipient.update({ where: { id: r.id }, data: { status: "failed", error: "WhatsApp reportó error de entrega (ack ERROR)" } }),
        prisma.campaign.update({ where: { id: r.campaignId }, data: { failedCount: { increment: 1 }, sentCount: { decrement: 1 } } }),
      ]);
    }
    return;
  }
  if (p.ack >= 3 && r.status !== "read") {
    await prisma.campaignRecipient.update({
      where: { id: r.id },
      data: { status: "read", readAt: now, deliveredAt: r.deliveredAt ?? now },
    });
  } else if (p.ack === 2 && r.status === "sent") {
    await prisma.campaignRecipient.update({ where: { id: r.id }, data: { status: "delivered", deliveredAt: now } });
  }
}

async function onMessage(p: MessagePayload): Promise<void> {
  if (p.fromMe || !p.from) return;
  const key = p._data?.key;
  // Chats con LID: `from` llega como `NNN@lid`; el número real viene en `_data.key.remoteJidAlt` (formato Baileys).
  const phone = jidToPhone(p.from) ?? jidToPhone(key?.remoteJidAlt) ?? jidToPhone(key?.senderPn);
  if (!phone) return;
  const body = typeof p.body === "string" ? p.body : "";
  if (!isOptOutText(body)) return;
  // Varios DNI pueden compartir celular: la baja aplica a todos los contactos de ese número.
  const contacts = await prisma.contact.findMany({ where: { phone }, select: { id: true, optedOut: true } });
  if (contacts.length === 0) return;
  if (contacts.every((c) => c.optedOut)) return; // ya dados de baja: no repetir la respuesta
  const ids = contacts.map((c) => c.id);
  await prisma.$transaction([
    prisma.contact.updateMany({
      where: { id: { in: ids }, optedOut: false },
      data: { optedOut: true, optedOutAt: new Date(), optedOutReason: `reply:${body.trim().slice(0, 40)}` },
    }),
    prisma.campaignRecipient.updateMany({ where: { contactId: { in: ids }, status: "pending" }, data: { status: "opted_out" } }),
  ]);
  try {
    await sendText(p.from, OPT_OUT_REPLY);
  } catch (e) {
    console.error("[waha webhook] respuesta BAJA", e);
  }
}

// STARTING es transitorio (reinicio del contenedor con WHATSAPP_RESTART_ALL_SESSIONS, reconexión):
// no pausa. Todo lo demás (STOPPED, SCAN_QR_CODE, FAILED, PASSKEY_*) requiere intervención humana.
const TRANSIENT_STATUSES = new Set(["WORKING", "STARTING"]);

async function onSessionStatus(p: SessionPayload): Promise<void> {
  if (!p.status || TRANSIENT_STATUSES.has(p.status)) return;
  await prisma.campaign.updateMany({
    where: { status: "running" },
    data: { status: "paused", pausedReason: "session_down" },
  });
}
```

- [ ] **Step 6: Verificar**

Run: `npm test && npx tsc --noEmit -p tsconfig.json && npx eslint src/app/api/waha src/lib/messaging src/proxy.ts`
Expected: PASS / sin errores.

Prueba con `curl` (servidor en marcha; `SECRET` = tu `WAHA_WEBHOOK_SECRET`):

```bash
BODY='{"id":"evt_1","event":"session.status","session":"default","payload":{"status":"STOPPED"}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha512 -hmac "$SECRET" | sed 's/^.* //')
curl -s -X POST http://localhost:3000/api/waha/webhook -H "Content-Type: application/json" -H "X-Webhook-Hmac: $SIG" -d "$BODY"
# → {"ok":true}
curl -s -X POST http://localhost:3000/api/waha/webhook -H "Content-Type: application/json" -d "$BODY"
# → 401 {"ok":false,"error":"Firma inválida."}
```

Manual con WhatsApp real: tras una campaña de prueba, los destinatarios pasan a Entregado y Leído al abrir el mensaje; responder "BAJA" desde un número de prueba → el contacto queda con Baja, llega la respuesta automática y sus pendientes pasan a "Baja". Cerrar sesión desde Conexión con campaña en curso → pasa a Pausada (session_down).

- [ ] **Step 7: Commit**

```bash
git add src/lib/messaging/webhook-signature.ts src/lib/messaging/webhook-signature.test.ts src/app/api/waha src/proxy.ts
git commit -m "feat(mensajes): webhook de WAHA con firma HMAC — acks, bajas por BAJA y caída de sesión"
```

---

### Task 14: Búsqueda global, spec al día y verificación final

**Files:**
- Modify: `src/app/api/admin/search/route.ts`
- Modify: `docs/superpowers/specs/2026-08-23-mensajeria-masiva-whatsapp-design.md` (dos ajustes)

- [ ] **Step 1: Grupo "Contactos" en la búsqueda global**

En `src/app/api/admin/search/route.ts`, antes de `return Response.json({ groups });`, añadir:

```ts
  if (me.permissions.has("mensajes.read")) {
    const contacts = await prisma.contact.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { docNumber: { contains: q } },
          { phone: { contains: q.replace(/\D/g, "") || q } },
        ],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, docNumber: true },
    });
    if (contacts.length)
      groups.push({
        key: "contacts",
        label: "Contactos (mensajería)",
        items: contacts.map((c) => ({
          id: c.id,
          title: c.name,
          sub: c.docNumber,
          href: `/mensajes/contactos?q=${enc}`,
          icon: "message",
        })),
      });
  }
```

- [ ] **Step 2: Ajustar el spec a lo implementado**

Editar `docs/superpowers/specs/2026-08-23-mensajeria-masiva-whatsapp-design.md`:
1. §4: `(primer nombre en Title Case)` → `(nombre completo en Title Case; los padrones vienen "APELLIDOS NOMBRES")`.
2. "Decisiones tomadas" punto 6 y §5.2 paso 1: `(\`read-excel-file\`, web worker)` / `(\`read-excel-file/web-worker\`)` → `(\`read-excel-file/browser\`, en el hilo principal: pocos miles de filas tardan < 1 s)`. §9: "entrypoints `/web-worker` y `/node`" → "se usa el entrypoint `/browser`".
3. §5.2 paso 2: "Vista previa de las primeras 20 filas normalizadas" → "Vista previa de hasta 8 filas válidas y 8 inválidas (las inválidas con motivo y número de fila; exportables a CSV)".
4. §5.3 `startCampaign`: añadir "y que no estemos en veda (`isElectoralSilence`); si no, devuelve `fail("Estamos en veda electoral…")`". `retryFailed`: "solo en campañas pausadas o finalizadas".
5. §6 paso 6: quitar "(Se cachea 30 s para no golpear WAHA cada tick.)" y poner "se consulta WAHA justo antes de cada envío (como mucho cada 20 s); `STARTING` se tolera ~1 min antes de pausar". §6 paso 9: añadir "si `whatsappStatus = no` → `no_whatsapp`, `failedCount++`, sin llamar a WAHA". §6 envío: "si la BD falla después de que WAHA aceptó el mensaje, el destinatario queda en `sent` con error anotado; nunca se reenvía".
6. §7 `message`: "la baja aplica a **todos** los contactos con ese celular"; `session.status`: "si `payload.status` no es `WORKING` ni `STARTING`".
7. Contexto (línea "**No hay framework de tests.**") → "Tests unitarios de módulos puros con `node:test` + `tsx` (`npm test`); sin tests de UI/integración." Alcance excluido: "tests automatizados" → "tests automatizados de UI/integración". Cabecera "Verificación (convención del repo — sin tests automatizados)" → "Verificación (`npm test` + build + manual)".
8. §Verificación punto 1: `npx eslint .` → "eslint acotado a los archivos del módulo (ver plan, Task 14)". Punto 3: sustituir el fixture y conteos por los de Task 9 Step 5 ("2 nuevos · 0 actualizados · 2 inválidos · 1 repetidos"; reimportar → "0 nuevos · 2 actualizados"). Punto 8: "Iniciar campaña → queda `paused` con motivo veda" → "Iniciar devuelve error de veda; una campaña ya en curso se pausa con motivo `veda`".
9. §1.3 `logoutSession()`: "`POST …/logout` seguido de `POST …/stop` (WAHA reinicia la sesión tras el logout)". `sendText`: "normaliza el id al formato `${fromMe}_${chatId}_${id}` cuando el engine NOWEB devuelve el `key` crudo". Añadir `describeWahaError` y `WahaConfigError` (falla `startSession` si `WAHA_WEBHOOK_SECRET` está vacío).
10. Archivos afectados: añadir `src/lib/ui/csv.ts`, `src/lib/messaging/types.ts`, `src/lib/messaging/webhook-signature.ts`, `scripts/waha-check.ts`, `src/app/(admin)/mensajes/MensajesTabs.tsx`; en modificados añadir `src/components/admin/Sidebar.tsx`, `src/app/globals.css`, `users.css`, `roles.css`, `login.css`.

- [ ] **Step 3: Verificación completa**

Run: `npm test`
Expected: todos los tests PASS (text, normalize, lima-time, csv, webhook-signature).

Run: `npx prisma validate && npm run build`
Expected: sin errores; el build lista las rutas `/mensajes`, `/mensajes/campanas`, `/mensajes/campanas/[id]`, `/mensajes/contactos`, `/mensajes/conexion`, `/api/waha/webhook`.

Run: `npx eslint "src/app/(admin)/mensajes" src/lib/messaging src/lib/text.ts src/lib/text.test.ts src/lib/ui src/app/api/waha "src/app/api/dni/[dni]/route.ts" src/app/api/admin/search/route.ts src/instrumentation.ts src/proxy.ts src/lib/auth/permissions.ts "src/app/(admin)/roles/category-icons.ts" src/components/admin/data.ts src/components/admin/Icon.tsx src/components/admin/Sidebar.tsx scripts/waha-check.ts`
Expected: sin errores ni warnings. (`npx eslint .` completo reporta cientos de errores preexistentes —vendor en `public/assets/js` y `react-hooks/set-state-in-effect` en componentes existentes— que están fuera de alcance; la expectativa es "nada nuevo", no "cero".)

Run: `npm run start` (o `npm run dev`) y recorrer la lista de verificación del spec:
1. `/mensajes/conexion` → QR → Conectado.
2. Importar el Excel de 6 filas → "2 nuevos · 0 actualizados · 2 inválidos · 1 repetidos"; reimportar → "0 nuevos · 2 actualizados".
3. Dar de baja un contacto → no aparece en la audiencia de una campaña nueva.
4. Campaña a 3 números propios (tope 3, pausas 20–25 s) → `sent` → `delivered` → `read`; "Hoy: 3/3"; Finalizada.
5. Responder "BAJA" → contacto con Baja + respuesta automática.
6. Cerrar sesión con campaña en curso → Pausada (session_down); reconectar y Reanudar.
7. `ELECTION_DATE` = mañana → Iniciar devuelve error de veda; con una campaña ya en curso el motor la pausa con motivo "veda".
8. Usuario `viewer`: ve todo sin botones; llamar a una action de escritura devuelve error de permiso.
9. Móvil 375 px y escritorio 1440 px: tablas con scroll horizontal, modal de importación y de campaña usables.
10. Búsqueda global del TopBar con un DNI importado → grupo "Contactos (mensajería)".

- [ ] **Step 4: Commit final**

```bash
git add src/app/api/admin/search/route.ts docs/superpowers/specs/2026-08-23-mensajeria-masiva-whatsapp-design.md
git commit -m "feat(mensajes): contactos en la búsqueda global y spec alineado con la implementación"
```

---

## Self-Review

**Cobertura del spec:** Infraestructura WAHA (T1, T6); variables de entorno (T1); modelo Prisma (T2); RBAC + icono de categoría + sidebar (T3, T7); normalización y detección de columnas (T4); Conexión (T8); Contactos + importación por lotes de 500 + origen/consentimiento + bajas manuales (T9); Campañas + audiencia + ritmo + vista previa + estimación (T11); Detalle con progreso, controles, reintento, CSV (T12); motor con veda, ventana, tope diario, claim atómico, reintentos, pausa por sesión/WAHA (T10); webhook con HMAC, acks monotónicos, BAJA con respuesta, session.status (T13); búsqueda global (T14); pie obligatorio (`senderFooter` en T10, vista previa en T11). Fuera de alcance respetado (sin Telegram/SMS/multi-sesión).

**Desviaciones documentadas respecto al spec (T14 Step 2 las incorpora al spec):** `{nombre}` = nombre completo; parseo en hilo principal; sin caché de sesión (consulta antes de cada envío; `STARTING` tolerado ~1 min); vista previa 8+8 filas; veda bloquea `startCampaign`; `retryFailed` solo en pausada/finalizada; baja por BAJA aplica a todos los contactos del número; `logout` + `stop`; id de mensaje normalizado para NOWEB; `WAHA_WEBHOOK_SECRET` obligatorio; estilos compartidos movidos a `globals.css`; tests unitarios de módulos puros.

**Hallazgos de la revisión adversarial aplicados:** comillas JSX (`react/no-unescaped-entities`), `foldText` sin bytes de control, timeout de la transacción de importación (60 s), fechas fijadas a Lima (hidratación), reloj del detalle solo en cliente, Sidebar sin `useEffect` + enlace cuando está colapsado, lint acotado, no reenviar si la BD falla tras `sendText`, `whatsappStatus = no` sin llamar a WAHA, pausa por 5xx sostenidos, contadores reseteados, `describeWahaError` síncrono en `waha.ts`, `jidToPhone` para LID, `retryFailed` restringido, `ImportModal` reporta error parcial, etiqueta de motivo de pausa en el listado.

**Placeholders:** ninguno; todo el código está inline.

**Consistencia de tipos:** `SessionStatus` (types.ts) = `WahaSessionStatus` (waha.ts) ∪ `"UNKNOWN"`; `RecipientStatusKey`/`CampaignStatusKey`/`AudienceKey`/`WhatsappStatusKey` coinciden literalmente con los enums Prisma, por lo que los campos del cliente generado se asignan sin cast; `SchedulerSnapshot` se produce en `scheduler.ts` y se consume en `getCampaignProgress` y `CampaignDetailClient`; `describeWahaError` es async (archivo `"use server"`) y se usa con `await` en ambos consumidores; `pauseCampaign` del motor se importa con alias `enginePause` en las actions de campañas para no chocar con la action homónima.
