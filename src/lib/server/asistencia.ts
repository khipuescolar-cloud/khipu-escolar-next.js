import "server-only";
import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import type { EstadoAsistencia, EstadoJustificacion } from "@/generated/prisma/enums";
import { claveMes, mesPedido, rangoDelMes } from "@/lib/calendario-asistencia";
import { urlColegio } from "@/lib/dominio";
import { esFechaReal, fechaDb, isoDeFechaDb, momentoEnZona } from "@/lib/fechas";
import { primerNombre } from "@/lib/nombres";
import { instanteDeRegistro } from "@/lib/registro-offline";
import { auditar, auditarVarios } from "./auditoria";
import { sincronizarNsp } from "./nsp";
import { expiracionJustificacion, ultimoDiaJustificacion } from "@/lib/plazo-justificacion";
import { asistenciaPorCursoActiva, ingresoAlColegio, mensajeCursoDesactivado, seAvisaCambio } from "@/lib/asistencia-por-curso";
import { ErrorDeNegocio } from "./contexto-accion";
import {
  destinatariosPorAlumno, encolarAvisosAsistencia, familiasConAvisoPorAlumno, type AsistenciaParaAviso, type Destinatario,
} from "./notificaciones/encolar";
import { conEnvio } from "./notificaciones/envios";
import { requireFeature } from "./plan";
import { whereSalonActivo } from "./salones-activos";
import { esVistaFamilia } from "@/lib/roles";
import { alumnoIdsVisibles, requireCursoDelProfesor, type TenantContext } from "./tenant";

// Pasar lista y ver asistencia (specs/04-asistencia.md).

export const AMBITO_DIA = "dia";
export const ESTADOS: EstadoAsistencia[] = ["llego", "tarde", "falta", "problema"];

export type OpcionLista = { salonId: string; salonNombre: string; ambito: string; titulo: string };

/** Error legible (403 de negocio) al pasar o corregir una lista de curso de un nivel sin asistencia por curso. */
export class AsistenciaPorCursoDesactivada extends ErrorDeNegocio {}

/**
 * Listas que el usuario puede pasar: «Asistencia del día» (tutor; dirección para corregir) y sus cursos.
 * Las listas de curso solo se ofrecen en salones de los niveles con asistencia por curso activa (Configuración).
 */
export async function opcionesDeLista(ctx: TenantContext): Promise<OpcionLista[]> {
  requireFeature(ctx, "asistencia");
  if (ctx.rol !== "direccion" && ctx.rol !== "profesor") forbidden();
  const esDireccion = ctx.rol === "direccion";
  const salones = await ctx.db.salon.findMany({
    where: {
      ...whereSalonActivo,
      ...(esDireccion ? {} : { OR: [{ tutorId: ctx.membership.id }, { cursos: { some: { profesorId: ctx.membership.id } } }] }),
    },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, nivel: true, tutorId: true, cursos: { orderBy: { nombre: "asc" }, select: { id: true, nombre: true, profesorId: true } } },
  });
  const opciones: OpcionLista[] = [];
  for (const s of salones) {
    const esTutor = s.tutorId === ctx.membership.id;
    if (esDireccion || esTutor) opciones.push({ salonId: s.id, salonNombre: s.nombre, ambito: AMBITO_DIA, titulo: "Asistencia del día" });
    if (!asistenciaPorCursoActiva(ctx.tenant.asistenciaPorCursoNiveles, s.nivel)) continue;
    for (const c of s.cursos) {
      if (esDireccion || esTutor || c.profesorId === ctx.membership.id) {
        opciones.push({ salonId: s.id, salonNombre: s.nombre, ambito: c.id, titulo: c.nombre });
      }
    }
  }
  return opciones;
}

/**
 * 403 si el usuario no puede pasar esa lista. Devuelve el salón y, si aplica, el curso.
 * Lista de curso de un nivel sin asistencia por curso → `AsistenciaPorCursoDesactivada` (también para dirección).
 */
