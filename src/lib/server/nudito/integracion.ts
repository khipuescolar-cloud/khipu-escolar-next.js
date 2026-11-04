import "server-only";
import type { AreaNudito, ConfigNudito, CursoNuditoVista, Dificultad, EjercicioConSolucion, EnvioRespuesta, EstadoDominioTema, Evaluacion, EvidenciaPractica, NivelNudito, PoliticaDominio, ProveedorTutorIA, Tema, TemaClave, ConsumoIA, EntradaValidarTema, ValidacionTema } from "@/lib/nudito/contratos";
import { crearAzar, type Azar } from "@/lib/nudito/azar";
import { posicionGrado, posicionTema, temaPorClave as temaGlobalPorClave, temasDe, temasGlobales } from "@/lib/nudito/catalogo";
import { evaluadorAbierto, evaluar } from "@/lib/nudito/evaluadores";
import { ejercicioPara as ejercicioParaB } from "@/lib/nudito/generadores/registro";
import { evaluarDominio as evaluarDominioB, politicaEfectiva, type ContextoDominio } from "@/lib/nudito/politica-dominio";
import { validarTema as validarTemaA } from "@/lib/nudito/validar-tema";
import type { DbTenant } from "../db";
import type { TenantContext } from "../tenant";
import { cursosNuditoDelAlumno } from "./areas-cursos";
import { catalogoDelColegio, PREFIJO_TEMA_COLEGIO } from "./catalogo";
import { configNudito } from "./config-colegio";

// Puntos de integración de C (sesiones, specs/41) con A (currículo, specs/42), B (práctica y dominio, specs/43) y
// D (gobierno, specs/44). Solo delega en las implementaciones reales: sin respaldos ni fixtures.

// ───────────── D: configuración institucional ─────────────

export type ConfigEfectiva = { activo: boolean; config: ConfigNudito };

/** Configuración vigente del colegio (`configNudito` de D: producto → plan → bloqueo de plataforma → interruptor). */
export async function configEfectiva(ctx: TenantContext): Promise<ConfigEfectiva> {
  const e = await configNudito(ctx);
  return { activo: e.activo, config: e.config };
}

/** Política de dominio por defecto con los cambios del colegio (B). */
export function politicaDelColegio(config: ConfigNudito): PoliticaDominio {
  return politicaEfectiva(config.politicaDominio ?? {});
}

// ───────────── A: cursos, catálogo y validación de tema ─────────────

export function cursosDelAlumno(db: DbTenant, alumnoId: string, areas: readonly string[]): Promise<CursoNuditoVista[]> {
  return cursosNuditoDelAlumno(db, alumnoId, areas);
}

/** Catálogo del área para el nivel del alumno (globales + temas activos del colegio, todos los grados). */
export function catalogo(db: DbTenant, filtro: { area: AreaNudito; nivel: NivelNudito }): Promise<Tema[]> {
  return catalogoDelColegio(db, filtro);
}

/**
 * Tema REAL por clave dentro del área: del colegio o global (cualquier nivel: un alumno de secundaria puede repasar uno
 * de primaria, y uno de primaria puede tener desbloqueado uno de secundaria). Un tema sintético de `validarTema`
 * («xxx.s5.avanzado-…») no está en ningún catálogo y por eso nunca se encuentra ni se practica.
 */
export async function temaDelArea(db: DbTenant, area: AreaNudito, nivel: NivelNudito, clave: TemaClave): Promise<Tema | null> {
  if (clave.startsWith(PREFIJO_TEMA_COLEGIO)) return (await catalogo(db, { area, nivel })).find((t) => t.clave === clave) ?? null;
  const t = temaGlobalPorClave(clave);
  return t && t.area === area ? t : null;
}

/** true si el tema existe en el catálogo (global o del colegio). Un tema sintético nunca lo está. */
export async function esTemaReal(db: DbTenant, tema: Tema, nivel: NivelNudito): Promise<boolean> {
  return (await temaDelArea(db, tema.area, nivel, tema.clave)) !== null;
}

