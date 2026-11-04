// Responsable: B (specs/43). Registro de generadores parametrizados (Matemática) y de bancos revisados (Ciencia) y
// colecciones de lecturas (Comunicación). Los ids que usa el catálogo (Tema.fuente) deben existir aquí: lo verifica el
// test de integridad del catálogo (A).
import type { Dificultad, EjercicioConSolucion, Generador, Tema } from "../contratos";
import { pendiente } from "../pendiente";

/** id → generador. */
export function generadores(): ReadonlyMap<string, Generador> {
  return pendiente("B", "generadores");
}

export function obtenerGenerador(id: string): Generador | null {
  return pendiente("B", "obtenerGenerador", id);
}

/** Ejercicio para un tema según su `fuente` (generador, banco o lecturas). Determinista por semilla. */
export function ejercicioPara(tema: Tema, dificultad: Dificultad, semilla: number): EjercicioConSolucion {
  return pendiente("B", "ejercicioPara", tema, dificultad, semilla);
}

/** Ids de bancos y colecciones disponibles (para el test de integridad del catálogo). */
export function fuentesDisponibles(): { generadores: string[]; bancos: string[]; lecturas: string[] } {
  return pendiente("B", "fuentesDisponibles");
}
