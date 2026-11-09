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
    // La vista previa de documentos (specs/31) incrusta `/archivos/<id>?vista=1` en un iframe del MISMO origen: solo ahí se
    // permite `SAMEORIGIN` (nunca otros sitios). El resto de la app y las descargas conservan `DENY`.
    const mismoOrigen = CABECERAS_SEGURIDAD.map((c) => c.key === "X-Frame-Options" ? { ...c, value: "SAMEORIGIN" } : c.key === "Content-Security-Policy" ? { ...c, value: "frame-ancestors 'self'" } : c);
    const vistaPrevia = { type: "query" as const, key: "vista", value: "1" };
    return [
      { source: "/archivos/:id", has: [vistaPrevia], headers: mismoOrigen },
      { source: "/archivos/:id", missing: [vistaPrevia], headers: CABECERAS_SEGURIDAD },
      { source: "/((?!archivos/).*)", headers: CABECERAS_SEGURIDAD },
    ];
  },
  allowedDevOrigins: ["lvh.me", "*.lvh.me"],
  serverExternalPackages: ["@react-pdf/renderer", "pg"],
  // El banco se lee en el servidor desde archivos JSON según área, nivel y grado.
  outputFileTracingIncludes: { "/*": ["src/lib/nudito/conocimiento/banco/**/*.json"] },
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
