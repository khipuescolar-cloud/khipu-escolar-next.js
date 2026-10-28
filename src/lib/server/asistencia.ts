import "server-only";
import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import type { EstadoAsistencia, EstadoJustificacion } from "@/generated/prisma/enums";
import { claveMes, mesPedido, rangoDelMes } from "@/lib/calendario-asistencia";
import { urlColegio } from "@/lib/dominio";
import { fechaDb, isoDeFechaDb, momentoEnZona, sumarDias } from "@/lib/fechas";
import { primerNombre } from "@/lib/nombres";
import { instanteDeRegistro } from "@/lib/registro-offline";
import { auditar } from "./auditoria";
import { feriadosAplicables } from "./plataforma-configuracion";
import { expiracionJustificacion, ultimoDiaJustificacion } from "@/lib/plazo-justificacion";
import { encolarAvisosAsistencia, familiasConAvisoPorAlumno } from "./notificaciones/encolar";
import { requireFeature } from "./plan";
import { whereSalonActivo } from "./salones-activos";
import { esVistaFamilia } from "@/lib/roles";
import { alumnoIdsVisibles, requireCursoDelProfesor, type TenantContext } from "./tenant";

// Pasar lista y ver asistencia (specs/04-asistencia.md).

export const AMBITO_DIA = "dia";
export const ESTADOS: EstadoAsistencia[] = ["llego", "tarde", "falta", "problema"];

export type OpcionLista = { salonId: string; salonNombre: string; ambito: string; titulo: string };

/** Listas que el usuario puede pasar: «Asistencia del día» (tutor o dirección) y sus cursos. */
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
    select: { id: true, nombre: true, tutorId: true, cursos: { orderBy: { nombre: "asc" }, select: { id: true, nombre: true, profesorId: true } } },
  });
  const opciones: OpcionLista[] = [];
  for (const s of salones) {
    const esTutor = s.tutorId === ctx.membership.id;
    if (esDireccion || esTutor) opciones.push({ salonId: s.id, salonNombre: s.nombre, ambito: AMBITO_DIA, titulo: "Asistencia del día" });
    for (const c of s.cursos) {
      if (esDireccion || esTutor || c.profesorId === ctx.membership.id) {
        opciones.push({ salonId: s.id, salonNombre: s.nombre, ambito: c.id, titulo: c.nombre });
      }
    }
  }
  return opciones;
}

/** 403 si el usuario no puede pasar esa lista. Devuelve el salón y, si aplica, el curso. */
async function requireLista(ctx: TenantContext, salonId: string, ambito: string) {
  requireFeature(ctx, "asistencia");
  if (ctx.rol !== "direccion" && ctx.rol !== "profesor") forbidden();
  const salon = await ctx.db.salon.findUnique({ where: { id: salonId }, select: { id: true, nombre: true, tutorId: true, archivadoAt: true } });
  if (!salon || salon.archivadoAt) notFound();
  if (ambito === AMBITO_DIA) {
    if (ctx.rol !== "direccion" && salon.tutorId !== ctx.membership.id) forbidden();
    return { salon, curso: null };
  }
  await requireCursoDelProfesor(ctx, ambito);
  const curso = await ctx.db.curso.findUnique({ where: { id: ambito }, select: { id: true, nombre: true, salonId: true } });
  if (!curso || curso.salonId !== salon.id) forbidden();
  return { salon, curso };
}

export function hoyDelColegio(ctx: Pick<TenantContext, "tenant">, ahora = new Date()) {
  return momentoEnZona(ahora, ctx.tenant.zonaHoraria);
}

