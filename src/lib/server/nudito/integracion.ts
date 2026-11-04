import "server-only";
import type { Nivel } from "@/generated/prisma/enums";
import { detectarArea } from "@/lib/cneb/catalogo";
import { esAreaNudito, type AreaNudito, type ConfigNudito, type CursoNuditoVista, type Dificultad, type EjercicioConSolucion, type EnvioRespuesta, type EstadoDominioTema, type Evaluacion, type EvidenciaPractica, type NivelNudito, type PoliticaDominio, type Tema, type ValidacionTema } from "@/lib/nudito/contratos";
import { crearAzar, type Azar } from "@/lib/nudito/azar";
import { buscarTemas as buscarTemasA, temaPorClave as temaPorClaveA } from "@/lib/nudito/catalogo";
import { evaluar as evaluarB, evaluarRubricaSimulada as rubricaSimuladaB } from "@/lib/nudito/evaluadores";
import { ejercicioPara as ejercicioParaB } from "@/lib/nudito/generadores/registro";
import { evaluarDominio as evaluarDominioB, POLITICA_DOMINIO_POR_DEFECTO, politicaEfectiva as politicaEfectivaB } from "@/lib/nudito/politica-dominio";
import { validarTema as validarTemaA } from "@/lib/nudito/validar-tema";
import type { DbTenant } from "../db";
import { normalizar } from "../nudito-plus/seguridad";
import type { TenantContext } from "../tenant";
import { cursosNuditoDelAlumno as cursosA } from "./areas-cursos";
import { catalogoDelColegio as catalogoA } from "./catalogo";
import { configNudito as configD } from "./config-colegio";
// Respaldo de DESARROLLO: los fixtures del paso 0 (no son el catálogo oficial). Se usan SOLO mientras A/B/D no
// implementen su parte (sus funciones lanzan `Error("pendiente")`). INTEGRAR: al fusionar A y B, este import y las
// funciones `respaldo*` de este archivo se borran.
import { CASOS_FIXTURE } from "../../../../tests/fixtures/nudito/ejercicios";
import { TEMAS_FIXTURE } from "../../../../tests/fixtures/nudito/temas";

// Puntos de integración de C (sesiones) con A (currículo), B (práctica y dominio) y D (gobierno), specs/41.
// Cada función llama a la implementación real; si aún es un esqueleto («pendiente»), usa un respaldo mínimo y
// determinista. Así el flujo funciona de punta a punta hoy y queda listo para conectar sin tocar `sesiones.ts`.

export function esPendiente(error: unknown): boolean {
  return error instanceof Error && error.message === "pendiente";
}

function conRespaldo<T>(real: () => T, respaldo: () => T): T {
  try {
    return real();
  } catch (error) {
    if (esPendiente(error)) return respaldo();
    throw error;
  }
}

async function conRespaldoAsync<T>(real: () => Promise<T>, respaldo: () => Promise<T> | T): Promise<T> {
  try {
    return await real();
  } catch (error) {
    if (esPendiente(error)) return respaldo();
    throw error;
  }
}

// ───────────── D: configuración institucional ─────────────

export const CONFIG_POR_DEFECTO: ConfigNudito = {
  activo: false,
  areas: ["matematica", "comunicacion", "ciencia-tecnologia"],
  niveles: ["primaria", "secundaria"],
  gradoMinimoPrimaria: 1,
  permitirModoHijo: true,
  permitirFotos: false,
  minutosPorDia: null,
  sesionesPorDia: 6,
  topeCostoUsdMes: null,
  retencionDias: 180,
  horaDesde: null,
  horaHasta: null,
  politicaDominio: null,
};

export type ConfigEfectiva = { activo: boolean; config: ConfigNudito };

