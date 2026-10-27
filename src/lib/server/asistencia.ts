import "server-only";
import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import type { EstadoAsistencia, EstadoJustificacion } from "@/generated/prisma/enums";
import { urlColegio } from "@/lib/dominio";
import { fechaDb, isoDeFechaDb, momentoEnZona, restarDias } from "@/lib/fechas";
import { primerNombre } from "@/lib/nombres";
import { auditar } from "./auditoria";
import { encolarAvisosAsistencia } from "./notificaciones/encolar";
import { requireFeature } from "./plan";
import { whereSalonActivo } from "./salones-activos";
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
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "asistencia",
    detalle: { salonId: salon.id, ambito, fecha: hoy.isoFecha },
  });
  return {
    salon: { id: salon.id, nombre: salon.nombre },
    curso,
    ambito,
    hoy,
    alumnos: alumnos.map((a) => ({ id: a.id, nombres: a.nombres, apellidos: a.apellidos, registro: a.asistencias[0] ?? null })),
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
});

export type ResultadoGuardarLista = { guardados: number; cambios: number; familiasAvisadas: number };

/**
 * Upsert por (alumnoId, fecha, ambito) con origen «lista». Encola avisos solo para registros nuevos
 * o con estado cambiado. En la lista de un curso, la llegada no se vuelve a avisar si ya se avisó hoy.
 */
export async function guardarLista(ctx: TenantContext, entrada: unknown, ahora = new Date()): Promise<ResultadoGuardarLista> {
  const datos = esquemaGuardarLista.parse(entrada);
  const { salon, curso } = await requireLista(ctx, datos.salonId, datos.ambito);
  const hoy = hoyDelColegio(ctx, ahora);
  const fecha = fechaDb(hoy.isoFecha);

  const alumnos = await ctx.db.alumno.findMany({
    where: { id: { in: datos.registros.map((r) => r.alumnoId) }, salonId: salon.id, estado: "activo" },
    select: { id: true, nombres: true },
  });
  const nombres = new Map(alumnos.map((a) => [a.id, primerNombre(a.nombres)]));
  if (nombres.size !== new Set(datos.registros.map((r) => r.alumnoId)).size) forbidden();

  let cambios = 0;
  let familiasAvisadas = 0;
  for (const r of datos.registros) {
    const nota = r.estado === "problema" && r.nota ? r.nota : null;
    const anterior = await ctx.db.asistencia.findUnique({
      where: { alumnoId_fecha_ambito: { alumnoId: r.alumnoId, fecha, ambito: datos.ambito } },
      select: { id: true, estado: true, hora: true, nota: true },
    });
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
      select: { id: true, alumnoId: true, estado: true, hora: true, nota: true },
    });
    cambios++;
    await auditar({
      tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: anterior ? "editar" : "crear", entidad: "asistencia",
      entidadId: asistencia.id, detalle: { alumnoId: r.alumnoId, ambito: datos.ambito, antes: anterior?.estado ?? null, ahora: r.estado },
    });

    if (!cambiaEstado) continue; // solo cambió la nota: no se vuelve a avisar
    if (r.estado === "llego" && datos.ambito !== AMBITO_DIA) {
      // La llegada ya se avisó si hoy hay otro registro de llegada (del día o de otro curso).
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
  return { guardados: datos.registros.length, cambios, familiasAvisadas };
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
  justificacion: EstadoJustificacion | null;
  puedeJustificar: boolean;
};

/** Últimos 30 días de cada hijo (solo lectura para el apoderado). */
export async function historialDeHijos(ctx: TenantContext, dias = 30) {
  requireFeature(ctx, "asistencia");
  if (ctx.rol !== "apoderado") forbidden();
  const ids = await alumnoIdsVisibles(ctx);
  const hoy = hoyDelColegio(ctx);
  const desde = fechaDb(restarDias(hoy.isoFecha, dias - 1));
  const hijos = await ctx.db.alumno.findMany({
    where: { id: { in: ids } },
    orderBy: { nombres: "asc" },
    select: {
      id: true, nombres: true, apellidos: true, salon: { select: { nombre: true } },
      asistencias: {
        where: { fecha: { gte: desde } },
        orderBy: [{ fecha: "desc" }, { hora: "asc" }],
        select: {
          id: true, fecha: true, hora: true, estado: true, ambito: true, curso: { select: { nombre: true } },
          justificaciones: { orderBy: { createdAt: "desc" }, take: 1, select: { estado: true } },
        },
      },
    },
  });
  await Promise.all(
    hijos.map((h) =>
      auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "asistencia", entidadId: h.id, detalle: { dias } }),
    ),
  );
  return hijos.map((h) => ({
    id: h.id,
    nombres: h.nombres,
    apellidos: h.apellidos,
    salon: h.salon.nombre,
    registros: h.asistencias.map<RegistroHistorial>((a) => {
      const justificacion = a.justificaciones[0]?.estado ?? null;
      return {
        id: a.id,
        fecha: isoDeFechaDb(a.fecha),
        hora: a.hora,
        estado: a.estado,
        lugar: a.ambito === AMBITO_DIA ? "Ingreso al colegio" : a.curso?.nombre ?? "Clase",
        justificacion,
        puedeJustificar: a.estado === "falta" && (justificacion === null || justificacion === "rechazada"),
      };
    }),
  }));
}
