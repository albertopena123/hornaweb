import { useState, useEffect } from 'react'

const navItems = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Propuestas', href: '#plan' },
  { label: 'Apoyo', href: '#apoyo' },
  { label: 'Sobre Simón', href: '#nosotros' },
  { label: 'Equipo', href: '#equipo' },
  { label: 'Eventos', href: '#eventos' },
  { label: 'Noticias', href: '#noticias' },
  { label: 'Contacto', href: '#contacto' },
]

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* Mobile Menu */}
      <div className={`mobile-menu d-lg-none d-block scroll-sm position-fixed bg-white tw-w-300-px tw-h-screen overflow-y-auto tw-p-6 tw-z-999 tw-pb-68 ${mobileOpen ? '' : 'tw--translate-x-full'}`}>
        <button
          type="button"
          className="close-button position-absolute tw-end-0 top-0 tw-me-2 tw-mt-2 tw-w-605 tw-h-605 rounded-circle d-flex justify-content-center align-items-center text-neutral-900 bg-neutral-200 hover-bg-neutral-900 hover-text-white"
          onClick={() => setMobileOpen(false)}
        >
          <i className="ph ph-x"></i>
        </button>
        <div className="mobile-menu__inner">
          <a href="#inicio" className="mobile-menu__logo d-flex align-items-center tw-gap-3">
            <img src="/assets/images/logo/logo-an.webp" alt="Ahora Nación" style={{width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px'}} />
            <div style={{lineHeight: 1.1}}>
              <div style={{fontWeight: 800, fontSize: '13px', color: '#C0392B', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Simón Horna</div>
              <div style={{fontWeight: 500, fontSize: '10px', color: '#555', textTransform: 'uppercase'}}>Ahora Nación</div>
            </div>
          </a>
          <div className="mobile-menu__menu">
            <ul className="nav-menu d-lg-flex align-items-center nav-menu--mobile d-block tw-mt-8">
              {navItems.map((item) => (
                <li key={item.label} className="nav-menu__item">
                  <a href={item.href} onClick={() => setMobileOpen(false)} className="nav-menu__link text-heading tw-pe-7 tw-py-9 fw-medium w-100">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className={`header bg-white tw-transition-all tw-z-99 ${scrolled ? 'shadow-sm' : ''}`}>
        <div className="container container-two">
          <nav className="d-flex align-items-center justify-content-between position-relative">
            {/* Logo */}
            <div className="logo">
              <a href="#inicio" className="link d-flex align-items-center tw-gap-3">
                <img
                  src="/assets/images/logo/logo-an.webp"
                  alt="Ahora Nación"
                  style={{width: '52px', height: '52px', objectFit: 'contain', borderRadius: '8px'}}
                />
                <div style={{lineHeight: 1.2}}>
                  <div style={{fontWeight: 800, fontSize: '15px', color: '#C0392B', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Simón Horna Alpaca</div>
                  <div style={{fontWeight: 500, fontSize: '11px', color: '#777', textTransform: 'uppercase', letterSpacing: '1px'}}>Ahora Nación · Madre de Dios</div>
                </div>
              </a>
            </div>

            {/* Desktop Menu */}
            <div className="header-menu d-lg-block d-none">
              <ul className="nav-menu d-lg-flex align-items-center tw-gap-6">
                {navItems.map((item) => (
                  <li key={item.label} className="nav-menu__item">
                    <a href={item.href} className="nav-menu__link text-heading tw-pe-7 tw-py-9 fw-medium w-100" style={{whiteSpace: 'nowrap'}}>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="d-flex align-items-center">
              {/* CTA Button */}
              <div className="header-button d-none d-sm-block">
                <a className="tw-hover-btn bg-main-600 text-white fw-bold tw-py-4 tw-px-10 d-inline-block hover-text-main-600" href="#contacto">
                  Apoya la Campaña
                  <span className="tw-hover-btn-circle-dot bg-black"></span>
                </a>
              </div>
              {/* Mobile toggle */}
              <button
                type="button"
                className="toggle-mobileMenu leading-none d-lg-none ms-3 text-neutral-800 tw-text-9"
                onClick={() => setMobileOpen(true)}
              >
                <i className="ph ph-list"></i>
              </button>
            </div>
          </nav>
        </div>
      </header>
    </>
  )
}

export default Header