/** INTEGRAR: D (`configNudito`). Respaldo: lee la fila (sin fila = apagado; bloqueo de plataforma manda). */
export async function configEfectiva(ctx: TenantContext): Promise<ConfigEfectiva> {
  return conRespaldoAsync(
    async () => {
      const e = await configD(ctx);
      return { activo: e.activo, config: e.config };
    },
    async () => {
      const fila = await ctx.db.nuditoConfigColegio.findFirst();
      if (!fila) return { activo: false, config: CONFIG_POR_DEFECTO };
      const config: ConfigNudito = {
        activo: fila.activo,
        areas: fila.areas.filter(esAreaNudito),
        niveles: fila.niveles.filter((n): n is NivelNudito => n === "primaria" || n === "secundaria"),
        gradoMinimoPrimaria: fila.gradoMinimoPrimaria,
        permitirModoHijo: fila.permitirModoHijo,
        permitirFotos: fila.permitirFotos,
        minutosPorDia: fila.minutosPorDia,
        sesionesPorDia: fila.sesionesPorDia,
        topeCostoUsdMes: fila.topeCostoUsdMes === null ? null : Number(fila.topeCostoUsdMes),
        retencionDias: fila.retencionDias,
        horaDesde: fila.horaDesde,
        horaHasta: fila.horaHasta,
        politicaDominio: (fila.politicaDominio as ConfigNudito["politicaDominio"]) ?? null,
      };
      return { activo: fila.activo && !fila.bloqueadoPlataforma, config };
    },
  );
}

/** INTEGRAR: B (`politicaEfectiva`). Respaldo: la política por defecto con los cambios superficiales. */
export function politicaDelColegio(config: ConfigNudito): PoliticaDominio {
  return conRespaldo(
    () => politicaEfectivaB(config.politicaDominio ?? {}),
    () => ({ ...POLITICA_DOMINIO_POR_DEFECTO, ...(config.politicaDominio ?? {}) }) as PoliticaDominio,
  );
}

// ───────────── A: cursos, catálogo y validación de tema ─────────────

/** INTEGRAR: A (`cursosNuditoDelAlumno`). Respaldo: cursos del salón con `area_cneb` (o detectada por el nombre). */
export async function cursosDelAlumno(db: DbTenant, alumnoId: string, areas: readonly string[]): Promise<CursoNuditoVista[]> {
  return conRespaldoAsync(
    () => cursosA(db, alumnoId, areas),
    async () => {
      const alumno = await db.alumno.findFirst({ where: { id: alumnoId }, select: { salon: { select: { nivel: true, cursos: { select: { id: true, nombre: true, areaCneb: true }, orderBy: { nombre: "asc" } } } } } });
      if (!alumno) return [];
      const vistos = new Set<string>();
      const cursos: CursoNuditoVista[] = [];
      for (const c of alumno.salon.cursos) {
        const area = c.areaCneb ?? areaPorNombre(c.nombre, alumno.salon.nivel);
        if (!area || !esAreaNudito(area) || !areas.includes(area) || vistos.has(c.id)) continue;
        vistos.add(c.id);
        cursos.push({ cursoId: c.id, nombre: c.nombre, area });
      }
      return cursos;
    },
  );
}

function areaPorNombre(nombre: string, nivel: Nivel): string | null {
  return detectarArea(nombre, nivel)?.area ?? null;
}

/** INTEGRAR: A (`catalogoDelColegio`). Respaldo: temas fixture del área y nivel. */
export async function catalogo(db: DbTenant, filtro: { area: AreaNudito; nivel: NivelNudito }): Promise<Tema[]> {
  return conRespaldoAsync(
    () => catalogoA(db, filtro),
    () => TEMAS_FIXTURE.filter((t) => t.area === filtro.area && t.nivel === filtro.nivel),
  );
}

/** INTEGRAR: A (`temaPorClave`) + temas del colegio. Respaldo: fixtures. */
export async function temaPorClave(db: DbTenant, clave: string, filtro?: { area: AreaNudito; nivel: NivelNudito }): Promise<Tema | null> {
  if (filtro) {
    const t = (await catalogo(db, filtro)).find((x) => x.clave === clave);
    if (t) return t;
  }
  return conRespaldo(() => temaPorClaveA(clave), () => TEMAS_FIXTURE.find((t) => t.clave === clave) ?? null);
}

/** Grado del tema medido en la escala del alumno: secundaria = 6 + grado (para comparar con primaria). */
export function gradoAbsoluto(nivel: NivelNudito, grado: number): number {
  return nivel === "secundaria" ? 6 + grado : grado;
}

