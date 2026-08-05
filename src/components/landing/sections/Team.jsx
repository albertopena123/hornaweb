const teamMembers = [
  {
    name: 'Simón Horna Alpaca',
    role: 'Candidato al Gobierno Regional',
    thumb: '/assets/images/thumbs/simon-horna.png',
    isCandidate: true,
  },
  {
    name: 'Equipo de Campaña',
    role: 'Coordinación Regional',
    thumb: '/assets/images/campaign/photo8.jpg',
    isCandidate: false,
  },
  {
    name: 'Voluntarios Ahora Nación',
    role: 'Organización Territorial',
    thumb: '/assets/images/campaign/photo3.jpg',
    isCandidate: false,
  },
  {
    name: 'Consejo Técnico',
    role: 'Asesoría y Planificación',
    thumb: '/assets/images/campaign/photo2.jpg',
    isCandidate: false,
  },
]

const socialLinks = [
  { icon: 'ph-facebook-logo', href: 'https://www.facebook.com/' },
  { icon: 'ph-twitter-logo', href: 'https://www.twitter.com/' },
  { icon: 'ph-instagram-logo', href: 'https://www.instagram.com/' },
  { icon: 'ph-youtube-logo', href: 'https://www.youtube.com/' },
]

const Team = () => {
  return (
    <section id="equipo" className="team-area pt-120 tw-pb-22 position-relative z-1">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-6">
            <div className="section-wrapper text-center tw-mb-14" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
              <div className="section-subtitle tw-text-base text-center bg-main-600 tw-py-2 tw-px-6 tw-mb-4 d-inline-flex align-items-center tw-gap-3 text-white font-body fw-semibold text-uppercase tw-rounded-3xl">
                <span className="tw-w-205 tw-h-205 lh-1 d-inline-block bg-white rounded-circle position-relative z-1"></span>
                Únete como Voluntario
                <span className="tw-w-205 tw-h-205 lh-1 d-inline-block bg-white rounded-circle position-relative z-1"></span>
              </div>
              <h2 className="section-title tw-text-170 fw-normal tw-char-animation">
                El equipo
              </h2>
            </div>
          </div>
        </div>
        <div className="row">
          {teamMembers.map((member, i) => (
            <div key={member.name} className="col-xl-3 col-lg-6 col-md-6">
              <div
                className="team-wrapper tw-mb-705 overflow-hidden tw-rounded-lg"
                data-aos="fade-up"
                data-aos-duration="800"
                data-aos-delay={String(200 + i * 100)}
              >
                <div className="team-thumb position-relative z-1 overflow-hidden">
                  <a className="d-block" href="#">
                    <img
                      className="tw-rounded-lg tw-transition-4 w-100"
                      src={member.thumb}
                      alt={member.name}
                      style={member.isCandidate ? {
                        objectFit: 'contain',
                        background: 'linear-gradient(135deg, #f5f5f5, #e8e8e8)',
                      } : {}}
                    />
                  </a>
                  <div className="team-wrap position-absolute tw-rounded-lg">
                    <div className="team-content tw-mb-3">
                      <h3 className="team-title tw-text-505 fw-normal text-uppercase">
                        <a href="#">{member.name}</a>
                      </h3>
                      <p className="team-paragraph">{member.role}</p>
                    </div>
                    <div className="team-social">
                      <ul className="d-flex justify-content-center tw-gap-2">
                        {socialLinks.map((s) => (
                          <li key={s.icon}>
                            <a
                              href={s.href}
                              className="tw-w-9 tw-h-9 lh-1 d-inline-flex justify-content-center align-items-center rounded-circle border border-neutral-200 text-heading hover-bg-main-600 hover-border-main-600 hover-text-white"
                            >
                              <i className={`ph-bold ${s.icon}`}></i>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
      </div>
    </section>
  )
}

export default Team
