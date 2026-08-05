import { useState } from 'react'

// Tarjetas resumen: beneficios en lenguaje ciudadano (spec 2026-08-02).
const tarjetas = [
  {
    id: 'social',
    icon: '🏥',
    color: '#C0392B',
    title: 'Salud y Educación',
    frases: ['Menos anemia infantil', 'Colegios con internet', 'Doctores en zonas rurales'],
  },
  {
    id: 'economico',
    icon: '🌿',
    color: '#27AE60',
    title: 'Economía y Empleo',
    frases: ['Castaña y cacao al mundo', 'Más turismo', 'Minería formal'],
  },
  {
    id: 'ambiental',
    icon: '🌎',
    color: '#2E86C1',
    title: 'Amazonía Protegida',
    frases: ['Bosques cuidados', 'Ríos limpios', 'Productos con sello amazónico'],
  },
  {
    id: 'institucional',
    icon: '🏛️',
    color: '#7D3C98',
    title: 'Gobierno que Funciona',
    frases: ['Menos delincuencia', 'Trámites simples', 'Cero corrupción'],
  },
]

const planDimensions = [
  {
    id: 'social',
    icon: '🏥',
    color: '#C0392B',
    label: 'Dimensión Social',
    title: 'Educación, Salud y Bienestar para Todos',
    desc: 'Reducir brechas históricas en servicios de salud, educación, vivienda y saneamiento para las familias de Tambopata, Manu y Tahuamanu, especialmente en comunidades indígenas y zonas rurales.',
    ejes: [
      {
        name: '📚 Educación de Calidad',
        items: [
          'Mejorar infraestructura educativa priorizando zonas rurales y comunidades nativas',
          'Implementar aulas inteligentes y conectividad digital en el 70% de instituciones',
          'Capacitar al 85% de docentes en competencias digitales e innovación pedagógica',
          'Fortalecer la Educación Intercultural Bilingüe (EIB) con materiales contextualizados',
          'Articular formación técnica con castaña, cacao, turismo y bioeconomía amazónica',
        ],
        meta: '80% de II.EE. priorizadas con infraestructura mejorada al 2030',
      },
      {
        name: '🏥 Salud Universal',
        items: [
          'Reducir la anemia infantil por debajo del 40% (actualmente 45.5%)',
          'Ampliar cobertura de vacunación al 85% en menores de 36 meses',
          'Modernizar hospitales y centros de salud del primer nivel de atención',
          'Incorporar especialistas médicos y brigadas móviles a zonas remotas',
          'Digitalizar historias clínicas y servicios de telemedicina',
        ],
        meta: 'Cobertura mínima del 85% en atención materno-infantil al 2030',
      },
      {
        name: '🏠 Vivienda y Saneamiento',
        items: [
          'Ampliar acceso a agua potable y saneamiento en zonas rurales',
          'Impulsar drenaje pluvial y ordenamiento territorial urbano',
          'Promover vivienda digna con inversión pública responsable',
        ],
        meta: 'Reducción del 30% en brecha de saneamiento básico al 2030',
      },
    ],
    progress: 85,
  },
  {
    id: 'economico',
    icon: '🌿',
    color: '#27AE60',
    label: 'Dimensión Económica',
    title: 'Bioeconomía, Turismo y Empleo Digno',
    desc: 'Impulsar la economía regional mediante agricultura, forestería sostenible, turismo ecológico, comercio exterior y emprendimientos MYPE, aprovechando la Carretera Interoceánica Sur.',
    ejes: [
      {
        name: '🌳 Agricultura y Agroforestería',
        items: [
          'Fomentar la producción de castaña, cacao y plantas medicinales con valor agregado',
          'Impulsar la agroforestería como modelo productivo sostenible',
          'Crear centros de acopio y procesamiento regional',
          'Vincular productores con mercados nacionales e internacionales',
        ],
        meta: 'Incrementar en 40% las exportaciones agroforestales regionales al 2030',
      },
      {
        name: '🏅 Turismo Sostenible',
        items: [
          'Posicionar Madre de Dios como destino de ecoturismo de clase mundial',
          'Desarrollar circuitos turísticos en Tambopata, Manu y Tahuamanu',
          'Promover el turismo vivencial con comunidades indígenas',
          'Mejorar infraestructura turística y conectividad aérea-fluvial',
        ],
        meta: 'Duplicar el número de visitantes nacionales e internacionales al 2030',
      },
      {
        name: '⛏️ Minería Formal y Energía',
        items: [
          'Implementar la formalización minera inteligente con plazos claros',
          'Combatir la minería ilegal con tecnología e inteligencia territorial',
          'Promover energías renovables para zonas rurales aisladas',
          'Generar empleos formales en el sector extractivo responsable',
        ],
        meta: '80% de mineros artesanales en proceso de formalización al 2030',
      },
    ],
    progress: 78,
  },
  {
    id: 'ambiental',
    icon: '🌎',
    color: '#2E86C1',
    label: 'Dimensión Ambiental',
    title: 'Amazonía Protegida y Economía Circular',
    desc: 'Proteger el patrimonio natural de Madre de Dios: biodiversidad, áreas naturales protegidas, recursos hídricos y recuperación de áreas degradadas, como eje transversal de toda la gestión.',
    ejes: [
      {
        name: '🦜 Biodiversidad y Recursos Naturales',
        items: [
          'Fortalecer la gestión de áreas naturales protegidas y zonas de amortiguamiento',
          'Recuperar áreas degradadas por actividades ilegales',
          'Apoyar las concesiones de conservación y ecoturismo',
          'Proteger cuencas hidrográficas y fuentes de agua',
        ],
        meta: '100% de áreas naturales protegidas con planes de manejo actualizados al 2030',
      },
      {
        name: '♻️ Economía Circular y Bioeconomía',
        items: [
          'Promover la transformación de residuos en insumos productivos',
          'Impulsar iniciativas de bioproductos con identidad amazónica',
          'Fomentar la certificación ecológica para productos regionales',
          'Articular academia, empresa y gobierno en innovación verde',
        ],
        meta: 'Al menos 20 iniciativas de bioeconomía implementadas al 2030',
      },
    ],
    progress: 72,
  },
  {
    id: 'institucional',
    icon: '🏛️',
    color: '#7D3C98',
    label: 'Dimensión Institucional',
    title: 'Gobierno Moderno, Transparente y Eficiente',
    desc: 'Fortalecer la gestión pública regional con modernización administrativa, lucha contra la corrupción, seguridad ciudadana, ordenamiento territorial y conectividad para toda la región.',
    ejes: [
      {
        name: '🔒 Seguridad Ciudadana',
        items: [
          'Implementar un sistema regional de seguridad con enfoque preventivo',
          'Fortalecer la Policía Nacional y serenazgo municipal',
          'Usar tecnología e inteligencia para combatir crimen organizado',
          'Erradicar la minería ilegal y tala ilegal con operativos coordinados',
        ],
        meta: 'Reducir índice delictivo en 25% en Puerto Maldonado al 2030',
      },
      {
        name: '🛣️ Infraestructura y Conectividad',
        items: [
          'Mejorar la conectividad vial entre las tres provincias',
          'Desarrollar puertos fluviales para el comercio con Brasil y Bolivia',
          'Ampliar acceso a internet de banda ancha en zonas rurales',
          'Construir infraestructura logística en zonas fronterizas',
        ],
        meta: '70% de centros poblados con acceso a internet de calidad al 2030',
      },
      {
        name: '⚖️ Transparencia y Modernización',
        items: [
          'Digitalizar procesos administrativos del Gobierno Regional',
          'Implementar portal de transparencia y rendición de cuentas',
          'Simplificar trámites para ciudadanos y emprendedores',
          'Fortalecer el control ciudadano y participación en presupuesto',
        ],
        meta: 'Certificación de gestión pública moderna al 2028',
      },
    ],
    progress: 90,
  },
]

