# Rediseño visual del landing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reducir el landing `/` de 14 secciones a 8 bloques visuales donde las propuestas se capten en segundos, sin perder el detalle del plan (queda plegado).

**Architecture:** El landing es una plantilla legacy (Politicly) portada a Next.js: componentes JSX de puro markup bajo `src/components/landing/`, compuestos por `LandingPage.tsx` (client component que carga scripts jQuery/GSAP en orden). Se crean 2 componentes nuevos (`Propuestas`, `CierreCta`) con el mismo estilo (clases de plantilla + estilos inline, como el actual `WorkPlan.jsx`), se eliminan 7 secciones y se retocan 5.

**Tech Stack:** Next.js (App Router), React 19, CSS de plantilla Bootstrap/legacy (NO Tailwind en el landing), scripts legacy jQuery/AOS/GSAP.

## Global Constraints

- **AGENTS.md:** este Next.js tiene breaking changes; ante cualquier duda de API consultar `node_modules/next/dist/docs/`. (Estas tareas solo tocan markup de client components, no APIs de Next.)
- Spec fuente: `docs/superpowers/specs/2026-08-02-landing-rediseno-visual-design.md`.
- No hay test-runner para el landing (markup de plantilla): el ciclo de verificación es visual — dev server en `http://localhost:3000/` + navegador (Playwright MCP o Chrome). Cada tarea termina con verificación en navegador antes de commitear.
- Los textos de las tarjetas y CTAs deben copiarse VERBATIM del spec (español, lenguaje ciudadano).
- Estilo de código: igual que los archivos vecinos (estilos inline + clases `tw-*`/Bootstrap de la plantilla, sin comillas dobles/semicolons distintos al vecino).

---

### Task 1: Crear `Propuestas.tsx` y reemplazar Features/Vision/WorkPlan/Solutions

**Files:**
- Create: `src/components/landing/sections/Propuestas.tsx`
- Modify: `src/components/landing/LandingPage.tsx`
- Delete: `src/components/landing/sections/Features.jsx`, `Vision.jsx`, `WorkPlan.jsx`, `Solutions.jsx`

**Interfaces:**
- Consumes: array `planDimensions` que hoy vive en `WorkPlan.jsx` líneas 3–159 (se copia VERBATIM, sin editar ni un string).
- Produces: componente default-export `Propuestas` con `<section id="plan">` (el ancla que usan Hero, About y Header).

- [ ] **Step 1: Crear `src/components/landing/sections/Propuestas.tsx`**

Contenido completo (el array `planDimensions` se copia textual de `WorkPlan.jsx` líneas 3–159 — es data pura, no editarla):

```tsx
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

// >>> PEGAR AQUÍ el array `planDimensions` copiado VERBATIM de
// src/components/landing/sections/WorkPlan.jsx líneas 3–159 (const planDimensions = [...]).
// Incluye los 4 objetos {id, icon, color, label, title, desc, ejes, progress}. <<<

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
```

Notas de tipo (el archivo es `.tsx`, la data viene de JSX sin tipos): si TypeScript se queja de tipos implícitos en los callbacks, tipar la data con `as const` NO (rompe `find`); basta declarar los arrays sin anotación — TS infiere. `activeEje` indexa con `?.` como el original.

- [ ] **Step 2: Recomponer `LandingPage.tsx`**

En `src/components/landing/LandingPage.tsx`:
- Eliminar los imports de `Features`, `Vision`, `WorkPlan`, `Solutions`.
- Añadir `import Propuestas from "./sections/Propuestas";`
- En el JSX, reemplazar el bloque
  `<Hero /><Features /><About /><Vision /><WorkPlan /><Solutions />` por
  `<Hero /><Propuestas /><About />` (Counter y el resto quedan igual por ahora).

- [ ] **Step 3: Borrar los 4 archivos absorbidos**

