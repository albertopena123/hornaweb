# Mapa de apoyos por distrito — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mapa coroplético público de apoyos por distrito de Madre de Dios, con registro público moderado y CRUD en el admin.

**Architecture:** Modelo `Supporter` en Postgres/Prisma. Dos API routes públicas (`POST /api/apoyos`, `GET /api/apoyos/mapa`) reutilizando los helpers de `api/v1/_lib`. Sección nueva del landing con SVG coroplético generado una vez desde GeoJSON público (script en `scripts/`). Módulo admin `/simpatizantes` calcado del patrón de `/usuarios` (server component + server actions + client component).

**Tech Stack:** Next 16.2.6, React 19, Prisma 7.8 (cliente generado en `@/generated/prisma/client`, `npx prisma db push`, sin migrations), CSS propio del admin, plantilla legacy en el landing.

## Global Constraints

- Prisma se importa SIEMPRE de `@/lib/prisma` (singleton) y los tipos de `@/generated/prisma/client` — nunca de `@prisma/client`.
- Schema se aplica con `npx prisma db push` + `npx prisma generate`; el seed se corre con `npx tsx prisma/seed.ts`.
- No hay test-runner: la verificación es `npm run build` + navegador (Playwright MCP con scroll de rueda — el landing usa GSAP ScrollSmoother y el scroll programático no dispara AOS) + `Invoke-RestMethod` para APIs.
- Copys en español. El mapa público JAMÁS devuelve nombres/teléfonos, solo conteos.
- Permisos por convención de la casa: `supporters.read`, `supporters.write`, categoría `"Simpatizantes"`.
- Rampa secuencial validada (dataviz, luminosidad monótona sobre fondo oscuro): cero=`#33404e`, pasos=`['#5a1e22','#8c2126','#b62a2c','#dd3a35','#ff6b5a']`; el mapa lleva leyenda + tooltip + lista de conteos (relief de contraste para los pasos bajos).
- PowerShell 5.1: los mensajes de commit no llevan comillas dobles (rompen el paso de argumentos a git).

---

### Task 1: Modelo `Supporter`, permisos RBAC y seed

**Files:**
- Modify: `prisma/schema.prisma` (modelo User: añadir relaciones; final del archivo: enums + modelo)
- Modify: `src/lib/auth/permissions.ts` (PERMISSIONS y ROLE_DEFS)
- Modify: `src/app/(admin)/roles/category-icons.ts` (ícono de la categoría)

**Interfaces:**
- Produces: modelo Prisma `Supporter` con enums `District`, `SupporterStatus`, `SupporterSource`; permisos `supporters.read` / `supporters.write` sembrados.

- [ ] **Step 1: Enums y modelo en `prisma/schema.prisma`**

Al final del archivo añadir:

```prisma
// ─────────────────────────── Simpatizantes (mapa de apoyos) ───────────────────────────

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
  notes        String?
  ip           String?
  createdById  String?
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

En el modelo `User`, junto a las relaciones de incidentes, añadir:

```prisma
  createdSupporters  Supporter[] @relation("SupporterCreator")
  reviewedSupporters Supporter[] @relation("SupporterReviewer")
```

- [ ] **Step 2: Permisos en `src/lib/auth/permissions.ts`**

Añadir al array `PERMISSIONS` (mismo formato que los existentes):

```ts
  {
    key: "supporters.read",
    name: "Ver simpatizantes",
    description: "Ver el listado de simpatizantes y sus estados",
    category: "Simpatizantes",
  },
  {
    key: "supporters.write",
    name: "Gestionar simpatizantes",
    description: "Registrar, editar, aprobar/rechazar y eliminar simpatizantes",
    category: "Simpatizantes",
  },
```

En `ROLE_DEFS`: `superadmin` ya toma todos los permisos (verificar cómo se construye; si lista keys explícitas, añadir ambas). A `admin` añadir ambas keys; a `editor` y `viewer` añadir `"supporters.read"`.

- [ ] **Step 3: Ícono de categoría en `src/app/(admin)/roles/category-icons.ts`**

Añadir el mapeo `"Simpatizantes": "users"` (el fallback es `"folder"`; `"users"` ya existe en `IconName`).

- [ ] **Step 4: Aplicar schema y seed**

```powershell
npx prisma db push
npx prisma generate
npx tsx prisma/seed.ts
```

Esperado: `db push` termina sin error, seed reporta permisos upserted.

- [ ] **Step 5: Verificar build y commit**

```powershell
npm run build
git add prisma/schema.prisma src/lib/auth/permissions.ts "src/app/(admin)/roles/category-icons.ts"
git commit -m "feat(simpatizantes): modelo Supporter y permisos RBAC"
```

---

### Task 2: Distritos compartidos y SVG del mapa (script generador)

**Files:**
- Create: `src/lib/districts.ts`
- Create: `scripts/gen-mapa-distritos.mjs`
- Create (generado): `src/components/landing/data/madre-de-dios-distritos.ts`

**Interfaces:**
- Produces: `DISTRICTS`, `DistrictId`, `DISTRICT_IDS`, `districtLabel(id)` en `@/lib/districts`; `MAP_VIEWBOX: string` y `DISTRICT_PATHS: { id: DistrictId; d: string }[]` en `@/components/landing/data/madre-de-dios-distritos`.

- [ ] **Step 1: Crear `src/lib/districts.ts`**

```ts
// Los 11 distritos de Madre de Dios. El id coincide con el enum District de Prisma.
export const DISTRICTS = [
  { id: "tambopata", label: "Tambopata", province: "Tambopata" },
  { id: "inambari", label: "Inambari", province: "Tambopata" },
  { id: "las_piedras", label: "Las Piedras", province: "Tambopata" },
  { id: "laberinto", label: "Laberinto", province: "Tambopata" },
  { id: "manu", label: "Manu", province: "Manu" },
  { id: "fitzcarrald", label: "Fitzcarrald", province: "Manu" },
  { id: "madre_de_dios", label: "Madre de Dios", province: "Manu" },
  { id: "huepetuhe", label: "Huepetuhe", province: "Manu" },
  { id: "inapari", label: "Iñapari", province: "Tahuamanu" },
  { id: "iberia", label: "Iberia", province: "Tahuamanu" },
  { id: "tahuamanu", label: "Tahuamanu", province: "Tahuamanu" },
] as const

