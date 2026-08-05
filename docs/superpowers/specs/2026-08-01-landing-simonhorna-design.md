# Landing pública de campaña en horna_web

**Fecha:** 2026-08-01 · **Aprobado por:** Alberto (opción "portar tal cual")

## Objetivo

Usar el landing page de `C:\Apache24\htdocs\simonhorna_public` (plantilla
Politicly adaptada a la campaña de Simón Horna Alpaca — Ahora Nación, Madre de
Dios) como página principal `/` de `horna_web`, pixel-idéntico al original. La
consola admin existente (`/login`, `/inicio`, `/usuarios`, etc.) no cambia.

## Contexto

- El landing es Vite + React 19: 16 componentes JSX (~1800 líneas) que son
  markup de la plantilla, más `index.css` con branding "Ahora Nación".
- Depende de scripts globales legacy cargados por `index.html` en orden
  estricto: jQuery → phosphor → bootstrap → waypoints → swiper → wow → aos →
  magnific → purecounter → nice-select → range-slider → gsap (5 archivos) →
  custom-gsap → slider-active → main.js.
- CSS de plantilla en `/assets/css/*` (bootstrap, animate, swiper, aos,
  magnific, main). Imágenes en `/assets/images` (~19MB).
- `horna_web` hoy: `/` redirige a `/inicio`; `src/proxy.ts` redirige a
  `/login` todo lo que no esté en su lista pública (los `.css`/`.js` estáticos
  incluidos, porque el matcher solo excluye imágenes).

## Diseño

1. **Assets:** copiar `simonhorna_public/public/assets` → `horna_web/public/assets`.
2. **Componentes:** copiar `src/components/{layout,sections,ui}` →
   `horna_web/src/components/landing/{layout,sections,ui}` sin cambios de
   markup. `index.css` → `src/components/landing/landing.css`.
3. **`LandingPage`** (`src/components/landing/LandingPage.tsx`, client
   component): replica `App.jsx` (composición de secciones + init de
   AOS/WOW/PureCounter) y carga los scripts legacy **secuencialmente** con un
   loader propio en `useEffect` (respeta el orden de dependencia; `next/script`
   no garantiza orden entre `afterInteractive`).
4. **`src/app/page.tsx`:** deja de redirigir; exporta la metadata de campaña
   (title/description/keywords del `index.html` original) y renderiza los
   `<link>` a los CSS de plantilla (React 19 los iza al `<head>`) +
   `<LandingPage />`.
5. **`src/proxy.ts`:** añadir `/` a `PUBLIC_PATHS` y `/assets/` a los prefijos
   públicos.

## Riesgos aceptados

- El layout raíz inyecta Tailwind (`globals.css`), fuentes de Google y el
  script de tema oscuro en todas las rutas, incluido el landing. Se verifica
  visualmente que no rompa la plantilla; si rompe, se neutralizan las reglas
  conflictivas desde `landing.css`.
- Los scripts legacy solo se cargan en `/` (loader en cliente), no en admin.

## Verificación

- `GET /` responde 200 sin redirección y renderiza el landing completo
  (screenshot comparado contra el original servido por Vite).
- `/login` y rutas admin siguen funcionando (redirect a login sin sesión).
