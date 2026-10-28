import type { MetadataRoute } from "next";
import { urlRaiz } from "@/lib/dominio";

// Sitemap del sitio público (specs/25): la landing y la página para instalar la app. Nada de subdominios.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: urlRaiz("/"), changeFrequency: "weekly", priority: 1 },
    { url: urlRaiz("/instalar"), changeFrequency: "monthly", priority: 0.6 },
  ];
}
