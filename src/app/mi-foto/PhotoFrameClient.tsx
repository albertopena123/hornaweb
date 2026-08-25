"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import "./mi-foto.css";

// Marco oficial (PNG 1254×1254 con centro transparente; derivado de public/perfil_usaurio_oficial.png,
// que viene con fondo rojo plano sin alfa). La foto se recorta a un círculo de radio
// OFFICIAL_FRAME_CLIP·ancho: debe quedar por encima del hueco interior del anillo (máx. 0.375
// del ancho) y por debajo de su borde exterior más fino (mín. 0.442, bajo el casco) para que
// no asome ni se vea un hueco entre foto y marco.
const OFFICIAL_FRAME_SRC = "/marco_oficial.png";
const OFFICIAL_FRAME_CLIP = 0.44;

type Style = "official" | "ring" | "flag";
const STYLES: Record<Style, { label: string; hint: string }> = {
  official: { label: "Marco Oficial", hint: "diseño de campaña" },
  ring: { label: "Aro", hint: "anillo con lema" },
  flag: { label: "Bandera", hint: "bandera sobre tu foto" },
};
// Foto de perfil: siempre cuadrada; las redes la recortan en círculo.
const SIZE = 1080;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
// La foto puede salirse del cuadro hasta este margen por lado (el hueco se rellena
// con la misma foto difuminada, así nunca se ve fondo vacío dentro del círculo).
const PAN_SLACK = SIZE * 0.22;

const RED = "#e90305";
const RED_DEEP = "#9f0408";
const YELLOW = "#ffd400";
const NAVY = "#0b141f";

type Offset = { x: number; y: number };

// Medidas de la imagen ya escalada ("cover" × zoom) dentro del canvas.
function fitted(img: HTMLImageElement, zoom: number) {
  const scale = Math.max(SIZE / img.width, SIZE / img.height) * zoom;
  return { dw: img.width * scale, dh: img.height * scale };
}

// Limita el desplazamiento para que la foto no se aleje más de PAN_SLACK del borde.
function clampOffset(o: Offset, zoom: number, img: HTMLImageElement | null): Offset {
  if (!img) return { x: 0, y: 0 };
  const { dw, dh } = fitted(img, zoom);
  const maxX = Math.max(0, (dw - SIZE) / 2) + PAN_SLACK;
  const maxY = Math.max(0, (dh - SIZE) / 2) + PAN_SLACK;
  return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
}

const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

// Texto siguiendo un arco. `flip` = arco superior (se lee al derecho).
function arcText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, r: number, centerAngle: number, spacing: number, flip: boolean) {
  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width * spacing);
  const total = widths.reduce((a, b) => a + b, 0);
  const dir = flip ? 1 : -1;
  let angle = centerAngle - (dir * total) / 2 / r;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  chars.forEach((ch, i) => {
    const a = angle + (dir * widths[i]) / 2 / r;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.rotate(a + (flip ? Math.PI / 2 : -Math.PI / 2));
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    angle += (dir * widths[i]) / r;
  });
  ctx.restore();
}

// Insignia circular blanca con el logo. Devuelve el grosor del borde para poder
// mantener la insignia completa dentro del círculo de recorte.
function drawLogoBadge(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, cx: number, cy: number, d: number) {
  const stroke = Math.max(3, d * 0.05);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = d * 0.18;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, d / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = RED;
  ctx.lineWidth = stroke;
  ctx.beginPath();
  ctx.arc(cx, cy, d / 2, 0, Math.PI * 2);
  ctx.stroke();
  if (logo) {
    const inset = d * 0.16;
    ctx.drawImage(logo, cx - d / 2 + inset, cy - d / 2 + inset, d - inset * 2, d - inset * 2);
  }
}

// Posición sobre el anillo, a `angle` radianes, tal que una insignia de diámetro `d`
// (con su borde) quede íntegra dentro del círculo de recorte de radio R.
function badgeCenter(R: number, d: number, angle: number) {
  const stroke = Math.max(3, d * 0.05);
  const rr = R - d / 2 - stroke;
  return { x: R + Math.cos(angle) * rr, y: R + Math.sin(angle) * rr };
}