/** Alumnos del salón con el registro de hoy (si existe) para esa lista. */
export async function obtenerLista(ctx: TenantContext, salonId: string, ambito: string) {
  const { salon, curso } = await requireLista(ctx, salonId, ambito);
  const hoy = hoyDelColegio(ctx);
  const alumnos = await ctx.db.alumno.findMany({
    where: { salonId: salon.id, estado: "activo" },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    select: {
      id: true, nombres: true, apellidos: true,
      asistencias: { where: { fecha: fechaDb(hoy.isoFecha), ambito }, select: { estado: true, hora: true, nota: true, origen: true } },
    },
  });
  const ids = alumnos.map((a) => a.id);
  const [familias, llegadasPrevias] = await Promise.all([
    familiasConAvisoPorAlumno(ctx.db, ids),
    ctx.db.asistencia.findMany({
      where: { alumnoId: { in: ids }, fecha: fechaDb(hoy.isoFecha), ambito: { not: ambito }, estado: { in: ["llego", "tarde"] } },
      select: { alumnoId: true },
    }),
  ]);
  const yaLlegaron = new Set(llegadasPrevias.map((l) => l.alumnoId));
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "asistencia",
    detalle: { salonId: salon.id, ambito, fecha: hoy.isoFecha },
  });
  return {
    salon: { id: salon.id, nombre: salon.nombre },
    curso,
    ambito,
    hoy,
    alumnos: alumnos.map((a) => ({
      id: a.id, nombres: a.nombres, apellidos: a.apellidos, registro: a.asistencias[0] ?? null,
      /** Familias que recibirán el aviso (con consentimiento y algún canal). */
      familiasConAviso: familias.get(a.id) ?? 0,
      /** Hoy ya se avisó su llegada en otra lista o en portería: esta lista no la repite. */
      llegadaAvisada: yaLlegaron.has(a.id),
    })),
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
});

/** `omitidos`: registros enviados sin conexión que no se aplicaron porque el servidor ya tenía un cambio más reciente. */
export type ResultadoGuardarLista = { guardados: number; cambios: number; familiasAvisadas: number; omitidos: number };

/**
 * Upsert por (alumnoId, fecha, ambito) con origen «lista». Al guardar («cerrar») la lista se encola el aviso
 * a las familias de cada alumno nuevo o con estado cambiado: presentes (llegada), tardanzas, faltas y problemas.
 *
 * Un solo aviso de llegada por alumno y día: si ya tuvo una llegada hoy (portería, la primera lista u otra lista,
 * o la misma lista lo tenía «tarde»), las listas siguientes no repiten el aviso de llegada. Así no se duplica el
 * correo (cuesta y el envío diario tiene tope; Gmail ~500 por día). Tardanza, falta y problema sí se avisan siempre.
 *
 * Idempotente (la fila es única por alumno/fecha/ámbito): reenviar la misma lista no cambia nada ni vuelve a avisar.
 * Si llega con `registradoAt` (lista guardada sin conexión), la fecha y hora del registro son las de ese instante
 * cuando es razonable (ver `instanteDeRegistro`), y un registro que el servidor ya cambió después de ese instante no se pisa.
 */