export type DistrictId = (typeof DISTRICTS)[number]["id"]

export const DISTRICT_IDS: DistrictId[] = DISTRICTS.map((d) => d.id)

export function districtLabel(id: DistrictId): string {
  return DISTRICTS.find((d) => d.id === id)?.label ?? id
}

export function isDistrictId(v: unknown): v is DistrictId {
  return typeof v === "string" && (DISTRICT_IDS as string[]).includes(v)
}
```

- [ ] **Step 2: Crear `scripts/gen-mapa-distritos.mjs`**

```js
// Genera src/components/landing/data/madre-de-dios-distritos.ts a partir del
// GeoJSON distrital público del Perú. Se corre UNA vez (o al cambiar la fuente):
//   node scripts/gen-mapa-distritos.mjs
import { writeFileSync } from "node:fs"

const SOURCE =
  "https://raw.githubusercontent.com/juaneladio/peru-geojson/master/peru_distrital_simple.geojson"

const WIDTH = 800

// NOMBDIST del GeoJSON → id del enum District
function toId(nombdist) {
  return nombdist
    .normalize("NFD")
    .replace(/[̀-̃̈]/g, "") // tildes y diéresis; la Ñ (̃) queda como N
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase()
}

const res = await fetch(SOURCE)
if (!res.ok) throw new Error(`Descarga falló: ${res.status}`)
const geo = await res.json()

const feats = geo.features.filter(
  (f) => (f.properties.NOMBDEP || f.properties.nombdep || "").toUpperCase() === "MADRE DE DIOS",
)
if (feats.length === 0) {
  console.error("Propiedades disponibles:", Object.keys(geo.features[0].properties))
  throw new Error("No se encontraron distritos de MADRE DE DIOS")
}
console.log(`Distritos encontrados: ${feats.length}`)

// Recolectar todos los anillos [lng,lat]
function ringsOf(geom) {
  if (geom.type === "Polygon") return geom.coordinates
  if (geom.type === "MultiPolygon") return geom.coordinates.flat()
  throw new Error(`Geometría no soportada: ${geom.type}`)
}

let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
for (const f of feats)
  for (const ring of ringsOf(f.geometry))
    for (const [lng, lat] of ring) {
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    }

// Proyección equirectangular con corrección cos(latMedia)
const midLat = ((minLat + maxLat) / 2) * (Math.PI / 180)
const kx = Math.cos(midLat)
const spanX = (maxLng - minLng) * kx
const spanY = maxLat - minLat
const scale = WIDTH / spanX
const HEIGHT = Math.round(spanY * scale)

const px = (lng) => ((lng - minLng) * kx * scale).toFixed(1)
const py = (lat) => ((maxLat - lat) * scale).toFixed(1)

const paths = feats.map((f) => {
  const id = toId(f.properties.NOMBDIST || f.properties.nombdist)
  const d = ringsOf(f.geometry)
    .map((ring) => "M" + ring.map(([lng, lat]) => `${px(lng)},${py(lat)}`).join("L") + "Z")
    .join("")
  return { id, d }
})

const ids = paths.map((p) => p.id).sort()
console.log("Ids generados:", ids.join(", "))

const out = `// GENERADO por scripts/gen-mapa-distritos.mjs — no editar a mano.
// Fuente: ${SOURCE}
import type { DistrictId } from "@/lib/districts"

export const MAP_VIEWBOX = "0 0 ${WIDTH} ${HEIGHT}"

export const DISTRICT_PATHS: { id: DistrictId; d: string }[] = ${JSON.stringify(paths, null, 2)}
`
writeFileSync("src/components/landing/data/madre-de-dios-distritos.ts", out)
console.log(`OK → src/components/landing/data/madre-de-dios-distritos.ts (${WIDTH}x${HEIGHT})`)
```

- [ ] **Step 3: Correr el script y validar ids**

```powershell
node scripts/gen-mapa-distritos.mjs
```

Esperado: "Distritos encontrados: 11" y los 11 ids EXACTAMENTE iguales a los de `DISTRICT_IDS` (tambopata, inambari, las_piedras, laberinto, manu, fitzcarrald, madre_de_dios, huepetuhe, inapari, iberia, tahuamanu). Si algún id no coincide (p. ej. acentos raros en la fuente), ajustar `toId` hasta que coincidan — NO cambiar el enum.

- [ ] **Step 4: Verificar tipo y commit**

```powershell
npm run build
git add src/lib/districts.ts scripts/gen-mapa-distritos.mjs src/components/landing/data/madre-de-dios-distritos.ts
git commit -m "feat(simpatizantes): distritos compartidos y SVG del mapa generado desde GeoJSON INEI"
```

---

### Task 3: APIs públicas de apoyos + proxy

**Files:**
- Create: `src/lib/rate-limit.ts`
- Create: `src/app/api/apoyos/route.ts`
- Create: `src/app/api/apoyos/mapa/route.ts`
- Modify: `src/proxy.ts` (prefijo público `/api/apoyos`)

**Interfaces:**
- Consumes: `ok`/`fail` de `@/app/api/v1/_lib/response`; `isDistrictId` de `@/lib/districts`; `prisma` de `@/lib/prisma`.
- Produces: `POST /api/apoyos` (body `{name, district, phone?, website?}` → 200 `{ok:true}` | 400 fieldErrors | 429), `GET /api/apoyos/mapa` → `{ok:true, total, districts: Record<DistrictId, number>}`; `rateLimit(scope, key, max, windowMs)` en `@/lib/rate-limit`.

- [ ] **Step 1: Crear `src/lib/rate-limit.ts`**

```ts
// Rate-limit in-memory por proceso (suficiente para una sola instancia; el
// login usa el mismo enfoque). scope separa contadores por endpoint.
type Bucket = { count: number; resetAt: number }

const scopes = new Map<string, Map<string, Bucket>>()