// Dibuja el marco de perfil sobre el canvas ya pintado con la foto.
function drawFrame(ctx: CanvasRenderingContext2D, style: Style, logo: HTMLImageElement | null, frameImg: HTMLImageElement | null) {
  const w = SIZE;
  const cx = w / 2;
  const cy = w / 2;
  const R = w / 2;

  if (style === "official") {
    if (frameImg) {
      ctx.drawImage(frameImg, 0, 0, w, w);
    }
    return;
  }

  if (style === "flag") {
    // Bandera del Perú translúcida (rojo | blanco | rojo) sobre la foto.
    ctx.save();
    ctx.globalAlpha = 0.38;
    const third = w / 3;
    ctx.fillStyle = RED;
    ctx.fillRect(0, 0, third, w);
    ctx.fillRect(third * 2, 0, third, w);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(third, 0, third, w);
    ctx.restore();

    // Anillo fino rojo al borde del círculo.
    const ringW = w * 0.035;
    ctx.strokeStyle = RED;
    ctx.lineWidth = ringW;
    ctx.beginPath();
    ctx.arc(cx, cy, R - ringW / 2, 0, Math.PI * 2);
    ctx.stroke();

    // Cinta inferior con lema.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();
    const bandH = w * 0.13;
    const grad = ctx.createLinearGradient(0, w - bandH, 0, w);
    grad.addColorStop(0, RED);
    grad.addColorStop(1, RED_DEEP);
    ctx.fillStyle = grad;
    ctx.fillRect(0, w - bandH, w, bandH);
    ctx.fillStyle = YELLOW;
    ctx.fillRect(0, w - bandH, w, w * 0.006);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `400 ${Math.round(w * 0.062)}px Staatliches, "Inter", system-ui, sans-serif`;
    ctx.fillText("#AHORANACIÓN", cx, w - bandH * 0.62);
    ctx.restore();

    const d = w * 0.16;
    const p = badgeCenter(R, d, Math.PI / 4);
    drawLogoBadge(ctx, logo, p.x, p.y, d);
    return;
  }

  // ---- Estilo "Aro": anillo rojo con lema en arco ----
  const ringW = w * 0.105;

  const grad = ctx.createLinearGradient(0, 0, w, w);
  grad.addColorStop(0, RED);
  grad.addColorStop(1, RED_DEEP);
  ctx.strokeStyle = grad;
  ctx.lineWidth = ringW;
  ctx.beginPath();
  ctx.arc(cx, cy, R - ringW / 2, 0, Math.PI * 2);
  ctx.stroke();

  // Filo amarillo interior.
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = w * 0.007;
  ctx.beginPath();
  ctx.arc(cx, cy, R - ringW + w * 0.0035, 0, Math.PI * 2);
  ctx.stroke();

  // Lema en arco inferior.
  ctx.fillStyle = "#ffffff";
  ctx.font = `400 ${Math.round(ringW * 0.62)}px Staatliches, "Inter", system-ui, sans-serif`;
  arcText(ctx, "SIMÓN HORNA · #AHORANACIÓN", cx, cy, R - ringW / 2, Math.PI / 2, 1.08, false);

  // Región en arco superior.
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `700 ${Math.round(ringW * 0.34)}px "Inter", system-ui, sans-serif`;
  arcText(ctx, "MADRE DE DIOS · 2027 – 2030", cx, cy, R - ringW / 2, -Math.PI / 2, 1.15, true);

  const d = w * 0.15;
  const p = badgeCenter(R, d, 0);
  drawLogoBadge(ctx, logo, p.x, p.y, d);
}

const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

