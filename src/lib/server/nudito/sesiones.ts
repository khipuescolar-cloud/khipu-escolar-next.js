import "server-only";
import { forbidden } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { momentoEnZona } from "@/lib/fechas";
import {
  esquemaEjercicioConSolucion,
  esquemaEjercicioPublico,
  esquemaEvaluacion,
  esquemaExplicacion,
  esquemaPista,
  type AccesoNudito,
  type AreaNudito,
  type Dificultad,
  type EjercicioConSolucion,
  type EjercicioPublico,
  type EntradaApi,
  type EstadoDominio,
  type EstadoDominioTema,
  type Evaluacion,
  type EvidenciaPractica,
  type NivelNudito,
  type ProveedorTutorIA,
  type SalidaApi,
  type Tema,
  type TemaVista,
} from "@/lib/nudito/contratos";
import { ejercicioDelBanco, fichaPorClave } from "@/lib/nudito/conocimiento/servidor";
import { primerNombre } from "@/lib/nombres";
import { ErrorDeNegocio } from "../contexto-accion";
import { conversar, MENSAJE_PROVEEDOR_CAIDO } from "../nudito-plus/conversar";
import type { MensajeIA, ProveedorIA } from "../nudito-plus/proveedor";
import type { TenantContext } from "../tenant";
import { claveCache, guardarCache, leerCache, registrarConsumo } from "./ia/consumo";
import { conValidacion } from "./ia/esquemas";
import { temaTienePractica } from "@/lib/nudito/conocimiento/servidor";
import { temasPublicadosDelAlumno, progresoDelPlan } from "./plan-publicado";
import { esquemaLeccion } from "@/lib/nudito/leccion";
import { obtenerProveedorTutor } from "./ia/proveedor";
import {
  acotarDificultad,
  azar,
  configEfectiva,
  contextoDominio,
  cursosDelAlumno,
  ejercicioPara,
  evaluarAbierto,
  evaluarCerrado,
  evaluarDominio,
  gradoAbsoluto,
  politicaDelColegio,
  temaDelArea,
  temasQueDesbloquea,
} from "./integracion";
import { analizarPregunta, comoDatosDelAlumno, pistaRevelaRespuesta, RESPUESTA_INYECCION, RESPUESTA_NO_ACADEMICO, verificarLimites } from "./seguridad";

// Responsable: C (specs/41). Sesión de tutoría: bienvenida → curso → tema → repaso → práctica → resultados.
// Todo con `ctx.db` (aislamiento por colegio) y `acceso` ya validado (acceso-tutor.ts). `responder` guarda intento +
// dominio + evento en UNA transacción; (ejercicio, número) único evita el doble envío. La solución nunca sale del servidor.
// Nudito NO importa ni escribe notas, registro auxiliar, NSP, evaluaciones oficiales ni libretas.
// Integración con A (currículo), B (práctica y dominio) y D (gobierno): `integracion.ts`.

/** Ejercicios por sesión. */
export const EJERCICIOS_POR_SESION = 5;
/** Intentos por ejercicio (práctica); la comprobación tiene uno solo. */
export const MAX_INTENTOS = 3;
export const HORAS_REANUDAR = 24;

type SolucionGuardada = Pick<EjercicioConSolucion, "solucion" | "pistas" | "explicacion">;

const ESTADOS_DOMINIO: readonly EstadoDominio[] = ["no_iniciado", "en_progreso", "en_comprobacion", "dominado", "reforzar"];

// ───────────── Ayudantes ─────────────

async function datosDelSalon(ctx: TenantContext, acceso: AccesoNudito): Promise<{ nivel: NivelNudito; grado: number }> {
  // Grado OFICIAL: siempre del salón del alumno (nunca del cliente).
  const salon = await ctx.db.salon.findFirst({ where: { id: acceso.alumno.salonId }, select: { nivel: true, grado: true } });
  if (!salon || (salon.nivel !== "primaria" && salon.nivel !== "secundaria") || !salon.grado) {
    throw new ErrorDeNegocio("Nudito todavía no tiene práctica para tu salón. ¡Pronto!");
  }
  return { nivel: salon.nivel, grado: salon.grado };
}

async function sesionPropia(ctx: TenantContext, acceso: AccesoNudito, sesionId: string, opciones: { incluirFinalizada?: boolean } = {}) {
  const s = await ctx.db.nuditoSesion.findFirst({
    where: { id: sesionId, alumnoId: acceso.alumno.id, membershipId: ctx.membership.id, modo: acceso.modo, ...(opciones.incluirFinalizada ? {} : { estado: "activa" }) },
  });
  if (!s) throw new ErrorDeNegocio("No encontré esa sesión. Empecemos una nueva.");
  return s;
}

async function temaDeSesion(ctx: TenantContext, sesion: { area: string | null; temaClave: string | null; cursoId: string | null }, nivel: NivelNudito, acceso: AccesoNudito): Promise<Tema> {
  if (!sesion.area || !sesion.temaClave) throw new ErrorDeNegocio("Primero elige un tema.");
  const tema = await temaDelArea(ctx.db, sesion.area as AreaNudito, nivel, sesion.temaClave);
  if (!tema || !(await temaTienePractica(tema.clave)) || !(await temasPublicadosDelAlumno(ctx, acceso, sesion.cursoId ?? sesion.area)).some(t => t.clave === tema.clave)) throw new ErrorDeNegocio("Ese tema ya no está disponible. Elige otro.");
  return tema;
}

