import { useState, useEffect } from 'react'

const navItems = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Apoyo', href: '#apoyo' },
]

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('#inicio')

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)

      const sectionIds = navItems.map((item) => item.href.substring(1))
      const scrollPosition = window.scrollY + 120

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i])
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection('#' + sectionIds[i])
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 9998,
            backdropFilter: 'blur(3px)',
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Mobile Menu */}
      <div
        className="mobile-menu d-xl-none d-block scroll-sm position-fixed bg-white tw-p-6 tw-pb-68"
        style={{
          top: 0,
          left: 0,
          bottom: 0,
          width: '280px',
          maxWidth: '85vw',
          height: '100vh',
          zIndex: 9999,
          overflowY: 'auto',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: mobileOpen ? '8px 0 32px rgba(0, 0, 0, 0.25)' : 'none',
        }}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menú"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#f1f3f5',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10000,
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#333',
          }}
        >
          ✕
        </button>
        <div className="mobile-menu__inner" style={{ paddingTop: '10px' }}>
          <a href="#inicio" onClick={() => setMobileOpen(false)} className="mobile-menu__logo d-flex align-items-center tw-gap-3" style={{ whiteSpace: 'nowrap' }}>
            <img src="/assets/images/logo/logo-an.webp" alt="Ahora Nación" style={{width: '44px', height: '44px', objectFit: 'contain', borderRadius: '8px'}} />
            <div style={{lineHeight: 1.1, whiteSpace: 'nowrap'}}>
              <div style={{fontWeight: 800, fontSize: '13px', color: '#C0392B', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Simón Horna</div>
              <div style={{fontWeight: 500, fontSize: '10px', color: '#555', textTransform: 'uppercase'}}>Ahora Nación</div>
            </div>
          </a>
          <div className="mobile-menu__menu" style={{ marginTop: '24px' }}>
            <ul className="nav-menu d-block p-0" style={{ listStyle: 'none' }}>
              {navItems.map((item) => {
                const isActive = activeSection === item.href
                return (
                  <li key={item.label} className="nav-menu__item" style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <a
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`nav-menu__link text-heading d-block py-3 px-3 ${isActive ? 'active' : ''}`}
                      style={{
                        fontSize: '15px',
                        color: isActive ? '#E90305' : '#1a1a1a',
                        fontWeight: isActive ? 800 : 500,
                        background: isActive ? 'rgba(233, 3, 5, 0.08)' : 'transparent',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {item.label}
                    </a>
                  </li>
                )
              })}
              <li className="nav-menu__item" style={{ borderBottom: '1px solid #f0f0f0' }}>
                <a href="/mi-mesa" onClick={() => setMobileOpen(false)} className="nav-menu__link text-heading d-block py-3 px-3" style={{ fontSize: '15px', color: '#1a1a1a', fontWeight: 500, borderRadius: '6px', textDecoration: 'none' }}>
                  Consultor de Mesa
                </a>
              </li>
              <li className="nav-menu__item" style={{ borderBottom: '1px solid #f0f0f0' }}>
                <a href="/mi-foto" onClick={() => setMobileOpen(false)} className="nav-menu__link text-heading d-block py-3 px-3" style={{ fontSize: '15px', color: '#1a1a1a', fontWeight: 500, borderRadius: '6px', textDecoration: 'none' }}>
                  Foto con Marco
                </a>
              </li>
              <li className="nav-menu__item" style={{ borderBottom: '1px solid #f0f0f0' }}>
                <a href="/unete" onClick={() => setMobileOpen(false)} className="nav-menu__link text-heading d-block py-3 px-3" style={{ fontSize: '15px', color: '#1a1a1a', fontWeight: 500, borderRadius: '6px', textDecoration: 'none' }}>
                  Únete a la Campaña
                </a>
              </li>
            </ul>
            <a
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="d-flex align-items-center justify-content-center fw-bold"
              style={{
                marginTop: '20px',
                fontSize: '14px',
                borderRadius: '10px',
                padding: '12px 20px',
                color: '#ffffff',
                background: '#E90305',
                textDecoration: 'none',
                gap: '8px',
              }}
            >
              <i className="ph ph-user" style={{ fontSize: '18px' }}></i>
              Iniciar Sesión
            </a>
          </div>
        </div>
      </div>

      {/* Header */}
      <header
        className={`header bg-white ${scrolled ? 'fixed-header shadow-sm' : ''}`}
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          width: '100%',
          height: '76px',
          display: 'flex',
          alignItems: 'center',
          zIndex: 99999,
          backgroundColor: '#ffffff',
          boxShadow: scrolled ? '0 4px 20px rgba(0, 0, 0, 0.1)' : 'none',
          transition: 'box-shadow 0.3s ease',
        }}
      >
        <div className="container container-two" style={{ width: '100%' }}>
          <nav className="d-flex align-items-center justify-content-between position-relative" style={{ width: '100%', gap: '16px' }}>
            {/* Logo */}
            <div className="logo" style={{ flexShrink: 0 }}>
              <a href="#inicio" className="link d-flex align-items-center tw-gap-3" style={{ whiteSpace: 'nowrap' }}>
                <img
                  src="/assets/images/logo/logo-an.webp"
                  alt="Ahora Nación"
                  style={{width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px', flexShrink: 0}}
                />
                <div style={{lineHeight: 1.2, whiteSpace: 'nowrap'}}>
                  <div style={{fontWeight: 800, fontSize: '14px', color: '#C0392B', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Simón Horna Alpaca</div>
                  <div style={{fontWeight: 500, fontSize: '10px', color: '#777', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Ahora Nación · Madre de Dios</div>
                </div>
              </a>
            </div>

            {/* Desktop Menu */}
            <div className="header-menu d-xl-block d-none" style={{ flexShrink: 1 }}>
              <ul className="nav-menu d-xl-flex align-items-center tw-gap-4 mb-0" style={{ flexWrap: 'nowrap' }}>
                {navItems.map((item) => {
                  const isActive = activeSection === item.href
                  return (
                    <li key={item.label} className="nav-menu__item" style={{ flexShrink: 0 }}>
                      <a
                        href={item.href}
                        className={`nav-menu__link text-heading ${isActive ? 'active' : ''}`}
                        style={{
                          whiteSpace: 'nowrap',
                          fontSize: '14px',
                          padding: '8px 12px',
                          color: isActive ? '#E90305' : '#222',
                          fontWeight: isActive ? 800 : 500,
                          borderBottom: isActive ? '3px solid #E90305' : '3px solid transparent',
                          transition: 'all 0.2s ease',
                          textDecoration: 'none',
                        }}
                      >
                        {item.label}
                      </a>
                    </li>
                  )
                })}
                <li className="nav-menu__item" style={{ flexShrink: 0 }}>
                  <a href="/mi-mesa" className="nav-menu__link text-heading" style={{ whiteSpace: 'nowrap', fontSize: '14px', padding: '8px 12px', color: '#222', fontWeight: 500, textDecoration: 'none' }}>
                    Consultor de Mesa
                  </a>
                </li>
                <li className="nav-menu__item" style={{ flexShrink: 0 }}>
                  <a href="/mi-foto" className="nav-menu__link text-heading" style={{ whiteSpace: 'nowrap', fontSize: '14px', padding: '8px 12px', color: '#222', fontWeight: 500, textDecoration: 'none' }}>
                    Foto con Marco
                  </a>
                </li>
                <li className="nav-menu__item" style={{ flexShrink: 0 }}>
                  <a href="/unete" className="nav-menu__link text-heading" style={{ whiteSpace: 'nowrap', fontSize: '14px', padding: '8px 12px', color: '#222', fontWeight: 500, textDecoration: 'none' }}>
                    Únete
                  </a>
                </li>
              </ul>
            </div>

            <div className="d-flex align-items-center" style={{ flexShrink: 0 }}>
              {/* Login Button */}
              <a
                href="/login"
                className="d-none d-sm-inline-flex align-items-center justify-content-center fw-bold"
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '13px',
                  borderRadius: '10px',
                  padding: '9px 18px',
                  lineHeight: '1',
                  color: '#E90305',
                  border: '2px solid #E90305',
                  background: 'transparent',
                  textDecoration: 'none',
                  marginRight: '12px',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
              >
                <i className="ph ph-user" style={{ fontSize: '16px' }}></i>
                Iniciar Sesión
              </a>
              {/* CTA Button */}
              <div className="header-button d-none d-sm-block" style={{ flexShrink: 0 }}>
                <a className="tw-hover-btn bg-main-600 text-white fw-bold d-inline-flex align-items-center justify-content-center" href="#apoyo" style={{ whiteSpace: 'nowrap', fontSize: '13px', borderRadius: '10px', padding: '10px 20px', lineHeight: '1' }}>
                  Apoya la Campaña
                  <span className="tw-hover-btn-circle-dot bg-black"></span>
                </a>
              </div>
              {/* Mobile toggle */}
              <button
                type="button"
                className="toggle-mobileMenu leading-none d-xl-none ms-3 text-neutral-800 tw-text-9"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menú"
                style={{ cursor: 'pointer', background: 'transparent', border: 'none' }}
              >
                <i className="ph ph-list" style={{ fontSize: '28px' }}></i>
              </button>
            </div>
          </nav>
        </div>
      </header>
    </>
  )
}

export default Header
