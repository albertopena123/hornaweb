// Datos de contacto de la campaña — REEMPLAZAR por los reales cuando estén.
const WHATSAPP = '51999999999'
const WHATSAPP_MSG = 'Hola, quiero sumarme a la campaña de Simón Horna en Madre de Dios'
const SOCIAL_LINKS = [
  { icon: 'ph-facebook-logo', href: 'https://www.facebook.com/', label: 'Facebook' },
  { icon: 'ph-instagram-logo', href: 'https://www.instagram.com/', label: 'Instagram' },
  { icon: 'ph-tiktok-logo', href: 'https://www.tiktok.com/', label: 'TikTok' },
  { icon: 'ph-youtube-logo', href: 'https://www.youtube.com/', label: 'YouTube' },
]

const CierreCta = () => {
  const waHref = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(WHATSAPP_MSG)}`

  return (
    <section id="contacto" className="py-120 position-relative z-1 overflow-hidden" style={{background: 'linear-gradient(135deg, var(--an-red) 0%, #8e0203 100%)'}}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-8 text-center" data-aos="fade-up" data-aos-duration="800">
            <img
              src="/assets/images/logo/logo-an.webp"
              alt="Ahora Nación"
              style={{width: '72px', height: '72px', objectFit: 'contain', borderRadius: '12px', background: '#fff', padding: '4px', margin: '0 auto 24px', display: 'block'}}
            />
            <h2 className="text-white fw-bold tw-mb-4" style={{fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.2}}>
              Súmate al cambio de Madre de Dios
            </h2>
            <p className="text-white tw-mb-8" style={{opacity: 0.9, fontSize: '18px'}}>
              Escríbenos y sé parte de la campaña.
            </p>
            <div className="d-flex justify-content-center align-items-center flex-wrap tw-gap-5 tw-mb-8">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="d-inline-flex align-items-center fw-bold text-white"
                style={{
                  background: '#25D366',
                  borderRadius: '50px',
                  padding: '18px 36px',
                  fontSize: '20px',
                  gap: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  textDecoration: 'none',
                }}
              >
                <i className="ph-fill ph-whatsapp-logo" style={{fontSize: '28px'}}></i>
                Escríbenos por WhatsApp
              </a>
            </div>
            <div className="d-flex justify-content-center tw-gap-4">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="d-inline-flex align-items-center justify-content-center"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    color: '#fff',
                    fontSize: '22px',
                  }}
                >
                  <i className={`ph ${s.icon}`}></i>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CierreCta