```powershell
git rm src/components/landing/sections/Features.jsx src/components/landing/sections/Vision.jsx src/components/landing/sections/WorkPlan.jsx src/components/landing/sections/Solutions.jsx
```

- [ ] **Step 4: Verificar en navegador**

Con el dev server corriendo, abrir `http://localhost:3000/`:
- Se ven las 4 tarjetas con ícono/título/3 checks, cada una con su color.
- "Ver el plan completo" despliega los tabs; cambiar de dimensión y de eje funciona; "Ocultar" pliega.
- El botón del Hero "Ver Plan de Gobierno" (ancla `#plan`) lleva a la sección.
- Consola: sin errores NUEVOS (los warnings preexistentes de la plantilla no cuentan).

- [ ] **Step 5: Commit**

```powershell
git add -A; git commit -m "feat(landing): propuestas en 4 tarjetas con plan completo plegable"
```

---

### Task 2: Crear `CierreCta.tsx` y reemplazar Community/Testimonials/Support

**Files:**
- Create: `src/components/landing/sections/CierreCta.tsx`
- Modify: `src/components/landing/LandingPage.tsx`
- Delete: `src/components/landing/sections/Community.jsx`, `Testimonials.jsx`, `Support.jsx`

**Interfaces:**
- Produces: componente default-export `CierreCta` con `<section id="contacto">` (ancla usada por Hero, About y Header). Constantes `WHATSAPP`, `WHATSAPP_MSG`, `SOCIAL_LINKS` al inicio del archivo (placeholders que Alberto reemplazará).

- [ ] **Step 1: Crear `src/components/landing/sections/CierreCta.tsx`**

Contenido completo:

```tsx
// Datos de contacto de la campaña — REEMPLAZAR por los reales cuando estén.
const WHATSAPP = '51999999999'
const WHATSAPP_MSG = 'Hola, quiero sumarme a la campaña de Simón Horna en Madre de Dios'
const SOCIAL_LINKS = [
  { icon: 'ph-facebook-logo', href: 'https://www.facebook.com/', label: 'Facebook' },
  { icon: 'ph-instagram-logo', href: 'https://www.instagram.com/', label: 'Instagram' },
  { icon: 'ph-tiktok-logo', href: 'https://www.tiktok.com/', label: 'TikTok' },
  { icon: 'ph-youtube-logo', href: 'https://www.youtube.com/', label: 'YouTube' },
]

const CierreCta = () => {
  const waHref = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(WHATSAPP_MSG)}`

  return (
    <section id="contacto" className="py-120 position-relative z-1 overflow-hidden" style={{background: 'linear-gradient(135deg, var(--an-red) 0%, #8e0203 100%)'}}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-8 text-center" data-aos="fade-up" data-aos-duration="800">
            <img
              src="/assets/images/logo/logo-an.webp"
              alt="Ahora Nación"
              style={{width: '72px', height: '72px', objectFit: 'contain', borderRadius: '12px', background: '#fff', padding: '4px', marginBottom: '24px'}}
            />
            <h2 className="text-white fw-bold tw-mb-4" style={{fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.2}}>
              Súmate al cambio de Madre de Dios
            </h2>
            <p className="text-white tw-mb-8" style={{opacity: 0.9, fontSize: '18px'}}>
              Escríbenos y sé parte de la campaña.
            </p>
            <div className="d-flex justify-content-center align-items-center flex-wrap tw-gap-5 tw-mb-8">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="d-inline-flex align-items-center fw-bold text-white"
                style={{
                  background: '#25D366',
                  borderRadius: '50px',
                  padding: '18px 36px',
                  fontSize: '20px',
                  gap: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  textDecoration: 'none',
                }}
              >
                <i className="ph-fill ph-whatsapp-logo" style={{fontSize: '28px'}}></i>
                Escríbenos por WhatsApp
              </a>
            </div>
            <div className="d-flex justify-content-center tw-gap-4">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="d-inline-flex align-items-center justify-content-center"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    color: '#fff',
                    fontSize: '22px',
                  }}
                >
                  <i className={`ph ${s.icon}`}></i>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CierreCta
