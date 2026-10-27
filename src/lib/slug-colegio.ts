// Subdominio (slug) de un colegio nuevo (specs/16). Puro: lo usan el formulario (sugerencia en vivo) y el servidor.
import { SUBDOMINIOS_RESERVADOS } from "./dominio";

export const LARGO_MAX_SLUG = 40;

/** Palabras que no aportan al subdominio («I.E.P. San José de Jesús» → «san-jose-jesus»). */
const PALABRAS_VACIAS = new Set(["iep", "ie", "iee", "cep", "de", "del", "la", "las", "el", "los", "y", "e"]);

/** Sugiere un slug a partir del nombre: minúsculas, sin tildes, palabras unidas con guion. */
export function sugerirSlug(nombre: string): string {
  const palabras = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\./g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const utiles = palabras.filter((p) => !PALABRAS_VACIAS.has(p));
  let slug = (utiles.length ? utiles : palabras).join("-");
  if (slug.length > LARGO_MAX_SLUG) slug = slug.slice(0, LARGO_MAX_SLUG).replace(/-[^-]*$/, "") || slug.slice(0, LARGO_MAX_SLUG);
  slug = slug.replace(/^-+|-+$/g, "");
  return SUBDOMINIOS_RESERVADOS.has(slug) ? `${slug}-colegio` : slug;
}

/** Mensaje de error si el slug no se puede usar como subdominio; null si es válido (sin revisar si ya existe). */
export function errorDeSlug(slug: string): string | null {
  if (slug.length < 3) return "La dirección debe tener al menos 3 caracteres.";
  if (slug.length > LARGO_MAX_SLUG) return `La dirección puede tener hasta ${LARGO_MAX_SLUG} caracteres.`;
  if (!/^[a-z0-9-]+$/.test(slug)) return "Usa solo minúsculas, números y guiones.";
  if (slug.startsWith("-") || slug.endsWith("-") || slug.includes("--")) return "La dirección no puede empezar ni terminar con guion, ni tener dos seguidos.";
  if (SUBDOMINIOS_RESERVADOS.has(slug)) return "Esa dirección está reservada para Khipu.";
  return null;
}