/** INTEGRAR: A (`validarTema`). Respaldo: búsqueda por palabras clave + grado (actual/anterior permitido). */
export function validarTema(entrada: Parameters<typeof validarTemaA>[0]): ValidacionTema {
  return conRespaldo(
    () => validarTemaA(entrada),
    () => {
      const encontrados = conRespaldo(() => buscarTemasA(entrada.texto, entrada.temas), () => respaldoBuscar(entrada.texto, entrada.temas));
      const alumno = gradoAbsoluto(entrada.nivel, entrada.grado);
      if (encontrados.length === 0) {
        const sugerencias = entrada.temas.filter((t) => gradoAbsoluto(t.nivel, t.grado) <= alumno).slice(0, 3);
        return { tipo: "no_reconocido", sugerencias, mensaje: "No encontré ese tema. ¿Quieres practicar alguno de estos?" };
      }
      const tema = encontrados[0].tema;
      const g = gradoAbsoluto(tema.nivel, tema.grado);
      if (g === alumno) return { tipo: "permitido", tema, relacion: "grado_actual" };
      if (g < alumno) return { tipo: "permitido", tema, relacion: "grado_anterior" };
      if (entrada.desbloqueados.has(tema.clave)) return { tipo: "permitido", tema, relacion: "desbloqueado" };
      const alternativas = entrada.temas.filter((t) => gradoAbsoluto(t.nivel, t.grado) <= alumno).slice(0, 2);
      const alt = alternativas[0]?.nombre ?? "un tema de tu grado";
      return { tipo: "demasiado_avanzado", solicitado: tema, alternativas, mensaje: `Ese tema viene más adelante. ¿Practicamos primero ${alt}?` };
    },
  );
}

function respaldoBuscar(texto: string, temas: readonly Tema[]): { tema: Tema; puntaje: number }[] {
  const t = normalizar(texto);
  return temas
    .map((tema) => {
      const claves = [tema.nombre, ...tema.palabrasClave, ...(tema.sinonimos ?? [])].map((k) => normalizar(k).trim());
      const puntaje = claves.filter((k) => k.length > 2 && t.includes(` ${k} `)).length + (claves.some((k) => t.includes(k.split(" ")[0])) ? 0.5 : 0);
      return { tema, puntaje };
    })
    .filter((x) => x.puntaje >= 1)
    .sort((a, b) => b.puntaje - a.puntaje);
}

// ───────────── B: ejercicios, evaluación y dominio ─────────────

/** INTEGRAR: B (`ejercicioPara`). Respaldo: ejercicio fixture del tema, elegido por semilla. */
export function ejercicioPara(tema: Tema, dificultad: Dificultad, semilla: number): EjercicioConSolucion {
  return conRespaldo(
    () => ejercicioParaB(tema, dificultad, semilla),
    () => {
      const delTema = CASOS_FIXTURE.filter((c) => c.ejercicio.publico.temaClave === tema.clave);
      if (delTema.length === 0) throw new Error(`Sin ejercicios de respaldo para ${tema.clave}`);
      const e = structuredClone(delTema[semilla % delTema.length].ejercicio);
      e.publico.semilla = semilla;
      return e;
    },
  );
}

/** INTEGRAR: B (`crearAzar`). Respaldo: mulberry32. */
export function azar(semilla: number): Azar {
  return conRespaldo(
    () => crearAzar(semilla),
    () => {
      let a = semilla >>> 0;
      const siguiente = () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const entero = (min: number, max: number) => min + Math.floor(siguiente() * (max - min + 1));
      return {
        siguiente,
        entero,
        elegir: <T,>(l: readonly T[]) => l[entero(0, l.length - 1)],
        barajar: <T,>(l: readonly T[]) => {
          const c = [...l];
          for (let i = c.length - 1; i > 0; i--) {
            const j = entero(0, i);
            [c[i], c[j]] = [c[j], c[i]];
          }
          return c;
        },
      };
    },
  );
}

