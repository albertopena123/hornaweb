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
                <form onSubmit={submit} style={{position: 'relative'}}>
                  <div style={{marginBottom: '14px'}}>
                    <label style={labelStyle} htmlFor="apoyo-nombre">Tu nombre</label>
                    <input id="apoyo-nombre" style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
                    {fieldErrors.name && <div style={errStyle}>{fieldErrors.name}</div>}
                  </div>
                  <div style={{marginBottom: '14px'}}>
                    <label style={labelStyle} htmlFor="apoyo-distrito">Tu distrito</label>
                    <select id="apoyo-distrito" className="no-nice-select" style={{...inputStyle, appearance: 'auto'}} value={district} onChange={(e) => setDistrict(e.target.value)} required>
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
