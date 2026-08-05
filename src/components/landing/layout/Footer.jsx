const Footer = () => {
  return (
    <footer className="footer-area position-relative z-1 mt-auto">
      <div className="py-120">
        <div className="container">
          <div className="row">
            <div className="col-xl-5 col-lg-7 col-md-7">
              <div className="footer-top-content tw-pb-20" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
                <h2 className="footer-top-title text-white fw-normal tw-text-30 lh-1">Trabajemos Juntos por Madre de Dios</h2>
              </div>
            </div>
            <div className="col-xl-7 col-lg-5 col-md-5">
              <div className="footer-top-wrap d-flex tw-gap-22 justify-content-end" data-aos="fade-up" data-aos-duration="800" data-aos-delay="300">
                <div>
                  <img src="/assets/images/shapes/footer-mail.png" alt="mail" />
                </div>
                <div>
                  <a className="text-white tw-text-605 font-heading hover-text-main-600" href="mailto:simon.horna@ahoranacion.pe">simon.horna@ahoranacion.pe</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container container-two">
          <div className="row gy-5">
            {/* Newsletter */}
            <div className="col-lg-4 col-sm-6 col-xs-6" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
              <div className="footer-col-1">
                <h3 className="fw-medium text--white tw-mb-10">Boletín de Campaña</h3>
                <p className="text-white tw-mb-6">Suscríbete para recibir las últimas noticias y avances del plan de gobierno de Simón Horna Alpaca.</p>
                <div className="footer-form tw-mb-3 position-relative z-1">
                  <input type="text" className="footer-input form-control bg-transparent shadow-none border border-transparent rounded-0 text-white ps-0 tw-pe-13 focus-border-main-600 font-body focus-tw-placeholder-text-hidden tw-placeholder-transition-2" placeholder="Tu Email" />
                  <button className="footer-button"><span><img src="/assets/images/icons/paper-arrow.svg" alt="paper" /></span></button>
                </div>
                <div>
                  <div className="package-details-contact-checkbox tw-mb-10">
                    <div className="custom-control custom-checkbox d-flex align-items-center tw-gap-3">
                      <input type="checkbox" className="custom-control-input" id="customCheck1" />
                      <label className="custom-control-label text-white fw-normal" htmlFor="customCheck1">Acepto la Política de Privacidad.</label>
                    </div>
                  </div>
                </div>
                <div className="mb-0 d-flex align-items-center tw-gap-3">
                  <img
                    src="/assets/images/logo/logo-an.webp"
                    alt="Ahora Nación"
                    style={{width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px'}}
                  />
                  <div>
                    <div style={{color: '#fff', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Ahora Nación</div>
                    <div style={{color: 'rgba(255,255,255,0.6)', fontSize: '11px'}}>Madre de Dios · Perú</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="col-lg-2 col-sm-6 col-xs-6" data-aos="fade-up" data-aos-duration="800" data-aos-delay="300">
              <div className="footer-col-2">
                <h3 className="fw-medium text--white tw-mb-8">Secciones</h3>
                <ul className="d-flex flex-column tw-gap-4">
                  {[
                    { label: 'Inicio', href: '#inicio' },
                    { label: 'Sobre Simón', href: '#nosotros' },
                    { label: 'Plan de Gobierno', href: '#plan' },
                    { label: 'Propuestas', href: '#propuestas' },
                    { label: 'Eventos', href: '#eventos' },
                  ].map((link) => (
                    <li key={link.label}>
                      <a href={link.href} className="text--white hover-text-main-600 hover-underline">{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Plan Dimensions */}
            <div className="col-lg-3 col-sm-6 col-xs-6" data-aos="fade-up" data-aos-duration="800" data-aos-delay="400">
              <div className="footer-col-3">
                <h3 className="fw-medium text--white tw-mb-8">Dimensiones del Plan</h3>
                <ul className="d-flex flex-column tw-gap-4">
                  {['🏥 Dimensión Social', '🌿 Dimensión Económica', '🌎 Dimensión Ambiental', '🏛️ Dimensión Institucional', '📄 Plan Completo 2027–2030'].map((link) => (
                    <li key={link}>
                      <a href="#plan" className="text--white hover-text-main-600 hover-underline">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Contact */}
            <div className="col-lg-3 col-sm-6 col-xs-6" data-aos="fade-up" data-aos-duration="800" data-aos-delay="500">
              <div className="footer-col-4">
                <h3 className="fw-medium text--white tw-mb-8">Información de Contacto</h3>
                <div className="tw-mb-4">
                  <a href="mailto:simon.horna@ahoranacion.pe" className="text--white d-block tw-mb-4">simon.horna@ahoranacion.pe</a>
                  <a href="tel:+51999999999" className="text--white d-block tw-mb-4">+51 999 999 999</a>
                  <span className="text--white d-block mb-1">Puerto Maldonado, Madre de Dios, Perú</span>
                  <span className="text--white d-block mb-1" style={{fontSize: '13px', opacity: 0.7}}>Tambopata · Manu · Tahuamanu</span>
                </div>
                <h3 className="fw-medium text--white tw-mb-4">Síguenos</h3>
                <ul className="d-flex align-items-center tw-gap-4">
                  {[
                    { icon: 'ph-facebook-logo', href: 'https://www.facebook.com/' },
                    { icon: 'ph-twitter-logo', href: 'https://www.twitter.com/' },
                    { icon: 'ph-instagram-logo', href: 'https://www.instagram.com/' },
                    { icon: 'ph-youtube-logo', href: 'https://www.youtube.com/' },
                  ].map((social) => (
                    <li key={social.icon}>
                      <a href={social.href} className="tw-w-9 tw-h-9 lh-1 d-inline-flex align-items-center justify-content-center text-white rounded-circle border border-neutral-700 tw-text-sm hover-bg-main-600 hover-text-white hover-border-main-600">
                        <i className={`ph-bold ${social.icon}`}></i>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="container">
        <div className="border-top border-dashed border-neutral-600 border-0 tw-py-8">
          <div className="container container-two">
            <div className="footer-copyright-wrap d-flex align-items-center justify-content-between tw-gap-4 flex-wrap">
              <p className="text--white text-line-1 fw-normal">
                Copyright &copy; 2026{' '}
                <a href="#inicio" className="fw-semibold text-main-600 hover-underline hover-text-white">Simón Horna Alpaca — Ahora Nación</a>{' '}
                · Todos los derechos reservados.
              </p>
              <div>
                <ul className="d-flex tw-gap-4">
                  <li><a className="text-white hover-text-main-600" href="#">Política de Privacidad,</a></li>
                  <li><a className="text-white hover-text-main-600" href="#">Términos y Condiciones</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
