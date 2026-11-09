import "server-only";
import { esquemaFicha, type FichaConocimiento } from "./esquema";
import { temasDe, temaPorClave } from "@/lib/nudito/catalogo";
import type { AreaNudito, Dificultad, EjercicioConSolucion, NivelNudito, Tema } from "@/lib/nudito/contratos";

let cache: Promise<readonly FichaConocimiento[]> | undefined;
async function cargarMatematicaP3(): Promise<readonly FichaConocimiento[]> {
  cache ??= Promise.all([
    import("./banco/matematica/primaria-3/competencia-23.json"),
    import("./banco/matematica/primaria-3/competencia-24.json"),
    import("./banco/matematica/primaria-3/competencia-25.json"),
    import("./banco/matematica/primaria-3/competencia-26.json"),
    import("./banco/matematica/primaria-3/temas-existentes.json"),
  ]).then(modulos => modulos.flatMap(m => (m.default as unknown[]).map(f => esquemaFicha.parse(f))));
  return cache;
}
export async function fichasDe(area: AreaNudito, nivel: NivelNudito, grado: number): Promise<readonly FichaConocimiento[]> {
  return area === "matematica" && nivel === "primaria" && grado === 3 ? cargarMatematicaP3() : [];
}
export async function fichaPorClave(clave: string): Promise<FichaConocimiento | null> {
  if (!clave.startsWith("mat.p3.")) return null;
  return (await cargarMatematicaP3()).find(f => f.clave === clave) ?? null;
}
export function temaDeFicha(f: FichaConocimiento): Tema {
  const primero = f.ejemplos[0];
  return {
    clave: f.clave, area: f.area, nivel: f.nivel, grado: f.grado, competenciaCneb: f.competenciaCneb,
    capacidad: f.capacidad, desempenoCodigo: f.desempenosOrigen[0], nombre: f.nombre, subtema: f.bloque,
    descripcionCorta: f.descripcionCorta, palabrasClave: f.palabrasClave, prerrequisitos: f.prerrequisitos,
    dificultad: { min: 1, max: 3 }, tipos: [...new Set(f.ejercicios.map(e => e.tipo))],
    fuente: { tipo: "banco", bancoId: "mat.banco" },
    repaso: { idea: f.ideaCentral, ejemplo: primero.situacion + " " + primero.desarrollo, errorFrecuente: f.erroresFrecuentes[0].error },
    recursos: [], origen: "cneb", version: f.version, revisado: f.revisado,
  };
}
export async function temasDeConBanco(area: AreaNudito, nivel: NivelNudito, grado?: number): Promise<Tema[]> {
  const base = temasDe(area, nivel, grado);
  if (area !== "matematica" || nivel !== "primaria" || (grado !== undefined && grado !== 3)) return base;
  const fichas = await cargarMatematicaP3();
  const claves = new Set(fichas.map(f => f.clave));
  return [...base.filter(t => !claves.has(t.clave)), ...fichas.map(temaDeFicha)].sort((a, b) => a.grado - b.grado);
}
export async function temaPorClaveConBanco(clave: string): Promise<Tema | null> {
  const ficha = await fichaPorClave(clave);
  return ficha ? temaDeFicha(ficha) : temaPorClave(clave);
}
export async function ejercicioDelBanco(tema: Tema, dificultad: Dificultad, semilla: number, usados: Iterable<string> = []): Promise<EjercicioConSolucion | null> {
  const ficha = await fichaPorClave(tema.clave);
  if (!ficha) return null;
  const utilizados = new Set(usados);
  const disponibles = ficha.ejercicios.filter(e => e.dificultad <= dificultad && !utilizados.has("mat.banco:" + tema.clave + ":" + e.id));
  const lista = disponibles.length ? disponibles : ficha.ejercicios.filter(e => e.dificultad <= dificultad);
  const e = lista[Math.abs(semilla) % lista.length];
  const fuenteId = "mat.banco:" + tema.clave + ":" + e.id;
  const comun = { temaClave: tema.clave, dificultad, fuenteId, semilla, enunciado: e.enunciado };
  const publico = e.tipo === "numerico" ? { ...comun, tipo: e.tipo } as const
    : e.tipo === "opcion_multiple" ? { ...comun, tipo: e.tipo, opciones: e.opciones! } as const
    : e.tipo === "verdadero_falso" ? { ...comun, tipo: e.tipo, afirmaciones: [{ id: "a", texto: e.enunciado }] } as { tipo: "verdadero_falso"; afirmaciones: {id: string; texto: string}[] } & typeof comun
    : { ...comun, tipo: "texto_corto" as const, maxCaracteres: 100 };
  const solucion = e.tipo === "numerico" ? { tipo: e.tipo, valor: e.respuesta as number, tolerancia: 0 } as const
    : e.tipo === "opcion_multiple" ? { tipo: e.tipo, correcta: e.respuesta as string, distractores: {} } as const
    : e.tipo === "verdadero_falso" ? { tipo: e.tipo, valores: { a: e.respuesta as boolean } } as const
    : { tipo: "texto_corto" as const, aceptadas: [String(e.respuesta), ...e.alternativasAceptadas], normalizacion: "flexible" as const };
  return { publico, solucion, pistas: e.pistas, explicacion: e.retroalimentacion };
}
