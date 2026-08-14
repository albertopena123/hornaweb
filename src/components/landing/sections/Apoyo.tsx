import { useEffect, useMemo, useRef, useState } from 'react'
import { DISTRICTS, districtLabel, type DistrictId } from '@/lib/districts'
import { MAP_VIEWBOX, DISTRICT_PATHS } from '@/components/landing/data/madre-de-dios-distritos'
import './apoyo.css'

// Mapa de densidad de puntos: 1 punto = 1 simpatizante, ubicado en una posición
// pseudoaleatoria (determinística por distrito) DENTRO de su distrito. No son
// direcciones reales — los datos solo registran el distrito de cada apoyo.
const DOT_COLOR = '#1E5B2E'
const DOT_RADIUS = 3.1 // en unidades del viewBox (800×743)

const PROVINCE: Record<DistrictId, string> = Object.fromEntries(
  DISTRICTS.map((d) => [d.id, d.province]),
) as Record<DistrictId, string>

type Counts = Record<DistrictId, number>
type Dot = { x: number; y: number }

// PRNG determinístico (mulberry32): los puntos no saltan entre renders ni visitas.
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFor(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Muestreo por rechazo dentro del path del distrito.
function sampleDots(path: SVGPathElement, count: number, seed: number): Dot[] {
  const rng = mulberry32(seed)
  const box = path.getBBox()
  const svg = path.ownerSVGElement
  const dots: Dot[] = []
  const maxAttempts = count * 120
  let attempts = 0
  const margin = DOT_RADIUS + 1
  while (dots.length < count && attempts < maxAttempts) {
    attempts++
    const x = box.x + margin + rng() * (box.width - margin * 2)
    const y = box.y + margin + rng() * (box.height - margin * 2)
    const pt = svg ? new DOMPoint(x, y) : null
    if (pt && path.isPointInFill(pt)) {
      dots.push({ x, y })
    }
  }
  // Fallback improbable: si el rechazo no alcanzó, apila lo que falta al centro.
  while (dots.length < count) {
    dots.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 })
  }
  return dots
}

const Apoyo = () => {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [dots, setDots] = useState<Record<DistrictId, Dot[]> | null>(null)
  const [hover, setHover] = useState<{ id: DistrictId; x: number; y: number; w: number } | null>(null)
  const pathRefs = useRef<Partial<Record<DistrictId, SVGPathElement | null>>>({})

  useEffect(() => {
    fetch('/api/apoyos/mapa')
      .then((r) => r.json())
      .then((j) => {
        if (j && j.ok) {
          setCounts(j.districts)
        }
      })
      .catch(() => {})
  }, [])

  // Genera los puntos cuando llegan los conteos y los paths ya están en el DOM.
  useEffect(() => {
    if (!counts) return
    const result = {} as Record<DistrictId, Dot[]>
    for (const p of DISTRICT_PATHS) {
      const el = pathRefs.current[p.id]
      const n = counts[p.id] ?? 0
      result[p.id] = el && n > 0 ? sampleDots(el, n, seedFor(p.id)) : []
    }
    setDots(result)
  }, [counts])

  const max = useMemo(
    () => (counts ? Math.max(0, ...Object.values(counts)) : 0),
    [counts],
  )

  const liderId = useMemo<DistrictId | null>(() => {
    if (!counts || max <= 0) return null
    return (Object.keys(counts) as DistrictId[]).find((id) => counts[id] === max) ?? null
  }, [counts, max])

  function place(e: React.MouseEvent<SVGPathElement>, id: DistrictId) {
    const box = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement).getBoundingClientRect()
    setHover({ id, x: e.clientX - box.left, y: e.clientY - box.top, w: box.width })
  }

  return (
    <section id="apoyo" className="py-120 position-relative z-1">
      <div className="container">
        <div className="row justify-content-center" data-aos="fade-up" data-aos-duration="800">
          <div className="col-12">
            <div className="ap-card ap-card-mapa" onMouseLeave={() => setHover(null)}>
              <svg viewBox={MAP_VIEWBOX} style={{width: '100%', height: 'auto', display: 'block'}} role="img" aria-label="Mapa de simpatizantes por distrito de Madre de Dios: un punto por apoyo">
                {/* Distritos (base neutra) */}
                {DISTRICT_PATHS.map((p) => (
                  <path
                    key={p.id}
                    d={p.d}
                    ref={(el) => { pathRefs.current[p.id] = el }}
                    className={`ap-distrito${p.id === liderId ? ' is-lider' : ''}`}
                    onMouseMove={(e) => place(e, p.id)}
                    onClick={(e) => place(e, p.id)}
                  />
                ))}
                {/* Puntos: 1 = 1 simpatizante */}
                {dots &&
                  DISTRICT_PATHS.map((p) =>
                    (dots[p.id] ?? []).map((d, i) => (
                      <circle
                        key={`${p.id}-${i}`}
                        className="ap-punto"
                        cx={d.x}
                        cy={d.y}
                        r={DOT_RADIUS}
                        fill={DOT_COLOR}
                        style={{animationDelay: `${Math.min(i * 12, 900)}ms`}}
                      />
                    )),
                  )}
              </svg>

              {hover && (
                <div className="ap-tooltip" style={{left: Math.min(hover.x + 12, hover.w - 180), top: hover.y - 48}}>
                  <strong>
                    {districtLabel(hover.id)}
                    {hover.id === liderId ? ' ★' : ''}
                  </strong>
                  <span>
                    {PROVINCE[hover.id]} · {counts ? (counts[hover.id] ?? 0) : 0} apoyos
                  </span>
                </div>
              )}

              {/* Leyenda */}
              <div className="ap-leyenda">
                <span className="ap-leyenda-punto">
                  <i aria-hidden="true"></i> 1 punto = 1 simpatizante
                </span>
                <span className="ap-leyenda-nota">
                  Posición referencial dentro de cada distrito · ★ distrito líder
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Apoyo
