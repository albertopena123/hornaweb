"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./mi-foto.css";

type Format = "square" | "story";
const DIMENSIONS: Record<Format, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: "Cuadrado" },
  story: { w: 1080, h: 1920, label: "Historia" },
};

const RED = "#e90305";

// Dibuja el marco oficial sobre el canvas ya pintado con la foto.
// Aislada a propósito: para usar un PNG oficial luego, reemplazar el cuerpo
// por ctx.drawImage(framePng, 0, 0, w, h).
function drawFrame(ctx: CanvasRenderingContext2D, w: number, h: number, logo: HTMLImageElement | null) {
  const bandH = Math.round(h * 0.17);
  const y = h - bandH;

  // Franja inferior con degradado rojo.
  const grad = ctx.createLinearGradient(0, y, 0, h);
  grad.addColorStop(0, "rgba(233,3,5,0.0)");
  grad.addColorStop(0.28, "rgba(176,6,12,0.92)");
  grad.addColorStop(1, RED);
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, w, bandH);

  // Borde superior de la franja.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, y + Math.round(bandH * 0.28), w, 3);

  const pad = Math.round(w * 0.05);
  const textX = pad;
  const baseY = h - Math.round(bandH * 0.30);

  // Logo (si cargó) a la derecha, sobre una chapa blanca redondeada para contraste.
  if (logo) {
    const chip = Math.round(bandH * 0.52);
    const cx = w - pad - chip;
    const cy = h - Math.round(bandH * 0.60);
    const radius = Math.round(chip * 0.18);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(cx, cy, chip, chip, radius);
    ctx.fill();
    const inset = Math.round(chip * 0.10);
    ctx.drawImage(logo, cx + inset, cy + inset, chip - inset * 2, chip - inset * 2);
  }

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${Math.round(w * 0.052)}px "Google Sans", system-ui, sans-serif`;
  ctx.fillText("Simón Horna Alpaca", textX, baseY);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `600 ${Math.round(w * 0.034)}px "Google Sans Text", system-ui, sans-serif`;
  ctx.fillText("#AhoraNación", textX, baseY + Math.round(w * 0.045));
}

export default function PhotoFrameClient() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [format, setFormat] = useState<Format>("square");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0.5, y: 0.5 }); // 0..1 punto focal
  const [hasImage, setHasImage] = useState(false);
  const [logoReady, setLogoReady] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Precargar el logo oficial de Ahora Nación.
  useEffect(() => {
    const l = new Image();
    l.onload = () => {
      logoRef.current = l;
      setLogoReady(true);
    };
    l.src = "/assets/images/logo/logo-an.webp";
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { w, h } = DIMENSIONS[format];
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#20242c";
    ctx.fillRect(0, 0, w, h);

    const img = imgRef.current;
    if (img) {
      // Escalado "cover" con punto focal (offset) y zoom.
      const scale = Math.max(w / img.width, h / img.height) * zoom;
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (w - dw) * offset.x;
      const dy = (h - dh) * offset.y;
      ctx.drawImage(img, dx, dy, dw, dh);
    }

    drawFrame(ctx, w, h, logoRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, zoom, offset, logoReady]);

  useEffect(() => {
    render();
  }, [render]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setOffset({ x: 0.5, y: 0.5 });
      setZoom(1);
      setHasImage(true);
      render();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  // Arrastrar para reencuadrar.
  function pointerDown(e: React.PointerEvent) {
    if (!hasImage) return;
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function pointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const nx = d.ox - (e.clientX - d.x) / rect.width;
    const ny = d.oy - (e.clientY - d.y) / rect.height;
    setOffset({ x: Math.min(1, Math.max(0, nx)), y: Math.min(1, Math.max(0, ny)) });
  }
  function pointerUp() {
    dragRef.current = null;
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ahora-nacion-${format}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  async function share() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `ahora-nacion-${format}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: "¡Ahora Nación! #SimónHorna" });
          return;
        } catch {
          /* usuario canceló: cae a descarga */
        }
      }
      download();
    }, "image/png");
  }

  return (
    <main className="mf">
      <div className="mf__card">
        <header className="mf__brand">
          <img src="/assets/images/logo/logo-an.webp" alt="Ahora Nación" />
          <div>
            <strong>Tu foto de campaña</strong>
            <span>Ahora Nación · Simón Horna</span>
          </div>
        </header>

        <h1 className="mf__title">Ponle el marco oficial a tu foto</h1>
        <p className="mf__lead">Sube tu foto, ajústala y compártela en WhatsApp, Facebook e Instagram. Tu foto no se sube a ningún servidor.</p>

        <div
          className={`mf__stage mf__stage--${format}`}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
        >
          <canvas ref={canvasRef} className="mf__canvas" />
          {!hasImage && <div className="mf__placeholder">Sube una foto para empezar</div>}
        </div>

        <div className="mf__formats">
          {(Object.keys(DIMENSIONS) as Format[]).map((f) => (
            <button
              key={f}
              className={`mf__chip ${format === f ? "is-active" : ""}`}
              onClick={() => setFormat(f)}
              type="button"
            >
              {DIMENSIONS[f].label}
            </button>
          ))}
        </div>

        {hasImage && (
          <label className="mf__zoom">
            <span>Zoom</span>
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          </label>
        )}

        <div className="mf__actions">
          <label className="mf__upload">
            {hasImage ? "Cambiar foto" : "Subir foto"}
            <input type="file" accept="image/*" capture="environment" onChange={onFile} hidden />
          </label>
          <button className="mf__download" type="button" onClick={download} disabled={!hasImage}>
            Descargar
          </button>
          <button className="mf__share" type="button" onClick={share} disabled={!hasImage}>
            Compartir
          </button>
        </div>
      </div>
    </main>
  );
}
