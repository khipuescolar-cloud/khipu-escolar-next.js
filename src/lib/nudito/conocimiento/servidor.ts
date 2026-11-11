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

type Propuesto = { clave: string; nombre: string; disciplina: string; descripcion: string; desempenosOrigen: string[]; prerrequisitos: string[]; ordenSugerido: number };
export async function temasPropuestosDe(area: AreaNudito, nivel: NivelNudito, grado: number): Promise<{ tema: Tema; disciplina: string }[]> {
  let fuente: { competencias: { numero: number; capacidades: { nombre: string; bloques: { nombre: string; temas: Propuesto[] }[] }[] }[] };
  try { fuente = JSON.parse(await readFile(join(raiz, area, nivel + "-" + grado, "temario-propuesto.json"), "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  return fuente.competencias.flatMap(c => c.capacidades.flatMap(cap => cap.bloques.flatMap(b => b.temas.map(t => ({
    disciplina: t.disciplina,
    tema: {
      clave: t.clave, area, nivel, grado, competenciaCneb: c.numero, capacidad: cap.nombre,
      desempenoCodigo: t.desempenosOrigen[0], nombre: t.nombre, subtema: b.nombre,
      descripcionCorta: t.descripcion, palabrasClave: t.nombre.toLowerCase().split(/\s+/).filter(x => x.length > 2),
      prerrequisitos: t.prerrequisitos, dificultad: { min: 1, max: 3 }, tipos: ["texto_corto"],
      fuente: { tipo: "banco", bancoId: "propuesta" }, repaso: { idea: t.descripcion, ejemplo: t.descripcion },
      recursos: [], origen: "cneb", version: 1, revisado: null,
    } as Tema,
  }))))).sort((a, b) => {
    const aa = fuente.competencias.flatMap(c => c.capacidades.flatMap(cap => cap.bloques.flatMap(b => b.temas)));
    return (aa.find(t => t.clave === a.tema.clave)?.ordenSugerido ?? 0) - (aa.find(t => t.clave === b.tema.clave)?.ordenSugerido ?? 0);
  });
}

export async function temaTienePractica(clave: string): Promise<boolean> {
  return Boolean(await fichaPorClave(clave)) || Boolean(temaPorClave(clave));
}

export async function temasDeConBanco(area: AreaNudito, nivel: NivelNudito, grado?: number): Promise<Tema[]> {
  const grados = grado === undefined ? Array.from({ length: nivel === "primaria" ? 6 : 5 }, (_, i) => i + 1) : [grado];
  const grupos = await Promise.all(grados.map(async g => {
    const [propuestos, fichas] = await Promise.all([temasPropuestosDe(area, nivel, g), fichasDe(area, nivel, g)]);
    const antiguos = temasDe(area, nivel, g);
    const porClave = new Map<string, Tema>([...propuestos.map(p => [p.tema.clave, p.tema] as const), ...antiguos.map(t => [t.clave, t] as const), ...fichas.map(f => [f.clave, temaDeFicha(f)] as const)]);
    return [...porClave.values()];
  }));
  return grupos.flat();
}

export async function temaPorClaveConBanco(clave: string): Promise<Tema | null> {
  const partes = /^(mat|com|cyt)\.([ps])([1-6])\.[a-z0-9-]+$/.exec(clave);
  if (!partes) return temaPorClave(clave);
  const area = areasPorPrefijo[partes[1]], nivel = partes[2] === "p" ? "primaria" : "secundaria", grado = Number(partes[3]);
  return (await temasDeConBanco(area, nivel, grado)).find(t => t.clave === clave) ?? null;
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
