import { useEffect, useRef, useState } from 'react'
import { DISTRICTS } from '@/lib/districts'
import PersoneroForm from './PersoneroForm'
import './floating-register.css'

const DOC_TYPES = [
  { id: 'dni', label: 'DNI' },
  { id: 'ce', label: 'Carné de Extranjería' },
  { id: 'passport', label: 'Pasaporte' },
] as const

type DocTypeId = (typeof DOC_TYPES)[number]['id']

type Coords = { latitude: number; longitude: number; gpsAccuracy: number | null }

type FieldErrors = Record<string, string>

type Tab = 'simpatizante' | 'personero'

const FloatingRegister = () => {
  // En móvil el panel arranca cerrado (se muestra el botón "Únete") para no
  // tapar el hero al cargar; en escritorio se abre tras montar. Empezar
  // cerrado evita además un desajuste de hidratación en SSR.
  const [open, setOpen] = useState(false)
  const [docType, setDocType] = useState<DocTypeId>('dni')
  const [docNumber, setDocNumber] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [district, setDistrict] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [gpsState, setGpsState] = useState<'pending' | 'ok' | 'unavailable'>('pending')
  const [dniLookup, setDniLookup] = useState<'idle' | 'loading' | 'found' | 'notfound' | 'error'>('idle')
  // Pestaña "Personero": solo aparece si el switch de Admin → Personeros está activo.
  const [personeroEnabled, setPersoneroEnabled] = useState(false)
  const [tab, setTab] = useState<Tab>('simpatizante')
  const [successKind, setSuccessKind] = useState<Tab>('simpatizante')

  // Las coordenadas se capturan en segundo plano al abrir el panel; si el
  // permiso se rechaza o falla, el registro se envía igual sin ubicación.
  const coordsRef = useRef<Coords | null>(null)
  // Último nombre autorellenado: solo se sobreescribe el campo si el usuario
  // no escribió un nombre propio.
  const autoNameRef = useRef<string | null>(null)

  // Autorellenado por DNI: al completar 8 dígitos consulta /api/dni/:dni
  // (proxy propio) y llena el nombre completo.
  useEffect(() => {
    const doc = docNumber.trim()
    if (docType !== 'dni' || !/^\d{8}$/.test(doc)) {
      setDniLookup('idle')
      return
    }
    const ctrl = new AbortController()
    setDniLookup('loading')
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/dni/${doc}`, { signal: ctrl.signal })
        const json = await res.json().catch(() => null)
        if (res.ok && json?.ok && typeof json.name === 'string' && json.name) {
          setName((prev) =>
            prev.trim() === '' || prev === autoNameRef.current ? json.name : prev,
          )
          autoNameRef.current = json.name
          setDniLookup('found')
        } else {
          setDniLookup(res.status === 404 ? 'notfound' : 'error')
        }
      } catch {
        if (!ctrl.signal.aborted) setDniLookup('error')
      }
    }, 350)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [docType, docNumber])

  // En escritorio (≥992px) el panel se abre automáticamente al montar y
  // captura la ubicación; en móvil permanece cerrado hasta que el usuario
  // pulsa el botón flotante "Únete".
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 992) {
      setOpen(true)
      if (!coordsRef.current) requestLocation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/api/personeros/registro', { signal: ctrl.signal, cache: 'no-store' })
      .then((res) => res.json().catch(() => null))
      .then((json) => {
        if (json?.ok && json.enabled === true) setPersoneroEnabled(true)
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, [])

  function requestLocation() {
    if (!('geolocation' in navigator)) {
      setGpsState('unavailable')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coordsRef.current = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          gpsAccuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        }
        setGpsState('ok')
      },
      () => setGpsState('unavailable'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }

  function handleOpen() {
    setOpen(true)
    setSuccess(false)
    setError(null)
    if (!coordsRef.current) requestLocation()
  }

  function validate(): FieldErrors {
    const errs: FieldErrors = {}
    const doc = docNumber.trim()
    if (docType === 'dni') {
      if (!/^\d{8}$/.test(doc)) errs.docNumber = 'El DNI debe tener 8 dígitos.'
    } else if (!/^[A-Za-z0-9]{6,12}$/.test(doc)) {
      errs.docNumber = 'Documento inválido (6 a 12 letras o números).'
    }
    if (name.trim().length < 2) errs.name = 'Escribe tu nombre completo.'
    if (!/^[0-9+\s-]{6,15}$/.test(phone.trim())) errs.phone = 'Celular inválido.'
    if (!district) errs.district = 'Elige tu distrito.'
    return errs
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const errs = validate()
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return

    const honeypot = (e.currentTarget.elements.namedItem('website') as HTMLInputElement | null)?.value ?? ''

    setSending(true)
    try {
      const res = await fetch('/api/apoyos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType,
          docNumber: docNumber.trim(),
          name: name.trim(),
          phone: phone.trim(),
          district,
          website: honeypot,
          ...(coordsRef.current ?? {}),
        }),
      })
      const json = await res.json().catch(() => null)
      if (json?.ok) {
        setSuccessKind('simpatizante')
        setSuccess(true)
        setDocNumber('')
        setName('')
        setPhone('')
        setDistrict('')
        setFieldErrors({})
        setTimeout(() => setOpen(false), 3000)
      } else {
        if (json?.fieldErrors) setFieldErrors(json.fieldErrors)
        setError(json?.error ?? 'No se pudo registrar. Intenta de nuevo.')
      }
    } catch {
      setError('Sin conexión. Intenta de nuevo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {!open && (
        <button type="button" className="fr-fab" onClick={handleOpen} aria-label="Regístrate como simpatizante">
          <i className="ph-fill ph-hand-fist" style={{ fontSize: '19px' }}></i>
          Únete
        </button>
      )}

      {open && (
        <div className="fr-panel" role="dialog" aria-label="Formulario de registro de simpatizante">
          {success ? (
            <div className="fr-success">
              <i className="ph-fill ph-check-circle"></i>
              {successKind === 'personero' ? (
                <>
                  <h4>¡Gracias por sumarte como personero!</h4>
                  <p>Recibimos tu inscripción. Un coordinador se comunicará contigo para confirmar tu local y mesa.</p>
                </>
              ) : (
                <>
                  <h4>¡Gracias por tu apoyo!</h4>
                  <p>Tu registro fue recibido correctamente.</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="fr-head">
                <div>
                  {tab === 'personero' ? (
                    <>
                      <h4>Sé personero</h4>
                      <p>Inscríbete para cuidar el voto de Simón Horna el día de la elección.</p>
                    </>
                  ) : (
                    <>
                      <h4>Únete a la campaña</h4>
                      <p>Regístrate como simpatizante de Simón Horna.</p>
                    </>
                  )}
                </div>
                <button type="button" className="fr-close" onClick={() => setOpen(false)} aria-label="Cerrar formulario">
                  ✕
                </button>
              </div>
              {personeroEnabled && (
                <div className="fr-tabs" role="tablist" aria-label="Tipo de registro">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'simpatizante'}
                    className={`fr-tab ${tab === 'simpatizante' ? 'is-active' : ''}`}
                    onClick={() => setTab('simpatizante')}
                  >
                    Simpatizante
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'personero'}
                    className={`fr-tab ${tab === 'personero' ? 'is-active' : ''}`}
                    onClick={() => setTab('personero')}
                  >
                    Personero
                  </button>
                </div>
              )}
              {tab === 'personero' && personeroEnabled ? (
                <PersoneroForm
                  onSuccess={() => {
                    setSuccessKind('personero')
                    setSuccess(true)
                    setTimeout(() => setOpen(false), 4000)
                  }}
                />
              ) : (
              <form className="fr-body" onSubmit={handleSubmit} noValidate>
                {error && <div className="fr-alert error">{error}</div>}

                <div className="fr-doc-row">
                  <div className={`fr-field ${fieldErrors.docType ? 'has-error' : ''}`}>
                    <label htmlFor="fr-doctype">Tipo de documento</label>
                    {/* no-nice-select: main.js reemplaza los <select> por un widget
                        jQuery que actualiza el valor con .trigger('change'); React
                        nunca se entera y el campo se revierte al re-renderizar. */}
                    <select
                      id="fr-doctype"
                      className="no-nice-select"
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as DocTypeId)}
                    >
                      {DOC_TYPES.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={`fr-field ${fieldErrors.docNumber ? 'has-error' : ''}`}>
                    <label htmlFor="fr-docnumber">N° de documento</label>
                    <input
                      id="fr-docnumber"
                      type="text"
                      inputMode={docType === 'dni' ? 'numeric' : 'text'}
                      maxLength={docType === 'dni' ? 8 : 12}
                      placeholder={docType === 'dni' ? '12345678' : 'Número'}
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                    />
                    {fieldErrors.docNumber && <span className="fr-error">{fieldErrors.docNumber}</span>}
                  </div>
                </div>

                <div className={`fr-field ${fieldErrors.name ? 'has-error' : ''}`}>
                  <label htmlFor="fr-name">Nombre completo</label>
                  <input
                    id="fr-name"
                    type="text"
                    maxLength={120}
                    placeholder={dniLookup === 'loading' ? 'Buscando datos…' : 'Tu nombre completo'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {dniLookup === 'loading' && (
                    <span className="fr-lookup loading">Consultando DNI…</span>
                  )}
                  {dniLookup === 'found' && (
                    <span className="fr-lookup ok">✓ Datos encontrados con tu DNI</span>
                  )}
                  {dniLookup === 'notfound' && (
                    <span className="fr-lookup">No encontramos el DNI, escribe tu nombre.</span>
                  )}
                  {dniLookup === 'error' && (
                    <span className="fr-lookup">No se pudo consultar el DNI, escribe tu nombre.</span>
                  )}
                  {fieldErrors.name && <span className="fr-error">{fieldErrors.name}</span>}
                </div>

                <div className={`fr-field ${fieldErrors.phone ? 'has-error' : ''}`}>
                  <label htmlFor="fr-phone">Número de celular</label>
                  <input
                    id="fr-phone"
                    type="tel"
                    inputMode="tel"
                    maxLength={15}
                    placeholder="987 654 321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  {fieldErrors.phone && <span className="fr-error">{fieldErrors.phone}</span>}
                </div>

                <div className={`fr-field ${fieldErrors.district ? 'has-error' : ''}`}>
                  <label htmlFor="fr-district">Distrito</label>
                  <select
                    id="fr-district"
                    className="no-nice-select"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                  >
                    <option value="">Elige tu distrito</option>
                    {DISTRICTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label} ({d.province})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.district && <span className="fr-error">{fieldErrors.district}</span>}
                </div>

                {/* Honeypot anti-bots: invisible para personas */}
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
                />

                <div className={`fr-gps ${gpsState === 'ok' ? 'ok' : ''}`}>
                  <i className={`ph-fill ${gpsState === 'ok' ? 'ph-map-pin' : 'ph-map-pin-line'}`}></i>
                  {gpsState === 'ok'
                    ? 'Ubicación detectada'
                    : gpsState === 'pending'
                      ? 'Detectando ubicación…'
                      : 'Sin ubicación (puedes registrarte igual)'}
                </div>

                <button type="submit" className="fr-submit" disabled={sending}>
                  {sending ? 'Enviando…' : 'Registrarme'}
                </button>
              </form>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}

export default FloatingRegister