async function requireLista(ctx: TenantContext, salonId: string, ambito: string) {
  requireFeature(ctx, "asistencia");
  if (ctx.rol !== "direccion" && ctx.rol !== "profesor") forbidden();
  const salon = await ctx.db.salon.findUnique({ where: { id: salonId }, select: { id: true, nombre: true, nivel: true, tutorId: true, archivadoAt: true } });
  if (!salon || salon.archivadoAt) notFound();
  if (ambito === AMBITO_DIA) {
    if (ctx.rol !== "direccion" && salon.tutorId !== ctx.membership.id) forbidden();
    return { salon, curso: null };
  }
  await requireCursoDelProfesor(ctx, ambito);
  const curso = await ctx.db.curso.findUnique({ where: { id: ambito }, select: { id: true, nombre: true, salonId: true } });
  if (!curso || curso.salonId !== salon.id) forbidden();
  if (!asistenciaPorCursoActiva(ctx.tenant.asistenciaPorCursoNiveles, salon.nivel)) throw new AsistenciaPorCursoDesactivada(mensajeCursoDesactivado(salon.nivel));
  return { salon, curso };
}

export function hoyDelColegio(ctx: Pick<TenantContext, "tenant">, ahora = new Date()) {
  return momentoEnZona(ahora, ctx.tenant.zonaHoraria);
}

const fechaCorreccion = z.string().refine(esFechaReal, "Fecha no válida.");

/**
 * Día de la lista. Sin `fecha`, hoy. Con `fecha` (modo «corregir» desde los reportes), solo dirección y nunca un día futuro;
 * un profesor solo puede pedir hoy. Devuelve también si es hoy: corregir un día pasado no avisa a las familias.
 */
function diaDeLista(ctx: TenantContext, fecha: string | undefined, ahora = new Date()) {
  const hoy = hoyDelColegio(ctx, ahora);
  if (!fecha || fecha === hoy.isoFecha) return { isoFecha: hoy.isoFecha, hora: hoy.hora, esHoy: true };
  if (!fechaCorreccion.safeParse(fecha).success) throw new ErrorDeNegocio("La fecha de la lista no es válida.");
  if (ctx.rol !== "direccion") forbidden();
  if (fecha > hoy.isoFecha) throw new ErrorDeNegocio("No se puede corregir la asistencia de un día que aún no llega.");
  return { isoFecha: fecha, hora: hoy.hora, esHoy: false };
}

/**
 * Alumnos del salón con su registro de ese día (hoy por defecto) para esa lista.
 * En las listas de curso trae además el ingreso al colegio de ese día (para decidir y mostrar el aviso de falta a clase).
 */
export async function obtenerLista(ctx: TenantContext, salonId: string, ambito: string, fecha?: string) {
  const { salon, curso } = await requireLista(ctx, salonId, ambito);
  const dia = diaDeLista(ctx, fecha);
  const fechaLista = fechaDb(dia.isoFecha);
  const alumnos = await ctx.db.alumno.findMany({
    where: { salonId: salon.id, estado: "activo" },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    select: {
      id: true, nombres: true, apellidos: true,
      asistencias: { where: { fecha: fechaLista, ambito: curso ? { in: [ambito, AMBITO_DIA] } : ambito }, select: { ambito: true, estado: true, hora: true, nota: true, origen: true } },
    },
  });
  const familias = await familiasConAvisoPorAlumno(ctx.db, alumnos.map((a) => a.id));
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "asistencia",
    detalle: { salonId: salon.id, ambito, fecha: dia.isoFecha },
  });
  return {
    salon: { id: salon.id, nombre: salon.nombre },
    curso: curso ? { id: curso.id, nombre: curso.nombre } : null,
    ambito,
    hoy: { isoFecha: dia.isoFecha, hora: dia.hora },
    /** false al corregir un día pasado: no se avisa a las familias. */
    esHoy: dia.esHoy,
    alumnos: alumnos.map((a) => {
      const registro = a.asistencias.find((r) => r.ambito === ambito);
      const ingreso = curso ? a.asistencias.find((r) => r.ambito === AMBITO_DIA) : undefined;
      return {
        id: a.id, nombres: a.nombres, apellidos: a.apellidos,
        registro: registro ? { estado: registro.estado, hora: registro.hora, nota: registro.nota, origen: registro.origen } : null,
        /** Familias que recibirán el aviso (con consentimiento y algún canal). */
        familiasConAviso: familias.get(a.id) ?? 0,
        /** Solo listas de curso: ingreso al colegio de ese día (portería o lista del día). */
        ingreso: ingreso ? { estado: ingreso.estado, hora: ingreso.hora } : null,
      };
    }),
  };
}