const Propuestas = () => {
  const [showPlan, setShowPlan] = useState(false)
  const [activeTab, setActiveTab] = useState('social')
  const [activeEje, setActiveEje] = useState(0)

  const current = planDimensions.find((d) => d.id === activeTab)

  return (
    <section id="plan" className="py-120 position-relative z-1" style={{background: 'linear-gradient(135deg, #0D1B2A 0%, #1a2a3a 100%)'}}>
      <div className="container">
        {/* Header */}
        <div className="row justify-content-center tw-mb-12">
          <div className="col-xl-8">
            <div className="text-center" data-aos="fade-up" data-aos-duration="800">
              <div className="section-subtitle text-center bg-main-600 tw-py-2 tw-px-6 tw-mb-4 d-inline-flex align-items-center tw-gap-3 text-white font-body fw-semibold text-uppercase tw-rounded-3xl">
                <span className="tw-w-205 tw-h-205 lh-1 d-inline-block bg-white rounded-circle position-relative z-1"></span>
                Propuestas para Madre de Dios
                <span className="tw-w-205 tw-h-205 lh-1 d-inline-block bg-white rounded-circle position-relative z-1"></span>
              </div>
              <h2 className="section-title tw-text-170 fw-normal text-white">
                Cuatro compromisos, en simple
              </h2>
            </div>
          </div>
        </div>

        {/* 4 tarjetas */}
        <div className="row">
          {tarjetas.map((t, i) => (
            <div key={t.id} className="col-xl-3 col-lg-6 col-md-6 tw-mb-6" data-aos="fade-up" data-aos-duration="800" data-aos-delay={String(100 + i * 100)}>
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '20px',
                padding: '32px 24px',
                border: `1px solid ${t.color}55`,
                borderTop: `4px solid ${t.color}`,
                height: '100%',
                backdropFilter: 'blur(10px)',
                textAlign: 'center',
              }}>
                <div style={{fontSize: '52px', marginBottom: '12px', lineHeight: 1}}>{t.icon}</div>
                <h3 style={{color: '#fff', fontSize: '22px', fontWeight: 800, marginBottom: '18px'}}>{t.title}</h3>
                <div className="d-flex flex-column" style={{gap: '10px'}}>
                  {t.frases.map((f) => (
                    <div key={f} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      textAlign: 'left',
                    }}>
                      <span style={{
                        minWidth: '22px', height: '22px', borderRadius: '50%',
                        background: `${t.color}30`, border: `1px solid ${t.color}`,
                        color: t.color, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '12px', fontWeight: 700,
                      }}>✓</span>
                      <span style={{color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: 500}}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Toggle plan completo */}
        <div className="row tw-mt-6">
          <div className="col-12 text-center">
            <button
              type="button"
              onClick={() => setShowPlan((v) => !v)}
              className="tw-hover-btn text-white fw-bold tw-py-4 tw-px-8 d-inline-block"
              style={{background: 'var(--an-red)', borderRadius: '8px', border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(233, 3, 5, 0.4)'}}
            >
              {showPlan ? 'Ocultar el plan completo ▲' : 'Ver el plan completo ▼'}
            </button>
          </div>
        </div>

        {/* Detalle del plan (plegado por defecto) */}
        {showPlan && current && (
          <div className="tw-mt-10">
            {/* Tabs de dimensión */}
            <div className="row tw-mb-8">
              <div className="col-12">
                <div className="d-flex justify-content-center flex-wrap tw-gap-3">
                  {planDimensions.map((dim) => (
                    <button
                      key={dim.id}
                      onClick={() => { setActiveTab(dim.id); setActiveEje(0) }}
                      style={{
                        padding: '12px 24px',
                        borderRadius: '50px',
                        border: activeTab === dim.id ? `2px solid ${dim.color}` : '2px solid rgba(255,255,255,0.2)',
                        background: activeTab === dim.id ? dim.color : 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        fontWeight: activeTab === dim.id ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <span style={{fontSize: '18px'}}>{dim.icon}</span>
                      <span>{dim.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="row" key={current.id}>
              {/* Izquierda: overview de la dimensión */}
              <div className="col-xl-4 col-lg-5 tw-mb-8">
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '20px',
                  padding: '32px',
                  border: `1px solid ${current.color}40`,
                  height: '100%',
                  backdropFilter: 'blur(10px)',
                }}>
                  <div style={{fontSize: '48px', marginBottom: '16px'}}>{current.icon}</div>
                  <h3 style={{color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '12px', lineHeight: 1.3}}>
                    {current.title}
                  </h3>
                  <p style={{color: 'rgba(255,255,255,0.75)', fontSize: '14px', lineHeight: 1.7, marginBottom: '24px'}}>
                    {current.desc}
                  </p>
                  <div>
                    <p style={{color: 'rgba(255,255,255,0.5)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px'}}>Ejes de Acción</p>
                    {current.ejes.map((eje, i) => (
                      <button
                        key={eje.name}
                        onClick={() => setActiveEje(i)}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: 'none',
                          background: activeEje === i ? `${current.color}20` : 'transparent',
                          color: activeEje === i ? current.color : 'rgba(255,255,255,0.7)',
                          fontWeight: activeEje === i ? 700 : 400,
                          cursor: 'pointer',
                          fontSize: '14px',
                          marginBottom: '4px',
                          transition: 'all 0.2s ease',
                          borderLeft: activeEje === i ? `3px solid ${current.color}` : '3px solid transparent',
                        }}
                      >
                        {eje.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Derecha: detalle del eje activo */}
              <div className="col-xl-8 col-lg-7">
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '20px',
                  padding: '32px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  height: '100%',
                  backdropFilter: 'blur(10px)',
                }}>
                  <h4 style={{color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '8px'}}>
                    {current.ejes[activeEje]?.name}
                  </h4>
                  <div style={{
                    display: 'inline-block',
                    background: `${current.color}20`,
                    color: current.color,
                    borderRadius: '50px',
                    padding: '4px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '24px',
                    border: `1px solid ${current.color}40`,
                  }}>
                    🎯 Meta: {current.ejes[activeEje]?.meta}
                  </div>
                  <div className="d-flex flex-column" style={{gap: '12px'}}>
                    {current.ejes[activeEje]?.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '14px 16px',
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <span style={{
                          minWidth: '28px',
                          height: '28px',
                          background: `${current.color}20`,
                          border: `1px solid ${current.color}60`,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: current.color,
                          marginTop: '1px',
                        }}>
                          {idx + 1}
                        </span>
                        <p style={{color: 'rgba(255,255,255,0.85)', fontSize: '15px', lineHeight: 1.6, margin: 0}}>
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default Propuestas
