import { useEffect, useRef, useState } from 'react'
import { DISTRICTS } from '@/lib/districts'

// Formulario público de inscripción de personeros (pestaña del panel flotante).
// Se muestra solo cuando el switch "Inscripción pública" está activo en Admin → Personeros.
// Envía a POST /api/personeros/registro; el registro entra como pendiente (inactivo).

const DOC_TYPES = [
  { id: 'dni', label: 'DNI' },
  { id: 'ce', label: 'Carné de Extranjería' },
  { id: 'passport', label: 'Pasaporte' },
] as const

type DocTypeId = (typeof DOC_TYPES)[number]['id']
type FieldErrors = Record<string, string>

const PHONE_RE = /^[0-9+\s-]{6,15}$/

export default function PersoneroForm({ onSuccess }: { onSuccess: () => void }) {
  const [docType, setDocType] = useState<DocTypeId>('dni')
  const [docNumber, setDocNumber] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [district, setDistrict] = useState('')
  const [localName, setLocalName] = useState('')
  const [mesa, setMesa] = useState('')
  const [coordinatorName, setCoordinatorName] = useState('')
  const [coordinatorPhone, setCoordinatorPhone] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [dniLookup, setDniLookup] = useState<'idle' | 'loading' | 'found' | 'notfound' | 'error'>('idle')
  // Último nombre autorellenado: solo se sobreescribe si el usuario no escribió uno propio.
  const autoNameRef = useRef<string | null>(null)

  // Autorellenado por DNI: al completar 8 dígitos consulta /api/dni/:dni (proxy propio).
  // Todas las actualizaciones de estado ocurren dentro del callback diferido.
  useEffect(() => {
    const doc = docNumber.trim()
    const eligible = docType === 'dni' && /^\d{8}$/.test(doc)
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      if (!eligible) {
        setDniLookup('idle')
        return
      }
      setDniLookup('loading')
      try {
        const res = await fetch(`/api/dni/${doc}`, { signal: ctrl.signal })
        const json = await res.json().catch(() => null)
        if (res.ok && json?.ok && typeof json.name === 'string' && json.name) {
          setName((prev) => (prev.trim() === '' || prev === autoNameRef.current ? json.name : prev))
          autoNameRef.current = json.name
          setDniLookup('found')
        } else {
          setDniLookup(res.status === 404 ? 'notfound' : 'error')
        }
      } catch {
        if (!ctrl.signal.aborted) setDniLookup('error')
      }
    }, eligible ? 350 : 0)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [docType, docNumber])

  function validate(): FieldErrors {
    const errs: FieldErrors = {}
    const doc = docNumber.trim()
    if (docType === 'dni') {
      if (!/^\d{8}$/.test(doc)) errs.docNumber = 'El DNI debe tener 8 dígitos.'
    } else if (!/^[A-Za-z0-9]{6,12}$/.test(doc)) {
      errs.docNumber = 'Documento inválido (6 a 12 letras o números).'
    }
    if (name.trim().length < 2) errs.name = 'Escribe tu nombre completo.'
    if (!PHONE_RE.test(phone.trim())) errs.phone = 'Celular inválido.'
    if (!district) errs.district = 'Elige tu distrito.'
    if (localName.trim().length < 2) errs.localName = 'Escribe tu local de votación.'
    if (mesa.trim().length > 10) errs.mesa = 'Máximo 10 caracteres.'
    if (coordinatorPhone.trim() !== '' && !PHONE_RE.test(coordinatorPhone.trim())) {
      errs.coordinatorPhone = 'Teléfono inválido.'
    }
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
      const res = await fetch('/api/personeros/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType,
          docNumber: docNumber.trim(),
          name: name.trim(),
          phone: phone.trim(),
          district,
          localName: localName.trim(),
          mesa: mesa.trim(),
          coordinatorName: coordinatorName.trim(),
          coordinatorPhone: coordinatorPhone.trim(),
          website: honeypot,
        }),
      })
      const json = await res.json().catch(() => null)
      if (json?.ok) {
        setDocNumber('')
        setName('')
        setPhone('')
        setDistrict('')
        setLocalName('')
        setMesa('')
        setCoordinatorName('')
        setCoordinatorPhone('')
        setFieldErrors({})
        onSuccess()
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
    <form className="fr-body" onSubmit={handleSubmit} noValidate>
      {error && <div className="fr-alert error">{error}</div>}
      <p className="fr-hint">
        Cuida el voto el día de la elección. Un coordinador te contactará para confirmar tu local y mesa.
      </p>

      <div className="fr-doc-row">
        <div className="fr-field">
          <label htmlFor="pr-doctype">Tipo de documento</label>
          <select id="pr-doctype" className="no-nice-select" value={docType} onChange={(e) => setDocType(e.target.value as DocTypeId)}>
            {DOC_TYPES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className={`fr-field ${fieldErrors.docNumber ? 'has-error' : ''}`}>
          <label htmlFor="pr-docnumber">N° de documento</label>
          <input
            id="pr-docnumber"
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
        <label htmlFor="pr-name">Nombre completo</label>
        <input
          id="pr-name"
          type="text"
          maxLength={120}
          placeholder={dniLookup === 'loading' ? 'Buscando datos…' : 'Tu nombre completo'}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {dniLookup === 'loading' && <span className="fr-lookup loading">Consultando DNI…</span>}
        {dniLookup === 'found' && <span className="fr-lookup ok">✓ Datos encontrados con tu DNI</span>}
        {dniLookup === 'notfound' && <span className="fr-lookup">No encontramos el DNI, escribe tu nombre.</span>}
        {dniLookup === 'error' && <span className="fr-lookup">No se pudo consultar el DNI, escribe tu nombre.</span>}
        {fieldErrors.name && <span className="fr-error">{fieldErrors.name}</span>}
      </div>

      <div className={`fr-field ${fieldErrors.phone ? 'has-error' : ''}`}>
        <label htmlFor="pr-phone">Número de celular</label>
        <input
          id="pr-phone"
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
        <label htmlFor="pr-district">Distrito donde votas</label>
        <select id="pr-district" className="no-nice-select" value={district} onChange={(e) => setDistrict(e.target.value)}>
          <option value="">Elige tu distrito</option>
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label} ({d.province})
            </option>
          ))}
        </select>
        {fieldErrors.district && <span className="fr-error">{fieldErrors.district}</span>}
      </div>

      <div className="fr-two">
        <div className={`fr-field ${fieldErrors.localName ? 'has-error' : ''}`}>
          <label htmlFor="pr-local">Local de votación</label>
          <input
            id="pr-local"
            type="text"
            maxLength={120}
            placeholder="Colegio / local"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
          />
          {fieldErrors.localName && <span className="fr-error">{fieldErrors.localName}</span>}
        </div>
        <div className={`fr-field ${fieldErrors.mesa ? 'has-error' : ''}`}>
          <label htmlFor="pr-mesa">
            N° de mesa <span className="fr-opt">(opcional)</span>
          </label>
          <input
            id="pr-mesa"
            type="text"
            inputMode="numeric"
            maxLength={10}
            placeholder="012345"
            value={mesa}
            onChange={(e) => setMesa(e.target.value)}
          />
          {fieldErrors.mesa && <span className="fr-error">{fieldErrors.mesa}</span>}
        </div>
      </div>

      <div className="fr-two">
        <div className={`fr-field ${fieldErrors.coordinatorName ? 'has-error' : ''}`}>
          <label htmlFor="pr-coord">
            Tu coordinador <span className="fr-opt">(opcional)</span>
          </label>
          <input
            id="pr-coord"
            type="text"
            maxLength={120}
            placeholder="Nombre"
            value={coordinatorName}
            onChange={(e) => setCoordinatorName(e.target.value)}
          />
          {fieldErrors.coordinatorName && <span className="fr-error">{fieldErrors.coordinatorName}</span>}
        </div>
        <div className={`fr-field ${fieldErrors.coordinatorPhone ? 'has-error' : ''}`}>
          <label htmlFor="pr-coord-phone">
            Celular coord. <span className="fr-opt">(opcional)</span>
          </label>
          <input
            id="pr-coord-phone"
            type="tel"
            inputMode="tel"
            maxLength={15}
            placeholder="987 654 321"
            value={coordinatorPhone}
            onChange={(e) => setCoordinatorPhone(e.target.value)}
          />
          {fieldErrors.coordinatorPhone && <span className="fr-error">{fieldErrors.coordinatorPhone}</span>}
        </div>
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

      <button type="submit" className="fr-submit" disabled={sending}>
        {sending ? 'Enviando…' : 'Inscribirme como personero'}
      </button>
    </form>
  )
}
