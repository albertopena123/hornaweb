/**
 * Utilidades para parsear y validar coordenadas geográficas de Google Maps y texto libre
 */

export type LatLng = {
  lat: number;
  lng: number;
};

/**
 * Parsea diversas formas de entrada de coordenadas:
 * 1. URL completa de Google Maps:
 *    - https://www.google.com/maps/place/.../@-12.5933894,-69.1891234,17z/...
 *    - https://maps.google.com/?q=-12.5933,-69.1891
 *    - https://www.google.com/maps?ll=-12.5933,-69.1891
 * 2. Texto con comas o espacios:
 *    - "-12.5933, -69.1891"
 *    - "-12.5933 -69.1891"
 */
export function parseCoordinates(input: string): LatLng | null {
  if (!input) return null;
  const str = input.trim();

  // Caso 1: @lat,lng en URL
  const atMatch = str.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // Caso 2: q=lat,lng o ll=lat,lng en URL
  const queryMatch = str.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // Caso 3: texto directo lat, lng (con o sin comas)
  const directMatch = str.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
  if (directMatch) {
    const lat = parseFloat(directMatch[1]);
    const lng = parseFloat(directMatch[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  return null;
}

export function isValidLatLng(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Formatea coordenadas para enlace directo a Google Maps */
export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
