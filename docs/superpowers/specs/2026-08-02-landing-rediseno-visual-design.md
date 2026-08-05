# Rediseño visual del landing: menos texto, más tarjetas

**Fecha:** 2026-08-02 · **Aprobado por:** Alberto (enfoque A)

## Objetivo

El landing `/` (plantilla Politicly portada, 14 secciones) es demasiado largo y
denso en texto: un votante que hace scroll rápido no lee nada. Reducirlo a 8
bloques donde cada uno se entienda en ~3 segundos, priorizando que el visitante
capte **las propuestas** (ícono + frase corta) además del nombre y la cara del
candidato. El detalle completo del plan no se pierde: queda plegado bajo un
botón "Ver el plan completo".

## Estructura final (8 bloques)

1. **Hero** (`Hero.jsx`, retoque): se elimina el párrafo largo ("Un plan de
   gobierno para hacer de Madre de Dios…") — el lema dorado ya comunica.
   Se conservan foto, nombre, lema, cifras y los dos botones
   ("Ver propuestas" → `#plan`, "Súmate" → `#contacto`).
2. **Propuestas** (`sections/Propuestas.tsx`, nueva, `id="plan"`): 4 tarjetas
   grandes, una por dimensión, con ícono, título de beneficio y 3 frases cortas
   con check, cada una con el color de su dimensión:
   - 🏥 **Salud y Educación** — Menos anemia infantil · Colegios con internet · Doctores en zonas rurales
   - 🌿 **Economía y Empleo** — Castaña y cacao al mundo · Más turismo · Minería formal
   - 🌎 **Amazonía Protegida** — Bosques cuidados · Ríos limpios · Productos con sello amazónico
   - 🏛️ **Gobierno que Funciona** — Menos delincuencia · Trámites simples · Cero corrupción

   Debajo, botón **"Ver el plan completo"** que despliega el detalle actual del
   WorkPlan (tabs por dimensión con ejes, items y metas), reusando los datos
   `planDimensions`. Cerrado por defecto.
3. **Quién es Simón** (`About.jsx`, condensado): foto + 3 líneas + firma. Sin
   biografía extensa.
4. **Números** (`Counter.jsx`): sin cambios (cifras animadas PureCounter).
5. **Equipo** (`Team.jsx`): se mantiene, intro más corta.
6. **Eventos** (`Events.jsx`): se mantiene, intro más corta.
7. **Noticias** (`Blog.jsx`): se mantiene, intro más corta.
8. **Cierre "Súmate"** (`sections/CierreCta.tsx`, nueva, `id="contacto"`):
   fondo rojo del partido, frase única ("Súmate al cambio de Madre de Dios"),
   botón grande de WhatsApp + íconos de redes. Número de WhatsApp y enlaces de
   redes como constantes al inicio del archivo con valores placeholder
   (Alberto los reemplazará luego). Sustituye a Support; el botón de donación
   (enlace muerto) desaparece.

Cierra con `Footer.jsx` (sin cambios estructurales).

## Secciones eliminadas

`Features.jsx`, `Vision.jsx`, `WorkPlan.jsx` (absorbida por Propuestas),
`Solutions.jsx`, `Projects.jsx` (slider de fotos con títulos genéricos y
enlaces muertos, redundante con Equipo/Noticias), `Community.jsx`,
`Testimonials.jsx`, `Support.jsx` — se borran los archivos y sus
imports/render en `LandingPage.tsx`.

## Cambios por archivo

- **Nuevo** `src/components/landing/sections/Propuestas.tsx` (client
  component): tarjetas + `useState` para el desplegable del plan completo.
  Mueve aquí los datos `planDimensions` de `WorkPlan.jsx`.
- **Nuevo** `src/components/landing/sections/CierreCta.tsx`: CTA final con
  constantes `WHATSAPP` y `SOCIAL_LINKS` editables en un solo lugar.
- **Editar** `LandingPage.tsx`: composición Hero → Propuestas → About →
  Counter → Team → Events → Blog → CierreCta → Footer.
- **Editar** `Hero.jsx` (quitar párrafo), `About.jsx` (condensar),
  `Team/Events/Blog` (aligerar intros), `Header.jsx`: el menú queda solo con
  anclas de bloques existentes (Inicio `#inicio`, Propuestas `#plan`, y las
  anclas de Quién es Simón, Equipo, Eventos, Noticias y Contacto `#contacto`
  si sus secciones tienen id; los ítems que apunten a secciones eliminadas se
  quitan).

## Riesgos aceptados

- Los scripts legacy (`main.js`, `custom-gsap.js`, `slider-active.js`) pueden
  referenciar selectores de secciones eliminadas (sliders de Testimonials/
  Projects, etc.). Se verifica que no aparezcan errores nuevos en consola; si
  aparecen, se neutralizan (guardas de existencia o retirar el init afectado).
- Estética de las tarjetas nuevas: estilo inline + clases de la plantilla,
  igual que el WorkPlan actual, para no pelear con el CSS legacy.

## Verificación

- `GET http://localhost:3000/` renderiza los 8 bloques en el orden definido.
- Screenshots desktop (1440px) y móvil (375px): sin overflow horizontal ni
  bloques rotos.
- Anclas `#plan` y `#contacto` navegan bien desde Hero y Header.
- "Ver el plan completo" abre y cierra; los tabs por dimensión funcionan.
- Consola sin errores nuevos respecto al estado actual.
- `/login` y rutas admin intactas.
