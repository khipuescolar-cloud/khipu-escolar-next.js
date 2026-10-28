import type { MetadataRoute } from "next";
import { urlRaiz } from "@/lib/dominio";

// Solo el sitio público se indexa (specs/25). Los subdominios de colegio y el panel no se listan aquí.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/instalar", "/privacidad"], disallow: ["/api/", "/login", "/elegir-colegio", "/entrando", "/recuperar", "/restablecer", "/cambiar-password", "/justificar/", "/q/"] },
    sitemap: urlRaiz("/sitemap.xml"),
  };
}
