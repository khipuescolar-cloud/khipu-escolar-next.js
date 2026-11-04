// Responsable: A (specs/42). Catálogo GLOBAL de temas de Nudito, en código (JSON por área en esta carpeta, revisado
// por PR, como el catálogo CNEB de src/lib/cneb). Puro: sin BD. Los temas propios del colegio se suman en
// src/lib/server/nudito/catalogo.ts.
import type { AreaNudito, NivelNudito, Tema, TemaClave } from "../contratos";
import { pendiente } from "../pendiente";

/** Todos los temas globales, validados con `esquemaTema` al cargar. */
export function temasGlobales(): readonly Tema[] {
  return pendiente("A", "temasGlobales");
}

/** Temas de un área para un nivel; con `grado`, solo ese grado. */
export function temasDe(area: AreaNudito, nivel: NivelNudito, grado?: number): Tema[] {
  return pendiente("A", "temasDe", area, nivel, grado);
}

export function temaPorClave(clave: TemaClave): Tema | null {
  return pendiente("A", "temaPorClave", clave);
}

/** Búsqueda determinista por palabras clave y sinónimos (normalizados, sin tildes). Mayor puntaje primero. */
export function buscarTemas(texto: string, temas: readonly Tema[]): { tema: Tema; puntaje: number }[] {
  return pendiente("A", "buscarTemas", texto, temas);
}