const IconWhatsApp = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 18.15c-1.49 0-2.95-.4-4.22-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.16 8.16 0 0 1-1.25-4.38c0-4.51 3.67-8.18 8.18-8.18 2.19 0 4.24.85 5.79 2.4 1.54 1.55 2.4 3.6 2.4 5.79 0 4.51-3.67 8.2-8.18 8.2z"/>
    <path d="M16.82 14.39c-.26-.13-1.54-.76-1.78-.85-.24-.09-.41-.13-.58.13-.17.26-.68.85-.83 1.02-.15.18-.31.2-.57.07-.26-.13-1.11-.41-2.11-1.3-.78-.7-1.31-1.56-1.46-1.82-.15-.26-.02-.4.11-.53.12-.12.26-.31.39-.46.13-.15.17-.26.26-.43.09-.18.04-.33-.02-.46-.07-.13-.58-1.4-.8-1.92-.21-.51-.43-.44-.59-.45h-.5c-.17 0-.46.07-.7.33-.24.26-.92.9-.92 2.2 0 1.3.95 2.55 1.08 2.73.13.17 1.87 2.85 4.53 4 2.66 1.15 2.66.77 3.14.72.48-.04 1.54-.63 1.76-1.24.22-.61.22-1.13.15-1.24-.06-.11-.24-.18-.5-.31z"/>
  </svg>
);

const IconUpload = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 16V4m0 0-4 4m4-4 4 4" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </svg>
);
const IconDownload = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v12m0 0 4-4m-4 4-4-4" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </svg>
);
const IconShare = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
  </svg>
);

type Pt = { x: number; y: number };

