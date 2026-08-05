"use client";

import { useEffect } from "react";
import "./landing.css";

import Preloader from "./ui/Preloader";
import ScrollToTop from "./ui/ScrollToTop";
import Header from "./layout/Header";
import Footer from "./layout/Footer";
import Hero from "./sections/Hero";
import Propuestas from "./sections/Propuestas";
import About from "./sections/About";
import Counter from "./sections/Counter";
import Apoyo from "./sections/Apoyo";
import Team from "./sections/Team";
import Events from "./sections/Events";
import Blog from "./sections/Blog";
import CierreCta from "./sections/CierreCta";

// La plantilla Politicly depende de scripts globales con orden estricto de
// dependencia (jQuery antes que sus plugins, gsap antes que sus plugins,
// main.js al final). Se cargan secuencialmente porque next/script no
// garantiza orden entre scripts afterInteractive.
const LEGACY_SCRIPTS = [
  "/assets/js/jquery-3.7.1.min.js",
  "/assets/js/phosphor-icon.js",
  "/assets/js/boostrap.bundle.min.js",
  "/assets/js/waypoints.js",
  "/assets/js/swiper-bundle.js",
  "/assets/js/wow.js",
  "/assets/js/aos.js",
  "/assets/js/magnific-popup.min.js",
  "/assets/js/purecounter.js",
  "/assets/js/nice-select.js",
  "/assets/js/range-slider.js",
  "/assets/js/gsap/gsap.js",
  "/assets/js/gsap/gsap-scroll-to-plugin.js",
  "/assets/js/gsap/gsap-scroll-smoother.js",
  "/assets/js/gsap/gsap-scroll-trigger.js",
  "/assets/js/gsap/gsap-split-text.js",
  "/assets/js/custom-gsap.js",
  "/assets/js/slider-active.js",
  "/assets/js/main.js",
];

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.body.appendChild(script);
  });
}

declare global {
  interface Window {
    $?: unknown;
    AOS?: { init: (opts: Record<string, unknown>) => void };
    WOW?: new (opts: Record<string, unknown>) => { init: () => void };
    PureCounter?: new () => unknown;
  }
}

export default function LandingPage() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      for (const src of LEGACY_SCRIPTS) {
        if (cancelled) return;
        try {
          await loadScript(src);
        } catch (err) {
          console.error(err);
        }
      }
      if (cancelled) return;

      if (window.AOS) {
        window.AOS.init({ duration: 800, once: true });
      }
      if (window.WOW) {
        new window.WOW({ live: false }).init();
      }
      if (window.PureCounter) {
        new window.PureCounter();
      }
      const loader = document.querySelector<HTMLElement>(".loader-mask");
      if (loader) {
        loader.style.opacity = "0";
        setTimeout(() => {
          loader.style.display = "none";
        }, 400);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Preloader />
      {/* Overlay */}
      <div className="overlay"></div>
      <div className="side-overlay"></div>
      {/* Toast */}
      <div id="toast-container"></div>
      {/* Scroll to top */}
      <ScrollToTop />
      {/* Custom Cursor */}
      <div className="cursor"></div>
      <span className="dot"></span>

      <Header />

      <div id="smooth-wrapper">
        <div id="smooth-content">
          <Hero />
          <Propuestas />
          <About />
          <Counter />
          <Apoyo />
          <Team />
          <Events />
          <Blog />
          <CierreCta />
          <Footer />
        </div>
      </div>
    </>
  );
}
