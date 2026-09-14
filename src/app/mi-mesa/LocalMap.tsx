"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, ExternalLink, Navigation, Compass } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface LocalMapProps {
  lat: number | null;
  lng: number | null;
  localName: string;
  direccion?: string | null;
  mesa?: string | null;
}

export default function LocalMap({ lat, lng, localName, direccion, mesa }: LocalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  const hasValidCoords =
    lat !== null &&
    lng !== null &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat !== 0 &&
    lng !== 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !hasValidCoords || !mapContainerRef.current) return;

    let isDestroyed = false;

    // Destruir mapa previo si existe
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    import("leaflet").then(({ default: L }) => {
      if (isDestroyed || !mapContainerRef.current) return;

      // Icono personalizado con estilo Ahora Nación
      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div style="
            position: relative;
            width: 42px;
            height: 42px;
            background: #e90305;
            border: 3px solid #ffffff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 15px rgba(233, 3, 5, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              transform: rotate(45deg);
              color: white;
              font-size: 16px;
              font-weight: bold;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              🏫
            </div>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 42],
      });

      // Configuración de mapa con zoom completo interactivo (ruedita del mouse, pellizco táctil y arrastre)
      const map = L.map(mapContainerRef.current, {
        center: [lat!, lng!],
        zoom: 16,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        dragging: true,
        attributionControl: false,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Capa de tiles OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Marker limpio sin popup intrusivo
      L.marker([lat!, lng!], { icon: customIcon }).addTo(map);
    });

    return () => {
      isDestroyed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mounted, lat, lng, localName, direccion, mesa, hasValidCoords]);

  // Ruta directa de navegación GPS en Google Maps ("Cómo llegar")
  const navigationUrl = hasValidCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat!)},${encodeURIComponent(lng!)}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${localName} ${direccion || ""} Madre de Dios`
      )}`;

  return (
    <div
      style={{
        background: "rgba(10, 16, 26, 0.95)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "18px",
        overflow: "hidden",
        marginTop: "16px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
      }}
    >
      {/* Cabecera del Mapa */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          background: "rgba(255, 255, 255, 0.03)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: "rgba(233, 3, 5, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ff4d4f",
            }}
          >
            <Compass size={17} />
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>
              Mapa de Ubicación del Local
            </div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.55)" }}>
              {localName}
            </div>
          </div>
        </div>

        {/* Botón único y directo: Cómo llegar */}
        <a
          href={navigationUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "10px",
            fontSize: "12px",
            fontWeight: 800,
            background: "var(--red, #e90305)",
            color: "#ffffff",
            textDecoration: "none",
            boxShadow: "0 4px 14px rgba(233, 3, 5, 0.35)",
            transition: "all 0.2s ease",
          }}
        >
          <Navigation size={13} /> ¿Cómo llegar? <ExternalLink size={12} />
        </a>
      </div>

      {/* Contenedor del Mapa Interactivo */}
      {hasValidCoords ? (
        <div
          ref={mapContainerRef}
          style={{
            width: "100%",
            height: "260px",
            background: "#1a2332",
            position: "relative",
            zIndex: 1,
          }}
        />
      ) : (
        <div
          style={{
            padding: "24px",
            textAlign: "center",
            background: "rgba(0,0,0,0.2)",
            color: "rgba(255,255,255,0.7)",
            fontSize: "13px",
          }}
        >
          <MapPin size={28} color="#ff6b6d" style={{ margin: "0 auto 8px" }} />
          <div>Ubicación referencial: <strong>{localName}</strong></div>
          <div style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
            {direccion}
          </div>
          <a
            href={navigationUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "12px",
              padding: "8px 16px",
              background: "var(--red)",
              color: "#fff",
              borderRadius: "10px",
              fontSize: "12px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <Navigation size={13} /> ¿Cómo llegar? <ExternalLink size={13} />
          </a>
        </div>
      )}
    </div>
  );
}
