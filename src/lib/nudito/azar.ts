// Responsable: B (specs/43). Generador pseudoaleatorio con semilla (mulberry32): mismo número → misma secuencia.
// Puro: los generadores de ejercicios NUNCA usan Math.random.

export interface Azar {
  /** [0, 1) */
  siguiente(): number;
  /** Entero en [min, max] (ambos incluidos). */
  entero(min: number, max: number): number;
  elegir<T>(lista: readonly T[]): T;
  barajar<T>(lista: readonly T[]): T[];
}

/** Normaliza cualquier número a un entero de 32 bits sin signo (las semillas negativas o decimales también son válidas). */
function semilla32(semilla: number): number {
  if (!Number.isFinite(semilla)) return 0;
  return Math.trunc(semilla) >>> 0;
}

export function crearAzar(semilla: number): Azar {
  let estado = semilla32(semilla);
  const siguiente = () => {
    // mulberry32 (dominio público).
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const entero = (min: number, max: number) => {
    const a = Math.ceil(Math.min(min, max));
    const b = Math.floor(Math.max(min, max));
    if (b < a) throw new RangeError(`Rango vacío [${min}, ${max}]`);
    return a + Math.floor(siguiente() * (b - a + 1));
  };
  return {
    siguiente,
    entero,
    elegir<T>(lista: readonly T[]): T {
      if (lista.length === 0) throw new RangeError("No se puede elegir de una lista vacía");
      return lista[entero(0, lista.length - 1)];
    },
    barajar<T>(lista: readonly T[]): T[] {
      const copia = [...lista];
      for (let i = copia.length - 1; i > 0; i--) {
        const j = entero(0, i);
        [copia[i], copia[j]] = [copia[j], copia[i]];
      }
      return copia;
    },
  };
}

/** Deriva una semilla hija estable (p. ej. para el n-ésimo ejercicio de una sesión). */
export function derivarSemilla(semilla: number, ...partes: (number | string)[]): number {
  let h = semilla32(semilla) ^ 0x9e3779b9;
  for (const parte of partes) {
    const texto = String(parte);
    for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 0x01000193) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  }
  return h & 0x7fffffff;
}

/** Semilla nueva para una sesión (entero de 31 bits no negativo). Única fuente de aleatoriedad real (no la usan los generadores). */
export function nuevaSemilla(): number {
  const bytes = new Uint32Array(1);
  globalThis.crypto.getRandomValues(bytes);
  return bytes[0] & 0x7fffffff;
}
