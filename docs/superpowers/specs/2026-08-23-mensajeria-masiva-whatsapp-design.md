# Diseño — Mensajería masiva por WhatsApp (contactos por DNI + campañas vía WAHA)

**Fecha:** 2026-08-23
**Estado:** Aprobado por Alberto (pendiente de plan de implementación)

## Contexto

Campaña "Ahora Nación" (Simón Horna Alpaca, Gobierno Regional de Madre de Dios, ERM 4-oct-2026).
La app ya tiene el panel admin bajo `src/app/(admin)/` con RBAC, Prisma 7 + Postgres (`prisma db push`,
sin migrations), patrón de módulo `page.tsx / actions.ts / XClient.tsx / types.ts / x.css`
(referencia: `personeros`), helpers `requirePermission`/`userHas` (`src/lib/auth/server`),
catálogo de permisos (`src/lib/auth/permissions.ts`), `rateLimit`, `ok`/`fail`
(`src/app/api/v1/_lib/response`), `DISTRICTS`/`isDistrictId` (`src/lib/districts`), `Icon`,
`ConfirmDialog`, `Toasts`, `useEscClose`. **No hay framework de tests.**

Se añade un módulo **Mensajería**: importar un Excel (DNI, nombre, celular) a una base única de
contactos deduplicada por DNI, y enviar campañas de WhatsApp de forma automática y pausada a través
de **WAHA** (WhatsApp HTTP API, self-hosted en Docker), con seguimiento de entrega y bajas.

## Investigación previa (hechos que condicionan el diseño)

- **WhatsApp Cloud API oficial descartada**: el número de prueba solo envía a 5 destinatarios
  verificados; producción cuesta ~USD 0.07/mensaje de marketing en Perú; y la política de Meta
  prohíbe el uso de la plataforma por partidos, candidatos y campañas políticas
  (whatsappbusiness.com/policy).
- **Telegram no permite enviar por número de teléfono** (solo a quien inició el bot). Queda fuera de v1.
- **SMS a Perú** cuesta ~USD 0.25/mensaje (Twilio). Fuera de alcance.
- **WAHA** (`devlikeapro/waha`, Apache-2.0, gratis desde 2026.6.1) expone por HTTP: sesiones + QR,
  `POST /api/sendText`, `GET /api/contacts/check-exists`, webhooks `message`, `message.ack`,
  `session.status` con firma HMAC sha512. Engine `NOWEB` (sin Chromium, ~50 MB RAM).
- **Riesgo aceptado**: Meta puede banear el número usado con un cliente no oficial aunque se respeten
  límites. Mitigación: número dedicado con chip peruano, perfil completo, calentamiento 1–2 semanas,
  tope diario bajo, pausas aleatorias, ventana horaria.
- **Legal (Ley 29733 / DS 016-2024-JUS)**: lista DNI+teléfono es banco de datos personales; enviar sin
  consentimiento es infracción grave ante la ANPD. El módulo registra origen y consentimiento por carga,
  incluye remitente y opción de baja en cada mensaje, mantiene lista de bajas permanente y bloquea
  envíos en veda electoral (24 h antes de la elección, Res. 0844-2025-JNE art. 7.1.10).

## Decisiones tomadas (brainstorming)

1. Canal: **WhatsApp automático vía WAHA** (no oficial), servicio Docker en el mismo VPS que Next.
2. **Solo WhatsApp** en v1. El modelo deja `channel` preparado para Telegram/SMS futuros.
3. Volumen: **cientos a pocos miles** de contactos; **una sola sesión/número** en v1.
4. Deduplicación: **base única de contactos por DNI** (upsert en cada importación) + campañas que
   seleccionan audiencia. Bajas permanentes.
5. Orquestación: **planificador dentro del proceso Next** (`src/instrumentation.ts`), estado en Postgres.
6. El `.xlsx` **se parsea en el navegador** (`read-excel-file`, web worker); al servidor solo llegan
   filas JSON por lotes. Nunca se sube el archivo.
7. Cumplimiento **no opcional**: pie con remitente + "Responde BAJA", registro de origen/consentimiento,
   veda no desactivable desde la UI.

## Rutas

