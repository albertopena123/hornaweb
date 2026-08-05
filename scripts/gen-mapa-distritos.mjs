// Genera src/components/landing/data/madre-de-dios-distritos.ts a partir del
// GeoJSON distrital público del Perú. Se corre UNA vez (o al cambiar la fuente):
//   node scripts/gen-mapa-distritos.mjs
import { writeFileSync, mkdirSync } from "node:fs"

const SOURCE =
  "https://raw.githubusercontent.com/juaneladio/peru-geojson/master/peru_distrital_simple.geojson"

const WIDTH = 800

// NOMBDIST del GeoJSON → id del enum District
function toId(nombdist) {
  return nombdist
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tildes y diéresis; la Ñ queda como N
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
mkdirSync("src/components/landing/data", { recursive: true })
writeFileSync("src/components/landing/data/madre-de-dios-distritos.ts", out)
console.log(`OK → src/components/landing/data/madre-de-dios-distritos.ts (${WIDTH}x${HEIGHT})`)