```

- [ ] **Step 2: Recomponer `LandingPage.tsx`**

- Eliminar imports de `Community`, `Testimonials`, `Support` y `Projects`
  (slider de fotos redundante — ver spec, sección "Secciones eliminadas").
- Añadir `import CierreCta from "./sections/CierreCta";`
- El JSX queda con esta composición final:

```tsx
<Hero />
<Propuestas />
<About />
<Counter />
<Team />
<Events />
<Blog />
<CierreCta />
<Footer />
```

- [ ] **Step 3: Borrar archivos**

```powershell
git rm src/components/landing/sections/Community.jsx src/components/landing/sections/Testimonials.jsx src/components/landing/sections/Support.jsx src/components/landing/sections/Projects.jsx
```

- [ ] **Step 4: Verificar en navegador**

- La página termina en: Noticias → bloque rojo "Súmate al cambio de Madre de Dios" → Footer.
- El botón verde abre `wa.me/51999999999` con el mensaje precargado (basta ver el href).
- Consola sin errores nuevos (ojo: `main.js`/`slider-active.js` inicializan sliders de Testimonials/Projects; si aparece un error de selector inexistente, anotarlo — se corrige en Task 5).

- [ ] **Step 5: Commit**

```powershell
git add -A; git commit -m "feat(landing): cierre Súmate con WhatsApp; elimina Community/Testimonials/Support/Projects"
```

---

### Task 3: Aligerar Hero y About

**Files:**
- Modify: `src/components/landing/sections/Hero.jsx`
- Modify: `src/components/landing/sections/About.jsx`

- [ ] **Step 1: Hero — quitar párrafo largo y renombrar botones**

En `Hero.jsx`:
- Eliminar el `<p className="tw-text-lg text-white tw-mb-8" ...>` ("Un plan de gobierno para hacer de Madre de Dios…", líneas ~57-59).
- Cambiar el texto del primer botón `Ver Plan de Gobierno` → `Ver propuestas` (href `#plan` se mantiene).
- Cambiar el texto del segundo botón `Únete a la Campaña` → `Súmate` (href `#contacto` se mantiene).

- [ ] **Step 2: About — condensar a 3 líneas**

En `About.jsx`:
- Reemplazar los DOS párrafos actuales por UNO solo:

```jsx
<p className="tw-text-505 fw-normal tw-mt-4">
  Líder regional con arraigo en Tambopata, Manu y Tahuamanu. Postula con{' '}
  <strong>Ahora Nación</strong> para hacer de Madre de Dios la puerta de la
  Amazonía hacia Brasil y Bolivia, con desarrollo sostenible y oportunidades para todos.
</p>
```

- Reducir la lista `about-list` de 6 ítems a estos 3 (borrar los otros):
  - `'Desarrollo sostenible con bioeconomía amazónica'`
  - `'Educación intercultural y salud universal'`
  - `'Gobierno transparente, moderno y cercano'`
- Los botones se quedan.

- [ ] **Step 3: Verificar en navegador**

- Hero sin el párrafo, botones "Ver propuestas" / "Súmate" funcionan.
- About: un párrafo de ~3 líneas + 3 checks. Sin desbordes en móvil (reducir ventana a 375px).

- [ ] **Step 4: Commit**

```powershell
git add src/components/landing/sections/Hero.jsx src/components/landing/sections/About.jsx; git commit -m "feat(landing): hero y about mas concisos"
```

---

### Task 4: Menú del Header + anclas e intros de Team/Events/Blog

**Files:**
- Modify: `src/components/landing/layout/Header.jsx`
- Modify: `src/components/landing/sections/Team.jsx`
- Modify: `src/components/landing/sections/Events.jsx`
- Modify: `src/components/landing/sections/Blog.jsx`