export const esquemaGuardarLista = z.object({
  salonId: z.uuid(),
  ambito: z.union([z.literal(AMBITO_DIA), z.uuid()]),
  registros: z
    .array(
      z.object({
        alumnoId: z.uuid(),
        estado: z.enum(["llego", "tarde", "falta", "problema"]),
        nota: z.string().trim().max(300).optional(),
      }),
    )
    .min(1)
    .max(200),
  /** Hora real en que se pasó lista, si se guardó sin conexión (ISO). Solo se respeta si es razonable. */
  registradoAt: z.iso.datetime().optional(),
  /** Día que dirección corrige desde los reportes (AAAA-MM-DD). Sin fecha, hoy. */
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** `omitidos`: registros enviados sin conexión que no se aplicaron porque el servidor ya tenía un cambio más reciente. */
export type ResultadoGuardarLista = { guardados: number; cambios: number; familiasAvisadas: number; omitidos: number };

/**
 * Upsert por (alumnoId, fecha, ambito) con origen «lista». Al guardar («cerrar») la lista se encola el aviso a las
 * familias de cada alumno nuevo o con estado cambiado, según `seAvisaCambio` (specs/04):
 * - Asistencia del día: llegada, tardanza, falta y problema. La llegada se avisa una sola vez (no si esta lista lo
 *   tenía «tarde»; portería escribe en la misma fila, así que tampoco se repite tras el escaneo).
 * - Lista de un curso: nunca la llegada. Tardanza («llegó tarde a Matemática») y problema siempre. La falta a clase
 *   solo si el alumno ingresó al colegio ese día («ingresó a las 7:52, pero no estuvo en Matemática»); si no ingresó,
 *   la familia ya recibe «no llegó» de la asistencia del día y no se duplica.
 * - Corrección de un día pasado (dirección, `fecha`): se guarda y se audita, pero no se avisa (el aviso habla de «hoy»).
 *
 * Idempotente (la fila es única por alumno/fecha/ámbito): reenviar la misma lista no cambia nada ni vuelve a avisar.
 * Si llega con `registradoAt` (lista guardada sin conexión), la fecha y hora del registro son las de ese instante
 * cuando es razonable (ver `instanteDeRegistro`), y un registro que el servidor ya cambió después de ese instante no se pisa.
 */
export async function guardarLista(ctx: TenantContext, entrada: unknown, ahora = new Date()): Promise<ResultadoGuardarLista> {
  const datos = esquemaGuardarLista.parse(entrada);
  const { salon, curso } = await requireLista(ctx, datos.salonId, datos.ambito);
  const correccion = datos.fecha ? diaDeLista(ctx, datos.fecha, ahora) : null;
  const instante = correccion ? ahora : instanteDeRegistro(datos.registradoAt, ahora);
  const sinConexion = instante !== ahora;
  const hoy = correccion ?? hoyDelColegio(ctx, instante);
  const avisa = correccion ? correccion.esHoy : true;
  const fecha = fechaDb(hoy.isoFecha);

  const alumnos = await ctx.db.alumno.findMany({
    where: { id: { in: datos.registros.map((r) => r.alumnoId) }, salonId: salon.id, estado: "activo" },
    select: { id: true, nombres: true },
  });
  const nombres = new Map(alumnos.map((a) => [a.id, primerNombre(a.nombres)]));
  if (nombres.size !== new Set(datos.registros.map((r) => r.alumnoId)).size) forbidden();

  // Control de ingreso (specs/05): en una lista de curso, quien no ingresó al colegio hoy solo puede quedar con falta.
  // No aplica a listas guardadas sin conexión (portería pudo registrar la llegada también sin conexión) ni a correcciones.
  if (curso && ctx.tenant.controlIngresoAutomatico && !correccion && !sinConexion) {
    const presentes = datos.registros.filter((r) => r.estado !== "falta").map((r) => r.alumnoId);
    if (presentes.length > 0) {
      const ingresos = await ctx.db.asistencia.findMany({
        where: { alumnoId: { in: presentes }, fecha, ambito: AMBITO_DIA },
        select: { alumnoId: true, estado: true },
      });
      const conIngreso = new Set(ingresos.filter((i) => ingresoAlColegio(i)).map((i) => i.alumnoId));
      const sinIngreso = presentes.filter((id) => !conIngreso.has(id));
      if (sinIngreso.length > 0) {
        const lista = sinIngreso.map((id) => nombres.get(id)).join(", ");
        throw new ErrorDeNegocio(
          `${lista} no ${sinIngreso.length === 1 ? "registra" : "registran"} ingreso al colegio hoy: solo puede${sinIngreso.length === 1 ? "" : "n"} quedar con falta. Si ya llegó, pide a portería que registre su ingreso.`,
        );
      }
    }
  }

  // Lo que se necesita de toda la lista se carga de una vez (antes eran ~10 consultas en serie por alumno:
  // ~250 idas y vueltas a la BD por salón, que en producción se multiplican por la latencia Vercel → Supabase).
  const ids = datos.registros.map((r) => r.alumnoId);
  const [previos, destinatarios] = await Promise.all([
    ctx.db.asistencia.findMany({
      where: { alumnoId: { in: ids }, fecha, ambito: datos.ambito },
      select: { id: true, alumnoId: true, estado: true, hora: true, nota: true, updatedAt: true },
    }),
    avisa ? destinatariosPorAlumno(ctx.db, ids) : Promise.resolve(new Map<string, Destinatario[]>()),
  ]);
  const anteriores = new Map(previos.map((p) => [p.alumnoId, p]));
  const auditorias: Parameters<typeof auditarVarios>[0] = [];
  const porAvisar: { asistencia: AsistenciaParaAviso; anterior: EstadoAsistencia | null }[] = [];

  let cambios = 0;
  const cambiados: string[] = [];
  let omitidos = 0;
  let familiasAvisadas = 0;
  for (const r of datos.registros) {
    const nota = r.estado === "problema" && r.nota ? r.nota : null;
    const anterior = anteriores.get(r.alumnoId) ?? null;
    if (sinConexion && anterior && anterior.updatedAt > instante) {
      omitidos++;
      continue;
    }
    const cambiaEstado = !anterior || anterior.estado !== r.estado;
    if (anterior && !cambiaEstado && anterior.nota === nota) continue;

    // Al corregir un día pasado se conserva la hora del registro (si lo había): la hora de hoy no dice nada de ese día.
    const hora = !cambiaEstado ? anterior!.hora : correccion && !correccion.esHoy ? (anterior?.hora ?? hoy.hora) : hoy.hora;
    const asistencia = await ctx.db.asistencia.upsert({
      where: { alumnoId_fecha_ambito: { alumnoId: r.alumnoId, fecha, ambito: datos.ambito } },
      create: {
        tenantId: ctx.tenant.id, alumnoId: r.alumnoId, cursoId: curso?.id ?? null, ambito: datos.ambito, fecha,
        hora, estado: r.estado, nota, origen: "lista", registradoPorId: ctx.membership.id,
      },
      update: { estado: r.estado, hora, nota, origen: "lista", registradoPorId: ctx.membership.id },
      select: { id: true, alumnoId: true, fecha: true, estado: true, hora: true, nota: true },
    });
    cambios++;
    cambiados.push(r.alumnoId);
    auditorias.push({
      tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: anterior ? "editar" : "crear", entidad: "asistencia",
      entidadId: asistencia.id,
      detalle: {
        alumnoId: r.alumnoId, ambito: datos.ambito, fecha: hoy.isoFecha, antes: anterior?.estado ?? null, ahora: r.estado,
        ...(correccion ? { correccion: true } : {}),
      },
    });

    if (!cambiaEstado || !avisa) continue; // solo cambió la nota, o es la corrección de un día pasado: no se avisa
    porAvisar.push({ asistencia, anterior: anterior?.estado ?? null });
  }
  await auditarVarios(auditorias);
  // NSP (specs/37): las actividades de ese día se ajustan a la asistencia nueva (pone o quita NSP, con historial).
  if (cambiados.length > 0) await sincronizarNsp(ctx.db, ctx.tenant, { fecha, alumnoIds: cambiados });

  // Lista de curso: ingreso al colegio de ese día de los alumnos con falta, consultado DESPUÉS de guardar
  // (si portería o la lista del día registraron el ingreso mientras tanto, cuenta).
  const conFalta = curso ? porAvisar.filter((p) => p.asistencia.estado === "falta").map((p) => p.asistencia.alumnoId) : [];
  const ingresos = new Map(
    conFalta.length === 0
      ? []
      : (await ctx.db.asistencia.findMany({
          where: { alumnoId: { in: conFalta }, fecha, ambito: AMBITO_DIA },
          select: { alumnoId: true, estado: true, hora: true },
        })).map((i) => [i.alumnoId, i]),
  );
  // Cerrar la lista es un envío (specs/06): masivo si avisa a más de una familia.
  const titulo = curso ? `${curso.nombre} · ${salon.nombre}` : `Lista del día · ${salon.nombre}`;
  await conEnvio(ctx.db, { tenantId: ctx.tenant.id, tipo: "asistencia", titulo, creadoPorId: ctx.membership.id }, async () => {
    for (const { asistencia, anterior } of porAvisar) {
      const ingreso = ingresos.get(asistencia.alumnoId) ?? null;
      if (!seAvisaCambio({ esCurso: !!curso, estado: asistencia.estado, anterior, ingreso })) continue;
      familiasAvisadas += await encolarAvisosAsistencia(ctx.db, {
        tenant: ctx.tenant,
        asistencia,
        alumnoNombre: nombres.get(asistencia.alumnoId)!,
        momento: curso ? `a ${curso.nombre}` : "a la 1.ª hora",
        ...(curso ? { curso: curso.nombre, ...(ingreso && ingresoAlColegio(ingreso) ? { ingreso: ingreso.hora } : {}) } : {}),
        urlMensajes: urlColegio(ctx.tenant.slug, "/mensajes"),
        destinatarios: destinatarios.get(asistencia.alumnoId) ?? [],
      });
    }
  });
  return { guardados: datos.registros.length, cambios, familiasAvisadas, omitidos };
}

export type RegistroHistorial = {
  id: string;
  fecha: string;
  hora: string;
  estado: EstadoAsistencia;
  lugar: string;
  /** true si es el ingreso al colegio (no un curso). */
  esDia: boolean;
  justificacion: EstadoJustificacion | null;
  puedeJustificar: boolean;
  /** Último día para justificar (AAAA-MM-DD), solo en faltas. */
  justificarHasta: string | null;
  /** Falta sin justificar cuyo plazo (días calendario) ya venció. */
  plazoVencido: boolean;
};

/** Asistencia de un mes (por defecto el actual) de cada hijo, para el calendario de la familia (solo lectura). */
export async function historialDeHijos(ctx: TenantContext, mes?: string) {
  requireFeature(ctx, "asistencia");
  if (!esVistaFamilia(ctx.rol)) forbidden(); // apoderado (sus hijos) o alumno (solo él)
  const ids = await alumnoIdsVisibles(ctx);
  const hoy = hoyDelColegio(ctx);
  const { anio, mes: numeroMes } = mesPedido(mes, hoy.isoFecha);
  const { desde, hasta } = rangoDelMes(anio, numeroMes);
  const hijos = await ctx.db.alumno.findMany({
    where: { id: { in: ids } },
    orderBy: { nombres: "asc" },
    select: {
      id: true, nombres: true, apellidos: true, salon: { select: { nombre: true } },
      asistencias: {
        where: { fecha: { gte: fechaDb(desde), lte: fechaDb(hasta) } },
        orderBy: [{ fecha: "desc" }, { hora: "asc" }],
        select: {
          id: true, fecha: true, hora: true, estado: true, ambito: true, curso: { select: { nombre: true } },
          justificaciones: { orderBy: { createdAt: "desc" }, take: 1, select: { estado: true } },
        },
      },
    },
  });
  const ahora = new Date();
  const plazo = ctx.tenant.plazoJustificacionDias;
  const zona = ctx.tenant.zonaHoraria;
  await Promise.all(
    hijos.map((h) =>
      auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "asistencia", entidadId: h.id, detalle: { mes: claveMes(anio, numeroMes) } }),
    ),
  );
  return {
    anio,
    mes: numeroMes,
    hoy: hoy.isoFecha,
    hijos: hijos.map((h) => ({
      id: h.id,
      nombres: h.nombres,
      apellidos: h.apellidos,
      salon: h.salon.nombre,
      registros: h.asistencias.map<RegistroHistorial>((a) => {
        // Una sola justificación por fecha (specs/37): la de cualquier falta del día cubre las demás de esa fecha.
        const justificacion = estadoJustificacionDelDia(h.asistencias, a);
        const fecha = isoDeFechaDb(a.fecha);
        const esFalta = a.estado === "falta";
        const pendiente = esFalta && (justificacion === null || justificacion === "rechazada");
        const plazoVencido = pendiente && expiracionJustificacion(fecha, plazo, zona) <= ahora;
        return {
          id: a.id,
          fecha,
          hora: a.hora,
          estado: a.estado,
          lugar: a.ambito === AMBITO_DIA ? "Ingreso al colegio" : a.curso?.nombre ?? "Clase",
          esDia: a.ambito === AMBITO_DIA,
          justificacion,
          // Solo el apoderado justifica faltas; el alumno ve su asistencia en solo lectura.
          // Solo dentro del plazo (días calendario desde la falta; specs/07).
          puedeJustificar: ctx.rol === "apoderado" && pendiente && !plazoVencido,
          justificarHasta: esFalta ? ultimoDiaJustificacion(fecha, plazo) : null,
          plazoVencido,
        };
      }),
    })),
  };
}

type ConJustificacion = { id: string; fecha: Date; estado: string; justificaciones: { estado: "pendiente" | "aceptada" | "rechazada" }[] };

/**
 * Estado de justificación que vale para una falta: el suyo o, si otra falta del mismo día ya tiene una justificación
 * pendiente o aceptada, ese (una solicitud por fecha cubre la falta del día y las faltas a clase; specs/37).
 */
function estadoJustificacionDelDia(todas: ConJustificacion[], a: ConJustificacion): "pendiente" | "aceptada" | "rechazada" | null {
  const propia = a.justificaciones[0]?.estado ?? null;
  if (propia === "pendiente" || propia === "aceptada") return propia;
  const dia = a.fecha.getTime();
  const otras = todas.filter((x) => x.id !== a.id && x.fecha.getTime() === dia).map((x) => x.justificaciones[0]?.estado);
  if (otras.includes("aceptada")) return "aceptada";
  if (otras.includes("pendiente")) return "pendiente";
  return propia;
}
