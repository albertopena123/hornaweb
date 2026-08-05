const About = () => {
  return (
    <section id="nosotros" className="about-area pt-120 tw-pb-22 position-relative z-1">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-xl-5 col-lg-6">
            <div className="about-thumb position-relative" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
              {/* Candidate photo styled */}
              <div style={{
                position: 'relative',
                borderRadius: '16px',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #C0392B 0%, #922B21 100%)',
                padding: '0',
              }}>
                <img
                  className="w-100"
                  src="/assets/images/thumbs/simon-horna.png"
                  alt="Simón Horna Alpaca"
                  style={{
                    borderRadius: '16px',
                    display: 'block',
                    objectFit: 'contain',
                    background: 'linear-gradient(to bottom, #f8f8f8, #e8e8e8)',
                  }}
                />
                {/* Party badge overlay */}
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <img src="/assets/images/logo/logo-an.webp" alt="AN" style={{width: '32px', height: '32px', objectFit: 'contain'}} />
                  <div>
                    <div style={{fontSize: '10px', fontWeight: 700, color: '#C0392B', textTransform: 'uppercase'}}>Ahora Nación</div>
                    <div style={{fontSize: '9px', color: '#888'}}>Madre de Dios</div>
                  </div>
                </div>
              </div>

              {/* Experience badge */}
              <div className="about-thumb-badge position-absolute tw-bottom-15 tw-start-n15">
                <div style={{
                  background: '#C0392B',
                  color: '#fff',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  textAlign: 'center',
                  boxShadow: '0 8px 24px rgba(192,57,43,0.4)',
                  minWidth: '140px',
                }}>
                  <div style={{fontSize: '32px', fontWeight: 800, lineHeight: 1}}>2022</div>
                  <div style={{fontSize: '11px', marginTop: '4px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px'}}>Experiencia Política</div>
                  <div style={{fontSize: '10px', opacity: 0.8}}>Amor por Madre de Dios</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-7 col-lg-6">
            <div className="about-wrapper" data-aos="fade-up" data-aos-duration="800" data-aos-delay="300">
              <div className="section-wrapper tw-mb-6">
                <div className="section-subtitle text-center bg-main-600 tw-py-2 tw-px-6 tw-mb-4 d-inline-flex align-items-center tw-gap-3 text-white font-body fw-semibold text-uppercase tw-rounded-3xl">
                  <span className="tw-w-205 tw-h-205 lh-1 d-inline-block bg-white rounded-circle position-relative z-1"></span>
                  Conoce al Candidato
                  <span className="tw-w-205 tw-h-205 lh-1 d-inline-block bg-white rounded-circle position-relative z-1"></span>
                </div>
                <h2 className="section-title tw-text-170 fw-normal tw-char-animation">
                  Simón Horna Alpaca — Comprometido con Madre de Dios
                </h2>
                <p className="tw-text-505 fw-normal tw-mt-4">
                  Líder regional con arraigo en Tambopata, Manu y Tahuamanu. Postula con{' '}
                  <strong>Ahora Nación</strong> para hacer de Madre de Dios la puerta de la
                  Amazonía hacia Brasil y Bolivia, con desarrollo sostenible y oportunidades para todos.
                </p>
              </div>
              <div className="about-list tw-mb-8">
                <ul className="d-flex flex-column tw-gap-4">
                  {[
                    'Desarrollo sostenible con bioeconomía amazónica',
                    'Educación intercultural y salud universal',
                    'Gobierno transparente, moderno y cercano',
                  ].map((item) => (
                    <li key={item} className="d-flex align-items-center tw-gap-3">
                      <span className="tw-w-6 tw-h-6 lh-1 d-inline-flex justify-content-center align-items-center bg-main-600 text-white rounded-circle tw-text-sm">
                        <i className="ph-bold ph-check"></i>
                      </span>
                      <span className="tw-text-505 fw-normal">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="d-flex tw-gap-4 flex-wrap">
                <a className="tw-hover-btn bg-main-600 text-white fw-bold tw-py-4 tw-px-10 d-inline-block hover-text-main-600" href="#plan">
                  Ver Plan de Gobierno
                  <span className="tw-hover-btn-circle-dot bg-black"></span>
                </a>
                <a className="tw-hover-btn fw-bold tw-py-4 tw-px-10 d-inline-block" href="#contacto"
                  style={{border: '2px solid #C0392B', color: '#C0392B', borderRadius: '4px'}}>
                  Contáctanos
                  <span className="tw-hover-btn-circle-dot" style={{background: '#C0392B'}}></span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default About
