import type { NextConfig } from "next";

// La app es dinámica por usuario y colegio (cookies + BD en cada request),
// por eso no se activa cacheComponents.
const nextConfig: NextConfig = {
  // `pnpm dev:nube` (scripts/dev-nube.mjs) compila en otra carpeta para convivir con `pnpm dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    authInterrupts: true, // forbidden() / unauthorized() para el bloqueo por plan y rol
    // Adjuntos de comunicados y tareas: hasta 5 archivos de 10 MB (specs/14) + margen del multipart.
    // El proxy también bufferiza el cuerpo (10 MB por defecto): se sube al mismo tope.
    serverActions: { bodySizeLimit: "55mb" },
    proxyClientMaxBodySize: "55mb",
  },
  allowedDevOrigins: ["lvh.me", "*.lvh.me"],
  serverExternalPackages: ["@react-pdf/renderer", "pg"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
