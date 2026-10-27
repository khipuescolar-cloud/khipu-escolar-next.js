import type { NextConfig } from "next";

// La app es dinámica por usuario y colegio (cookies + BD en cada request),
// por eso no se activa cacheComponents.
const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true, // forbidden() / unauthorized() para el bloqueo por plan y rol
    // Adjuntos de hasta 5 MB (specs/14) + margen del multipart.
    serverActions: { bodySizeLimit: "6mb" },
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
