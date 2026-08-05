# Mapa de apoyos por distrito (simpatizantes)

**Fecha:** 2026-08-04 · **Aprobado por:** Alberto

## Objetivo

Visualizar en el landing público cuántas personas apoyan a Simón Horna en
cada uno de los 11 distritos de Madre de Dios, con un mapa coroplético
(intensidad de rojo por cantidad), alimentado por registros del equipo en el
admin y por un formulario público de "Súmate". La simpatía política es dato
personal sensible: el mapa público muestra **solo conteos agregados por
distrito**, nunca personas.

## Decisiones tomadas

- Registro por dos canales: equipo en el admin (nace aprobado) y formulario
  público en el landing (nace pendiente; un coordinador lo aprueba).
- Campos mínimos: nombre + distrito obligatorios, teléfono opcional. Sin DNI.
- Mapa: SVG propio por distritos (sin Leaflet/Google, sin API keys). Los
  polígonos salen de un GeoJSON público (INEI/peru-geojson) simplificado una
  sola vez y guardado como paths estáticos en el repo.
- Anti-spam del formulario público: límite por IP (3/hora) + honeypot
  invisible. Sin captcha.

## Modelo de datos (Prisma, Postgres)

```prisma
enum SupporterStatus {
  pending
  approved
  rejected
}

enum SupporterSource {
  admin
  public
}

enum District {
  tambopata
  inambari
  las_piedras
  laberinto
  manu
  fitzcarrald
  madre_de_dios
  huepetuhe
  inapari
  iberia
  tahuamanu
}

model Supporter {
  id           String          @id @default(cuid())
  name         String
  phone        String?
  district     District
  source       SupporterSource
  status       SupporterStatus @default(pending)
  notes        String?         // solo visible/editable en admin
  ip           String?         // solo registros public, para rate-limit/auditoría
  createdById  String?         // usuario admin que lo registró (source=admin)
  reviewedById String?
  reviewedAt   DateTime?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  createdBy  User? @relation("SupporterCreator", fields: [createdById], references: [id], onDelete: SetNull)
  reviewedBy User? @relation("SupporterReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)

  @@index([status])
  @@index([district])
  @@index([createdAt])
}
```

Los 11 distritos son geografía fija → enum (no tabla).

## API

- `POST /api/apoyos` (pública): body `{name, district, phone?}` + campo
  honeypot `website` (si viene lleno → 200 silencioso sin guardar). Crea
  Supporter `source=public, status=pending`. Rate-limit: máx. 3 registros por
  IP por hora (HTTP 429 al exceder). Validación: name 2–120 chars, district
  del enum, phone opcional 6–15 dígitos.
- `GET /api/apoyos/mapa` (pública): devuelve
  `{total: number, districts: {[district]: number}}` contando SOLO
  `status=approved`. Cache-Control 60s. Jamás expone nombres/teléfonos.
- Rutas admin: el mismo mecanismo que ya usa la página /usuarios (el plan de
  implementación lo confirma leyendo ese código y lo replica). Operaciones:
  listar con filtros (status, district, búsqueda por nombre),
  crear (nace approved, source=admin), editar, aprobar/rechazar, eliminar.
- `src/proxy.ts`: añadir `/api/apoyos` y `/api/apoyos/mapa` a rutas públicas.

## Permisos RBAC

Nuevos permisos (categoría "Simpatizantes"), siguiendo la convención
existente (`users.read`/`users.write`): `supporters.read` y
`supporters.write` (crear/editar/aprobar/rechazar/eliminar). Se siembran
como los permisos existentes y se asignan a superadmin/admin (write) y
editor/viewer (read).

## Landing: sección "Apoyo" (`id="apoyo"`)

Ubicación: entre Números (Counter) y Equipo. Fondo oscuro consistente con
Propuestas. Dos columnas (móvil: mapa arriba, formulario abajo):

- **Mapa** (`MapaApoyos`): SVG de Madre de Dios con los 11 distritos como
  `<path>` estáticos en `src/components/landing/data/madre-de-dios-distritos.ts`
  (generados una vez desde GeoJSON público con un script de simplificación).
  Escala secuencial de rojos AN sobre fondo oscuro; distrito con 0 apoyos =
  gris neutro. Hover/tap: tooltip "Distrito — N apoyos". Leyenda de escala.
  Los datos vienen de `GET /api/apoyos/mapa` al montar.
- **Panel derecho**: total grande ("N madrediosenses ya se sumaron") y
  formulario Súmate: nombre, selector de distrito, teléfono opcional, botón
  "Sumar mi apoyo". Al enviar OK: "¡Gracias! Tu apoyo será verificado."
  Errores de validación/límite en línea, sin recargar.
- Header del landing: nuevo ítem "Apoyo" → `#apoyo` (queda de 8 ítems).

Para la escala de colores y accesibilidad del mapa se sigue la skill
`dataviz` en implementación.

## Admin: página /simpatizantes

Misma estética y patrones que /usuarios:

- Pestañas: Pendientes / Aprobados / Rechazados (contador en cada una).
- Tabla: nombre, distrito, teléfono, origen (admin/público), fecha,
  registrado por. Búsqueda por nombre y filtro por distrito.
- Acciones por fila: aprobar / rechazar (en pendientes), editar, eliminar —
  visibles según permisos.
- Botón "Registrar simpatizante" (modal con los mismos campos + notas).
- Ítem "Simpatizantes" en el menú lateral (ícono nuevo). El conteo de
  pendientes se muestra en la pestaña Pendientes de la página (el sidebar
  actual solo soporta un punto estático, no contadores dinámicos).

## Riesgos y decisiones de privacidad

- El endpoint público solo agrega; los datos personales viven detrás del
  login del admin con RBAC.
- `ip` se guarda solo para rate-limit/auditoría de registros públicos.
- Si más adelante se quiere heatmap fino (GPS) para uso interno del comando
  de campaña, es otra iteración: este spec cubre solo agregación por distrito.

## Verificación

- Seed de desarrollo con conteos de ejemplo en varios distritos.
- E2E con navegador: registro público → aparece en Pendientes del admin →
  aprobar → `GET /api/apoyos/mapa` sube el conteo y el mapa lo refleja.
- El 4.º registro seguido desde la misma IP recibe el error de límite.
- Responsive 1440px y 375px sin desbordes; tooltip funciona con tap en móvil.
- El honeypot lleno no crea registro.
- `/login` y el resto del admin intactos.