export function rateLimit(
  scope: string,
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now()
  let buckets = scopes.get(scope)
  if (!buckets) {
    buckets = new Map()
    scopes.set(scope, buckets)
  }
  // GC ocasional de buckets vencidos
  if (buckets.size > 1000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
  }
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSec: 0 }
  }
  if (b.count < max) {
    b.count += 1
    return { allowed: true, retryAfterSec: 0 }
  }
  return { allowed: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) }
}
```

- [ ] **Step 2: Crear `src/app/api/apoyos/route.ts`**

```ts
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { ok, fail } from "@/app/api/v1/_lib/response"
import { isDistrictId } from "@/lib/districts"
import { rateLimit } from "@/lib/rate-limit"

const MAX_PER_IP = 3
const WINDOW_MS = 60 * 60 * 1000 // 1 hora

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return fail("Cuerpo inválido.", 400)
  }

  // Honeypot: los bots llenan "website"; respondemos OK sin guardar nada.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return ok({})
  }

  const fieldErrors: Record<string, string> = {}
  const name = typeof body.name === "string" ? body.name.trim() : ""
  if (name.length < 2 || name.length > 120) {
    fieldErrors.name = "Escribe tu nombre (2 a 120 caracteres)."
  }
  const district = body.district
  if (!isDistrictId(district)) {
    fieldErrors.district = "Elige tu distrito."
  }
  let phone: string | null = null
  if (typeof body.phone === "string" && body.phone.trim() !== "") {
    const p = body.phone.trim()
    if (!/^[0-9+\s-]{6,15}$/.test(p)) {
      fieldErrors.phone = "Teléfono inválido."
    } else {
      phone = p
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    return fail("Revisa los campos marcados.", 400, fieldErrors)
  }

  const ip = clientIp(req)
  const rl = rateLimit("apoyos", ip, MAX_PER_IP, WINDOW_MS)
  if (!rl.allowed) {
    const res = fail("Demasiados registros desde esta conexión. Intenta más tarde.", 429)
    res.headers.set("Retry-After", String(rl.retryAfterSec))
    return res
  }

  try {
    await prisma.supporter.create({
      data: {
        name,
        phone,
        district: district,
        source: "public",
        status: "pending",
        ip,
      },
    })
    return ok({})
  } catch (e) {
    console.error("POST /api/apoyos", e)
    return fail("No se pudo registrar. Intenta de nuevo.", 500)
  }
}
```

- [ ] **Step 3: Crear `src/app/api/apoyos/mapa/route.ts`**

```ts
import { prisma } from "@/lib/prisma"
import { ok, fail } from "@/app/api/v1/_lib/response"
import { DISTRICT_IDS } from "@/lib/districts"

export async function GET() {
  try {
    const rows = await prisma.supporter.groupBy({
      by: ["district"],
      where: { status: "approved" },
      _count: { _all: true },
    })
    const districts: Record<string, number> = {}
    for (const id of DISTRICT_IDS) districts[id] = 0
    let total = 0
    for (const r of rows) {
      districts[r.district] = r._count._all
      total += r._count._all
    }
    const res = ok({ total, districts })
    res.headers.set("Cache-Control", "public, max-age=60")
    return res
  } catch (e) {
    console.error("GET /api/apoyos/mapa", e)
    return fail("Error interno.", 500)
  }
}
```

- [ ] **Step 4: Exponer rutas en `src/proxy.ts`**

Donde se chequean los prefijos públicos (junto a `/api/auth/`), añadir `/api/apoyos` como prefijo público (cubre `/api/apoyos` y `/api/apoyos/mapa`).

- [ ] **Step 5: Probar con el dev server corriendo**

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/apoyos/mapa | ConvertTo-Json -Depth 4
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/apoyos -ContentType "application/json" -Body '{"name":"Prueba Plan","district":"tambopata"}'
```

Esperado: el GET devuelve `ok true, total 0` y los 11 distritos en 0; el POST devuelve `ok true`. Luego verificar en BD que quedó `pending` (o dejarlo para la verificación E2E de Task 6). El honeypot: POST con `"website":"x"` devuelve ok pero NO crea fila.

- [ ] **Step 6: Commit**

```powershell
npm run build
git add src/lib/rate-limit.ts src/app/api/apoyos src/proxy.ts
git commit -m "feat(simpatizantes): API publica de registro y conteos por distrito"
```

---

### Task 4: Sección "Apoyo" del landing (mapa + formulario)

**Files:**
- Create: `src/components/landing/sections/Apoyo.tsx`
- Modify: `src/components/landing/LandingPage.tsx` (entre `<Counter />` y `<Team />`)
- Modify: `src/components/landing/layout/Header.jsx` (ítem "Apoyo")

**Interfaces:**
- Consumes: `MAP_VIEWBOX`, `DISTRICT_PATHS`; `DISTRICTS`, `districtLabel`, `DistrictId`; `GET /api/apoyos/mapa`; `POST /api/apoyos`.

