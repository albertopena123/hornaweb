const blogPosts = [
  {
    thumb: '/assets/images/campaign/photo3.jpg',
    date: '10 Sep, 2025',
    title: 'La comunidad nos ha dado su confianza',
    href: '#',
  },
  {
    thumb: '/assets/images/campaign/photo2.jpg',
    date: '10 Sep, 2025',
    title: 'Desarrollo sostenible en la Amazonía',
    href: '#',
  },
  {
    thumb: '/assets/images/campaign/photo7.jpg',
    date: '10 Sep, 2025',
    title: 'Nuestro plan de acción para Madre de Dios',
    href: '#',
  },
  {
    thumb: '/assets/images/campaign/photo8.jpg',
    date: '10 Sep, 2025',
    title: 'Construyendo el futuro de nuestra región',
    href: '#',
  },
]

const Blog = () => {
  return (
    <section id="noticias" className="blog-area pt-120 tw-pb-22">
      <div className="container">
        <div className="row tw-mb-8">
          <div className="col-xl-7 col-lg-7 col-md-8">
            <div className="section-wrapper" data-aos="fade-up" data-aos-duration="800" data-aos-delay="200">
              <div className="section-subtitle tw-text-base text-center bg-main-600 tw-py-2 tw-px-6 tw-mb-4 d-inline-flex align-items-center tw-gap-3 text-white font-body fw-semibold text-uppercase tw-rounded-3xl">
                <span className="tw-w-205 tw-h-205 lh-1 d-inline-block bg-white rounded-circle position-relative z-1"></span>
                Últimas Noticias
                <span className="tw-w-205 tw-h-205 lh-1 d-inline-block bg-white rounded-circle position-relative z-1"></span>
              </div>
              <h2 className="section-title tw-text-170 fw-normal tw-char-animation">
                Noticias de campaña
              </h2>
            </div>
          </div>
          <div className="col-xl-5 col-lg-5 col-md-4">
            <div className="blog-button text-md-end" data-aos="fade-up" data-aos-duration="800" data-aos-delay="300">
              <div className="tw-hover-btn-wrapper d-inline-block">
                <a className="tw-btn-circle tw-hover-btn-item tw-hover-btn tw-w-170-px tw-h-170-px lh-1 d-inline-flex justify-content-center align-items-center bg-main-600 rounded-circle position-relative overflow-hidden" href="#">
                  <span className="d-flex flex-column justify-content-center">
                    <span className="tw-btn-circle-icon text-white tw-text-10 tw-transition-3"><i className="ph ph-arrow-up-right"></i></span>
                    <span className="text-white fw-bold text-center tw-transition-3">Ver Todo</span>
                  </span>
                  <i className="tw-btn-circle-dot bg-white"></i>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          {blogPosts.map((post, i) => (
            <div key={post.title} className="col-xl-6 col-lg-6 col-md-6">
              <div
                className="blog-wrapper bg-white d-flex tw-gap-6 tw-mb-705 tw-p-4 tw-rounded-lg"
                data-aos="fade-up"
                data-aos-duration="800"
                data-aos-delay={String(200 + (i % 2) * 100)}
              >
                <div className="blog-thumb blog-main-thumb position-relative overflow-hidden tw-rounded-lg">
                  <img className="w-img tw-rounded-lg tw-transition-5" src={post.thumb} alt="blog" />
                  <img className="w-img tw-rounded-lg tw-transition-5" src={post.thumb} alt="blog" />
                  <a className="blog-card-image-link d-flex align-items-center justify-content-center w-100 h-100 position-absolute z-1 top-0 start-0" href={post.href}></a>
                </div>
                <div className="blog-wrap d-flex justify-content-between flex-column">
                  <div className="blog-meta tw-mt-205">
                    <ul className="d-flex align-items-center tw-gap-2">
                      <li className="d-inline-flex align-items-center tw-gap-2">
                        <span className="text-main-600 lh-1 d-inline-block"><i className="ph ph-user-plus"></i></span>
                        Por Admin
                      </li>
                      <li className="d-inline-flex align-items-center tw-gap-2">
                        <span className="text-main-600 lh-1 d-inline-block"><i className="ph ph-calendar"></i></span>
                        {post.date}
                      </li>
                    </ul>
                  </div>
                  <div className="blog-content d-flex align-items-center justify-content-between tw-mb-205">
                    <div>
                      <h3 className="blog-title tw-w-300-px tw-text-3xl fw-normal">
                        <a href={post.href}>{post.title}</a>
                      </h3>
                    </div>
                    <div className="blog-button">
                      <a className="tw-w-10 tw-h-10 lh-1 d-inline-flex justify-content-center align-items-center rounded-circle border border-neutral-200 text-heading hover-bg-main-600 hover-text-white hover-border-main-600" href={post.href}>
                        <i className="ph-bold ph-arrow-right"></i>
                      </a>
                    </div>
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

export default Blog
