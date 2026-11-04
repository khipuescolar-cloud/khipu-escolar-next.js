// Responsable: B (specs/43). Ítems REVISADOS escritos por personas (banco de Ciencia y lecturas de Comunicación) en JSON:
// esquema del sobre, armado de `EjercicioConSolucion` y selector determinista por semilla y dificultad, sin repetir en la
// sesión. La IA nunca crea ítems.
import { z } from "zod";
import { crearAzar } from "../azar";
import {
  esquemaDificultad,
  esquemaEjercicioConSolucion,
  esquemaNivel,
  esquemaTemaClave,
  type Dificultad,
  type EjercicioConSolucion,
  type NivelNudito,
  type TemaClave,
  type TipoEjercicio,
} from "../contratos";
import { rubricaEscritura } from "../rubricas/escritura";

export const esquemaItem = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,32}$/),
  temaClave: esquemaTemaClave,
  nivel: esquemaNivel,
  grado: z.number().int().min(1).max(6),
  dificultad: esquemaDificultad,
  categoria: z.string().min(1),
  genero: z.string().optional(),
  /** Referencia general (CNEB, texto escolar). */
  fuente: z.string().min(10),
  /** Revisión docente pendiente mientras sea null. */
  revisadoPor: z.string().min(1).nullable(),
  /** Ejercicio sin los campos base (temaClave, dificultad, fuenteId, semilla) que se completan al armar. */
  ejercicio: z.object({
    publico: z.looseObject({ tipo: z.string() }),
    solucion: z.unknown().optional(),
    pistas: z.tuple([z.string(), z.string(), z.string()]),
    explicacion: z.string(),
  }),
});
export type ItemRevisado = z.infer<typeof esquemaItem>;

/** Valida y congela una colección (lanza con el id del ítem si algo no cumple). */
export function cargarItems(coleccionId: string, ...listas: unknown[]): readonly ItemRevisado[] {
  const items = listas.flatMap((l) => z.array(esquemaItem).parse(l));
  const ids = new Set<string>();
  for (const it of items) {
    if (ids.has(it.id)) throw new Error(`${coleccionId}: id duplicado ${it.id}`);
    ids.add(it.id);
    const r = esquemaEjercicioConSolucion.safeParse(armarItem(coleccionId, it, 0));
    if (!r.success) throw new Error(`${coleccionId}:${it.id} no cumple el contrato: ${r.error.message}`);
  }
  return Object.freeze(items);
}

export const tipoDeItem = (it: ItemRevisado) => it.ejercicio.publico.tipo as TipoEjercicio;

/** Ejercicio completo de un ítem. La escritura recibe la rúbrica formativa de su grado. */
export function armarItem(coleccionId: string, it: ItemRevisado, semilla: number): EjercicioConSolucion {
  const base = { temaClave: it.temaClave, dificultad: it.dificultad, fuenteId: `${coleccionId}:${it.id}`, semilla };
  if (it.ejercicio.publico.tipo === "escritura_rubrica") {
    const rubrica = rubricaEscritura(it.nivel, it.grado);
    return {
      publico: { ...it.ejercicio.publico, ...base, rubricaId: rubrica.id, criteriosVisibles: rubrica.criterios.map((c) => c.descripcion) },
      solucion: { tipo: "escritura_rubrica", rubrica },
      pistas: it.ejercicio.pistas,
      explicacion: it.ejercicio.explicacion,
    } as EjercicioConSolucion;
  }
  return { publico: { ...it.ejercicio.publico, ...base }, solucion: it.ejercicio.solucion, pistas: it.ejercicio.pistas, explicacion: it.ejercicio.explicacion } as EjercicioConSolucion;
}

export type CriterioSeleccion = {
  temaClave: TemaClave;
  nivel: NivelNudito;
  grado: number;
  dificultad: Dificultad;
  semilla: number;
  /** Tipos permitidos por el tema (si se omite, cualquiera). */
  tipos?: readonly TipoEjercicio[];
  /** Ids de ítem (o fuenteId «coleccion:item») ya usados en la sesión. */
  usados?: Iterable<string>;
};

/**
 * Selección determinista:
 * 1. ítems del tema (si no hay, del mismo nivel y grado: fallback mientras se reconcilian las claves con el catálogo);
 * 2. de los tipos que admite el tema; 3. sin los ya usados (si se agotaron, se vuelve a permitir todos);
 * 4. los de dificultad más cercana a la pedida; 5. uno de ellos según la semilla.
 */
export function seleccionarItem(items: readonly ItemRevisado[], c: CriterioSeleccion): ItemRevisado | null {
  let pool = items.filter((i) => i.temaClave === c.temaClave);
  if (!pool.length) pool = items.filter((i) => i.nivel === c.nivel && i.grado === c.grado);
  if (c.tipos?.length) {
    const conTipo = pool.filter((i) => c.tipos!.includes(tipoDeItem(i)));
    if (conTipo.length) pool = conTipo;
  }
  if (!pool.length) return null;
  const usados = new Set([...(c.usados ?? [])].map((u) => u.split(":").pop()!));
  const libres = pool.filter((i) => !usados.has(i.id));
  if (libres.length) pool = libres;
  const distancia = Math.min(...pool.map((i) => Math.abs(i.dificultad - c.dificultad)));
  const cercanos = pool.filter((i) => Math.abs(i.dificultad - c.dificultad) === distancia).sort((a, b) => a.id.localeCompare(b.id));
  return crearAzar(c.semilla).elegir(cercanos);
}