| Pantalla | Ruta (admin) | Permiso |
|---|---|---|
| Conexión WhatsApp (QR / estado) | `/mensajes/conexion` | `mensajes.read` (acciones: `write`) |
| Contactos + Importar Excel | `/mensajes/contactos` | `mensajes.read` (importar/baja: `write`) |
| Campañas (lista + nueva) | `/mensajes/campanas` | `mensajes.read` (crear: `write`) |
| Detalle de campaña | `/mensajes/campanas/[id]` | `mensajes.read` (controles: `write`) |
| Webhook de WAHA | `POST /api/waha/webhook` | público, verificado por HMAC |

`/mensajes` redirige a `/mensajes/campanas`. Sidebar: ítem expandible **Mensajería** (icono nuevo
`message`) con hijos *Campañas*, *Contactos*, *Conexión*.

---

## 1. Infraestructura WAHA

### 1.1 Docker

Nuevo `docker-compose.waha.yml` en la raíz del repo:

```yaml
services:
  waha:
    image: devlikeapro/waha
    restart: unless-stopped
    ports:
      - "127.0.0.1:3001:3000"
    environment:
      WAHA_API_KEY: ${WAHA_API_KEY}
      WHATSAPP_DEFAULT_ENGINE: NOWEB
      WAHA_PRINT_QR: "false"
      WHATSAPP_RESTART_ALL_SESSIONS: "true"
    volumes:
      - ./.waha/sessions:/app/.sessions
```

Solo escucha en `127.0.0.1` del VPS; Next lo llama por `http://127.0.0.1:3001`. WAHA llama al webhook
de Next por `http://host.docker.internal:3000/api/waha/webhook` (añadir
`extra_hosts: ["host.docker.internal:host-gateway"]`).

### 1.2 Variables de entorno (`.env`; se añade `.env.example` con estos valores de ejemplo)

```
WAHA_URL=http://127.0.0.1:3001
WAHA_API_KEY=<secreto largo>
WAHA_SESSION=default
WAHA_WEBHOOK_URL=http://host.docker.internal:3000/api/waha/webhook
WAHA_WEBHOOK_SECRET=<secreto largo>          # clave HMAC
MESSAGING_SENDER_FOOTER=— Equipo Simón Horna · Responde BAJA para no recibir más mensajes
ELECTION_DATE=2026-10-04                      # veda desde 24 h antes (hora Lima)
MESSAGING_SCHEDULER=on                        # off para desactivar el bucle (p. ej. en dev)
```

### 1.3 Cliente WAHA (`src/lib/messaging/waha.ts`, `server-only`)

Funciones tipadas, todas con header `X-Api-Key` y timeout 15 s (`AbortSignal.timeout`):

| Función | Endpoint WAHA |
|---|---|
| `getSession()` | `GET /api/sessions/{session}` → `{ status: 'STOPPED'\|'STARTING'\|'SCAN_QR_CODE'\|'WORKING'\|'FAILED', me? }` (404 → `'STOPPED'`, no creada) |
| `startSession()` | `POST /api/sessions` con `{ name, start: true, config: { webhooks: [{ url, events: ['message','message.ack','session.status'], hmac: { key }, retries: { policy: 'constant', delaySeconds: 2, attempts: 15 } }] } }`; si ya existe → `POST /api/sessions/{session}/start` |
| `getQr()` | `GET /api/{session}/auth/qr` con `Accept: application/json` → `{ mimetype, data }` (base64) |
| `logoutSession()` | `POST /api/sessions/{session}/logout` |
| `stopSession()` | `POST /api/sessions/{session}/stop` |
| `checkExists(phoneE164)` | `GET /api/contacts/check-exists?phone=519XXXXXXXX&session=…` → `{ numberExists, chatId }` |
| `sendText(chatId, text)` | `POST /api/sendText` `{ session, chatId, text }` → `{ id }` (el `id` puede venir como `id` string o `id._serialized`; normalizar) |

`chatId` = número E.164 sin `+` + `@c.us` (ej. `51987654321@c.us`), salvo que `checkExists`
devuelva un `chatId` distinto (se usa ese).

Errores: `WahaError { status, body }`. 401 → "API key inválida"; conexión rechazada → "WAHA no
responde"; ambos se muestran en `/mensajes/conexion`.

