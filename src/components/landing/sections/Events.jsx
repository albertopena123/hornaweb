const eventItems = [
  {
    thumb: '/assets/images/campaign/photo6.jpg',
    date: '13 Jul, 2025',
    title: 'Foro de Acción Comunitaria',
    location: 'Puerto Maldonado',
    time: '20 Jul 2025 10:30 - 24 Jul 2025 17:00',
    desc: 'Espacio de diálogo ciudadano para discutir las propuestas de nuestra campaña y escuchar las necesidades de la comunidad.',
    speaker: 'Carlos Mamani',
    role: 'Candidato',
  },
  {
    thumb: '/assets/images/campaign/photo1.jpg',
    date: '14 Jul, 2025',
    title: 'Taller de Capacitación para Voluntarios',
    location: 'Puerto Maldonado',
    time: '20 Jul 2025 10:30 - 24 Jul 2025 17:00',
    desc: 'Capacitación para nuestros voluntarios sobre estrategias de campaña, comunicación y movilización ciudadana.',
    speaker: 'María Quispe',
    role: 'Coordinadora',
  },
  {
    thumb: '/assets/images/campaign/photo5.jpg',
    date: '15 Jul, 2025',
    title: 'Campaña de Registro Electoral',
    location: 'Puerto Maldonado',
    time: '20 Jul 2025 10:30 - 24 Jul 2025 17:00',
    desc: 'Jornada para facilitar el registro electoral de los ciudadanos de Madre de Dios y promover la participación democrática.',
    speaker: 'José Flores',
    role: 'Asesor Político',
  },
  {
    thumb: '/assets/images/campaign/photo4.jpg',
    date: '16 Jul, 2025',
    title: 'Campaña de Registro - Zona Rural',
    location: 'Iberia, Madre de Dios',
    time: '20 Jul 2025 10:30 - 24 Jul 2025 17:00',
    desc: 'Llegamos a las zonas rurales para garantizar que todos los ciudadanos tengan voz en las próximas elecciones.',
    speaker: 'Ana Torres',
    role: 'Comunicaciones',
  },
]

const Events = () => {
  return (
    <section id="eventos" className="event-area pt-120">
      <div className="container">
        <div className="row align-items-center tw-mb-14">
          <div className="col-xl-6 col-lg-8 col-md-8">
            <div className="section-wrapper" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
              <div className="section-subtitle tw-text-base text-center bg-main-600 tw-py-2 tw-px-6 tw-mb-4 d-inline-flex align-items-center tw-gap-3 text-white font-body fw-semibold text-uppercase tw-rounded-3xl">
                <span className="tw-w-205 tw-h-205 lh-1 d-inline-block bg-white rounded-circle position-relative z-1"></span>
                Próximos Eventos
                <span className="tw-w-205 tw-h-205 lh-1 d-inline-block bg-white rounded-circle position-relative z-1"></span>
              </div>
              <h2 className="section-title tw-text-170 fw-normal tw-char-animation">
                Próximas actividades
              </h2>
            </div>
          </div>
          <div className="col-xl-6 col-lg-4 col-md-4">
            <div className="solution-button text-md-end" data-aos="fade-up" data-aos-duration="800" data-aos-delay="300">
              <div className="tw-hover-btn-wrapper d-inline-block">
                <a className="tw-btn-circle tw-hover-btn-item tw-hover-btn tw-w-170-px tw-h-170-px lh-1 d-inline-flex justify-content-center align-items-center bg-main-600 rounded-circle position-relative overflow-hidden" href="#">
                  <span className="d-flex flex-column justify-content-center">
                    <span className="tw-btn-circle-icon text-white tw-text-10 tw-transition-3"><i className="ph ph-arrow-up-right"></i></span>
                    <span className="text-white fw-bold text-center tw-transition-3">Ver Todos</span>
                  </span>
                  <i className="tw-btn-circle-dot bg-white"></i>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="row project-panel-area">
          {eventItems.map((ev) => (
            <div key={ev.title} className="col-xl-12 project-panel">
              <div className="event-wrapper bg-white d-flex align-items-center tw-gap-6 tw-p-305 tw-rounded-lg tw-mb-705">
                <div className="event-thumb position-relative z-1">
                  <a className="d-block" href="#">
                    <img className="tw-rounded-lg" src={ev.thumb} alt="thumb" />
                  </a>
                  <div className="event-tag d-inline-flex tw-gap-2 position-absolute end-0 top-0 tw-mt-205">
                    <span className="text-main-600 tw-text-lg lh-1 d-inline-block"><i className="ph ph-calendar"></i></span>
                    <h3 className="tw-text-base fw-semibold font-body text-white">{ev.date}</h3>
                  </div>
                </div>
                <div className="event-wrap d-flex justify-content-between align-items-center w-100">
                  <div className="event-content">
                    <h4 className="event-title tw-text-120 fw-normal tw-mb-4">{ev.title}</h4>
                    <div className="event-list tw-mb-4">
                      <ul className="d-flex tw-gap-4">
                        <li className="d-inline-flex align-items-center tw-gap-2">
                          <span className="text-main-600 lh-1 d-inline-block tw-text-xl"><i className="ph ph-map-pin"></i></span>
                          {ev.location}
                        </li>
                        <li className="d-inline-flex align-items-center tw-gap-2">
                          <span className="text-main-600 lh-1 d-inline-block tw-text-xl"><i className="ph ph-clock"></i></span>
                          {ev.time}
                        </li>
                      </ul>
                    </div>
                    <p className="tw-text-xl tw-mb-4">{ev.desc}</p>
                    <div className="d-flex tw-gap-3">
                      <div className="border border-2 border-main-600 rounded-circle">
                        <img className="rounded-circle" src="/assets/images/thumbs/an-avatar.png" alt="Ahora Nación" />
                      </div>
                      <div>
                        <h5 className="tw-text-505 fw-normal text-uppercase">{ev.speaker}</h5>
                        <p>{ev.role}</p>
                      </div>
                    </div>
                  </div>
                  <div className="tw-me-4">
                    <a className="tw-hover-btn bg-main-600 text-white fw-bold tw-py-4 tw-px-10 d-inline-block hover-text-main-600" href="#">
                      Ver detalles
                      <span className="tw-hover-btn-circle-dot bg-black"></span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Events