/** Temas practicables: grado actual y anteriores (en secundaria, también los de primaria) + los desbloqueados. */
export async function temasPracticables(db: DbTenant, filtro: { area: AreaNudito; nivel: NivelNudito; grado: number; desbloqueados: ReadonlySet<TemaClave> }): Promise<Tema[]> {
  const pos = posicionGrado(filtro.nivel, filtro.grado);
  const propios = await catalogo(db, filtro);
  const otros = filtro.nivel === "secundaria" ? temasDe(filtro.area, "primaria") : temasDe(filtro.area, "secundaria");
  return [...otros, ...propios].filter((t) => posicionTema(t) <= pos || filtro.desbloqueados.has(t.clave));
}

/** Grado del tema medido en la escala del alumno (primaria 1–6, secundaria 7–11). */
export function gradoAbsoluto(nivel: NivelNudito, grado: number): number {
  return posicionGrado(nivel, grado);
}

/** Validación determinista de «Otro tema» (A). La IA no decide aquí. */
export function validarTema(entrada: EntradaValidarTema): ValidacionTema {
  return validarTemaA(entrada);
}

/** Temas globales del área por encima del grado del alumno que tienen `clave` como prerrequisito (para desbloquear). */
export function temasQueDesbloquea(area: AreaNudito, clave: TemaClave, nivel: NivelNudito, grado: number): Tema[] {
  const pos = posicionGrado(nivel, grado);
  return temasGlobales().filter((t) => t.area === area && posicionTema(t) > pos && t.prerrequisitos.includes(clave));
}

// ───────────── B: ejercicios, evaluación y dominio ─────────────

/** Dificultad acotada al rango del tema. */
export function acotarDificultad(tema: Tema, dificultad: number): Dificultad {
  return Math.min(tema.dificultad.max, Math.max(tema.dificultad.min, dificultad)) as Dificultad;
}

/** Ejercicio del tema (generador, banco o lecturas). `usados`: `fuenteId` ya vistos en la sesión (no se repiten). */
export function ejercicioPara(tema: Tema, dificultad: Dificultad, semilla: number, usados: Iterable<string> = []): EjercicioConSolucion {
  return ejercicioParaB(tema, acotarDificultad(tema, dificultad), semilla, { usados });
}

export function azar(semilla: number): Azar {
  return crearAzar(semilla);
}

/** Ítems cerrados: SOLO código (B). La IA nunca corrige ítems cerrados. */
export function evaluarCerrado(ejercicio: EjercicioConSolucion, envio: EnvioRespuesta): Evaluacion {
  return evaluar(ejercicio, envio);
}

/**
 * Escritura con rúbrica (B, `evaluadorAbierto`). Con el proveedor simulado la evaluación es `incierto` (no cuenta para el
 * dominio) pero trae retroalimentación formativa por criterio.
 */
export function evaluarAbierto(ejercicio: EjercicioConSolucion, envio: EnvioRespuesta, ia: ProveedorTutorIA): Promise<{ evaluacion: Evaluacion; consumo: ConsumoIA }> {
  return evaluadorAbierto().evaluar(ejercicio, envio, ia);
}

/** Contexto para `desbloqueo_tema`: prerrequisitos del tema y cuáles ya domina el alumno (una consulta). */
export async function contextoDominio(db: DbTenant, alumnoId: string, tema: Tema): Promise<ContextoDominio> {
  if (tema.prerrequisitos.length === 0) return { prerrequisitos: [], dominados: new Set() };
  const filas = await db.nuditoDominio.findMany({ where: { alumnoId, temaClave: { in: tema.prerrequisitos }, estado: "dominado" }, select: { temaClave: true } });
  return { prerrequisitos: tema.prerrequisitos, dominados: new Set(filas.map((f) => f.temaClave)) };
}

export function evaluarDominio(actual: EstadoDominioTema, evidencia: EvidenciaPractica, politica: PoliticaDominio, contexto?: ContextoDominio) {
  return evaluarDominioB(actual, evidencia, politica, contexto);
}
