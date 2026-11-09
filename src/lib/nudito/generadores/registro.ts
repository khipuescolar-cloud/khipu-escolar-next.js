// Responsable: B (specs/43). Registro de generadores parametrizados (Matemática) y de bancos revisados (Ciencia) y
// colecciones de lecturas (Comunicación). Los ids que usa el catálogo (Tema.fuente) deben existir aquí: lo verifica el
// test de integridad del catálogo (A).
import { BANCO_CIENCIA_ID, seleccionarItemCiencia } from "../banco/ciencia";
import { armarItem } from "../banco/items";
import type { Dificultad, EjercicioConSolucion, Generador, Tema } from "../contratos";
import { COLECCION_ESCRITURA_ID, COLECCION_LECTURAS_ID, seleccionarItemComunicacion } from "../lecturas/comunicacion";
import { generadorEcuaciones } from "./matematica/ecuaciones";
import { generadorFracciones } from "./matematica/fracciones";
import { generadorGeometria } from "./matematica/geometria";
import { generadorOperaciones } from "./matematica/operaciones";
import { generadorPatrones } from "./matematica/patrones";
import { generadorPorcentajes } from "./matematica/porcentajes";
import { generadorProporcionalidad } from "./matematica/proporcionalidad";

/** Versión del registro: sube cuando cambia el conjunto de fuentes. Cada generador tiene además su propia versión. */
export const VERSION_REGISTRO = 1;

const GENERADORES: ReadonlyMap<string, Generador> = new Map(
  [generadorOperaciones, generadorFracciones, generadorProporcionalidad, generadorPorcentajes, generadorEcuaciones, generadorGeometria, generadorPatrones].map(
    (g) => [g.id, g] as const,
  ),
);

/**
 * Alias aceptados mientras se reconcilian los ids con el catálogo (A). Los fixtures del paso 0 usan los nombres largos.
 * No agregar alias nuevos: el catálogo debe usar los ids exactos.
 */
const ALIAS: Record<string, string> = {
  "mat.fracciones-equivalentes": "mat.fracciones",
  "mat.ecuaciones-lineales": "mat.ecuaciones",
};

/** id → generador. */
export function generadores(): ReadonlyMap<string, Generador> {
  return GENERADORES;
}

export function obtenerGenerador(id: string): Generador | null {
  return GENERADORES.get(ALIAS[id] ?? id) ?? null;
}

export type OpcionesEjercicio = {
  /** Ítems ya usados en la sesión (banco y lecturas): no se repiten mientras queden otros. */
  usados?: Iterable<string>;
};

/** Ejercicio para un tema según su `fuente` (generador, banco o lecturas). Determinista por semilla. */
export function ejercicioPara(tema: Tema, dificultad: Dificultad, semilla: number, opciones: OpcionesEjercicio = {}): EjercicioConSolucion {
  const f = tema.fuente;
  if (f.tipo === "generador") {
    const g = obtenerGenerador(f.generadorId);
    if (!g) throw new Error(`Generador desconocido: ${f.generadorId}`);
    return g.generar(tema, dificultad, semilla);
  }
  const criterio = { temaClave: tema.clave, nivel: tema.nivel, grado: tema.grado, dificultad, semilla, tipos: tema.tipos, usados: opciones.usados };
  if (f.tipo === "banco") {
    if (f.bancoId !== BANCO_CIENCIA_ID) throw new Error(`Banco desconocido: ${f.bancoId}`);
    const item = seleccionarItemCiencia(criterio);
    if (!item) throw new Error(`El banco ${f.bancoId} no tiene ítems para ${tema.clave}`);
    return armarItem(f.bancoId, item, semilla);
  }
  const item = seleccionarItemComunicacion(f.coleccionId, criterio);
  if (!item) throw new Error(`La colección ${f.coleccionId} no existe o no tiene ítems para ${tema.clave}`);
  return armarItem(f.coleccionId, item, semilla);
}

/** Ids de bancos y colecciones disponibles (para el test de integridad del catálogo). */
export function fuentesDisponibles(): { generadores: string[]; bancos: string[]; lecturas: string[] } {
  return { generadores: [...GENERADORES.keys()], bancos: [BANCO_CIENCIA_ID, "mat.banco"], lecturas: [COLECCION_LECTURAS_ID, COLECCION_ESCRITURA_ID] };
}