export async function guardarLista(ctx: TenantContext, entrada: unknown, ahora = new Date()): Promise<ResultadoGuardarLista> {
  const datos = esquemaGuardarLista.parse(entrada);
  const { salon, curso } = await requireLista(ctx, datos.salonId, datos.ambito);
  const instante = instanteDeRegistro(datos.registradoAt, ahora);
  const sinConexion = instante !== ahora;
  const hoy = hoyDelColegio(ctx, instante);
  const fecha = fechaDb(hoy.isoFecha);

  const alumnos = await ctx.db.alumno.findMany({
    where: { id: { in: datos.registros.map((r) => r.alumnoId) }, salonId: salon.id, estado: "activo" },
    select: { id: true, nombres: true },
  });
  const nombres = new Map(alumnos.map((a) => [a.id, primerNombre(a.nombres)]));
  if (nombres.size !== new Set(datos.registros.map((r) => r.alumnoId)).size) forbidden();

  let cambios = 0;
  let omitidos = 0;
  let familiasAvisadas = 0;
  for (const r of datos.registros) {
    const nota = r.estado === "problema" && r.nota ? r.nota : null;
    const anterior = await ctx.db.asistencia.findUnique({
      where: { alumnoId_fecha_ambito: { alumnoId: r.alumnoId, fecha, ambito: datos.ambito } },
      select: { id: true, estado: true, hora: true, nota: true, updatedAt: true },
    });
    if (sinConexion && anterior && anterior.updatedAt > instante) {
      omitidos++;
      continue;
    }
    const cambiaEstado = !anterior || anterior.estado !== r.estado;
    if (anterior && !cambiaEstado && anterior.nota === nota) continue;

    const hora = cambiaEstado ? hoy.hora : anterior!.hora;
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
    await auditar({
      tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: anterior ? "editar" : "crear", entidad: "asistencia",
      entidadId: asistencia.id, detalle: { alumnoId: r.alumnoId, ambito: datos.ambito, antes: anterior?.estado ?? null, ahora: r.estado },
    });

    if (!cambiaEstado) continue; // solo cambió la nota: no se vuelve a avisar
    if (r.estado === "llego") {
      // La llegada ya se avisó si esta lista lo tenía «tarde» o si hoy hay otro registro de llegada (portería, día u otro curso).
      if (anterior?.estado === "tarde") continue;
      const yaLlego = await ctx.db.asistencia.count({
        where: { alumnoId: r.alumnoId, fecha, ambito: { not: datos.ambito }, estado: { in: ["llego", "tarde"] } },
      });
      if (yaLlego > 0) continue;
    }
    familiasAvisadas += await encolarAvisosAsistencia(ctx.db, {
      tenant: ctx.tenant,
      asistencia,
      alumnoNombre: nombres.get(r.alumnoId)!,
      momento: curso ? `a ${curso.nombre}` : "a la 1.ª hora",
      urlMensajes: urlColegio(ctx.tenant.slug, "/mensajes"),
    });
  }
  return { guardados: datos.registros.length, cambios, familiasAvisadas, omitidos };
}

/** Conteo de la asistencia del día en todo el colegio (dirección). */
export async function resumenDelDia(ctx: TenantContext) {
  requireFeature(ctx, "asistencia");
  if (ctx.rol !== "direccion") forbidden();
  const hoy = hoyDelColegio(ctx);
  const grupos = await ctx.db.asistencia.groupBy({
    by: ["estado"],
    where: { fecha: fechaDb(hoy.isoFecha), ambito: AMBITO_DIA },
    _count: { _all: true },
  });
  const totalAlumnos = await ctx.db.alumno.count({ where: { estado: "activo" } });
  const conteo = Object.fromEntries(ESTADOS.map((e) => [e, 0])) as Record<EstadoAsistencia, number>;
  for (const g of grupos) conteo[g.estado] = g._count._all;
  const registrados = ESTADOS.reduce((s, e) => s + conteo[e], 0);
  return { conteo, totalAlumnos, sinRegistro: Math.max(0, totalAlumnos - registrados) };
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
  /** Falta sin justificar cuyo plazo (días hábiles) ya venció. */
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
  const plazo = ctx.tenant.plazoJustificacionDiasHabiles;
  const zona = ctx.tenant.zonaHoraria;
  const feriados = await feriadosAplicables(ctx.tenant.id, desde, sumarDias(hasta, 90));
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
        const justificacion = a.justificaciones[0]?.estado ?? null;
        const fecha = isoDeFechaDb(a.fecha);
        const esFalta = a.estado === "falta";
        const pendiente = esFalta && (justificacion === null || justificacion === "rechazada");
        const plazoVencido = pendiente && expiracionJustificacion(fecha, plazo, zona, feriados) <= ahora;
        return {
          id: a.id,
          fecha,
          hora: a.hora,
          estado: a.estado,
          lugar: a.ambito === AMBITO_DIA ? "Ingreso al colegio" : a.curso?.nombre ?? "Clase",
          esDia: a.ambito === AMBITO_DIA,
          justificacion,
          // Solo el apoderado justifica faltas; el alumno ve su asistencia en solo lectura.
          // Solo dentro del plazo del reglamento (días hábiles desde la falta; specs/07).
          puedeJustificar: ctx.rol === "apoderado" && pendiente && !plazoVencido,
          justificarHasta: esFalta ? ultimoDiaJustificacion(fecha, plazo, feriados) : null,
          plazoVencido,
        };
      }),
    })),
  };
}
