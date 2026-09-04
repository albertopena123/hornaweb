import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Solo la portada es pública; el resto es panel interno o páginas de socio que
 * el middleware manda a /login (indexarlas solo generaría resultados vacíos).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/login",
        "/403",
        "/inicio",
        "/cuenta",
        "/usuarios",
        "/roles",
        "/simpatizantes",
        "/personeros",
        "/mi-mesa",
        "/mi-foto",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
