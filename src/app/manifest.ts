import type { MetadataRoute } from "next";

// Manifiesto de la app instalable (specs/24-app-instalable.md), servido en /manifest.webmanifest.
// Rutas relativas a la raíz del origen: cada colegio (<slug>.<dominio>) es su propio origen y se instala
// como su propia app desde su dirección; el mismo manifiesto sirve para todos y para el panel de plataforma.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?origen=app",
    name: "Khipu Escolar",
    short_name: "Khipu",
    description: "Cada día de tu hijo, bien anudado. Asistencia, mensajes, comunicados y notas del colegio en tu celular.",
    start_url: "/?origen=app",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    theme_color: "#1E2A78",
    background_color: "#FAF7F2",
    lang: "es-PE",
    dir: "ltr",
    categories: ["education", "productivity"],
    icons: [
      { src: "/marca/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/marca/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/marca/icono-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/marca/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/marca/icono-app.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Pasar lista", short_name: "Lista", url: "/asistencia?origen=app", icons: [{ src: "/marca/atajo-asistencia.png", sizes: "96x96", type: "image/png" }] },
      { name: "Mensajes", url: "/mensajes?origen=app", icons: [{ src: "/marca/atajo-mensajes.png", sizes: "96x96", type: "image/png" }] },
      { name: "Comunicados", url: "/comunicados?origen=app", icons: [{ src: "/marca/atajo-comunicados.png", sizes: "96x96", type: "image/png" }] },
      { name: "Inicio", url: "/inicio?origen=app", icons: [{ src: "/marca/atajo-inicio.png", sizes: "96x96", type: "image/png" }] },
    ],
    screenshots: [
      { src: "/app/capturas/inicio-celular.png", sizes: "390x844", type: "image/png", form_factor: "narrow", label: "Inicio del colegio en el celular" },
      { src: "/app/capturas/asistencia-celular.png", sizes: "390x844", type: "image/png", form_factor: "narrow", label: "Pasar lista en el celular" },
      { src: "/app/capturas/inicio-escritorio.png", sizes: "1366x768", type: "image/png", form_factor: "wide", label: "Inicio del colegio en el computador" },
      { src: "/app/capturas/asistencia-escritorio.png", sizes: "1366x768", type: "image/png", form_factor: "wide", label: "Pasar lista en el computador" },
    ],
  };
}
