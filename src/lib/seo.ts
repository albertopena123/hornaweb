/**
 * Datos canónicos para SEO. Un solo lugar donde vive el nombre del candidato,
 * el cargo al que postula y el ámbito geográfico, para que metadata, JSON-LD,
 * sitemap y robots no se contradigan entre sí.
 *
 * OJO con el cargo: la landing hablaba de "Gobierno Regional" pero nunca de
 * "gobernador", que es justo como la gente busca ("gobernador de Madre de
 * Dios", "gobernador Puerto Maldonado"). El término va explícito aquí y en la
 * copia visible del hero.
 */

export const SITE_URL = "https://ahoranacionmdd.com";

export const CANDIDATE = {
  name: "Simón Horna Alpaca",
  firstName: "Simón",
  lastName: "Horna Alpaca",
  office: "Gobernador Regional de Madre de Dios",
  jobTitle: "Candidato a Gobernador Regional de Madre de Dios",
  term: "2027-2030",
} as const;

export const PARTY = {
  name: "Ahora Nación",
  slogan:
    "Todo el poder a las regiones para conquistar los mercados del mundo",
} as const;

export const REGION = {
  name: "Madre de Dios",
  capital: "Puerto Maldonado",
  provinces: ["Tambopata", "Manu", "Tahuamanu"],
  country: "Perú",
  // Plaza de Armas de Puerto Maldonado.
  geo: { lat: -12.5933, lng: -69.1891 },
} as const;

export const ELECTION = {
  name: "Elecciones Regionales y Municipales 2026",
  year: "2026",
} as const;

/** Título por defecto: el patrón que más se busca, nombre + cargo + región. */
export const SITE_TITLE = `${CANDIDATE.name} | ${CANDIDATE.jobTitle} — ${PARTY.name}`;

export const SITE_DESCRIPTION = `${CANDIDATE.name}, candidato a Gobernador Regional de ${REGION.name} ${CANDIDATE.term} por ${PARTY.name}. Propuestas para ${REGION.capital}, ${REGION.provinces.join(", ")} rumbo a las ${ELECTION.name}.`;

/**
 * Palabras clave alineadas a cómo busca la gente: nombre suelto, nombre +
 * región, y la consulta genérica del cargo ("gobernador Puerto Maldonado"),
 * donde hoy la web no aparecía porque no usaba la palabra "gobernador".
 */
export const SITE_KEYWORDS = [
  "Simón Horna",
  "Simon Horna",
  "Simón Horna Alpaca",
  "Simon Horna Madre de Dios",
  "Horna Madre de Dios",
  "gobernador Madre de Dios",
  "gobernador regional Madre de Dios",
  "candidato a gobernador Madre de Dios",
  "gobernador Puerto Maldonado",
  "candidato Puerto Maldonado",
  "Ahora Nación",
  "Ahora Nación Madre de Dios",
  "Ahora Nación Puerto Maldonado",
  "elecciones regionales 2026 Madre de Dios",
  "Gobierno Regional de Madre de Dios",
  "Tambopata",
  "Manu",
  "Tahuamanu",
];

const CANDIDATE_ID = `${SITE_URL}/#candidato`;
const PARTY_ID = `${SITE_URL}/#partido`;
const SITE_ID = `${SITE_URL}/#website`;

/**
 * Grafo JSON-LD de la portada: quién es (Person), por qué organización
 * (PoliticalParty), qué sitio es (WebSite) y las preguntas que la gente
 * escribe en Google (FAQPage, candidata a rich result).
 */
export function landingJsonLd() {
  const person = {
    "@type": "Person",
    "@id": CANDIDATE_ID,
    name: CANDIDATE.name,
    givenName: CANDIDATE.firstName,
    familyName: CANDIDATE.lastName,
    jobTitle: CANDIDATE.jobTitle,
    description: `${CANDIDATE.name} postula a ${CANDIDATE.office} (${CANDIDATE.term}) por ${PARTY.name}.`,
    url: SITE_URL,
    image: `${SITE_URL}/assets/images/campaign/cover.jpg`,
    nationality: { "@type": "Country", name: REGION.country },
    affiliation: { "@id": PARTY_ID },
    memberOf: { "@id": PARTY_ID },
    homeLocation: {
      "@type": "Place",
      name: `${REGION.capital}, ${REGION.name}, ${REGION.country}`,
      address: {
        "@type": "PostalAddress",
        addressLocality: REGION.capital,
        addressRegion: REGION.name,
        addressCountry: "PE",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: REGION.geo.lat,
        longitude: REGION.geo.lng,
      },
    },
    knowsAbout: [
      `Gobierno Regional de ${REGION.name}`,
      `Desarrollo de ${REGION.capital}`,
      ...REGION.provinces,
    ],
  };

  const party = {
    "@type": ["PoliticalParty", "Organization"],
    "@id": PARTY_ID,
    name: PARTY.name,
    alternateName: `${PARTY.name} ${REGION.name}`,
    slogan: PARTY.slogan,
    url: SITE_URL,
    logo: `${SITE_URL}/assets/images/logo/logo-an.webp`,
    areaServed: {
      "@type": "AdministrativeArea",
      name: `${REGION.name}, ${REGION.country}`,
    },
    member: { "@id": CANDIDATE_ID },
  };

  const website = {
    "@type": "WebSite",
    "@id": SITE_ID,
    url: SITE_URL,
    name: SITE_TITLE,
    inLanguage: "es-PE",
    about: { "@id": CANDIDATE_ID },
    publisher: { "@id": PARTY_ID },
  };

  const faq = {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    mainEntity: [
      {
        q: `¿Quién es ${CANDIDATE.name}?`,
        a: `${CANDIDATE.name} es el candidato a ${CANDIDATE.office} por ${PARTY.name} para el periodo ${CANDIDATE.term}. Su propuesta abarca ${REGION.capital} y las provincias de ${REGION.provinces.join(", ")}.`,
      },
      {
        q: `¿Quién es el candidato a gobernador de ${REGION.name} por ${PARTY.name}?`,
        a: `${CANDIDATE.name} encabeza la lista de ${PARTY.name} al Gobierno Regional de ${REGION.name} en las ${ELECTION.name}.`,
      },
      {
        q: `¿Qué propone ${CANDIDATE.name} para ${REGION.capital}?`,
        a: `Su plan se organiza en cuatro dimensiones estratégicas con más de 17 propuestas concretas para ${REGION.capital} y el resto de ${REGION.name}, bajo la idea de ${PARTY.name}: ${PARTY.slogan.toLowerCase()}.`,
      },
      {
        q: `¿Cuándo se elige al Gobernador Regional de ${REGION.name}?`,
        a: `El Gobernador Regional de ${REGION.name} se elige en las ${ELECTION.name}, para gobernar el periodo ${CANDIDATE.term}.`,
      },
      {
        q: `¿Cómo apoyo la campaña de ${PARTY.name} en ${REGION.name}?`,
        a: `Desde esta web puedes registrar tu apoyo en segundos con tu DNI y ubicar tu distrito en el mapa de apoyo de ${REGION.name}.`,
      },
    ].map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [person, party, website, faq],
  };
}
