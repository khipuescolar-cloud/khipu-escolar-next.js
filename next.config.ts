import type { NextConfig } from "next";

// Cabeceras de seguridad en todas las respuestas (specs/15). Sin CSP completa (rompería los scripts de Next):
// solo `frame-ancestors` contra el clickjacking. HSTS lo ignoran los navegadores en http (local). La cámara solo la usa
// el escáner QR de portería (mismo origen).
export const CABECERAS_SEGURIDAD = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
];

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
  async headers() {
    return [{ source: "/:path*", headers: CABECERAS_SEGURIDAD }];
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