function hash(texto: string): number {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h >>> 0;
}

function saludoPorHora(ctx: TenantContext, ahora: Date): string {
  const h = Number(momentoEnZona(ahora, ctx.tenant.zonaHoraria).hora.slice(0, 2));
  return h < 12 ? "¡Buenos días" : h < 19 ? "¡Buenas tardes" : "¡Buenas noches";
}

function vistaTema(t: Tema, estado: EstadoDominio, recomendado: boolean): TemaVista {
  return { clave: t.clave, nombre: t.nombre, ...(t.subtema ? { subtema: t.subtema } : {}), grado: t.grado, estado, recomendado };
}

async function dominiosDe(ctx: TenantContext, alumnoId: string, claves: string[]) {
  const filas = await ctx.db.nuditoDominio.findMany({ where: { alumnoId, temaClave: { in: claves } }, select: { temaClave: true, estado: true, dificultad: true, autorizadoPorEventoId: true } });
  return new Map(filas.map((f) => [f.temaClave, f]));
}

function aEjercicioConSolucion(fila: { enunciado: unknown; solucion: unknown }): EjercicioConSolucion {
  return { publico: fila.enunciado as EjercicioPublico, ...(fila.solucion as SolucionGuardada) };
}

async function proveedor(): Promise<ProveedorTutorIA> {
  return obtenerProveedorTutor();
}

// ───────────── API ─────────────

export async function iniciarSesion(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"iniciarSesion">, ahora: Date = new Date()): Promise<SalidaApi<"iniciarSesion">> {
  if (entrada.alumnoId !== acceso.alumno.id) forbidden();
  const { activo, config } = await configEfectiva(ctx);
  if (!activo) throw new ErrorDeNegocio("Tu colegio todavía no activó Nudito.");
  await datosDelSalon(ctx, acceso);
  const alumnoId = acceso.alumno.id;
  const propias = { alumnoId, membershipId: ctx.membership.id, modo: acceso.modo };

  // Las sesiones activas de más de 24 h se dan por abandonadas.
  const limite = new Date(ahora.getTime() - HORAS_REANUDAR * 3_600_000);
  await ctx.db.nuditoSesion.updateMany({ where: { ...propias, estado: "activa", ultimaActividadAt: { lt: limite } }, data: { estado: "abandonada" } });

  const anterior = await ctx.db.nuditoSesion.findFirst({
    where: { ...propias, estado: "activa", temaClave: { not: null }, ultimaActividadAt: { gte: limite } },
    orderBy: { ultimaActividadAt: "desc" },
    select: { id: true, temaClave: true, area: true },
  });
  let reanudable: { sesionId: string; tema: string } | undefined;
  if (anterior?.temaClave && anterior.area) {
    const { nivel } = await datosDelSalon(ctx, acceso);
    const tema = await temaDelArea(ctx.db, anterior.area as AreaNudito, nivel, anterior.temaClave);
    if (tema) reanudable = { sesionId: anterior.id, tema: tema.nombre };
  }

  // Una sesión vacía (aún sin tema) se reutiliza: recargar la página no crea sesiones.
  let sesion = await ctx.db.nuditoSesion.findFirst({ where: { ...propias, estado: "activa", temaClave: null }, orderBy: { iniciadaAt: "desc" }, select: { id: true } });
  if (!sesion) {
    const limites = await verificarLimites(ctx, acceso, "practica", { nuevaSesion: true, ahora });
    if (!limites.ok) throw new ErrorDeNegocio(limites.mensaje);
    sesion = await ctx.db.nuditoSesion.create({
      data: { tenantId: ctx.tenant.id, ...propias, semilla: hash(`${alumnoId}|${ahora.toISOString()}|${Math.random()}`) & 0x7fffffff, meta: EJERCICIOS_POR_SESION, fase: "bienvenida" },
      select: { id: true },
    });
  }

  const nombre = primerNombre(acceso.alumno.nombres);
  const cursos = await cursosDelAlumno(ctx.db, alumnoId, config.areas);
  const mensaje = reanudable
    ? `${saludoPorHora(ctx, ahora)}, ${nombre}! Qué bueno verte. ¿Seguimos con ${reanudable.tema} o practicamos algo nuevo?`
    : `${saludoPorHora(ctx, ahora)}, ${nombre}! Soy Nudito. ¿Qué quieres practicar hoy?`;
  return { sesionId: sesion.id, bienvenida: { nombre, mensaje, mascota: "saludo" }, cursos, ...(reanudable ? { reanudable } : {}) };
}

export async function elegirCurso(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"elegirCurso">): Promise<SalidaApi<"elegirCurso">> {
  const sesion = await sesionPropia(ctx, acceso, entrada.sesionId);
  const { config } = await configEfectiva(ctx);
  const curso = (await cursosDelAlumno(ctx.db, acceso.alumno.id, config.areas)).find((c) => c.cursoId === entrada.cursoId);
  if (!curso) throw new ErrorDeNegocio("Ese curso no está disponible para practicar.");
  const { nivel, grado } = await datosDelSalon(ctx, acceso);
  await ctx.db.nuditoSesion.update({ where: { id: sesion.id }, data: { cursoId: curso.cursoId, area: curso.area, temaClave: null, gradoTema: null, fase: "tema", ultimaActividadAt: new Date() } });

  const visibles = await temasPublicadosDelAlumno(ctx, acceso, curso.cursoId);
  const alumnoG = gradoAbsoluto(nivel, grado);
  const dominios = await dominiosDe(ctx, acceso.alumno.id, visibles.map((t) => t.clave));
  const preparados = new Map(await Promise.all(visibles.map(async t => [t.clave, await temaTienePractica(t.clave)] as const)));
  return {
    temas: visibles
      .map((t) => {
        const estado = (dominios.get(t.clave)?.estado ?? "no_iniciado") as EstadoDominio;
        const recomendado = estado !== "dominado" && gradoAbsoluto(t.nivel, t.grado) === alumnoG;
        return { ...vistaTema(t, estado, recomendado), pronto: !preparados.get(t.clave) };
      }),
  };
}