**Interfaces:**
- Consumes: anclas `#plan` (Task 1) y `#contacto` (Task 2).
- Produces: ids nuevos `#equipo`, `#eventos`, `#noticias`.

- [ ] **Step 1: Añadir ids a las secciones**

- `Team.jsx`: `<section className="team-area ...">` → `<section id="equipo" className="team-area ...">`
- `Events.jsx`: `<section className="event-area pt-120">` → `<section id="eventos" className="event-area pt-120">`
- `Blog.jsx`: `<section className="blog-area ...">` → `<section id="noticias" className="blog-area ...">`

- [ ] **Step 2: Actualizar `navItems` en `Header.jsx`**

Reemplazar el array completo por:

```jsx
const navItems = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Propuestas', href: '#plan' },
  { label: 'Sobre Simón', href: '#nosotros' },
  { label: 'Equipo', href: '#equipo' },
  { label: 'Eventos', href: '#eventos' },
  { label: 'Noticias', href: '#noticias' },
  { label: 'Contacto', href: '#contacto' },
]
```

(Se elimina el ítem duplicado "Plan de Gobierno"/"Propuestas" que apuntaba a `#propuestas`, ancla que ya no existe.)

- [ ] **Step 3: Acortar títulos de sección**

- `Team.jsx` h2: `Simón Horna y su Equipo por Madre de Dios` → `El equipo`
- `Events.jsx` h2: `Únete a Estos Momentos Clave de la Campaña` → `Próximas actividades`
- `Blog.jsx` h2: `Explora Nuestras Últimas Noticias y Artículos de Campaña` → `Noticias de campaña`

- [ ] **Step 4: Verificar en navegador**

- Los 7 ítems del menú navegan a su sección (desktop y menú móvil).
- Títulos cortos visibles sin romper el layout.

- [ ] **Step 5: Commit**

```powershell
git add src/components/landing/layout/Header.jsx src/components/landing/sections/Team.jsx src/components/landing/sections/Events.jsx src/components/landing/sections/Blog.jsx; git commit -m "feat(landing): menu con anclas reales y titulos cortos"
```

---

### Task 5: Verificación integral y saneo de scripts legacy

**Files:**
- Posible Modify: `public/assets/js/main.js`, `public/assets/js/slider-active.js`, `public/assets/js/custom-gsap.js` (solo si hay errores de consola)

- [ ] **Step 1: Revisión de consola**

Abrir `http://localhost:3000/` con la consola abierta. Buscar errores nuevos de los scripts legacy que referencien secciones borradas (sliders de Testimonials/Projects/Community, contadores, etc.). Los scripts de la plantilla suelen usar `if ($('.selector').length)`, así que lo esperado es CERO errores nuevos; si aparece alguno:
- Identificar el init que falla y envolverlo en una guarda de existencia (`if (document.querySelector('.clase')) { ... }`) en el JS correspondiente. NO borrar código que otras páginas puedan usar.

- [ ] **Step 2: Verificación responsive**

Con el navegador:
- Desktop 1440px: screenshot de la página completa. Los 8 bloques en orden: Hero, Propuestas, Sobre Simón, Números, Equipo, Eventos, Noticias, Súmate, Footer.
- Móvil 375px: screenshot. Sin overflow horizontal; tarjetas de propuestas apiladas de a una; botón de WhatsApp completo en pantalla.

- [ ] **Step 3: Verificación funcional**

- Anclas del Hero (`#plan`, `#contacto`) y las 7 del menú.
- "Ver el plan completo": abre, cambia tabs/ejes, cierra.
- Contadores de Números animan al hacer scroll (PureCounter sigue vivo).
- `http://localhost:3000/login` carga el login del admin intacto.

- [ ] **Step 4: Commit final (solo si Step 1 tocó JS)**

```powershell
git add -A; git commit -m "fix(landing): guardas de existencia en scripts legacy"
```