- [ ] **Step 1: Crear `src/components/landing/sections/Apoyo.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { DISTRICTS, districtLabel, type DistrictId } from '@/lib/districts'
import { MAP_VIEWBOX, DISTRICT_PATHS } from '@/components/landing/data/madre-de-dios-distritos'

// Rampa secuencial validada (dataviz): luminosidad monótona sobre fondo oscuro.
const ZERO_FILL = '#33404e'
const RAMP = ['#5a1e22', '#8c2126', '#b62a2c', '#dd3a35', '#ff6b5a']

function fillFor(count: number, max: number): string {
  if (count <= 0 || max <= 0) return ZERO_FILL
  const idx = Math.min(RAMP.length - 1, Math.floor((count / max) * RAMP.length))
  return RAMP[idx]
}

type Counts = Record<DistrictId, number>

const Apoyo = () => {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [total, setTotal] = useState(0)
  const [hover, setHover] = useState<{ id: DistrictId; x: number; y: number } | null>(null)

  // Formulario
  const [name, setName] = useState('')
  const [district, setDistrict] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/apoyos/mapa')
      .then((r) => r.json())
      .then((j) => {
        if (j && j.ok) {
          setCounts(j.districts)
          setTotal(j.total)
        }
      })
      .catch(() => {})
  }, [])

  const max = useMemo(
    () => (counts ? Math.max(0, ...Object.values(counts)) : 0),
    [counts],
  )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (sending) return
    setSending(true)
    setError(null)
    setFieldErrors({})
    try {
      const res = await fetch('/api/apoyos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, district, phone: phone || undefined, website }),
      })
      const j = await res.json().catch(() => null)
      if (res.ok && j && j.ok) {
        setDone(true)
      } else if (j && j.fieldErrors) {
        setFieldErrors(j.fieldErrors)
        setError(j.error ?? 'Revisa los campos.')
      } else {
        setError((j && j.error) || 'No se pudo registrar. Intenta más tarde.')
      }
    } catch {
      setError('Sin conexión. Intenta de nuevo.')
    } finally {
      setSending(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: '10px',
    color: '#fff',
    padding: '12px 14px',
    fontSize: '15px',
  }
  const labelStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.75)',
    fontSize: '13px',
    marginBottom: '6px',
    display: 'block',
  }
  const errStyle: React.CSSProperties = { color: '#ffb0a6', fontSize: '13px', marginTop: '4px' }

  return (
    <section id="apoyo" className="py-120 position-relative z-1" style={{background: 'linear-gradient(135deg, #0D1B2A 0%, #1a2a3a 100%)'}}>
      <div className="container">
        <div className="row justify-content-center tw-mb-10">
          <div className="col-xl-8">
            <div className="text-center" data-aos="fade-up" data-aos-duration="800">
              <div className="section-subtitle text-center bg-main-600 tw-py-2 tw-px-6 tw-mb-4 d-inline-flex align-items-center tw-gap-3 text-white font-body fw-semibold text-uppercase tw-rounded-3xl">
                <span className="tw-w-205 tw-h-205 lh-1 d-inline-block bg-white rounded-circle position-relative z-1"></span>
                El apoyo crece
                <span className="tw-w-205 tw-h-205 lh-1 d-inline-block bg-white rounded-circle position-relative z-1"></span>
              </div>
              <h2 className="section-title tw-text-170 fw-normal text-white">
                Madre de Dios se suma distrito por distrito
              </h2>
            </div>
          </div>
        </div>

        <div className="row align-items-start" data-aos="fade-up" data-aos-duration="800" data-aos-delay="150">
          {/* Mapa */}
          <div className="col-lg-7 tw-mb-8">
            <div
              style={{position: 'relative', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '20px'}}
              onMouseLeave={() => setHover(null)}
            >
              <svg viewBox={MAP_VIEWBOX} style={{width: '100%', height: 'auto', display: 'block'}} role="img" aria-label="Mapa de apoyos por distrito de Madre de Dios">
                {DISTRICT_PATHS.map((p) => {
                  const c = counts ? counts[p.id] ?? 0 : 0
                  return (
                    <path
                      key={p.id}
                      d={p.d}
                      fill={fillFor(c, max)}
                      stroke="rgba(255,255,255,0.35)"
                      strokeWidth="1.5"
                      style={{cursor: 'pointer', transition: 'fill 0.3s ease'}}
                      onMouseMove={(e) => {
                        const box = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement).getBoundingClientRect()
                        setHover({ id: p.id, x: e.clientX - box.left, y: e.clientY - box.top })
                      }}
                      onClick={(e) => {
                        const box = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement).getBoundingClientRect()
                        setHover({ id: p.id, x: e.clientX - box.left, y: e.clientY - box.top })
                      }}
                    />
                  )
                })}
              </svg>

              {hover && (
                <div style={{
                  position: 'absolute',
                  left: Math.min(hover.x + 12, 560),
                  top: hover.y - 40,
                  background: '#0D1B2A',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  color: '#fff',
                  fontSize: '13px',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  zIndex: 5,
                }}>
                  <strong>{districtLabel(hover.id)}</strong> — {counts ? (counts[hover.id] ?? 0) : 0} apoyos
                </div>
              )}

              {/* Leyenda */}
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', flexWrap: 'wrap'}}>
                <span style={{color: 'rgba(255,255,255,0.6)', fontSize: '12px'}}>0</span>
                <span style={{width: '18px', height: '12px', background: ZERO_FILL, borderRadius: '3px', display: 'inline-block'}}></span>
                <span style={{color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginLeft: '10px'}}>menos</span>
                {RAMP.map((c) => (
                  <span key={c} style={{width: '18px', height: '12px', background: c, borderRadius: '3px', display: 'inline-block'}}></span>
                ))}
                <span style={{color: 'rgba(255,255,255,0.6)', fontSize: '12px'}}>más</span>
              </div>

              {/* Lista accesible de conteos */}
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '4px 16px', marginTop: '14px'}}>
                {DISTRICTS.map((d) => (
                  <div key={d.id} style={{display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.75)', fontSize: '13px'}}>
                    <span>{d.label}</span>
                    <strong style={{color: '#fff'}}>{counts ? counts[d.id] ?? 0 : '—'}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Total + formulario */}
          <div className="col-lg-5">
            <div style={{background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px'}}>
              <div style={{textAlign: 'center', marginBottom: '20px'}}>
                <div style={{fontSize: 'clamp(2.4rem, 4vw, 3.4rem)', fontWeight: 800, color: '#ff6b5a', lineHeight: 1}}>
                  {total.toLocaleString('es-PE')}
                </div>
                <div style={{color: 'rgba(255,255,255,0.8)', fontSize: '15px', marginTop: '6px'}}>
                  madrediosenses ya se sumaron
                </div>
              </div>

              {done ? (
                <div style={{textAlign: 'center', padding: '24px 8px', color: '#fff'}}>
                  <div style={{fontSize: '40px', marginBottom: '8px'}}>🎉</div>
                  <p style={{margin: 0, fontSize: '17px', fontWeight: 700}}>¡Gracias por sumarte!</p>
                  <p style={{margin: '6px 0 0', color: 'rgba(255,255,255,0.75)', fontSize: '14px'}}>
                    Tu apoyo será verificado y pronto aparecerá en el mapa.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <div style={{marginBottom: '14px'}}>
                    <label style={labelStyle} htmlFor="apoyo-nombre">Tu nombre</label>
                    <input id="apoyo-nombre" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
                    {fieldErrors.name && <div style={errStyle}>{fieldErrors.name}</div>}
                  </div>
                  <div style={{marginBottom: '14px'}}>
                    <label style={labelStyle} htmlFor="apoyo-distrito">Tu distrito</label>
                    <select id="apoyo-distrito" style={{...inputStyle, appearance: 'auto'}} value={district} onChange={(e) => setDistrict(e.target.value)} required>
                      <option value="" disabled>Elige tu distrito…</option>
                      {DISTRICTS.map((d) => (
                        <option key={d.id} value={d.id} style={{color: '#111'}}>{d.label} ({d.province})</option>
                      ))}
                    </select>
                    {fieldErrors.district && <div style={errStyle}>{fieldErrors.district}</div>}
                  </div>
                  <div style={{marginBottom: '18px'}}>
                    <label style={labelStyle} htmlFor="apoyo-telefono">Teléfono (opcional)</label>
                    <input id="apoyo-telefono" style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={15} />
                    {fieldErrors.phone && <div style={errStyle}>{fieldErrors.phone}</div>}
                  </div>
                  {/* Honeypot invisible */}
                  <div style={{position: 'absolute', left: '-9999px', top: 'auto'}} aria-hidden="true">
                    <label htmlFor="apoyo-web">No llenar</label>
                    <input id="apoyo-web" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>

                  {error && (
                    <div style={{background: 'rgba(233,3,5,0.15)', border: '1px solid rgba(233,3,5,0.5)', borderRadius: '8px', padding: '10px 12px', color: '#ffb0a6', fontSize: '14px', marginBottom: '14px'}}>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="tw-hover-btn text-white fw-bold tw-py-4 d-inline-block w-100"
                    style={{background: 'var(--an-red)', borderRadius: '8px', border: 'none', cursor: sending ? 'wait' : 'pointer', boxShadow: '0 6px 20px rgba(233, 3, 5, 0.4)', opacity: sending ? 0.7 : 1}}
                  >
                    {sending ? 'Enviando…' : 'Sumar mi apoyo'}
                  </button>
                  <p style={{color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '10px', marginBottom: 0, textAlign: 'center'}}>
                    Solo usamos tus datos para la campaña. No se publican nombres.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Apoyo
```