export async function elegirTema(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"elegirTema">): Promise<SalidaApi<"elegirTema">> {
  const sesion = await sesionPropia(ctx, acceso, entrada.sesionId);
  if (!sesion.area) throw new ErrorDeNegocio("Primero elige un curso.");
  const area = sesion.area as AreaNudito;
  const temas = await temasPublicadosDelAlumno(ctx, acceso, sesion.cursoId ?? area);
  const tema = temas.find(t => t.clave === entrada.temaClave);
  if (!tema) return { tipo: "no_reconocido", sugerencias: temas.slice(0, 3), mensaje: "Ese tema todavía no está en el plan publicado. Elige uno de la lista." };
  if (!(await temaTienePractica(tema.clave))) return { tipo: "no_reconocido", sugerencias: [], mensaje: "Pronto: estamos preparando la práctica de este tema." };
  const dominio = (await dominiosDe(ctx, acceso.alumno.id, [tema.clave])).get(tema.clave);
  const dificultad = acotarDificultad(tema, dominio?.dificultad ?? tema.dificultad.min);
  await ctx.db.nuditoSesion.update({ where: { id: sesion.id }, data: { temaClave: tema.clave, gradoTema: tema.grado, dificultad, fase: "repaso", ultimaActividadAt: new Date() } });
  return { tipo: "permitido", tema, relacion: "grado_actual" };
}

/** `otraVez`: el alumno pidió «explícame otra vez» → explicación con IA (o caché); si no, solo el repaso revisado. */
export async function pedirRepaso(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"pedirRepaso">, opciones: { otraVez?: boolean; duda?: string } = {}): Promise<SalidaApi<"pedirRepaso">> {
  const sesion = await sesionPropia(ctx, acceso, entrada.sesionId);
  const { nivel } = await datosDelSalon(ctx, acceso);
  const tema = await temaDeSesion(ctx, sesion, nivel, acceso);
  await ctx.db.nuditoSesion.update({ where: { id: sesion.id }, data: { fase: sesion.fase === "bienvenida" || sesion.fase === "tema" ? "repaso" : sesion.fase, ultimaActividadAt: new Date() } });
  const leccion = await ctx.db.nuditoLeccion.findFirst({ where: { temaClave: tema.clave, estado: "publicada" }, orderBy: { version: "desc" }, select: { contenido: true, version: true } });
  const ficha = leccion ? null : await fichaPorClave(tema.clave);
  if (!leccion && !ficha) throw new ErrorDeNegocio("Tu colegio está preparando este tema.");
  if (ficha) return { idea: ficha.ideaCentral, ejemplo: ficha.ejemplos.map(e => e.situacion + " " + e.desarrollo).join("\n"), explicacion: ficha.pasos.join("\n"), recursos: [] };
  if (!leccion) throw new ErrorDeNegocio("Tu colegio está preparando este tema.");
  const contenido = esquemaLeccion.parse(leccion.contenido);
  const base = { idea: contenido.idea, ejemplo: contenido.ejemplos.map(e => `${e.enunciado} ${e.desarrollo}`).join("\n"), explicacion: contenido.explicacion, recursos: contenido.recursos };
  if (!opciones.otraVez) return base;

  const datos = { tenantId: ctx.tenant.id, alumnoId: acceso.alumno.id, sesionId: sesion.id, operacion: "explicar" as const };
  const clave = claveCache(tema.clave, tema.grado, leccion.version);
  const enCache = opciones.duda ? undefined : leerCache(clave);
  if (enCache) {
    const ia = await proveedor();
    await registrarConsumo(ctx.db, { ...datos, ok: true, consumo: { proveedor: ia.nombre, modelo: null, tokensEntrada: 0, tokensSalida: 0, latenciaMs: 0, cache: true, simulado: ia.simulado } });
    return { ...base, explicacionIa: enCache.texto + (enCache.ejemplo ? `\n${enCache.ejemplo}` : "") };
  }
  const limite = await verificarLimites(ctx, acceso, "explicar", { sesionId: sesion.id });
  if (!limite.ok) return base;
  const ia = await proveedor();
  const r = await conValidacion(
    esquemaExplicacion,
    // Contexto mínimo: solo el tema (nombre, repaso revisado, grado y nivel) y, si hay, la duda marcada como datos.
    () => ia.explicar({ tema: { nombre: tema.nombre, repaso: { idea: contenido.idea, ejemplo: base.ejemplo, errorFrecuente: contenido.errorFrecuente }, grado: tema.grado, nivel: tema.nivel }, ...(opciones.duda ? { duda: comoDatosDelAlumno(opciones.duda) } : {}) }),
    () => ({ texto: tema.repaso.idea, ejemplo: tema.repaso.ejemplo }),
    ia,
  );
  await registrarConsumo(ctx.db, { ...datos, consumo: r.consumo, ok: !r.respaldo, ...(r.error ? { error: r.error } : {}) });
  if (!r.respaldo && !opciones.duda) guardarCache(clave, r.datos);
  return { ...base, explicacionIa: r.datos.texto + (r.datos.ejemplo ? `\n${r.datos.ejemplo}` : "") };
}

