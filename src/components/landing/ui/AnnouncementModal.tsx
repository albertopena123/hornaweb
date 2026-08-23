'use client'

import { useEffect, useRef, useState } from 'react'
import type { AnnouncementPublic } from '@/lib/announcements'
import './announcement-modal.css'

export const DISMISS_KEY = 'an-aviso-descartado'
const OPEN_DELAY_MS = 1000

type Props = {
  // Con `preview` no hay fetch ni localStorage: se muestra tal cual (admin).
  preview?: AnnouncementPublic
  onClose?: () => void
}

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY)
  } catch {
    return null
  }
}

function writeDismissed(id: string) {
  try {
    localStorage.setItem(DISMISS_KEY, id)
  } catch {
    /* modo privado o almacenamiento bloqueado */
  }
}

export default function AnnouncementModal({ preview, onClose }: Props) {
  const [data, setData] = useState<AnnouncementPublic | null>(preview ?? null)
  const [open, setOpen] = useState(!!preview)
  const [dontShow, setDontShow] = useState(false)
  const dontShowRef = useRef(false)
  const closeRef = useRef<HTMLButtonElement | null>(null)

  // Carga del aviso vigente (solo en modo público).
  useEffect(() => {
    if (preview) return
    const ctrl = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    ;(async () => {
      try {
        const res = await fetch('/api/anuncios/activo', { signal: ctrl.signal, cache: 'no-store' })
        const json = await res.json().catch(() => null)
        const a: AnnouncementPublic | null = json?.ok ? json.announcement : null
        if (!a || readDismissed() === a.id) return
        setData(a)
        timer = setTimeout(() => setOpen(true), OPEN_DELAY_MS)
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return
        if (process.env.NODE_ENV !== 'production') console.warn('AnnouncementModal', e)
      }
    })()
    return () => {
      ctrl.abort()
      if (timer) clearTimeout(timer)
    }
  }, [preview])

  // Bloqueo de scroll, foco inicial y Escape.
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function close() {
    if (!preview && dontShowRef.current && data) writeDismissed(data.id)
    setOpen(false)
    onClose?.()
  }

  if (!open || !data) return null

  const external = !!data.ctaUrl && /^https?:\/\//.test(data.ctaUrl)
  const safeCta = !!data.ctaUrl && /^(https?:\/\/|\/(?![\/\\]))/.test(data.ctaUrl)

  return (
    <div className="anm" onClick={close} role="presentation">
      <div
        className="anm__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="anm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="anm__close" onClick={close} aria-label="Cerrar aviso">
          ×
        </button>
        {data.imageUrl && <img className="anm__img" src={data.imageUrl} alt="" />}
        <div className="anm__body">
          <span className="anm__eyebrow"><i /> Aviso de campaña</span>
          <h2 id="anm-title" className="anm__title">{data.title}</h2>
          <p className="anm__text">{data.body}</p>
          {safeCta && data.ctaLabel && (
            <a
              className="anm__cta"
              href={data.ctaUrl ?? undefined}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
            >
              {data.ctaLabel} →
            </a>
          )}
          <div className="anm__foot">
            {!preview && (
              <label>
                <input
                  type="checkbox"
                  checked={dontShow}
                  onChange={(e) => {
                    setDontShow(e.target.checked)
                    dontShowRef.current = e.target.checked
                  }}
                />
                No volver a mostrar este aviso
              </label>
            )}
            <button type="button" className="anm__later" onClick={close}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