- [ ] **Step 2: Componer en `LandingPage.tsx`**

Añadir `import Apoyo from "./sections/Apoyo";` y renderizar `<Apoyo />` entre `<Counter />` y `<Team />`.

- [ ] **Step 3: Ítem del menú en `Header.jsx`**

En `navItems`, insertar después de Propuestas: `{ label: 'Apoyo', href: '#apoyo' },` (queda de 8 ítems).

- [ ] **Step 4: Verificar en navegador (scroll de rueda, no programático)**

Con Playwright MCP a 1440px: bajar con `page.mouse.wheel` hasta `#apoyo`; verificar que el mapa pinta 11 paths, tooltip al pasar el mouse, lista con 11 distritos, total visible; enviar el formulario con nombre "Prueba Landing" y distrito Tambopata → mensaje de gracias. A 375px: mapa arriba, formulario abajo, sin overflow horizontal. Consola sin errores nuevos.

- [ ] **Step 5: Commit**

```powershell
npm run build
git add src/components/landing/sections/Apoyo.tsx src/components/landing/LandingPage.tsx src/components/landing/layout/Header.jsx
git commit -m "feat(landing): seccion Apoyo con mapa coropletico y formulario Sumate"
```

---

### Task 5: Módulo admin /simpatizantes

**Files:**
- Modify: `src/components/admin/Icon.tsx` (ícono `heart`)
- Modify: `src/components/admin/data.ts` (ítem sidebar)
- Create: `src/app/(admin)/simpatizantes/types.ts`
- Create: `src/app/(admin)/simpatizantes/actions.ts`
- Create: `src/app/(admin)/simpatizantes/page.tsx`
- Create: `src/app/(admin)/simpatizantes/SupportersClient.tsx`
- Create: `src/app/(admin)/simpatizantes/simpatizantes.css`

**Interfaces:**
- Consumes: `requirePermission`, `getCurrentUser` de `@/lib/auth/server`; `prisma`; `DISTRICTS`, `districtLabel`, `isDistrictId`; componentes `Icon`, `ConfirmDialog`, `Toasts`, `useEscClose` existentes.
- Produces: acciones `createSupporter`, `updateSupporter`, `setSupporterStatus`, `deleteSupporter` (todas `ActionResult`); página `/simpatizantes`.

- [ ] **Step 1: Ícono `heart` en `src/components/admin/Icon.tsx`**

Añadir `"heart"` a la unión `IconName` y su SVG al mapa de íconos (mismo formato que los existentes, stroke actual):

```tsx
heart: (
  <path d="M12 20.5s-7-4.6-9.4-9C1 8.5 2.6 5.5 5.7 5.5c2 0 3.3 1.1 4.3 2.6 1-1.5 2.3-2.6 4.3-2.6 3.1 0 4.7 3 3.1 6-2.4 4.4-9.4 9-9.4 9z" />
),
```

- [ ] **Step 2: Sidebar en `src/components/admin/data.ts`**

Añadir a `SIDEBAR_NAV` (después de incidentes):

```ts
  { id: "simpatizantes", label: "Simpatizantes", icon: "heart", href: "/simpatizantes" },
```

- [ ] **Step 3: Crear `src/app/(admin)/simpatizantes/types.ts`**

```ts
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> }

export type SupporterRow = {
  id: string
  name: string
  phone: string | null
  district: string
  source: "admin" | "public"
  status: "pending" | "approved" | "rejected"
  notes: string | null
  createdAt: string // ISO
  createdByName: string | null
  reviewedByName: string | null
}

export type SupporterInput = {
  name: string
  district: string
  phone?: string
  notes?: string
}

export type PermFlags = { canRead: boolean; canWrite: boolean }
```

- [ ] **Step 4: Crear `src/app/(admin)/simpatizantes/actions.ts`**