export async function siguienteEjercicio(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"siguienteEjercicio">): Promise<SalidaApi<"siguienteEjercicio">> {
  const sesion = await sesionPropia(ctx, acceso, entrada.sesionId);
  const { nivel } = await datosDelSalon(ctx, acceso);
  const tema = await temaDeSesion(ctx, sesion, nivel, acceso);

  // Un ejercicio abierto se devuelve tal cual (reanudar o doble clic: idempotente).
  const abierto = await ctx.db.nuditoEjercicio.findFirst({ where: { sesionId: sesion.id, cerradoAt: null }, orderBy: { orden: "desc" } });
  if (abierto) return { ejercicioId: abierto.id, numero: abierto.orden, total: sesion.meta, comprobacion: abierto.esComprobacion, ejercicio: esquemaEjercicioPublico.parse(abierto.enunciado) };

  const hechos = await ctx.db.nuditoEjercicio.count({ where: { sesionId: sesion.id } });
  if (hechos >= sesion.meta) return { fin: true };
  const limite = await verificarLimites(ctx, acceso, "practica", { sesionId: sesion.id });
  if (!limite.ok) throw new ErrorDeNegocio(limite.mensaje);

  const dominio = await ctx.db.nuditoDominio.findUnique({ where: { alumnoId_temaClave: { alumnoId: acceso.alumno.id, temaClave: tema.clave } } });
  const comprobacion = dominio?.estado === "en_comprobacion";
  const plan = dominio?.estado === "dominado" ? await progresoDelPlan(ctx, acceso.alumno.id, sesion.cursoId ?? tema.area) : null;
  const dificultad = plan?.completo ? tema.dificultad.max : acotarDificultad(tema, dominio?.dificultad ?? sesion.dificultad);
  const orden = hechos + 1;
  // Variedad: semilla por sesión + orden (determinista y distinta en cada ejercicio).
  const semilla = azar(sesion.semilla + orden * 7919).entero(0, 0x7fffffff);
  // B: generador, banco o lecturas según la fuente del tema; sin repetir ítems de esta sesión.
  const usados = (await ctx.db.nuditoEjercicio.findMany({ where: { sesionId: sesion.id }, select: { fuenteId: true } })).map((e) => e.fuenteId);
  const ejercicio = esquemaEjercicioConSolucion.parse((await ejercicioDelBanco(tema, dificultad, semilla, usados)) ?? ejercicioPara(tema, dificultad, semilla, usados));
  const solucion: SolucionGuardada = { solucion: ejercicio.solucion, pistas: ejercicio.pistas, explicacion: ejercicio.explicacion };
  try {
    const fila = await ctx.db.nuditoEjercicio.create({
      data: {
        tenantId: ctx.tenant.id, sesionId: sesion.id, alumnoId: acceso.alumno.id, temaClave: tema.clave, tipo: ejercicio.publico.tipo,
        dificultad, fuenteId: ejercicio.publico.fuenteId, semilla, enunciado: ejercicio.publico as Prisma.InputJsonValue,
        solucion: solucion as unknown as Prisma.InputJsonValue, esComprobacion: comprobacion, orden,
      },
    });
    await ctx.db.nuditoSesion.update({ where: { id: sesion.id }, data: { fase: comprobacion ? "comprobacion" : "practica", dificultad, ultimaActividadAt: new Date() } });
    // Solo la parte PÚBLICA sale al cliente.
    return { ejercicioId: fila.id, numero: orden, total: sesion.meta, comprobacion, ejercicio: esquemaEjercicioPublico.parse(ejercicio.publico) };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return siguienteEjercicio(ctx, acceso, entrada);
    throw e;
  }
}

async function evaluarEnvio(ctx: TenantContext, acceso: AccesoNudito, sesionId: string, ejercicio: EjercicioConSolucion, envio: Parameters<typeof evaluarCerrado>[1]): Promise<Evaluacion> {
  // B: ítems cerrados SOLO por código. La IA nunca corrige ítems cerrados.
  if (ejercicio.publico.tipo !== "escritura_rubrica" || envio.respuesta.tipo !== "texto") return evaluarCerrado(ejercicio, envio);
  // Escritura: `evaluadorAbierto` de B con el proveedor. Sin cupo → rúbrica simulada (síncrona). En ambos casos, si no
  // hay certeza (simulado o confianza baja) el resultado es `incierto`: no cuenta para el dominio, pero la retro sirve.
  const limite = await verificarLimites(ctx, acceso, "retroalimentar_abierta", { sesionId });
  if (!limite.ok) return evaluarCerrado(ejercicio, envio);
  const ia = await proveedor();
  // Con un proveedor real, el texto del alumno va marcado como datos (anti-inyección); el simulado lo mide tal cual.
  const paraIa = ia.simulado ? envio : { ...envio, respuesta: { tipo: "texto" as const, texto: comoDatosDelAlumno(envio.respuesta.texto) } };
  const r = await evaluarAbierto(ejercicio, paraIa, ia);
  if (!ia.simulado || r.consumo.tokensSalida > 0) {
    await registrarConsumo(ctx.db, { tenantId: ctx.tenant.id, alumnoId: acceso.alumno.id, sesionId, operacion: "retroalimentar_abierta", consumo: r.consumo, ok: r.evaluacion.evaluadoPor === "rubrica_ia" });
  }
  return r.evaluacion;
}

