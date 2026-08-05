const Hero = () => {
  return (
    <section id="inicio" className="banner-area position-relative z-1 overflow-hidden tw-py-12">
      {/* Background Peruvian flag overlay with smooth fade */}
      <div 
        className="position-absolute top-0 end-0 h-100 z-n1 pointer-events-none d-none d-md-block"
        style={{
          width: '55%',
          opacity: 0.85,
          overflow: 'hidden',
          maskImage: 'linear-gradient(to right, transparent 0%, black 35%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 35%)',
        }}
      >
        <img
          src="/assets/images/shapes/bandera-peru.png"
          alt="Bandera del Perú"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top right',
            filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))',
          }}
        />
      </div>

      <div className="container-fluid tw-px-6">
        <div className="row align-items-center">
          {/* Left Column: Text & Information */}
          <div className="col-xl-6 col-lg-6">
            <div className="banner-left position-relative z-2" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
              <div className="tw-mb-8">
                {/* Party badge */}
                <div className="d-flex align-items-center tw-gap-3 tw-mb-5 flex-wrap">
                  <img
                    src="/assets/images/logo/logo-an.webp"
                    alt="Ahora Nación"
                    style={{width: '46px', height: '46px', objectFit: 'contain', borderRadius: '8px', border: '2px solid rgba(255,255,255,0.6)', background: '#fff', padding: '2px'}}
                  />
                  <span 
                    className="banner-subtitle text-white tw-py-3 tw-px-6 tw-text-base tw-rounded-3xl fw-bold font-body text-uppercase position-relative z-1"
                    style={{background: 'var(--an-red)', boxShadow: '0 4px 15px rgba(233, 3, 5, 0.4)'}}
                  >
                    Candidato al Gobierno Regional 2027–2030
                  </span>
                </div>

                <h1 className="banner-title text-white tw-mb-6 fw-bold" style={{fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.15}}>
                  Simón Horna Alpaca
                </h1>

                <p className="tw-text-xl fw-bold tw-mb-4" style={{color: '#FFD700', letterSpacing: '0.5px'}}>
                  "Todo el poder a las regiones para conquistar los mercados del mundo"
                </p>

                {/* Stats row */}
                <div className="d-flex tw-gap-6 tw-mb-8 flex-wrap">
                  {[
                    { num: '4', label: 'Dimensiones Estratégicas' },
                    { num: '17', label: 'Propuestas Concretas' },
                    { num: '3', label: 'Provincias Beneficiadas' },
                  ].map((s) => (
                    <div key={s.label} style={{borderLeft: '4px solid var(--an-red)', paddingLeft: '14px', background: 'rgba(255,255,255,0.05)', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px', borderRadius: '0 8px 8px 0'}}>
                      <div style={{fontSize: '30px', fontWeight: 800, color: '#fff', lineHeight: 1}}>{s.num}</div>
                      <div style={{fontSize: '11px', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px'}}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="banner-buttton-wrap d-flex align-items-center tw-gap-5 flex-wrap">
                <div>
                  <a 
                    className="tw-hover-btn text-white fw-bold tw-py-4 tw-px-8 d-inline-block" 
                    href="#plan"
                    style={{background: 'var(--an-red)', borderRadius: '8px', boxShadow: '0 6px 20px rgba(233, 3, 5, 0.4)'}}
                  >
                    Ver propuestas
                  </a>
                </div>
                <div>
                  <a 
                    className="tw-hover-btn d-inline-block tw-py-4 tw-px-8 fw-bold" 
                    href="#contacto"
                    style={{border: '2px solid rgba(255,255,255,0.7)', color: '#fff', borderRadius: '8px', background: 'rgba(255,255,255,0.1)'}}
                  >
                    Súmate
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Candidate Photo (Larger & Prominent) */}
          <div className="col-xl-6 col-lg-6 text-center text-lg-end position-relative tw-mt-8 tw-mt-lg-0">
            <div 
              className="d-inline-block position-relative z-2" 
              data-aos="fade-up" 
              data-aos-duration="1000" 
              data-aos-delay="300"
              style={{maxWidth: '100%'}}
            >
              {/* Glow backdrop behind candidate */}
              <div 
                style={{
                  position: 'absolute',
                  top: '10%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '80%',
                  height: '80%',
                  background: 'radial-gradient(circle, rgba(233, 3, 5, 0.35) 0%, rgba(13, 27, 42, 0) 70%)',
                  filter: 'blur(40px)',
                  zIndex: -1,
                }}
              />

              {/* Large Candidate Image */}
              <img
                src="/assets/images/thumbs/simon-horna.png"
                alt="Simón Horna Alpaca - Candidato Madre de Dios"
                style={{
                  maxHeight: '680px',
                  width: 'auto',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 15px 35px rgba(0, 0, 0, 0.6))',
                  display: 'block',
                  margin: '0 auto',
                }}
              />

              {/* Floating Region Badge */}
              <div 
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '10px',
                  background: 'rgba(13, 27, 42, 0.95)',
                  border: '2px solid var(--an-red)',
                  color: '#fff',
                  padding: '12px 20px',
                  borderRadius: '16px',
                  fontSize: '14px',
                  fontWeight: 700,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(10px)',
                  textAlign: 'left',
                }}
              >
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span style={{fontSize: '18px'}}>🇵🇪</span>
                  <span>Madre de Dios</span>
                </div>
                <div style={{fontWeight: 400, fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '2px'}}>
                  Tambopata · Manu · Tahuamanu
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
