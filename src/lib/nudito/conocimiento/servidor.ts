import "server-only";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { esquemaFicha, type FichaConocimiento } from "./esquema";
import { temasDe, temaPorClave } from "@/lib/nudito/catalogo";
import type { AreaNudito, Dificultad, EjercicioConSolucion, NivelNudito, Tema } from "@/lib/nudito/contratos";

const raiz = join(process.cwd(), "src/lib/nudito/conocimiento/banco");
const prefijos: Record<AreaNudito, string> = { matematica: "mat", comunicacion: "com", "ciencia-tecnologia": "cyt" };
const areasPorPrefijo: Record<string, AreaNudito> = { mat: "matematica", com: "comunicacion", cyt: "ciencia-tecnologia" };
const cache = new Map<string, Promise<readonly FichaConocimiento[]>>();

async function leerFichas(carpeta: string): Promise<FichaConocimiento[]> {
  let archivos: string[];
  try { archivos = (await readdir(carpeta)).filter(a => a.endsWith(".json")).sort(); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const grupos = await Promise.all(archivos.map(async archivo => {
    const datos: unknown = JSON.parse(await readFile(join(carpeta, archivo), "utf8"));
    if (!Array.isArray(datos)) throw new Error("Se esperaba un arreglo de fichas en " + archivo);
    return datos.map(f => esquemaFicha.parse(f));
  }));
  return grupos.flat();
}

async function cargar(area: AreaNudito, nivel: NivelNudito, grado: number): Promise<readonly FichaConocimiento[]> {
  return leerFichas(join(raiz, area, nivel + "-" + grado, "fichas"));
}

export async function fichasDe(area: AreaNudito, nivel: NivelNudito, grado: number): Promise<readonly FichaConocimiento[]> {
  if (grado < 1 || grado > (nivel === "primaria" ? 6 : 5)) return [];
  const clave = area + ":" + nivel + ":" + grado;
  if (!cache.has(clave)) cache.set(clave, cargar(area, nivel, grado).catch(error => { cache.delete(clave); throw error; }));
  return cache.get(clave)!;
}

export async function fichaPorClave(clave: string): Promise<FichaConocimiento | null> {
  const partes = /^(mat|com|cyt)\.([ps])([1-6])\.[a-z0-9-]+$/.exec(clave);
  if (!partes) return null;
  const area = areasPorPrefijo[partes[1]];
  const nivel = partes[2] === "p" ? "primaria" : "secundaria";
  return (await fichasDe(area, nivel, Number(partes[3]))).find(f => f.clave === clave) ?? null;
}

export function temaDeFicha(f: FichaConocimiento): Tema {
  const primero = f.ejemplos[0];
  return {
    clave: f.clave, area: f.area, nivel: f.nivel, grado: f.grado, competenciaCneb: f.competenciaCneb,
    capacidad: f.capacidad, desempenoCodigo: f.desempenosOrigen[0], nombre: f.nombre, subtema: f.bloque,
    descripcionCorta: f.descripcionCorta, palabrasClave: f.palabrasClave, prerrequisitos: f.prerrequisitos,
    dificultad: { min: 1, max: 3 }, tipos: [...new Set(f.ejercicios.map(e => e.tipo))],
    fuente: { tipo: "banco", bancoId: prefijos[f.area] + ".banco" },
    repaso: { idea: f.ideaCentral, ejemplo: primero.situacion + " " + primero.desarrollo, errorFrecuente: f.erroresFrecuentes[0].error },
    recursos: [], origen: "cneb", version: f.version, revisado: f.revisado,
  };
}

export async function temasDeConBanco(area: AreaNudito, nivel: NivelNudito, grado?: number): Promise<Tema[]> {
  const grados = grado === undefined ? Array.from({ length: nivel === "primaria" ? 6 : 5 }, (_, i) => i + 1) : [grado];
  const grupos = await Promise.all(grados.map(async g => {
    const fichas = await fichasDe(area, nivel, g);
    return fichas.length ? fichas.map(temaDeFicha) : temasDe(area, nivel, g);
  }));
  return grupos.flat();
}

export async function temaPorClaveConBanco(clave: string): Promise<Tema | null> {
  const partes = /^(mat|com|cyt)\.([ps])([1-6])\.[a-z0-9-]+$/.exec(clave);
  if (partes) {
    const fichas = await fichasDe(areasPorPrefijo[partes[1]], partes[2] === "p" ? "primaria" : "secundaria", Number(partes[3]));
    if (fichas.length) {
      const ficha = fichas.find(f => f.clave === clave);
      return ficha ? temaDeFicha(ficha) : null;
    }
  }
  return temaPorClave(clave);
}

export async function ejercicioDelBanco(tema: Tema, dificultad: Dificultad, semilla: number, usados: Iterable<string> = []): Promise<EjercicioConSolucion | null> {
  const ficha = await fichaPorClave(tema.clave);
  if (!ficha) return null;
  const utilizados = new Set(usados);
  const disponibles = ficha.ejercicios.filter(e => e.dificultad <= dificultad && !utilizados.has(prefijos[ficha.area] + ".banco:" + tema.clave + ":" + e.id));
  const lista = disponibles.length ? disponibles : ficha.ejercicios.filter(e => e.dificultad <= dificultad);
  const e = lista[Math.abs(semilla) % lista.length];
  const fuenteId = prefijos[ficha.area] + ".banco:" + tema.clave + ":" + e.id;
  const comun = { temaClave: tema.clave, dificultad, fuenteId, semilla, enunciado: e.enunciado, lectura: e.lectura };
  const publico = e.tipo === "numerico" ? { ...comun, tipo: e.tipo } as const
    : e.tipo === "opcion_multiple" ? { ...comun, tipo: e.tipo, opciones: e.opciones! } as const
    : e.tipo === "verdadero_falso" ? { ...comun, tipo: e.tipo, afirmaciones: [{ id: "a", texto: e.enunciado }] } as { tipo: "verdadero_falso"; afirmaciones: {id: string; texto: string}[] } & typeof comun
    : { ...comun, tipo: "texto_corto" as const, maxCaracteres: 100 };
  const solucion = e.tipo === "numerico" ? { tipo: e.tipo, valor: e.respuesta as number, tolerancia: 0 } as const
    : e.tipo === "opcion_multiple" ? { tipo: e.tipo, correcta: e.respuesta as string, distractores: {} } as const
    : e.tipo === "verdadero_falso" ? { tipo: e.tipo, valores: { a: e.respuesta as boolean } } as const
    : { tipo: "texto_corto" as const, aceptadas: [String(e.respuesta), ...e.alternativasAceptadas], normalizacion: "literal" as const };
  return { publico, solucion, pistas: e.pistas, explicacion: e.retroalimentacion };
}