---

## 2. Modelo de datos (Prisma)

Añadir a `prisma/schema.prisma` (reutiliza `DocumentType` y `District`):

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
  all             // todos los contactos activos
  not_contacted   // contactos sin lastMessagedAt
  district        // contactos de un distrito (campaign.district)
}

enum RecipientStatus {
  pending
  sent          // aceptado por WAHA (ack SERVER pendiente)
  delivered     // ack DEVICE
  read          // ack READ / PLAYED
  failed        // error de envío tras reintentos, o ack ERROR
  no_whatsapp   // check-exists = false
  opted_out     // el contacto pidió baja antes del envío
  skipped       // campaña cancelada con el destinatario aún pendiente
}

model Contact {
  id             String         @id @default(cuid())
  docType        DocumentType   @default(dni)
  docNumber      String
  name           String
  phone          String         // E.164: +519XXXXXXXX
  district       District?
  source         String         // origen de la lista (texto de la importación)
  whatsappStatus WhatsappStatus @default(unknown)
  checkedAt      DateTime?      // último check-exists
  optedOut       Boolean        @default(false)
  optedOutAt     DateTime?
  optedOutReason String?        // "reply:BAJA" | "manual:<userId>"
  lastMessagedAt DateTime?
  importId       String?        // última importación que lo creó/actualizó
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
  source           String   // "Padrón de personeros 2026", "Inscritos feria Puerto Maldonado"…
  consentConfirmed Boolean  // checkbox obligatorio en la UI
  totalRows        Int
  inserted         Int
  updated          Int
  invalid          Int      // DNI/teléfono inválidos (no se importan)
  duplicatedInFile Int      // DNI repetidos dentro del archivo (se conserva la última fila)
  createdById      String?
  createdAt        DateTime @default(now())

  createdBy User?     @relation("ContactImportCreator", fields: [createdById], references: [id], onDelete: SetNull)
  contacts  Contact[]
}

