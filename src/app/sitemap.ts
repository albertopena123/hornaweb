import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * La web es una sola página pública; las anclas de la landing no van al
 * sitemap (Google las descubre solo y no son URLs propias).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
