// Tonos de la paleta de marca para la landing (docs/marca · specs/25). Clases literales para que Tailwind las vea.
// Contraste: blanco sobre turquesa (5:1), cochinilla (6:1), indigo-cielo (7:1) e indigo (12:1); sobre maíz va siempre
// `sobre-maiz` (9.2:1). El maíz nunca se usa como texto sobre fondo claro.

export type Tono = "indigo" | "cielo" | "turquesa" | "cochinilla" | "maiz";

export const TONOS: Record<Tono, { rotulo: string; solido: string; suave: string; borde: string; tope: string; nudo: string }> = {
  indigo: { rotulo: "text-indigo", solido: "bg-indigo text-white", suave: "bg-indigo/8", borde: "border-indigo", tope: "border-t-indigo", nudo: "bg-indigo" },
  cielo: { rotulo: "text-indigo-cielo", solido: "bg-indigo-cielo text-white", suave: "bg-indigo-cielo/10", borde: "border-indigo-cielo", tope: "border-t-indigo-cielo", nudo: "bg-indigo-cielo" },
  turquesa: { rotulo: "text-turquesa", solido: "bg-turquesa text-white", suave: "bg-turquesa/10", borde: "border-turquesa", tope: "border-t-turquesa", nudo: "bg-turquesa" },
  cochinilla: { rotulo: "text-cochinilla", solido: "bg-cochinilla text-white", suave: "bg-cochinilla/8", borde: "border-cochinilla", tope: "border-t-cochinilla", nudo: "bg-cochinilla" },
  maiz: { rotulo: "text-tinta", solido: "bg-maiz text-sobre-maiz", suave: "bg-maiz/25", borde: "border-maiz", tope: "border-t-maiz", nudo: "bg-maiz" },
};

/** Botón de llamada a la acción en maíz (sobre índigo o cochinilla): tinta oscura encima, nunca blanco. */
export const BOTON_MAIZ = "bg-maiz text-sobre-maiz hover:bg-maiz/90 focus-visible:outline-white";
