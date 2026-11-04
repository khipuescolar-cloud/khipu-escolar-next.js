// Responsable: B (specs/43). Generador pseudoaleatorio con semilla (p. ej. mulberry32): mismo número → misma secuencia.
// Puro: los generadores de ejercicios NUNCA usan Math.random.
import { pendiente } from "./pendiente";

export interface Azar {
  /** [0, 1) */
  siguiente(): number;
  /** Entero en [min, max] (ambos incluidos). */
  entero(min: number, max: number): number;
  elegir<T>(lista: readonly T[]): T;
  barajar<T>(lista: readonly T[]): T[];
}

export function crearAzar(semilla: number): Azar {
  return pendiente("B", "crearAzar", semilla);
}

/** Semilla nueva para una sesión (entero de 31 bits no negativo). */
export function nuevaSemilla(): number {
  return pendiente("B", "nuevaSemilla");
}
