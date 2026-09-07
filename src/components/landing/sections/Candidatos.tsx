import './candidatos.css'

type Candidato = {
  slug: string
  nombre: string
  cargo: string
  ambito: string
}

// Retratos generados por scripts/build-fotos-candidatos.mjs (una toma por
// candidato; el resto de las fotos del estudio son tomas repetidas).
//
// OJO — Yilmer Gonzales Khan: el archivo original venía rotulado "Tahuamanu",
// pero en la tabla Candidate (datos JNE) figura como candidato provincial por
// MANU, y Tahuamanu corresponde a Wilber Nina Calla. Se usa el dato oficial.
const DESTACADO: Candidato = {
  slug: 'simon-horna',
  nombre: 'Simón Horna Alpaca',
  cargo: 'Gobernador Regional',
  ambito: 'Madre de Dios',
}

const CANDIDATOS: Candidato[] = [
  { slug: 'juan-ticona',      nombre: 'Juan Ticona Quispe',      cargo: 'Alcalde Provincial', ambito: 'Tambopata' },
  { slug: 'yilmer-gonzales',  nombre: 'Yilmer Gonzales Khan',    cargo: 'Alcalde Provincial', ambito: 'Manu' },
  { slug: 'abimael-huaman',   nombre: 'Abimael Huamán Ccolque',  cargo: 'Alcalde Distrital',  ambito: 'Huepetuhe' },
  { slug: 'isaac-cahuana',    nombre: 'Isaac Cahuana Ccama',     cargo: 'Alcalde Distrital',  ambito: 'Laberinto' },
  { slug: 'jhonny-curinambe', nombre: 'Jhonny Curinambe Leyva',  cargo: 'Alcalde Distrital',  ambito: 'Las Piedras' },
  { slug: 'danny-taboada',    nombre: 'Danny Taboada Cáceres',   cargo: 'Alcalde Distrital',  ambito: 'Iberia' },
]

function Retrato({ c, eager = false }: { c: Candidato; eager?: boolean }) {
  return (
    <img
      className="cd-foto"
      src={`/assets/images/candidatos/${c.slug}.webp`}
      srcSet={`/assets/images/candidatos/${c.slug}.webp 560w, /assets/images/candidatos/${c.slug}@1.5x.webp 840w`}
      sizes="(max-width: 575px) 45vw, (max-width: 991px) 30vw, 280px"
      width={560}
      height={747}
      alt={`${c.nombre}, ${c.cargo} de ${c.ambito} por Ahora Nación`}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  )
}

// Sin `data-aos`: la landing usa GSAP ScrollSmoother, que se queda con el scroll
// y deja a AOS sin eventos, así que `aos-animate` nunca llega y los elementos
// quedan clavados en translateY(100px) — desbordando el pie de la sección.
const Candidatos = () => (
  <section id="candidatos" className="py-120 position-relative z-1">
    <div className="container">
      <div className="row justify-content-center text-center">
        <div className="col-lg-8">
          <span className="cd-eyebrow">Elecciones 2026</span>
          <h2 className="cd-title">Nuestros candidatos</h2>
          <p className="cd-sub">
            El equipo de Ahora Nación que se presenta en Madre de Dios: un gobernador
            regional, dos alcaldías provinciales y cuatro distritales.
          </p>
          <span className="cd-flag-stripe" aria-hidden="true"></span>
        </div>
      </div>

      <div className="cd-destacado">
        <div className="cd-destacado-foto">
          <Retrato c={DESTACADO} eager />
        </div>
        <div className="cd-destacado-info">
          <span className="cd-chip cd-chip-oro">{DESTACADO.cargo}</span>
          <h3 className="cd-destacado-nombre">{DESTACADO.nombre}</h3>
          <p className="cd-destacado-ambito">{DESTACADO.ambito}</p>
          <p className="cd-destacado-lema">
            «Todo el poder a las regiones». Madre de Dios decide su propio futuro.
          </p>
        </div>
      </div>

      <ul className="cd-grid">
        {CANDIDATOS.map((c) => (
          <li key={c.slug} className="cd-card">
            <div className="cd-card-foto">
              <Retrato c={c} />
            </div>
            <div className="cd-card-info">
              <span className="cd-chip">{c.cargo}</span>
              <h3 className="cd-card-nombre">{c.nombre}</h3>
              <p className="cd-card-ambito">{c.ambito}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </section>
)

export default Candidatos
