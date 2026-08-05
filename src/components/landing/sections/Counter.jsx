const counterItems = [
  { end: 174, suffix: 'k', label: 'Habitantes en Madre de Dios', duration: 2 },
  { end: 85, suffix: 'k', label: 'km² de Selva Amazónica', duration: 2 },
  { end: 17, suffix: '+', label: 'Propuestas de Gobierno', duration: 1 },
  { end: 3, suffix: '', label: 'Provincias Beneficiadas', duration: 1 },
]

const Counter = () => {
  return (
    <section className="counter-area pb-120 tw-mx-20">
      <div className="container">
        <div className="row">
          <div className="col-xl-12">
            <div className="counter-wrapper d-flex align-items-center justify-content-between flex-wrap" style={{gap: '24px'}}>
              {counterItems.map((item, i) => (
                <div key={item.label} className="counter-item" data-aos="fade-up" data-aos-duration="800" data-aos-delay={String(200 + i * 100)}>
                  <h2 className="counter-title tw-text-25 fw-normal font-heading text-white mb-0 lh-1">
                    <span
                      className="purecounter"
                      data-purecounter-duration={String(item.duration)}
                      data-purecounter-end={String(item.end)}
                    ></span>
                    {item.suffix}
                  </h2>
                  <p className="counter-paragraph tw-text-lg fw-medium text-white">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Counter