```ts
"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getCurrentUser, type CurrentUser } from "@/lib/auth/server"
import { isDistrictId } from "@/lib/districts"
import type { ActionResult, SupporterInput } from "./types"

class Denied extends Error {}

async function authorize(perm: "supporters.read" | "supporters.write"): Promise<CurrentUser> {
  const me = await getCurrentUser()
  if (!me || !me.permissions.has(perm)) throw new Denied()
  return me
}

function fail(error: string, fieldErrors?: Partial<Record<string, string>>): ActionResult<never> {
  return { ok: false, error, fieldErrors }
}

function refresh() {
  revalidatePath("/simpatizantes")
}

function validate(input: SupporterInput): {
  data?: { name: string; district: string; phone: string | null; notes: string | null }
  fieldErrors?: Record<string, string>
} {
  const fieldErrors: Record<string, string> = {}
  const name = (input.name ?? "").trim()
  if (name.length < 2 || name.length > 120) fieldErrors.name = "Nombre de 2 a 120 caracteres."
  if (!isDistrictId(input.district)) fieldErrors.district = "Distrito inválido."
  let phone: string | null = null
  if (input.phone && input.phone.trim() !== "") {
    const p = input.phone.trim()
    if (!/^[0-9+\s-]{6,15}$/.test(p)) fieldErrors.phone = "Teléfono inválido."
    else phone = p
  }
  const notes = input.notes && input.notes.trim() !== "" ? input.notes.trim().slice(0, 500) : null
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors }
  return { data: { name, district: input.district, phone, notes } }
}

export async function createSupporter(input: SupporterInput): Promise<ActionResult<{ id: string }>> {
  try {
    const me = await authorize("supporters.write")
    const v = validate(input)
    if (!v.data) return fail("Revisa los campos marcados.", v.fieldErrors)
    const s = await prisma.supporter.create({
      data: {
        name: v.data.name,
        district: v.data.district as never,
        phone: v.data.phone,
        notes: v.data.notes,
        source: "admin",
        status: "approved",
        createdById: me.id,
        reviewedById: me.id,
        reviewedAt: new Date(),
      },
    })
    refresh()
    return { ok: true, data: { id: s.id } }
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar simpatizantes.")
    console.error("createSupporter", e)
    return fail("Error inesperado al registrar.")
  }
}

export async function updateSupporter(id: string, input: SupporterInput): Promise<ActionResult> {
  try {
    await authorize("supporters.write")
    const v = validate(input)
    if (!v.data) return fail("Revisa los campos marcados.", v.fieldErrors)
    await prisma.supporter.update({
      where: { id },
      data: {
        name: v.data.name,
        district: v.data.district as never,
        phone: v.data.phone,
        notes: v.data.notes,
      },
    })
    refresh()
    return { ok: true }
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar simpatizantes.")
    console.error("updateSupporter", e)
    return fail("Error inesperado al guardar.")
  }
}

export async function setSupporterStatus(
  id: string,
  status: "approved" | "rejected",
): Promise<ActionResult> {
  try {
    const me = await authorize("supporters.write")
    await prisma.supporter.update({
      where: { id },
      data: { status, reviewedById: me.id, reviewedAt: new Date() },
    })
    refresh()
    return { ok: true }
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar simpatizantes.")
    console.error("setSupporterStatus", e)
    return fail("Error inesperado al cambiar el estado.")
  }
}

export async function deleteSupporter(id: string): Promise<ActionResult> {
  try {
    await authorize("supporters.write")
    await prisma.supporter.delete({ where: { id } })
    refresh()
    return { ok: true }
  } catch (e) {
    if (e instanceof Denied) return fail("No tienes permiso para gestionar simpatizantes.")
    console.error("deleteSupporter", e)
    return fail("Error inesperado al eliminar.")
  }
}
```

Nota: `district: v.data.district as never` evita fricción entre el union de `DistrictId` y el enum generado; si el enum coincide 1:1 (debería), puede tiparse sin cast — probar primero sin cast y dejarlo solo si TS reclama.

- [ ] **Step 5: Crear `src/app/(admin)/simpatizantes/page.tsx`**

```tsx
import type { Metadata } from "next"
import { requirePermission } from "@/lib/auth/server"
import { prisma } from "@/lib/prisma"
import SupportersClient from "./SupportersClient"
import type { SupporterRow, PermFlags } from "./types"

export const metadata: Metadata = { title: "Simpatizantes · Admin" }
export const dynamic = "force-dynamic"

export default async function SimpatizantesPage() {
  const me = await requirePermission("supporters.read")

  const supporters = await prisma.supporter.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
    },
  })

  const rows: SupporterRow[] = supporters.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    district: s.district,
    source: s.source,
    status: s.status,
    notes: s.notes,
    createdAt: s.createdAt.toISOString(),
    createdByName: s.createdBy?.name ?? null,
    reviewedByName: s.reviewedBy?.name ?? null,
  }))

  const perms: PermFlags = {
    canRead: me.permissions.has("supporters.read"),
    canWrite: me.permissions.has("supporters.write"),
  }

  return <SupportersClient rows={rows} perms={perms} />
}
```

- [ ] **Step 6: Crear `src/app/(admin)/simpatizantes/SupportersClient.tsx`**