model Campaign {
  id              String           @id @default(cuid())
  name            String
  channel         MessageChannel   @default(whatsapp)
  messageTemplate String           // admite {nombre} y {dni}
  audience        CampaignAudience
  district        District?        // solo si audience = district
  status          CampaignStatus   @default(draft)
  dailyCap        Int              @default(150)
  minDelaySec     Int              @default(45)
  maxDelaySec     Int              @default(120)
  windowStart     Int              @default(8)   // hora Lima (0-23) inclusive
  windowEnd       Int              @default(20)  // hora Lima exclusiva
  totalRecipients Int              @default(0)
  sentCount       Int              @default(0)   // sent+delivered+read
  failedCount     Int              @default(0)   // failed+no_whatsapp
  lastError       String?
  pausedReason    String?          // "session_down" | "manual" | "waha_error"
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

Relaciones inversas en `model User`:

```prisma
  createdContacts       Contact[]         @relation("ContactCreator")
  createdContactImports ContactImport[]   @relation("ContactImportCreator")
  createdCampaigns      Campaign[]        @relation("CampaignCreator")
```

Aplicar con `npx prisma db push` + `npx prisma generate`.

`MessagingDailyCounter` es el tope diario **global del número** (no por campaña). El motor procesa
**una campaña a la vez** (la `running` con `startedAt` más antiguo); las demás `running` esperan su turno.
El contador cuenta todos los envíos del día, así que `dailyCap` de la campaña en curso se compara contra
el total del número, no contra lo enviado por esa campaña.

---

## 3. RBAC

Añadir a `PERMISSIONS` en `src/lib/auth/permissions.ts`:

```ts
{ key: "mensajes.read",  name: "Ver mensajería",      description: "Consultar contactos, campañas y estado de la conexión de WhatsApp", category: "Mensajería" },
{ key: "mensajes.write", name: "Gestionar mensajería", description: "Importar contactos, crear y controlar campañas, conectar WhatsApp y dar de baja contactos", category: "Mensajería" },
```

`ROLE_DEFS`: `superadmin` (automático), `admin` → ambos, `viewer` → `mensajes.read`.
`src/app/(admin)/roles/category-icons.ts`: `"Mensajería": "message"`. Re-seed: `npx tsx prisma/seed.ts`.

---

## 4. Normalización y validación (`src/lib/messaging/normalize.ts`, sin `server-only`: se usa en cliente y servidor)

- `normalizeDni(v): string | null` — quita espacios/puntos; Excel puede entregar número (`12345678`) o
  texto con ceros perdidos (`1234567` → rellenar a 8 con ceros a la izquierda **solo si** tiene 7 dígitos);
  válido si `^\d{8}$`.
- `normalizePeruPhone(v): string | null` — acepta `987654321`, `51987654321`, `+51 987 654 321`,
  `0051987654321`, `9.87654321E8` (notación científica de Excel: convertir con `Number` si es finito);
  resultado `+519XXXXXXXX`; válido si tras quitar prefijo `51`/`+51`/`0051` quedan 9 dígitos que
  empiezan por `9`.
- `normalizeName(v): string` — `trim`, colapsar espacios, Title Case (reusar la lógica de
  `src/app/api/dni/[dni]/route.ts` extraída a `src/lib/text.ts` → `toTitleCase`).
- `detectColumns(headers: string[]): { dni?: number; name?: number; phone?: number }` — match
  case/acento-insensible: DNI ∈ {`dni`, `documento`, `nro documento`, `num doc`, `doc`};
  nombre ∈ {`nombre`, `nombres`, `nombre completo`, `apellidos y nombres`}; teléfono ∈ {`celular`,
  `telefono`, `teléfono`, `numero`, `número`, `whatsapp`, `movil`, `móvil`}. Si hay columnas separadas
  `apellido paterno`/`materno`/`nombres`, se concatenan `nombres + paterno + materno`.
- `renderTemplate(template, { nombre, dni })` — reemplaza `{nombre}` (primer nombre en Title Case) y
  `{dni}`; añade `\n\n` + `MESSAGING_SENDER_FOOTER`.
- `isOptOutText(body)` — `^\s*(baja|stop|no)\b` case-insensible, sin acentos.

---

## 5. Pantallas admin (`src/app/(admin)/mensajes/…`)

Estructura: `mensajes/layout.tsx` (sub-navegación con 3 pestañas: Campañas · Contactos · Conexión;
`requirePermission("mensajes.read")`), `mensajes/page.tsx` (redirect a `/mensajes/campanas`),
`mensajes/mensajes.css` (padding `0 24px 80px; max-width: 1600px`, mismo patrón que `personeros.css`),
`mensajes/types.ts` (`ActionResult`, `ContactRow`, `CampaignRow`, `RecipientRow`, `SessionInfo`, `PermFlags`).

### 5.1 Conexión — `mensajes/conexion/page.tsx` + `ConexionClient.tsx` + `actions.ts`

- Server: `force-dynamic`; obtiene `getSession()` (capturando error WAHA) y pasa `SessionInfo`.
- Cliente: tarjeta con estado (`Desconectado` / `Iniciando…` / `Escanea el QR` / `Conectado como +51… (nombre)` /
  `Error`), QR (`<img src="data:...">`) cuando `SCAN_QR_CODE`, se refresca cada 3 s con `getSessionAction()`
  y `getQrAction()` mientras no esté `WORKING`. Botones (`canWrite`): **Conectar** (`startSessionAction`),
  **Cerrar sesión** (`logoutSessionAction`, con `ConfirmDialog`), **Reintentar**.
- Instrucciones en pantalla: "Usa el celular de campaña → WhatsApp → Dispositivos vinculados → Vincular".
- Advertencia fija: riesgo de baneo + recomendaciones (número dedicado, calentar, tope diario).

### 5.2 Contactos — `mensajes/contactos/page.tsx` + `ContactosClient.tsx` + `ImportModal.tsx` + `actions.ts`

- Server: `force-dynamic`; `prisma.contact.findMany({ orderBy: { createdAt: "desc" } })` → `ContactRow[]`
  (sin paginación server-side, igual que el resto del admin; la tabla pagina en cliente de 50 en 50).
- Tabla: DNI · Nombre · Celular · Distrito · WhatsApp (`?`/`Sí`/`No`) · Último envío · Baja · Origen.
  Buscador (DNI/nombre/teléfono), filtros (WhatsApp, baja, contactado/no). Acción por fila (`canWrite`):
  **Dar de baja** / **Reactivar** (`setContactOptedOut(id, optedOut)` → `optedOutReason = "manual:<userId>"`).
  Eliminar contacto (`deleteContact(id)`, `ConfirmDialog`).
- Resumen superior: total, con WhatsApp, sin WhatsApp, bajas, nunca contactados.
- **Importar Excel** (`ImportModal`, 3 pasos):
  1. *Archivo*: `<input type="file" accept=".xlsx">`; se lee con `read-excel-file/web-worker`
     (`readXlsxFile(file)` → `Row[]`); primera fila = cabeceras. Muestra "N filas detectadas".
  2. *Columnas y revisión*: selects DNI / Nombre / Celular precargados por `detectColumns`; opcional
     Distrito (select fijo para todo el archivo). Vista previa de las primeras 20 filas normalizadas y
     contadores: válidas, inválidas (con motivo por fila, exportable), repetidas en el archivo.
     Campo **Origen de la lista** (obligatorio) y checkbox **"Confirmo que estas personas autorizaron
     recibir mensajes de la campaña"** (obligatorio).
  3. *Importar*: envía `createImport({ fileName, source, consentConfirmed, totalRows, invalid, duplicatedInFile })`
     → `importId`; luego `importContactsBatch(importId, rows)` en lotes de **500** filas
     (`{ docNumber, name, phone, district? }`; ~60 KB por lote, muy por debajo del límite de 1 MB de
     Server Actions). Barra de progreso. Al final `finishImport(importId)` devuelve totales y se muestra
     "X nuevos · Y actualizados · Z inválidos · W repetidos".
- `importContactsBatch`: por cada fila, `upsert` por `[docType=dni, docNumber]`: crea, o actualiza
  `name`, `phone`, `district` (si viene), `source`, `importId`; **no** toca `optedOut`,
  `whatsappStatus` ni `lastMessagedAt`. Si el teléfono cambia, `whatsappStatus = unknown`. Devuelve
  `{ inserted, updated }`. Se ejecuta dentro de `prisma.$transaction` por lote.

### 5.3 Campañas — `mensajes/campanas/page.tsx` + `CampanasClient.tsx` + `NewCampaignModal.tsx` + `actions.ts`

- Lista: Nombre · Estado (chip) · Destinatarios · Enviados · Fallidos · Creada · Creador; click → detalle.
- **Nueva campaña** (`canWrite`): nombre; mensaje (textarea, contador, botones para insertar `{nombre}` /
  `{dni}`); vista previa renderizada con un contacto real (el primero de la audiencia) incluyendo el pie;
  audiencia (`all` / `not_contacted` / `district` + select); ritmo: tope diario (10–500), pausa mín/máx
  (segundos, 20–600, mín < máx), ventana horaria (hora inicio/fin). Estimación en vivo:
  "N destinatarios · ≈ D días al ritmo actual" (`D = ceil(N / dailyCap)`).
- `createCampaign(input)`: valida (nombre 3–80, mensaje 10–1000 chars sin el pie, rangos), calcula la
  audiencia **excluyendo** `optedOut = true` y `whatsappStatus = no`, crea `Campaign` + `CampaignRecipient[]`
  (`createMany`, `status = pending`) y `totalRecipients`. Queda en `draft`.
- `startCampaign(id)` → `running` (+ `startedAt` si nulo); requiere sesión `WORKING`, si no devuelve
  `fail("Conecta WhatsApp antes de iniciar.")`. `pauseCampaign(id)` → `paused` (`pausedReason = "manual"`).
  `resumeCampaign(id)` → `running`. `cancelCampaign(id)` → `cancelled` y marca `pending` → `skipped`.
  `deleteCampaign(id)` solo si `draft`/`cancelled`/`finished`.

### 5.4 Detalle — `mensajes/campanas/[id]/page.tsx` + `CampaignDetailClient.tsx`

- `params` es `Promise` (`await params`). Server carga campaña + conteos por estado
  (`groupBy status`) + destinatarios con contacto.
- Cabecera: nombre, estado, controles **Iniciar / Pausar / Reanudar / Cancelar** (`canWrite`),
  aviso si `pausedReason = session_down` ("WhatsApp se desconectó; reconecta en Conexión y reanuda").
- Tarjetas: Pendientes · Enviados · Entregados · Leídos · Fallidos · Sin WhatsApp · Bajas. Barra de progreso.
  "Hoy: X/dailyCap enviados" y "Próximo envío en ~N s" (calculado en cliente desde `nextSendAt` que
  devuelve `getCampaignProgress`).
- Tabla de destinatarios: DNI · Nombre · Celular · Estado · Enviado · Entregado · Error; filtro por estado.
- Polling: `getCampaignProgress(id)` (server action) cada **5 s** mientras `running`; cada 30 s si no.
- **Exportar CSV** (generado en cliente desde las filas cargadas; `Blob` + `a[download]`).
- **Reintentar fallidos** (`retryFailed(id)`): `failed` → `pending`, `attempts = 0`.

---

## 6. Motor de envío (`src/lib/messaging/scheduler.ts`, `server-only`)

Arranque: `src/instrumentation.ts`:

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.MESSAGING_SCHEDULER !== "off") {
    const { startScheduler } = await import("./lib/messaging/scheduler");
    startScheduler();
  }
}
```

`startScheduler()` usa `globalThis.__messagingScheduler` como guard (una sola instancia por proceso,
también con HMR en dev). Bucle `setTimeout` recursivo (no `setInterval`) con **tick cada 5 s**; cada
tick está envuelto en `try/catch` y nunca tumba el proceso.

Algoritmo del tick:

1. Si `nextAllowedAt > now` (pausa aleatoria en curso) → salir.
2. `campaign = prisma.campaign.findFirst({ where: { status: "running" }, orderBy: { startedAt: "asc" } })`;
   si no hay → salir.
3. **Veda**: si `now (Lima) >= ELECTION_DATE - 24h` y `now < ELECTION_DATE + 1 día` → pausar la campaña
   (`pausedReason = "veda"`) y salir. (`Intl.DateTimeFormat` con `timeZone: "America/Lima"`; sin libs.)
4. **Ventana horaria**: hora Lima fuera de `[windowStart, windowEnd)` → salir (no pausa; la campaña
   espera a la siguiente ventana; el detalle muestra "Fuera de horario, reanuda a las HH:00").
5. **Tope diario**: `MessagingDailyCounter[hoy Lima].count >= campaign.dailyCap` → salir
   (detalle muestra "Tope diario alcanzado").
6. **Sesión**: `getSession()`; si no `WORKING` → `status = paused`, `pausedReason = "session_down"`, salir.
   (Se cachea 30 s para no golpear WAHA cada tick.)
7. Tomar destinatario: `updateMany`-style claim atómico —
   `prisma.$queryRaw` `UPDATE "CampaignRecipient" SET status='sent', attempts=attempts+1, "updatedAt"=now()
   WHERE id = (SELECT id FROM "CampaignRecipient" WHERE "campaignId"=$1 AND status='pending'
   ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING id, "contactId"`. Si no hay filas → campaña
   `finished` (`finishedAt = now`) y salir.
8. Cargar contacto. Si `optedOut` → `status = opted_out`, siguiente tick.
9. Si `whatsappStatus = unknown` → `checkExists(phone)`; guardar `whatsappStatus` + `checkedAt`.
   Si `false` → recipient `no_whatsapp`, `failedCount++`, `nextAllowedAt = now + 3–8 s`, salir.
10. `text = renderTemplate(campaign.messageTemplate, contact)`; `sendText(chatId, text)`.
    - OK → recipient `sent`, `wahaMessageId`, `sentAt`; contact `lastMessagedAt`; campaign `sentCount++`;
      counter `count++` (upsert); `nextAllowedAt = now + random(minDelaySec, maxDelaySec)` s.
    - Error → si `attempts < 3`: volver a `pending` y `nextAllowedAt = now + 60 s · attempts`; si no:
      `failed` con `error`, `failedCount++`. Si el error es de conexión a WAHA (no HTTP 4xx) tres veces
      seguidas → pausar campaña (`pausedReason = "waha_error"`, `lastError`).

`getSchedulerState()` (para el detalle): `{ nextSendAt, reason: 'waiting'|'out_of_window'|'daily_cap'|'session_down'|'veda'|'idle' }`,
guardado en `globalThis` por el propio scheduler.

Apagado: el bucle no bloquea el shutdown; un envío en vuelo termina (timeout 15 s) y el estado queda en BD.
Si el proceso muere entre `claim` y respuesta de WAHA, el destinatario queda en `sent` sin `wahaMessageId`;
al arrancar, `startScheduler()` corrige: `sent` sin `wahaMessageId` y `sentAt` null → `pending`.

---

## 7. Webhook — `src/app/api/waha/webhook/route.ts`

- Público (añadir `/api/waha/` a los prefijos públicos de `src/proxy.ts`).
- Verificación: leer `rawBody = await req.text()`, calcular `HMAC-SHA512(WAHA_WEBHOOK_SECRET, rawBody)`
  hex con `node:crypto` y comparar (`timingSafeEqual`) con `X-Webhook-Hmac`. Sin header o no coincide → 401.
  Responder siempre `200 {ok:true}` tras procesar (WAHA reintenta en caso contrario).
- Idempotencia: ignorar duplicados por `id` del evento (cache en memoria de los últimos 1000 ids).
- Eventos (`event`):
  - `message.ack` → `payload.id` → `CampaignRecipient.wahaMessageId`; `ack`: `2 (DEVICE)` → `delivered` + `deliveredAt`;
    `3/4 (READ/PLAYED)` → `read` + `readAt`; `-1 (ERROR)` → `failed` (`error = "ack error"`), `failedCount++`, `sentCount--`.
    Nunca retrocede (`read` no vuelve a `delivered`).
  - `message` con `payload.fromMe = false`: buscar `Contact` por `phone` (`payload.from` `51…@c.us` → `+51…`;
    si viene `@lid`, usar `payload._data?.key?.senderPn` o ignorar). Si `isOptOutText(payload.body)` → contacto
    `optedOut = true`, `optedOutAt`, `optedOutReason = "reply:<texto>"`; sus `CampaignRecipient` `pending` → `opted_out`;
    responder una sola vez con `sendText(from, "Listo, no recibirás más mensajes de la campaña. Gracias.")`.
    Cualquier otro texto se ignora (v1 sin bandeja de entrada).
  - `session.status` → si `payload.status !== "WORKING"` → campañas `running` → `paused` (`session_down`).
    Si vuelve a `WORKING` no se reanuda solo (decisión humana desde el detalle).

---

## 8. Sidebar, iconos, búsqueda global

- `src/components/admin/data.ts`: `{ id: "mensajes", label: "Mensajería", icon: "message", expandable: true,
  children: [ { id: "campanas", label: "Campañas", href: "/mensajes/campanas" }, { id: "contactos", label: "Contactos",
  href: "/mensajes/contactos" }, { id: "conexion", label: "Conexión", href: "/mensajes/conexion" } ] }`.
- `src/components/admin/Icon.tsx`: nuevo `"message"` (burbuja de chat, trazo 1.75 como los existentes).
- `src/app/api/admin/search/route.ts`: si `me.permissions.has("mensajes.read")`, buscar contactos por DNI/nombre
  (máx. 5) → `/mensajes/contactos?q=`.

---

## 9. Dependencias nuevas

- `read-excel-file` (^9.3, MIT, SAX, activo; entrypoints `/web-worker` y `/node`). Solo se usa en cliente.
- Sin librerías de WhatsApp en el repo: toda la integración es HTTP contra WAHA.

---

## 10. Riesgos aceptados y decisiones de privacidad

- **Baneo del número** por Meta al usar cliente no oficial (ver contexto). Se documenta en la pantalla de Conexión.
- **Base de contactos con teléfono = dato personal**: solo visible con `mensajes.read`; exportación CSV solo
  del resultado de campaña (DNI/nombre/celular/estado) para usuarios con permiso.
- `check-exists` masivo puede contar como señal de spam: por eso se hace **uno por envío**, justo antes
  de enviar, nunca en lote al importar.
- Veda fija por `ELECTION_DATE`; si cambia la fecha, se cambia el `.env`.
- Un solo proceso Next por VPS: el scheduler asume **una instancia** (`next start` sin cluster). Si en el
  futuro hay varias réplicas, el `FOR UPDATE SKIP LOCKED` evita envíos duplicados pero el contador diario
  en memoria de `nextAllowedAt` no se comparte; queda anotado.

## Alcance excluido (YAGNI)

Telegram, SMS, Cloud API oficial, varios números/sesiones en paralelo, mensajes con imagen o adjuntos,
programación por fecha/hora de inicio, segmentación por etiquetas libres, bandeja de respuestas,
plantillas guardadas, A/B, importación CSV (solo `.xlsx`), paginación server-side, tests automatizados.

## Verificación (convención del repo — sin tests automatizados)

1. `npx prisma validate` · `npx prisma db push` · `npx prisma generate` · `npx tsx prisma/seed.ts` ·
   `npm run build` · `npx eslint .` sin errores.
2. `docker compose -f docker-compose.waha.yml up -d`; `/mensajes/conexion` muestra "Escanea el QR";
   escanear con el celular de campaña → "Conectado como +51…".
3. Importar un `.xlsx` de 6 filas: 1 DNI repetido, 1 DNI de 7 dígitos (se completa con 0), 1 teléfono
   inválido, 1 teléfono con `+51 ` y espacios → resultado "4 nuevos · 0 actualizados · 1 inválido · 1 repetido".
   Reimportar el mismo archivo → "0 nuevos · 4 actualizados".
4. Dar de baja un contacto manualmente; crear campaña `all` → no aparece en destinatarios.
5. Campaña a 3 números propios, `dailyCap = 3`, pausas 10–15 s, ventana actual: Iniciar → en ≤ 1 min los
   3 pasan a `sent` → `delivered` → `read` al abrirlos; "Hoy: 3/3"; la campaña pasa a `finished`.
6. Responder "BAJA" desde uno de los números → contacto con baja, respuesta automática recibida.
7. Cerrar sesión de WhatsApp con una campaña `running` → pasa a `paused` (`session_down`); reconectar y
   Reanudar → continúa.
8. Poner `ELECTION_DATE` = mañana → Iniciar campaña → queda `paused` con motivo "veda".
9. Usuario `viewer`: ve todo, sin botones de importar/crear/iniciar/baja; actions devuelven error de permiso.
10. Móvil 375 px y escritorio 1440 px: tablas con scroll horizontal, modal de importación usable.

## Archivos afectados (resumen)

**Nuevos**
- `docker-compose.waha.yml`
- `src/instrumentation.ts`
- `src/lib/text.ts` (`toTitleCase`, extraído de `api/dni`)
- `src/lib/messaging/normalize.ts`, `src/lib/messaging/waha.ts`, `src/lib/messaging/scheduler.ts`, `src/lib/messaging/lima-time.ts`
- `src/app/api/waha/webhook/route.ts`
- `src/app/(admin)/mensajes/layout.tsx`, `page.tsx`, `mensajes.css`, `types.ts`
- `src/app/(admin)/mensajes/conexion/{page.tsx, ConexionClient.tsx, actions.ts}`
- `src/app/(admin)/mensajes/contactos/{page.tsx, ContactosClient.tsx, ImportModal.tsx, actions.ts}`
- `src/app/(admin)/mensajes/campanas/{page.tsx, CampanasClient.tsx, NewCampaignModal.tsx, actions.ts}`
- `src/app/(admin)/mensajes/campanas/[id]/{page.tsx, CampaignDetailClient.tsx}`

**Modificados**
- `prisma/schema.prisma` (4 modelos + 5 enums + relaciones en `User`)
- `src/lib/auth/permissions.ts` (2 permisos, `ROLE_DEFS`)
- `src/app/(admin)/roles/category-icons.ts`
- `src/components/admin/data.ts`, `src/components/admin/Icon.tsx`
- `src/app/api/admin/search/route.ts`
- `src/app/api/dni/[dni]/route.ts` (usa `toTitleCase` de `src/lib/text.ts`)
- `src/proxy.ts` (`/api/waha/` público)
- `package.json` (`read-excel-file`)
- `.env` (variables de la sección 1.2; el repo no tiene `.env.example`, se crea uno con valores de ejemplo)