export default function PhotoFrameClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef<HTMLImageElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [style, setStyle] = useState<Style>("official");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 }); // px de canvas respecto al centro
  const [hasImage, setHasImage] = useState(false);
  const [assetsReady, setAssetsReady] = useState(0);
  const [isOver, setIsOver] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Espejos de zoom/offset para los handlers de puntero (evitan closures obsoletos).
  const zoomRef = useRef(zoom);
  const offsetRef = useRef(offset);
  useEffect(() => {
    zoomRef.current = zoom;
    offsetRef.current = offset;
  }, [zoom, offset]);

  // Gestos: punteros activos, arrastre con un dedo, pellizco con dos.
  const pointersRef = useRef<Map<number, Pt>>(new Map());
  const dragRef = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);
  const pinchRef = useRef<{ dist: number; zoom: number; off: Offset } | null>(null);

  // Precargar marcos, logo y tipografías.
  useEffect(() => {
    const fr = new Image();
    fr.onload = () => {
      frameRef.current = fr;
      setAssetsReady((n) => n + 1);
    };
    fr.src = OFFICIAL_FRAME_SRC;

    const l = new Image();
    l.onload = () => {
      logoRef.current = l;
      setAssetsReady((n) => n + 1);
    };
    l.src = "/assets/images/logo/logo-an.webp";

    if (typeof document !== "undefined" && "fonts" in document) {
      Promise.all([document.fonts.load("400 80px Staatliches"), document.fonts.load('700 40px "Inter"')])
        .then(() => setAssetsReady((n) => n + 1))
        .catch(() => {});
    }
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = SIZE;
    canvas.width = w;
    canvas.height = w;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, w, w);

    const img = imgRef.current;
    if (img) {
      ctx.save();
      if (style === "official") {
        ctx.beginPath();
        ctx.arc(w / 2, w / 2, w * OFFICIAL_FRAME_CLIP, 0, Math.PI * 2);
        ctx.clip();
      }

      // Fondo: la misma foto difuminada cubriendo todo, para que el margen de
      // desplazamiento nunca muestre un hueco vacío.
      if ("filter" in ctx) {
        const bg = fitted(img, 1.15);
        ctx.save();
        ctx.filter = "blur(28px) brightness(0.6)";
        ctx.drawImage(img, (w - bg.dw) / 2, (w - bg.dh) / 2, bg.dw, bg.dh);
        ctx.restore();
      }
      const { dw, dh } = fitted(img, zoom);
      const dx = (w - dw) / 2 + offset.x;
      const dy = (w - dh) / 2 + offset.y;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    }

    drawFrame(ctx, style, logoRef.current, frameRef.current);

    if (style !== "official") {
      // Recorte circular para estilos generados: todo lo que queda fuera del círculo se vuelve transparente.
      ctx.save();
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style, zoom, offset, assetsReady]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!showHint) return;
    const t = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(t);
  }, [showHint]);

  const loadFile = useCallback((file: File | undefined | null) => {
    if (!file || (file.type && !file.type.startsWith("image/"))) {
      setToast("Elige un archivo de imagen (JPG o PNG).");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      imgRef.current = img;
      setOffset({ x: 0, y: 0 });
      setZoom(1);
      setHasImage(true);
      setShowHint(true);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setToast("No se pudo leer esa imagen. Prueba con otra (JPG o PNG).");
    };
    img.src = url;
  }, []);

  // Pegar desde el portapapeles.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      if (item) loadFile(item.getAsFile());
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [loadFile]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    loadFile(e.target.files?.[0]);
    e.target.value = "";
  }

  // Cambia el zoom manteniendo fijo lo que está bajo el centro del círculo.
  const applyZoom = useCallback((nz: number, baseZoom = zoomRef.current, baseOff = offsetRef.current) => {
    const z = clampZoom(nz);
    const k = z / baseZoom;
    setZoom(z);
    setOffset(clampOffset({ x: baseOff.x * k, y: baseOff.y * k }, z, imgRef.current));
  }, []);

  const nudge = useCallback((dx: number, dy: number) => {
    const o = offsetRef.current;
    setOffset(clampOffset({ x: o.x + dx, y: o.y + dy }, zoomRef.current, imgRef.current));
  }, []);

  function reset() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  // ---- Gestos de puntero sobre el encuadre ----
  const canvasScale = () => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return rect && rect.width > 0 ? SIZE / rect.width : 1; // px de pantalla -> px de canvas
  };

  function pointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!hasImage) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pts = pointersRef.current;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) {
      dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: offsetRef.current.x, oy: offsetRef.current.y };
      pinchRef.current = null;
    } else if (pts.size === 2) {
      const [a, b] = Array.from(pts.values());
      dragRef.current = null;
      pinchRef.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: zoomRef.current, off: offsetRef.current };
    }
  }

  function pointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const pts = pointersRef.current;
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pinch = pinchRef.current;
    if (pinch && pts.size >= 2) {
      const [a, b] = Array.from(pts.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      applyZoom(pinch.zoom * (dist / pinch.dist), pinch.zoom, pinch.off);
      return;
    }
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const k = canvasScale();
    const next = { x: d.ox + (e.clientX - d.x) * k, y: d.oy + (e.clientY - d.y) * k };
    setOffset(clampOffset(next, zoomRef.current, imgRef.current));
  }

  function pointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    const pts = pointersRef.current;
    pts.delete(e.pointerId);
    if (pts.size < 2) pinchRef.current = null;
    if (dragRef.current?.id === e.pointerId) dragRef.current = null;
    if (pts.size === 1 && !dragRef.current) {
      // Queda un dedo tras un pellizco: continúa como arrastre desde donde está.
      const [id, p] = Array.from(pts.entries())[0];
      dragRef.current = { id, x: p.x, y: p.y, ox: offsetRef.current.x, oy: offsetRef.current.y };
    }
  }

  function stageKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!hasImage) return;
    const step = e.shiftKey ? 100 : 20;
    const map: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (map[e.key]) {
      e.preventDefault();
      nudge(...map[e.key]);
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      applyZoom(zoomRef.current + 0.1);
    } else if (e.key === "-") {
      e.preventDefault();
      applyZoom(zoomRef.current - 0.1);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsOver(false);
    loadFile(e.dataTransfer.files?.[0]);
  }

  // ---- Exportar ----
  function toBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      canvas.toBlob((b) => resolve(b), "image/png");
    });
  }

  async function makeFile(): Promise<File | null> {
    const blob = await toBlob();
    if (!blob) {
      setToast("No se pudo generar la imagen. Intenta de nuevo.");
      return null;
    }
    return new File([blob], `perfil-simon-horna-${style}.png`, { type: "image/png" });
  }

  function canShareFiles(file: File) {
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    return typeof nav.share === "function" && typeof nav.canShare === "function" && nav.canShare({ files: [file] });
  }

  // Devuelve true si el usuario completó o canceló la hoja de compartir; false si falló.
  async function shareFile(file: File, withText: boolean): Promise<boolean> {
    const data: ShareData = withText && !isIOS() ? { files: [file], text: "Yo apoyo a Simón Horna. #AhoraNación" } : { files: [file] };
    try {
      await navigator.share(data);
      return true;
    } catch (err) {
      return err instanceof DOMException && err.name === "AbortError"; // canceló: no es error
    }
  }

  function saveViaAnchor(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleWhatsApp() {
    const file = await makeFile();
    if (!file) return;

    // 1. Guardar la foto en la galería/descargas
    saveViaAnchor(file);

    // 2. Si el dispositivo soporta compartir nativo (móviles Android / iOS), abrir hoja de compartir
    if (canShareFiles(file)) {
      await shareFile(file, true);
    }

    // 3. Mostrar modal con guía rápida y acceso directo a WhatsApp
    setShowWhatsAppModal(true);
  }

  async function download() {
    const file = await makeFile();
    if (!file) return;
    // En iPhone/iPad la hoja nativa ofrece "Guardar imagen" → Fotos, que es lo
    // que el usuario necesita para ponerla de perfil. <a download> iría a Archivos.
    if (isIOS() && canShareFiles(file)) {
      if (await shareFile(file, false)) return;
    }
    saveViaAnchor(file);
    setToast(isIOS() ? "Si no ves la imagen, usa Compartir → Guardar imagen." : "Foto descargada en alta resolución.");
  }

  async function share() {
    const file = await makeFile();
    if (!file) return;
    if (canShareFiles(file) && (await shareFile(file, true))) return;
    // Sin hoja de compartir (escritorio) o falló: descarga.
    saveViaAnchor(file);
    setToast("Tu navegador no permite compartir directo: la foto se descargó.");
  }

  return (
    <main className="mf">
      <header className="mf__top">
        <Link className="mf__logo" href="/">
          <img src="/assets/images/logo/logo-an.webp" alt="" />
          <span>
            <strong>Simón Horna Alpaca</strong>
            <span>Ahora Nación · Madre de Dios</span>
          </span>
        </Link>

        <nav className="mf__nav" aria-label="Navegación principal">
          <Link href="/" className="mf__nav-link">Inicio</Link>
          <Link href="/#apoyo" className="mf__nav-link">Apoyo</Link>
          <Link href="/mi-mesa" className="mf__nav-link">Consultor de Mesa</Link>
          <Link href="/mi-foto" className="mf__nav-link is-active">Foto con Marco</Link>
        </nav>

        <div className="mf__top-actions">
          <Link className="mf__back" href="/">← Volver al inicio</Link>
        </div>
      </header>

      <div className="mf__wrap">
        <section className="mf__copy">
          <span className="mf__eyebrow"><i /> Campaña regional 2027–2030</span>
          <h1 className="mf__title">
            Tu perfil,<br />
            <em>nuestra</em> causa
          </h1>
          <p className="mf__lead">
            Ponle el marco oficial de Ahora Nación a tu foto de perfil de WhatsApp, TikTok, Facebook e Instagram.
            Gratis, sin registro y en menos de un minuto.
          </p>

          <ol className="mf__steps">
            <li className={hasImage ? "is-done" : ""}><b>1</b> Sube o arrastra tu foto</li>
            <li><b>2</b> Centra tu rostro dentro del círculo</li>
            <li><b>3</b> Descárgala y ponla como foto de perfil</li>
          </ol>

          <p className="mf__privacy">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            Tu foto se procesa en tu dispositivo. Nunca se sube a ningún servidor.
          </p>
        </section>

        <section className="mf__studio" aria-label="Editor de foto de perfil">
          <div className="mf__formats" role="group" aria-label="Estilo del marco">
            {(Object.keys(STYLES) as Style[]).map((f) => (
              <button
                key={f}
                aria-pressed={style === f}
                className={`mf__chip ${style === f ? "is-active" : ""}`}
                onClick={() => setStyle(f)}
                type="button"
              >
                {STYLES[f].label}
                <small>{STYLES[f].hint}</small>
              </button>
            ))}
          </div>

          <div
            ref={stageRef}
            className={`mf__stage ${hasImage ? "is-draggable" : ""} ${isOver ? "is-over" : ""}`}
            tabIndex={hasImage ? 0 : -1}
            role={hasImage ? "group" : undefined}
            aria-label={hasImage ? "Encuadre de la foto. Arrastra o usa las flechas para mover; + y − para el zoom." : undefined}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerEnd}
            onPointerCancel={pointerEnd}
            onLostPointerCapture={pointerEnd}
            onKeyDown={stageKeyDown}
            onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
            onDragLeave={() => setIsOver(false)}
            onDrop={onDrop}
          >
            <canvas ref={canvasRef} className="mf__canvas" aria-label="Vista previa de tu foto de perfil" />
            <div className="mf__mask" aria-hidden="true" />
            {!hasImage && (
              <button type="button" className="mf__drop" onClick={() => fileRef.current?.click()}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" />
                </svg>
                <strong>Tu foto aquí</strong>
                <span>Arrástrala, pégala o toca para elegirla</span>
                <span className="mf__drop-cta">Elegir foto</span>
              </button>
            )}
            {hasImage && showHint && <div className="mf__hint" aria-hidden="true">Arrastra para encuadrar · pellizca para el zoom</div>}
          </div>

          {hasImage && (
            <div className="mf__zoom">
              <label htmlFor="mf-zoom">Zoom</label>
              <input
                id="mf-zoom"
                type="range"
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step={0.01}
                value={zoom}
                onChange={(e) => applyZoom(Number(e.target.value))}
              />
              <button type="button" onClick={reset}>Centrar</button>
            </div>
          )}

          <div className="mf__actions">
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} hidden />
            
            <button className="mf__btn mf__btn--whatsapp" type="button" onClick={handleWhatsApp} disabled={!hasImage}>
              <IconWhatsApp /> Poner en WhatsApp
            </button>

            <button className="mf__btn mf__btn--light" type="button" onClick={download} disabled={!hasImage}>
              <IconDownload /> Descargar PNG
            </button>

            <button className="mf__btn mf__btn--ghost" type="button" onClick={() => fileRef.current?.click()}>
              <IconUpload /> {hasImage ? "Cambiar foto" : "Subir foto"}
            </button>
          </div>
        </section>
      </div>

      {/* Siempre presente para que los lectores de pantalla anuncien los cambios. */}
      <div className={`mf__toast ${toast ? "is-visible" : ""}`} role="status" aria-live="polite">
        {toast ?? ""}
      </div>

      {/* Modal Guía Rápida para WhatsApp */}
      {showWhatsAppModal && (
        <div className="mf__modal-overlay" onClick={() => setShowWhatsAppModal(false)}>
          <div className="mf__modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="mf-modal-title">
            <div className="mf__modal-header">
              <h3 id="mf-modal-title" className="mf__modal-title">
                <IconWhatsApp /> Foto lista para WhatsApp
              </h3>
              <button
                type="button"
                className="mf__modal-close"
                onClick={() => setShowWhatsAppModal(false)}
                aria-label="Cerrar guía"
              >
                ✕
              </button>
            </div>

            <div className="mf__guide-steps">
              <div className="mf__guide-step">
                <b>1</b>
                <span><strong>¡Foto guardada!</strong> Ya se descargó en tu galería / fotos.</span>
              </div>
              <div className="mf__guide-step">
                <b>2</b>
                <span>Abre <strong>WhatsApp</strong> y ve a <strong>Ajustes → Toca tu foto</strong>.</span>
              </div>
              <div className="mf__guide-step">
                <b>3</b>
                <span>Toca <strong>Editar / Galería</strong> y selecciona esta imagen.</span>
              </div>
            </div>

            <div className="mf__modal-actions">
              <a
                href="whatsapp://app"
                className="mf__btn mf__btn--whatsapp"
                style={{ textDecoration: "none", textAlign: "center" }}
                onClick={() => {
                  setTimeout(() => {
                    if (!document.hidden) {
                      window.open("https://web.whatsapp.com", "_blank");
                    }
                  }, 1200);
                }}
              >
                <IconWhatsApp /> Abrir WhatsApp ahora
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