/** INTEGRAR: B (`evaluar`). Respaldo: comparación exacta y simple por tipo (retro amable, sin revelar). */
export function evaluarCerrado(ejercicio: EjercicioConSolucion, envio: EnvioRespuesta) {
  return conRespaldo(() => evaluarB(ejercicio, envio), () => respaldoEvaluar(ejercicio, envio));
}

/** INTEGRAR: B (`evaluarRubricaSimulada`). Respaldo: heurística mínima (extensión + conectores), confianza baja. */
export function rubricaSimulada(ejercicio: EjercicioConSolucion, envio: EnvioRespuesta) {
  return conRespaldo((): Evaluacion => rubricaSimuladaB(ejercicio, envio), (): Evaluacion => {
    const texto = envio.respuesta.tipo === "texto" ? envio.respuesta.texto : "";
    const palabras = texto.split(/\s+/).filter(Boolean).length;
    const min = ejercicio.publico.tipo === "escritura_rubrica" ? ejercicio.publico.minPalabras : 20;
    const conectores = (normalizar(texto).match(/ (porque|ademas|por eso|sin embargo|tambien|entonces|finalmente) /g) ?? []).length;
    const puntaje = Math.min(1, (palabras >= min ? 0.6 : (0.6 * palabras) / min) + Math.min(0.4, conectores * 0.2));
    const resultado = puntaje >= 0.8 ? "correcto" : puntaje >= 0.4 ? "parcial" : "incorrecto";
    const retro = resultado === "correcto"
      ? "¡Buen párrafo! Tu idea se entiende y la unes con conectores."
      : palabras < min ? `Vas bien. Agrega más ideas: intenta llegar a ${min} palabras.` : "Buen inicio. Une tus razones con conectores como «porque» o «además».";
    return { resultado, puntaje: Math.round(puntaje * 100) / 100, retro, evaluadoPor: "rubrica_simulada" as const };
  });
}

const norm = (s: string) => normalizar(s).trim();

function respaldoEvaluar(e: EjercicioConSolucion, envio: EnvioRespuesta) {
  const s = e.solucion;
  const r = envio.respuesta;
  const malo = (retro: string, errorDetectado?: string) => ({ resultado: "incorrecto" as const, puntaje: 0, retro, evaluadoPor: "codigo" as const, ...(errorDetectado ? { errorDetectado } : {}) });
  const bien = (retro = "¡Correcto! Muy bien.") => ({ resultado: "correcto" as const, puntaje: 1, retro, evaluadoPor: "codigo" as const });
  const parcial = (p: number, retro: string) => ({ resultado: (p >= 1 ? "correcto" : p > 0 ? "parcial" : "incorrecto") as "correcto" | "parcial" | "incorrecto", puntaje: Math.round(p * 1000) / 1000, retro, evaluadoPor: "codigo" as const });
  if (s.tipo === "opcion_multiple" && r.tipo === "opcion") return r.opcionId === s.correcta ? bien() : malo("Esa no es. Revisa otra vez la idea del tema.", s.distractores[r.opcionId]);
  if (s.tipo === "numerico" && r.tipo === "numero") {
    const v = Number(r.valor.replace(",", "."));
    return Number.isFinite(v) && Math.abs(v - s.valor) <= s.tolerancia ? bien() : malo("Todavía no. Revisa tus cálculos paso a paso.");
  }
  if (s.tipo === "fraccion" && r.tipo === "fraccion") {
    const n = Number(r.num), d = Number(r.den);
    if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) return malo("Escribe números enteros y un denominador distinto de 0.");
    const ok = s.aceptarEquivalentes ? n * s.den === d * s.num : n === s.num && d === s.den;
    return ok ? bien() : malo("Casi. Revisa qué número multiplicó al denominador.");
  }
  if (s.tipo === "texto_corto" && r.tipo === "texto") return s.aceptadas.some((a) => norm(a) === norm(r.texto) || norm(r.texto).includes(norm(a))) ? bien() : malo("No es esa. Relee el texto con calma.");
  if (s.tipo === "lectura" && r.tipo === "lectura") {
    const ids = Object.keys(s.respuestas);
    const ok = ids.filter((id) => {
      const esperado = s.respuestas[id];
      const dada = r.respuestas[id] ?? "";
      return typeof esperado === "string" ? dada === esperado : esperado.aceptadas.some((a) => norm(a) === norm(dada));
    }).length;
    return parcial(ok / ids.length, ok === ids.length ? "¡Respondiste todo bien!" : `Acertaste ${ok} de ${ids.length}. Relee las partes que faltan.`);
  }
  if (s.tipo === "relacionar" && r.tipo === "relacionar") {
    const ids = Object.keys(s.pares);
    const ok = ids.filter((id) => r.pares[id] === s.pares[id]).length;
    return parcial(ok / ids.length, ok === ids.length ? "¡Todas las parejas están bien!" : `Tienes ${ok} de ${ids.length} parejas bien.`);
  }
  if (s.tipo === "verdadero_falso" && r.tipo === "vf") {
    const ids = Object.keys(s.valores);
    const ok = ids.filter((id) => r.valores[id] === s.valores[id]).length;
    return parcial(ok / ids.length, ok === ids.length ? "¡Todas correctas!" : `Acertaste ${ok} de ${ids.length}. Revisa las demás.`);
  }
  return malo("Esa respuesta no corresponde a este ejercicio.");
}

