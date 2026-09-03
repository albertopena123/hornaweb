/**
 * Servicio de CDN Oficial del JNE Voto Informado en Azure Blob Storage
 */

export const JNE_AZURE_BLOB_BASE = {
  LOGOS_PARTIDOS: 'https://stovotoinformadodev.blob.core.windows.net/contenedor-2',
  FOTOS_CANDIDATOS: 'https://stovotoinformadodev.blob.core.windows.net/contenedor-1',
  MPESEXT_IMAGEN_CANDIDATO: 'https://mpesext.jne.gob.pe/mpesext/ObtenerImagenCandidato.ashx?strCodigoCompleto=',
  PLATAFORMA_ELECTORAL: 'https://plataformaelectoral.jne.gob.pe',
  VOTO_INFORMADO_CANDIDATOS: 'https://votoinformado.jne.gob.pe/candidatos'
};

/**
 * Genera la URL pública oficial del logotipo en Azure Blob Storage del JNE
 * @param idOrganizacion ID numérico de la organización política (ej: '1257', '14', '22')
 */
export function getJneBlobLogoUrl(idOrganizacion: string): string {
  if (!idOrganizacion) return 'https://plataformaelectoral.jne.gob.pe/assets/images/partido-placeholder.png';
  return `${JNE_AZURE_BLOB_BASE.LOGOS_PARTIDOS}/${idOrganizacion}.png`;
}

/**
 * Genera la URL pública oficial de la foto del candidato en el JNE
 * @param idHojaVida ID de la Hoja de Vida o DNI del candidato
 */
export function getJneFotoCandidatoUrl(idFotoOrDni: string): string {
  if (!idFotoOrDni) return createSvgUserFallback('Candidato');
  if (idFotoOrDni.startsWith('http')) return idFotoOrDni;
  const fileName = idFotoOrDni.endsWith('.jpg') || idFotoOrDni.endsWith('.png') ? idFotoOrDni : `${idFotoOrDni}.jpg`;
  return `${JNE_AZURE_BLOB_BASE.FOTOS_CANDIDATOS}/${fileName}`;
}

/**
  * Genera una insignia SVG vectorial limpia para logotipos en caso de fallo de red
  */
export function createSvgLogoFallback(partyName: string): string {
  const words = (partyName || 'PARTIDO').toUpperCase().split(' ').filter(w => w.length > 2 && !['DEL', 'POR', 'PARA', 'LOS', 'LAS', 'CON', 'PERU', 'PERÚ'].includes(w));
  const initials = words.slice(0, 3).map(w => w[0]).join('') || partyName.substring(0, 2).toUpperCase();
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
    <rect width="100" height="100" rx="14" fill="#0f172a"/>
    <circle cx="50" cy="50" r="38" fill="#dc2626" stroke="#ffffff" stroke-width="4"/>
    <text x="50" y="59" font-family="Arial, sans-serif" font-size="26" font-weight="900" fill="#ffffff" text-anchor="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
  * Genera una silueta SVG vectorial limpia y profesional para fotos de candidatos
  */
export function createSvgUserFallback(candidateName: string): string {
  const initials = (candidateName || 'Candidato').toUpperCase().split(' ').filter(w => w.length > 0).slice(0, 2).map(w => w[0]).join('') || 'C';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#991b1b"/>
        <stop offset="100%" stop-color="#dc2626"/>
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="28" fill="url(#avatarGrad)"/>
    <circle cx="80" cy="58" r="32" fill="url(#bodyGrad)" stroke="#ffffff" stroke-width="2"/>
    <path d="M 24 146 C 24 100, 136 100, 136 146 Z" fill="url(#bodyGrad)" stroke="#ffffff" stroke-width="2"/>
    <text x="80" y="68" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