```tsx
"use client"

import { useMemo, useState, useTransition } from "react"
import "./simpatizantes.css"
import Icon from "@/components/admin/Icon"
import ConfirmDialog from "../usuarios/ConfirmDialog"
import Toasts, { type Toast } from "../usuarios/Toasts"
import { useEscClose } from "@/lib/ui/useEscClose"
import { formatFullDate } from "@/lib/ui/dates"
import { DISTRICTS, districtLabel, type DistrictId } from "@/lib/districts"
import { createSupporter, updateSupporter, setSupporterStatus, deleteSupporter } from "./actions"
import type { SupporterRow, SupporterInput, PermFlags, ActionResult } from "./types"

type Tab = "pending" | "approved" | "rejected"

const STATUS_BADGE: Record<Tab, string> = {
  pending: "badge badge--amber",
  approved: "badge badge--green",
  rejected: "badge badge--red",
}
const STATUS_LABEL: Record<Tab, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
}

export default function SupportersClient({ rows, perms }: { rows: SupporterRow[]; perms: PermFlags }) {
  const [tab, setTab] = useState<Tab>("pending")
  const [q, setQ] = useState("")
  const [district, setDistrict] = useState<string>("")
  const [modal, setModal] = useState<null | { mode: "create" } | { mode: "edit"; row: SupporterRow }>(null)
  const [toDelete, setToDelete] = useState<SupporterRow | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [pending, startTransition] = useTransition()

  function toast(kind: Toast["kind"], message: string) {
    setToasts((t) => [...t, { id: Date.now() + Math.random(), kind, message }])
  }

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { pending: 0, approved: 0, rejected: 0 }
    for (const r of rows) c[r.status] += 1
    return c
  }, [rows])

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase()
    return rows.filter(
      (r) =>
        r.status === tab &&
        (district === "" || r.district === district) &&
        (term === "" || r.name.toLowerCase().includes(term)),
    )
  }, [rows, tab, q, district])

  function run(action: () => Promise<ActionResult<unknown>>, okMsg: string) {
    startTransition(async () => {
      const res = await action()
      if (res.ok) toast("success", okMsg)
      else toast("error", res.error)
    })
  }

  return (
    <div className="supporters">
      <header className="supporters__head">
        <div>
          <h1>Simpatizantes</h1>
          <p className="supporters__sub">Apoyos registrados para el mapa por distrito</p>
        </div>
        {perms.canWrite && (
          <button className="btn btn--primary" onClick={() => setModal({ mode: "create" })}>
            <Icon name="plus" size={16} /> Registrar simpatizante
          </button>
        )}
      </header>

      <div className="supporters__tabs">
        {(["pending", "approved", "rejected"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`supporters__tab ${tab === t ? "is-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {STATUS_LABEL[t]} <span className="supporters__count">{counts[t]}</span>
          </button>
        ))}
      </div>

      <div className="supporters__filters">
        <input
          className="supporters__search"
          placeholder="Buscar por nombre…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="supporters__district" value={district} onChange={(e) => setDistrict(e.target.value)}>
          <option value="">Todos los distritos</option>
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </select>
      </div>

      <div className="supporters__tablewrap">
        <table className="supporters__table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Distrito</th>
              <th>Teléfono</th>
              <th>Origen</th>
              <th>Registrado</th>
              <th>Estado</th>
              {perms.canWrite && <th></th>}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="supporters__empty">Sin registros en esta vista.</td>
              </tr>
            )}
            {visible.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="supporters__name">{r.name}</div>
                  {r.notes && <div className="supporters__notes">{r.notes}</div>}
                </td>
                <td>{districtLabel(r.district as DistrictId)}</td>
                <td>{r.phone ?? "—"}</td>
                <td>
                  <span className="badge badge--neutral">{r.source === "admin" ? "Equipo" : "Web"}</span>
                </td>
                <td title={r.createdByName ?? undefined}>{formatFullDate(new Date(r.createdAt))}</td>
                <td>
                  <span className={STATUS_BADGE[r.status]}>{STATUS_LABEL[r.status]}</span>
                </td>
                {perms.canWrite && (
                  <td className="supporters__actions">
                    {r.status === "pending" && (
                      <>
                        <button
                          className="btn btn--primary btn--sm"
                          disabled={pending}
                          onClick={() => run(() => setSupporterStatus(r.id, "approved"), "Apoyo aprobado.")}
                        >
                          Aprobar
                        </button>
                        <button
                          className="btn btn--ghost btn--sm"
                          disabled={pending}
                          onClick={() => run(() => setSupporterStatus(r.id, "rejected"), "Apoyo rechazado.")}
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                    {r.status === "rejected" && (
                      <button
                        className="btn btn--ghost btn--sm"
                        disabled={pending}
                        onClick={() => run(() => setSupporterStatus(r.id, "approved"), "Apoyo aprobado.")}
                      >
                        Aprobar
                      </button>
                    )}
                    <button className="iconbtn" title="Editar" onClick={() => setModal({ mode: "edit", row: r })}>
                      <Icon name="settings" size={16} />
                    </button>
                    <button className="iconbtn" title="Eliminar" onClick={() => setToDelete(r)}>
                      <Icon name="trash" size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <SupporterModal
          initial={modal.mode === "edit" ? modal.row : null}
          onClose={() => setModal(null)}
          onSubmit={async (input) => {
            const res =
              modal.mode === "edit"
                ? await updateSupporter(modal.row.id, input)
                : await createSupporter(input)
            if (res.ok) {
              toast("success", modal.mode === "edit" ? "Simpatizante actualizado." : "Simpatizante registrado.")
              setModal(null)
            }
            return res
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Eliminar simpatizante"
          description={<>Se eliminará <strong>{toDelete.name}</strong>. Esta acción no se puede deshacer.</>}
          confirmLabel="Eliminar"
          tone="danger"
          busy={pending}
          onConfirm={async () => {
            await deleteSupporter(toDelete.id)
            toast("success", "Simpatizante eliminado.")
            setToDelete(null)
          }}
          onClose={() => setToDelete(null)}
        />
      )}

      <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  )
}

function SupporterModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial: SupporterRow | null
  onClose: () => void
  onSubmit: (input: SupporterInput) => Promise<ActionResult<unknown>>
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [district, setDistrict] = useState(initial?.district ?? "")
  const [phone, setPhone] = useState(initial?.phone ?? "")
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [busy, setBusy] = useState(false)
  const [topError, setTopError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({})
  useEscClose(true, onClose, busy)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setTopError(null)
    setFieldErrors({})
    const res = await onSubmit({ name, district, phone: phone || undefined, notes: notes || undefined })
    if (!res.ok) {
      setTopError(res.error)
      setFieldErrors(res.fieldErrors ?? {})
    }
    setBusy(false)
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <form className="modal" onSubmit={submit}>
        <header className="modal__head">
          <h2>{initial ? "Editar simpatizante" : "Registrar simpatizante"}</h2>
          <button type="button" className="iconbtn" onClick={onClose} disabled={busy}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div className="modal__body">
          {topError && <div className="modal__error">{topError}</div>}
          <label className="field">
            <span>Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
            {fieldErrors.name && <em>{fieldErrors.name}</em>}
          </label>
          <label className="field">
            <span>Distrito</span>
            <select value={district} onChange={(e) => setDistrict(e.target.value)} required>
              <option value="" disabled>Elige…</option>
              {DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>{d.label} ({d.province})</option>
              ))}
            </select>
            {fieldErrors.district && <em>{fieldErrors.district}</em>}
          </label>
          <label className="field">
            <span>Teléfono (opcional)</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={15} />
            {fieldErrors.phone && <em>{fieldErrors.phone}</em>}
          </label>
          <label className="field">
            <span>Notas (solo equipo)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={3} />
          </label>
        </div>
        <footer className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? "Guardando…" : initial ? "Guardar cambios" : "Registrar"}
          </button>
        </footer>
      </form>
    </div>
  )
}
```

Ajustes permitidos al integrar: usar las clases reales de `globals.css`/módulos vecinos si algún nombre (`.field`, `.modal__error`, `btn--sm`) no existe — copiar el patrón de `CreateUserModal.tsx` y `users.css` en vez de inventar clases nuevas.

- [ ] **Step 7: Crear `src/app/(admin)/simpatizantes/simpatizantes.css`**

```css
/* Módulo Simpatizantes — complementa las clases globales del admin */
.supporters { display: flex; flex-direction: column; gap: 16px; }
.supporters__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.supporters__head h1 { margin: 0; font-size: 22px; }
.supporters__sub { margin: 4px 0 0; color: var(--text-muted, #7a8699); font-size: 13px; }
.supporters__tabs { display: flex; gap: 6px; border-bottom: 1px solid var(--border, #e3e8ef); }
.supporters__tab { background: none; border: none; padding: 10px 14px; cursor: pointer; font-weight: 600; color: var(--text-muted, #7a8699); border-bottom: 2px solid transparent; }
.supporters__tab.is-active { color: var(--text, #16232f); border-bottom-color: var(--an-red, #e90305); }
.supporters__count { display: inline-block; min-width: 20px; padding: 1px 6px; border-radius: 999px; background: var(--surface-2, #eef2f6); font-size: 12px; margin-left: 4px; }
.supporters__filters { display: flex; gap: 10px; flex-wrap: wrap; }
.supporters__search { flex: 1 1 220px; max-width: 340px; padding: 9px 12px; border: 1px solid var(--border, #e3e8ef); border-radius: 8px; }
.supporters__district { padding: 9px 12px; border: 1px solid var(--border, #e3e8ef); border-radius: 8px; }
.supporters__tablewrap { overflow-x: auto; }
.supporters__table { width: 100%; border-collapse: collapse; font-size: 14px; }
.supporters__table th { text-align: left; padding: 10px 12px; color: var(--text-muted, #7a8699); font-weight: 600; border-bottom: 1px solid var(--border, #e3e8ef); white-space: nowrap; }
.supporters__table td { padding: 12px; border-bottom: 1px solid var(--border, #e3e8ef); vertical-align: top; }
.supporters__name { font-weight: 600; }
.supporters__notes { color: var(--text-muted, #7a8699); font-size: 12px; margin-top: 2px; }
.supporters__empty { text-align: center; color: var(--text-muted, #7a8699); padding: 28px 0; }
.supporters__actions { display: flex; gap: 6px; align-items: center; white-space: nowrap; }
.btn--sm { padding: 5px 10px; font-size: 13px; }
```

(Si `globals.css` ya define variables/clases equivalentes con otros nombres, usarlas.)

- [ ] **Step 8: Verificar en navegador**

Login en `/login` con el admin del seed (ver `prisma/seed.ts` para email/clave por defecto). En `/simpatizantes`: se ve el registro "Prueba Plan" (del Task 3) en Pendientes; aprobarlo → pasa a Aprobados y `GET /api/apoyos/mapa` muestra `tambopata: 1`. Crear uno manual → nace aprobado. Editar y eliminar funcionan. El ítem "Simpatizantes" aparece en el sidebar y marca activo.

- [ ] **Step 9: Commit**

```powershell
npm run build
git add src/components/admin/Icon.tsx src/components/admin/data.ts "src/app/(admin)/simpatizantes"
git commit -m "feat(admin): modulo simpatizantes con aprobacion y CRUD"
```

---

### Task 6: Seed demo + verificación E2E integral

**Files:**
- Create: `prisma/seed-demo-supporters.ts`

- [ ] **Step 1: Crear `prisma/seed-demo-supporters.ts`**

```ts
// Datos de demo para el mapa (SOLO desarrollo): reparte apoyos aprobados
// entre distritos. Correr con: npx tsx prisma/seed-demo-supporters.ts
import { prisma } from "../src/lib/prisma"

const COUNTS: Record<string, number> = {
  tambopata: 34,
  inambari: 12,
  las_piedras: 9,
  laberinto: 7,
  manu: 5,
  fitzcarrald: 2,
  madre_de_dios: 4,
  huepetuhe: 8,
  inapari: 3,
  iberia: 6,
  tahuamanu: 4,
}

async function main() {
  const existing = await prisma.supporter.count()
  if (existing > 20) {
    console.log(`Ya hay ${existing} simpatizantes; no se siembra de nuevo.`)
    return
  }
  for (const [district, n] of Object.entries(COUNTS)) {
    for (let i = 1; i <= n; i++) {
      await prisma.supporter.create({
        data: {
          name: `Demo ${district} ${i}`,
          district: district as never,
          source: "admin",
          status: "approved",
          notes: "seed demo",
        },
      })
    }
  }
  console.log("Seed demo de simpatizantes listo.")
}

main().finally(() => process.exit(0))
```

- [ ] **Step 2: Correr seed demo y verificar mapa con datos**

```powershell
npx tsx prisma/seed-demo-supporters.ts
Invoke-RestMethod -Uri http://localhost:3000/api/apoyos/mapa | ConvertTo-Json -Depth 4
```

Esperado: total ≈ 94+, tambopata el más alto. En el navegador, el mapa muestra Tambopata en el rojo más intenso y la leyenda/lista coherentes.

- [ ] **Step 3: E2E completo con navegador**

1. Landing 1440px: formulario → registrar "Prueba E2E" en Iberia → mensaje de gracias.
2. El conteo de Iberia NO sube aún (pendiente).
3. Admin: aparece en Pendientes → Aprobar.
4. `GET /api/apoyos/mapa`: iberia +1.
5. Rate-limit: 3 POST seguidos más desde la misma IP → el último responde 429 con Retry-After.
6. Honeypot: POST con website lleno → ok pero el total de pendientes no cambia.
7. Móvil 375px: sección apoyo sin overflow, formulario usable.
8. `/login` y módulos admin existentes intactos.

- [ ] **Step 4: Lint/build final y commit**

```powershell
npm run lint
npm run build
git add prisma/seed-demo-supporters.ts
git commit -m "chore(simpatizantes): seed demo y verificacion e2e del mapa de apoyos"
```