export async function responder(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"responder">): Promise<SalidaApi<"responder">> {
  const fila = await ctx.db.nuditoEjercicio.findFirst({
    where: { id: entrada.ejercicioId, alumnoId: acceso.alumno.id, sesion: { membershipId: ctx.membership.id, modo: acceso.modo, estado: "activa" } },
    include: { sesion: true, _count: { select: { intentos: true } } },
  });
  if (!fila) throw new ErrorDeNegocio("No encontré ese ejercicio.");
  if (fila.cerradoAt) throw new ErrorDeNegocio("Ese ejercicio ya terminó. ¡Vamos al siguiente!");
  const limite = await verificarLimites(ctx, acceso, "practica", { sesionId: fila.sesionId });
  if (!limite.ok) throw new ErrorDeNegocio(limite.mensaje);

  const ejercicio = aEjercicioConSolucion(fila);
  const envio = { respuesta: entrada.respuesta, ...(entrada.procedimiento ? { procedimiento: entrada.procedimiento } : {}), ...(entrada.tiempoMs !== undefined ? { tiempoMs: entrada.tiempoMs } : {}) };
  const evaluada = esquemaEvaluacion.safeParse(await evaluarEnvio(ctx, acceso, fila.sesionId, ejercicio, envio));
  const evaluacion: Evaluacion = evaluada.success
    ? evaluada.data
    : { resultado: "incierto", puntaje: 0, retro: "No pude revisar bien tu respuesta. ¡Sigamos con el siguiente!", evaluadoPor: "codigo" };

  const numero = fila._count.intentos + 1;
  const maximo = fila.esComprobacion ? 1 : MAX_INTENTOS;
  const cierra = evaluacion.resultado === "correcto" || evaluacion.resultado === "incierto" || numero >= maximo;
  // Foto: solo si es de esta sesión (D la sube con `subirFoto`).
  const foto = entrada.fotoArchivoId ? await ctx.db.archivo.findFirst({ where: { id: entrada.fotoArchivoId, nuditoSesionId: fila.sesionId }, select: { id: true } }) : null;

  const { config } = await configEfectiva(ctx);
  const politica = politicaDelColegio(config);
  const ahora = new Date();
  // Contexto de dominio (una consulta) y temas que se desbloquearían si este pasa a dominado.
  const { nivel, grado } = await datosDelSalon(ctx, acceso);
  const temaActual = fila.sesion.area ? await temaDelArea(ctx.db, fila.sesion.area as AreaNudito, nivel, fila.temaClave) : null;
  const contexto = temaActual ? await contextoDominio(ctx.db, acceso.alumno.id, temaActual) : undefined;
  const desbloqueables = temaActual ? await temasQueDesbloquea(temaActual.area, temaActual.clave, nivel, grado) : [];

  let cambioDominio: { estado: EstadoDominio; motivo: string } | undefined;
  try {
    cambioDominio = await ctx.db.$transaction(async (tx) => {
      await tx.nuditoIntento.create({
        data: {
          tenantId: ctx.tenant.id, ejercicioId: fila.id, alumnoId: acceso.alumno.id, numero, respuesta: envio as unknown as Prisma.InputJsonValue,
          resultado: evaluacion.resultado, puntaje: evaluacion.puntaje, errorDetectado: evaluacion.errorDetectado ?? null, retro: evaluacion.retro,
          evaluadoPor: evaluacion.evaluadoPor, pistasUsadas: fila.pistasUsadas, tiempoMs: entrada.tiempoMs ?? null, fotoArchivoId: foto?.id ?? null,
        },
      });
      await tx.nuditoSesion.update({ where: { id: fila.sesionId }, data: { ultimaActividadAt: ahora } });
      if (!cierra) return undefined;
      await tx.nuditoEjercicio.update({ where: { id: fila.id }, data: { cerradoAt: ahora } });

      // Evidencia del ejercicio cerrado: acierto al primer intento = correcto; tras reintentos = parcial.
      const resultado = evaluacion.resultado === "correcto" && numero > 1 ? "parcial" : evaluacion.resultado;
      const evidencia: EvidenciaPractica = { resultado, dificultad: fila.dificultad as Dificultad, pistas: Math.min(3, fila.pistasUsadas), sesionId: fila.sesionId, comprobacion: fila.esComprobacion, at: ahora.toISOString() };
      const actualFila = await tx.nuditoDominio.findUnique({ where: { alumnoId_temaClave: { alumnoId: acceso.alumno.id, temaClave: fila.temaClave } } });
      const actual: EstadoDominioTema = {
        estado: (actualFila?.estado ?? "no_iniciado") as EstadoDominio,
        dificultad: (actualFila?.dificultad ?? fila.dificultad) as Dificultad,
        evidencia: (actualFila?.evidencia as EvidenciaPractica[] | undefined) ?? [],
        sesionesDistintas: actualFila?.sesionesDistintas ?? 0,
        politicaVersion: actualFila?.politicaVersion ?? politica.version,
      };
      // B (puro). El contexto (prerrequisitos del tema y cuáles domina el alumno) habilita `desbloqueo_tema`.
      const bruta = evaluarDominio(actual, evidencia, politica, contexto);
      // La dificultad se acota al rango del tema (specs/43 §4): un cambio que el rango anula no se registra.
      const dificultadAcotada = temaActual ? acotarDificultad(temaActual, bruta.nuevo.dificultad) : bruta.nuevo.dificultad;
      const decision = {
        nuevo: { ...bruta.nuevo, dificultad: dificultadAcotada },
        eventos: bruta.eventos.filter((e) => (e.tipo !== "dificultad_sube" && e.tipo !== "dificultad_baja") || dificultadAcotada !== actual.dificultad),
      };
      const nuevo = decision.nuevo;
      const acierto = resultado === "correcto" || resultado === "parcial";
      const motivo = decision.eventos.at(-1)?.motivo ?? actualFila?.motivo ?? null;
      const datosDominio = {
        estado: nuevo.estado, dificultad: nuevo.dificultad, sesionesDistintas: nuevo.sesionesDistintas, evidencia: nuevo.evidencia as unknown as Prisma.InputJsonValue,
        politicaVersion: politica.version, motivo, ...(nuevo.estado === "dominado" && actual.estado !== "dominado" ? { dominadoAt: ahora } : {}),
      };
      await tx.nuditoDominio.upsert({
        where: { alumnoId_temaClave: { alumnoId: acceso.alumno.id, temaClave: fila.temaClave } },
        create: {
          tenantId: ctx.tenant.id, alumnoId: acceso.alumno.id, temaClave: fila.temaClave, area: fila.sesion.area ?? "", gradoTema: fila.sesion.gradoTema ?? 1,
          intentos: 1, aciertos: acierto ? 1 : 0, aciertosSinPista: acierto && fila.pistasUsadas === 0 ? 1 : 0, racha: acierto ? 1 : 0, ...datosDominio,
        },
        update: {
          intentos: { increment: 1 }, aciertos: { increment: acierto ? 1 : 0 }, aciertosSinPista: { increment: acierto && fila.pistasUsadas === 0 ? 1 : 0 },
          racha: acierto ? { increment: 1 } : 0, ...datosDominio,
        },
      });
      for (const ev of decision.eventos) {
        const evento = await tx.nuditoDominioEvento.create({
          data: {
            tenantId: ctx.tenant.id, alumnoId: acceso.alumno.id, temaClave: fila.temaClave, tipo: ev.tipo, motivo: ev.motivo,
            deEstado: actual.estado, aEstado: nuevo.estado, deDificultad: actual.dificultad, aDificultad: nuevo.dificultad,
            evidencia: evidencia as unknown as Prisma.InputJsonValue, politica: politica as unknown as Prisma.InputJsonValue,
          },
          select: { id: true },
        });
        // Desbloqueo: los temas siguientes (que tienen este como prerrequisito) quedan autorizados por este evento.
        if (ev.tipo === "desbloqueo_tema" && fila.sesion.area) {
          for (const t of desbloqueables) {
            await tx.nuditoDominio.upsert({
              where: { alumnoId_temaClave: { alumnoId: acceso.alumno.id, temaClave: t.clave } },
              create: { tenantId: ctx.tenant.id, alumnoId: acceso.alumno.id, temaClave: t.clave, area: t.area, gradoTema: t.grado, dificultad: t.dificultad.min, politicaVersion: politica.version, motivo: ev.motivo, autorizadoPorEventoId: evento.id },
              update: { autorizadoPorEventoId: evento.id },
            });
          }
        }
      }
      await tx.nuditoSesion.update({ where: { id: fila.sesionId }, data: { dificultad: nuevo.dificultad } });
      return nuevo.estado !== actual.estado ? { estado: nuevo.estado, motivo: decision.eventos.find((e) => e.tipo === "estado")?.motivo ?? motivo ?? "" } : undefined;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ErrorDeNegocio("Ya recibí esa respuesta.");
    throw e;
  }

  // Tras agotar los intentos: ejemplo resuelto (la explicación revisada) y uno equivalente a continuación.
  // Mientras se pueda reintentar, la retro NO incluye la explicación (que trae la respuesta): los evaluadores de B la
  // agregan siempre; aquí se quita y se añade solo al acertar o al agotar los intentos.
  let retro = evaluacion.retro.replace(ejercicio.explicacion, "").replace(/\s+$/, "") || "Revisa tu respuesta con calma.";
  if (cierra && evaluacion.resultado !== "correcto" && evaluacion.resultado !== "incierto") retro = `${retro}\nMira cómo se resuelve: ${ejercicio.explicacion}\nAhora te doy uno parecido para que lo intentes.`;
  else if (evaluacion.resultado === "correcto") retro = `${retro}\n${ejercicio.explicacion}`;
  return { evaluacion: { ...evaluacion, retro: retro.slice(0, 1200) }, puedeReintentar: !cierra, ...(cambioDominio ? { cambioDominio } : {}) };
}

export async function pedirPista(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"pedirPista">): Promise<SalidaApi<"pedirPista">> {
  const fila = await ctx.db.nuditoEjercicio.findFirst({
    where: { id: entrada.ejercicioId, alumnoId: acceso.alumno.id, sesion: { membershipId: ctx.membership.id, modo: acceso.modo, estado: "activa" } },
  });
  if (!fila || fila.cerradoAt) throw new ErrorDeNegocio("No encontré ese ejercicio.");
  if (fila.esComprobacion) throw new ErrorDeNegocio("En la comprobación vamos sin pistas. ¡Tú puedes!");
  const nivel = fila.pistasUsadas + 1;
  if (nivel > 3) throw new ErrorDeNegocio("Ya usaste las 3 pistas. Intenta con lo que sabes.");
  const n = nivel as 1 | 2 | 3;
  // Reserva la pista (evita que dos clics den dos pistas del mismo nivel).
  const reservada = await ctx.db.nuditoEjercicio.updateMany({ where: { id: fila.id, pistasUsadas: fila.pistasUsadas }, data: { pistasUsadas: nivel } });
  if (reservada.count === 0) throw new ErrorDeNegocio("Ya te di esa pista.");

  const ejercicio = aEjercicioConSolucion(fila);
  const pistaBase = ejercicio.pistas[nivel - 1];
  let texto = pistaBase;
  const limite = await verificarLimites(ctx, acceso, "pista", { sesionId: fila.sesionId });
  if (limite.ok) {
    const ia = await proveedor();
    const r = await conValidacion(esquemaPista, () => ia.pista({ ejercicio: ejercicio.publico, nivel: n, pistaBase }), () => ({ texto: pistaBase, revelaRespuesta: false }), ia);
    const revela = !r.respaldo && pistaRevelaRespuesta(r.datos, ejercicio);
    texto = revela || r.respaldo ? pistaBase : r.datos.texto;
    await registrarConsumo(ctx.db, {
      tenantId: ctx.tenant.id, alumnoId: acceso.alumno.id, sesionId: fila.sesionId, operacion: "pista", consumo: r.consumo,
      ok: !r.respaldo && !revela, ...(revela ? { error: "pista descartada: revelaba la respuesta" } : r.error ? { error: r.error } : {}),
    });
  }
  await ctx.db.nuditoSesion.update({ where: { id: fila.sesionId }, data: { ultimaActividadAt: new Date() } });
  return { nivel: n, texto, quedan: 3 - nivel };
}

/** Pregunta libre dentro de la sesión: reutiliza el turno de Nudito+ (filtros, alertas, uso) con contexto mínimo. */
export async function preguntar(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"preguntar">): Promise<SalidaApi<"preguntar">> {
  const sesion = await sesionPropia(ctx, acceso, entrada.sesionId);
  const texto = entrada.texto.trim();
  const analisis = analizarPregunta(texto);
  if (analisis.tipo === "muy_largo") throw new ErrorDeNegocio("Escribe tu pregunta en menos palabras.");
  if (!texto) throw new ErrorDeNegocio("Escribe tu pregunta.");
  if (analisis.tipo === "inyeccion" || analisis.tipo === "no_academico") {
    return { texto: analisis.tipo === "inyeccion" ? RESPUESTA_INYECCION : RESPUESTA_NO_ACADEMICO, bloqueado: analisis.tipo === "inyeccion" };
  }
  const limite = await verificarLimites(ctx, acceso, "preguntar", { sesionId: sesion.id });
  if (!limite.ok) return { texto: limite.mensaje, bloqueado: false };

  // Contexto mínimo para la IA: tema + ejercicio público abierto + ≤4 turnos; nunca nombres completos, notas ni datos del colegio.
  const { nivel } = await datosDelSalon(ctx, acceso);
  const tema = sesion.temaClave ? await temaDeSesion(ctx, sesion, nivel, acceso).catch(() => null) : null;
  const abierto = await ctx.db.nuditoEjercicio.findFirst({ where: { sesionId: sesion.id, cerradoAt: null }, select: { enunciado: true } });
  const sistema = [
    "Eres Nudito, tutor escolar. Guía con preguntas, sin dar la respuesta final. Solo temas del curso.",
    tema ? `Tema: ${tema.nombre} (${tema.nivel}, grado ${tema.grado}). Idea revisada: ${tema.repaso.idea}` : "",
    abierto ? `Ejercicio actual (público): ${(abierto.enunciado as EjercicioPublico).enunciado}` : "",
  ].filter(Boolean).join("\n");
  const ia = await proveedor();
  let consumo = { tokensEntrada: 0, tokensSalida: 0 };
  const t0 = Date.now();
  const envoltura: ProveedorIA = {
    nombre: ia.nombre,
    async responder({ mensajes }: { sistema: string; mensajes: MensajeIA[] }) {
      const turnos = mensajes.slice(-4).map((m, i, l) => (i === l.length - 1 && m.rol === "usuario" ? { ...m, texto: comoDatosDelAlumno(m.texto) } : m));
      const r = await ia.responder({ sistema, mensajes: turnos });
      consumo = { tokensEntrada: r.tokensEntrada, tokensSalida: r.tokensSalida };
      return r;
    },
  };
  const inicio = new Date(Date.now() - 1000);
  try {
    const r = await conversar(ctx, acceso, { conversacionId: sesion.conversacionId, texto }, { proveedor: envoltura });
    if (r.conversacionId) {
      await ctx.db.nuditoMensaje.updateMany({ where: { conversacionId: r.conversacionId, sesionId: null, createdAt: { gte: inicio } }, data: { sesionId: sesion.id } });
      await ctx.db.nuditoSesion.update({ where: { id: sesion.id }, data: { conversacionId: r.conversacionId, ultimaActividadAt: new Date() } });
    }
    if (consumo.tokensSalida > 0) {
      // `conversar` ya sumó el UsoNudito del mes: aquí solo el registro por llamada.
      await ctx.db.nuditoConsumoIa.create({
        data: { tenantId: ctx.tenant.id, alumnoId: acceso.alumno.id, sesionId: sesion.id, operacion: "preguntar", proveedor: ia.nombre, tokensEntrada: consumo.tokensEntrada, tokensSalida: consumo.tokensSalida, latenciaMs: Date.now() - t0, simulado: ia.simulado, ok: true },
      });
    }
    return { texto: r.texto, bloqueado: r.bloqueado };
  } catch (e) {
    if (e instanceof ErrorDeNegocio && e.message === MENSAJE_PROVEEDOR_CAIDO) {
      await ctx.db.nuditoConsumoIa.create({ data: { tenantId: ctx.tenant.id, alumnoId: acceso.alumno.id, sesionId: sesion.id, operacion: "preguntar", proveedor: ia.nombre, simulado: ia.simulado, ok: false, error: "proveedor caído" } });
      return { texto: "Ahora no puedo responder preguntas, pero sigamos practicando: usa las pistas si las necesitas.", bloqueado: false };
    }
    throw e;
  }
}

export async function finalizar(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"finalizar">): Promise<SalidaApi<"finalizar">> {
  const sesion = await sesionPropia(ctx, acceso, entrada.sesionId, { incluirFinalizada: true });
  const ahora = new Date();
  await ctx.db.nuditoEjercicio.updateMany({ where: { sesionId: sesion.id, cerradoAt: null }, data: { cerradoAt: ahora } });
  const ejercicios = await ctx.db.nuditoEjercicio.findMany({ where: { sesionId: sesion.id }, select: { pistasUsadas: true, intentos: { select: { resultado: true } } } });
  const conIntento = ejercicios.filter((e) => e.intentos.length > 0);
  const aciertos = conIntento.filter((e) => e.intentos.some((i) => i.resultado === "correcto")).length;
  const pistas = ejercicios.reduce((n, e) => n + e.pistasUsadas, 0);
  const fin = sesion.finalizadaAt ?? ahora;
  const minutos = Math.max(1, Math.round((fin.getTime() - sesion.iniciadaAt.getTime()) / 60_000));

  const temas: TemaVista[] = [];
  let siguiente = "";
  if (sesion.temaClave && sesion.area) {
    const { nivel } = await datosDelSalon(ctx, acceso);
    const tema = await temaDelArea(ctx.db, sesion.area as AreaNudito, nivel, sesion.temaClave);
    const dominio = await ctx.db.nuditoDominio.findUnique({ where: { alumnoId_temaClave: { alumnoId: acceso.alumno.id, temaClave: sesion.temaClave } }, select: { estado: true } });
    const estado = (dominio?.estado ?? "no_iniciado") as EstadoDominio;
    if (tema) {
      temas.push(vistaTema(tema, ESTADOS_DOMINIO.includes(estado) ? estado : "no_iniciado", estado !== "dominado"));
      siguiente =
        estado === "dominado" ? " ¡Ya dominas este tema! La próxima vez prueba uno nuevo."
          : estado === "reforzar" ? ` La próxima vez repasamos ${tema.nombre} con calma, paso a paso.`
            : estado === "en_comprobacion" ? ` La próxima vez hacemos la comprobación de ${tema.nombre}.`
              : ` La próxima vez seguimos con ${tema.nombre} para afianzarlo.`;
    }
  }
  const nombre = primerNombre(acceso.alumno.nombres);
  const base = conIntento.length === 0
    ? `¡Gracias por pasar, ${nombre}!`
    : aciertos === conIntento.length ? `¡Excelente, ${nombre}! Acertaste todos.` : aciertos > 0 ? `¡Buen trabajo, ${nombre}! Acertaste ${aciertos} de ${conIntento.length}.` : `¡Gracias por practicar, ${nombre}! Cada intento te ayuda a aprender.`;
  const plan = sesion.area ? await progresoDelPlan(ctx, acceso.alumno.id, sesion.cursoId ?? sesion.area as AreaNudito) : null;
  const habilidades = temas.filter(t => t.estado === "dominado" || aciertos > 0).map(t => t.nombre);
  const dificultades = temas.filter(t => t.estado === "reforzar" || aciertos < conIntento.length).map(t => t.nombre);
  const recomendaciones = plan?.completo ? ["Repasa libremente los temas del plan.", "Prueba la profundización en el nivel más difícil."] : dificultades.length ? ["Revisa la explicación y vuelve a intentar el tema con las pistas."] : ["Continúa con otro tema del plan cuando quieras."];
  const resultados = { aciertos, total: conIntento.length, pistas, minutos, temas, habilidades, dificultades, recomendaciones, mensaje: plan?.completo ? `${base} ¡Completaste todos los temas del plan! Puedes volver a repasarlos o profundizar con ejercicios más difíciles.` : `${base}${siguiente}`,
    ...(plan ? { plan: { total: plan.total, dominados: plan.dominados, completo: plan.completo } } : {}) };

  if (sesion.estado === "activa") {
    await ctx.db.nuditoSesion.update({
      where: { id: sesion.id },
      data: { estado: "finalizada", fase: "resultados", finalizadaAt: ahora, ultimaActividadAt: ahora, resumen: { aciertos, total: conIntento.length, pistas, segundos: minutos * 60 } },
    });
  }
  return resultados;
}