/** INTEGRAR: B (`evaluarDominio`). Respaldo: ventana + rachas para subir/bajar dificultad y estado simple. */
export function evaluarDominio(actual: EstadoDominioTema, evidencia: EvidenciaPractica, politica: PoliticaDominio) {
  return conRespaldo(
    () => evaluarDominioB(actual, evidencia, politica),
    () => {
      const eventos: { tipo: "dificultad_sube" | "dificultad_baja" | "estado"; motivo: string }[] = [];
      if (evidencia.resultado === "incierto") return { nuevo: actual, eventos };
      const ev = [...actual.evidencia, evidencia].slice(-politica.ventana);
      const sesiones = new Set(ev.map((x) => x.sesionId)).size;
      let dificultad = actual.dificultad;
      const cola = (n: number, pred: (x: EvidenciaPractica) => boolean) => ev.length >= n && ev.slice(-n).every(pred);
      if (cola(politica.subirTrasAciertosSeguidos, (x) => x.resultado === "correcto" && x.dificultad >= dificultad) && dificultad < 5) {
        dificultad = (dificultad + 1) as Dificultad;
        eventos.push({ tipo: "dificultad_sube", motivo: `${politica.subirTrasAciertosSeguidos} aciertos seguidos: sube a dificultad ${dificultad}.` });
      } else if (cola(politica.bajarTrasFallosSeguidos, (x) => x.resultado === "incorrecto") && dificultad > 1) {
        dificultad = (dificultad - 1) as Dificultad;
        eventos.push({ tipo: "dificultad_baja", motivo: `${politica.bajarTrasFallosSeguidos} fallos seguidos: baja a dificultad ${dificultad}.` });
      }
      const puntos = ev.map((x) => (x.resultado === "correcto" ? (x.pistas > 0 ? politica.pesoConPista : 1) : x.resultado === "parcial" ? politica.pesoParcial : 0));
      const promedio = puntos.reduce((a, b) => a + b, 0) / Math.max(1, puntos.length);
      let estado = actual.estado === "no_iniciado" ? "en_progreso" : actual.estado;
      if (ev.length >= politica.minIntentos && promedio >= politica.minPuntajePonderado && sesiones >= politica.minSesionesDistintas && dificultad >= politica.dificultadMinimaDominio) estado = "dominado";
      else if (ev.length >= politica.minIntentos && promedio < 0.4) estado = "reforzar";
      else if (estado === "reforzar" && promedio >= 0.6) estado = "en_progreso";
      if (estado !== actual.estado) eventos.push({ tipo: "estado", motivo: estado === "dominado" ? "Aciertos sostenidos en varias sesiones." : estado === "reforzar" ? "Conviene repasar este tema con calma." : "Empezó a practicar el tema." });
      return { nuevo: { ...actual, estado, dificultad, evidencia: ev, sesionesDistintas: Math.max(actual.sesionesDistintas, sesiones) }, eventos };
    },
  );
}
