import "server-only";
import { z } from "zod";
import { fechaLima, grupoEntrega, instanteLima, inicioDiaLima, sumarDias, type GrupoEntrega } from "@/lib/fechas";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import type { AdjuntoVista } from "@/lib/adjuntos";
import { adjuntoVista, adjuntosDe, borrarDelProveedor, contarRestantes, guardarAdjuntos, quitarAdjuntos, validarAdjuntos, type EntradaAdjunto } from "./adjuntos";
import { auditar } from "./auditoria";
import { ErrorDeNegocio } from "./contexto-accion";
import { cursosDelDocente } from "./cursos";
import { avisarTareaNueva } from "./notificaciones/avisos-tareas";
import { requireFeature } from "./plan";
import { alumnoIdsVisibles, requireCursoDelProfesor, requireRol, type TenantContext } from "./tenant";

const esquemaTarea = z.object({
  cursoId: z.uuid("Elige el curso."),
  titulo: z.string().trim().min(3, "Escribe el título de la tarea.").max(150),
  descripcion: z.string().trim().max(1000).optional(),
  fechaEntrega: z.iso.date("Elige la fecha de entrega."),
});

/** El profesor crea una tarea en un curso que dicta. Dirección solo la consulta. */
export async function crearTarea(ctx: TenantContext, entrada: unknown, adjuntos: EntradaAdjunto[] = []): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  requireRol(ctx, ["profesor"]);
  const d = esquemaTarea.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  await requireCursoDelProfesor(ctx, d.data.cursoId);
  if (d.data.fechaEntrega < fechaLima(new Date())) return fallo("La fecha de entrega ya pasó.");
  const curso = await ctx.db.curso.findFirst({ where: { id: d.data.cursoId } });
  if (!curso) return fallo("No encontramos ese curso.");
  let validados;
  try {
    validados = validarAdjuntos(adjuntos);
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return fallo(e.message);
    throw e;
  }
  const t = await ctx.db.tarea.create({
    data: {
      tenantId: ctx.tenant.id, cursoId: curso.id, titulo: d.data.titulo, descripcion: d.data.descripcion || null,
      fechaEntrega: instanteLima(d.data.fechaEntrega, "08:00"), creadoPorId: ctx.membership.id,
    },
  });
  try {
    await guardarAdjuntos(ctx, { tareaId: t.id }, validados);
  } catch (e) {
    await ctx.db.tarea.deleteMany({ where: { id: t.id } });
    throw e;
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "tarea", entidadId: t.id, detalle: { adjuntos: validados.length } });
  await avisarTareaNueva(ctx, t.id, entrada);
  return ok("Tarea creada.");
}

export async function eliminarTarea(ctx: TenantContext, tareaId: string): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  requireRol(ctx, ["profesor", "direccion"]);
  const t = await ctx.db.tarea.findFirst({ where: { id: tareaId } });
  if (!t) return fallo("No encontramos esa tarea.");
  await requireCursoDelProfesor(ctx, t.cursoId);
  const archivos = await adjuntosDe(ctx, { tareaId });
  await ctx.db.tarea.deleteMany({ where: { id: tareaId } }); // los adjuntos se borran en cascada de la BD
  await borrarDelProveedor(archivos);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "tarea", entidadId: tareaId });
  return ok("Tarea eliminada.");
}

/** Cursos donde el usuario puede crear tareas (para el formulario). */
export async function cursosParaTareas(ctx: TenantContext) {
  requireFeature(ctx, "tareas");
  return cursosDelDocente(ctx);
}

/** Tareas de los cursos del docente (dirección: todas): próximas y las de la última semana. */
export async function tareasDelDocente(ctx: TenantContext) {
  requireFeature(ctx, "tareas");
  const cursos = await cursosDelDocente(ctx);
  const desde = inicioDiaLima(sumarDias(fechaLima(new Date()), -7));
  const tareas = await ctx.db.tarea.findMany({
    where: { cursoId: { in: cursos.map((c) => c.id) }, fechaEntrega: { gte: desde } },
    include: { adjuntos: { orderBy: { createdAt: "asc" } }, curso: { include: { salon: { select: { nombre: true } } } } },
    orderBy: { fechaEntrega: "asc" },
  });
  return tareas.map((t) => ({
    id: t.id, titulo: t.titulo, descripcion: t.descripcion, fechaEntrega: t.fechaEntrega, adjuntos: t.adjuntos.map(adjuntoVista),
    curso: t.curso.nombre, salon: t.curso.salon.nombre, vencida: grupoEntrega(t.fechaEntrega) === "vencida",
  }));
}

export type TareasDeHijo = Awaited<ReturnType<typeof tareasDeFamilia>>[number];

/** Tareas pendientes por hijo (o del propio alumno), agrupadas: Para mañana · Esta semana · Más adelante. */
export async function tareasDeFamilia(ctx: TenantContext, ahora: Date = new Date()) {
  requireFeature(ctx, "tareas");
  requireRol(ctx, ["apoderado", "alumno"]);
  const ids = await alumnoIdsVisibles(ctx);
  const hijos = await ctx.db.alumno.findMany({
    where: { id: { in: ids }, estado: "activo" },
    select: { id: true, nombres: true, apellidos: true, salonId: true },
    orderBy: { nombres: "asc" },
  });
  const salones = [...new Set(hijos.map((h) => h.salonId))];
  const tareas = await ctx.db.tarea.findMany({
    where: { curso: { salonId: { in: salones } }, fechaEntrega: { gte: inicioDiaLima(fechaLima(ahora)) } },
    include: { adjuntos: { orderBy: { createdAt: "asc" } }, curso: { select: { nombre: true, salonId: true } } },
    orderBy: { fechaEntrega: "asc" },
  });
  return hijos.map((h) => {
    const grupos: Record<Exclude<GrupoEntrega, "vencida">, { id: string; titulo: string; descripcion: string | null; curso: string; fechaEntrega: Date; adjuntos: AdjuntoVista[] }[]> = {
      manana: [], semana: [], despues: [],
    };
    for (const t of tareas.filter((x) => x.curso.salonId === h.salonId)) {
      const g = grupoEntrega(t.fechaEntrega, ahora);
      if (g === "vencida") continue;
      grupos[g].push({ id: t.id, titulo: t.titulo, descripcion: t.descripcion, curso: t.curso.nombre, fechaEntrega: t.fechaEntrega, adjuntos: t.adjuntos.map(adjuntoVista) });
    }
    return { alumno: { id: h.id, nombres: h.nombres, apellidos: h.apellidos }, grupos };
  });
}


const esquemaEdicionTarea = z.object({
  titulo: z.string().trim().min(3, "Escribe el título de la tarea.").max(150),
  descripcion: z.string().trim().max(1000).optional(),
  fechaEntrega: z.iso.date("Elige la fecha de entrega."),
});

/** El profesor edita una tarea de un curso que dicta (mismas reglas que borrar). Dirección solo consulta. */
export async function actualizarTarea(
  ctx: TenantContext,
  tareaId: string,
  entrada: unknown,
  adjuntos: { nuevos?: EntradaAdjunto[]; quitar?: string[] } = {},
): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  requireRol(ctx, ["profesor", "direccion"]);
  const d = esquemaEdicionTarea.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const t = await ctx.db.tarea.findFirst({ where: { id: tareaId } });
  if (!t) return fallo("No encontramos esa tarea.");
  await requireCursoDelProfesor(ctx, t.cursoId);
  // La fecha solo se valida si cambió: se puede corregir el texto de una tarea que ya venció.
  const cambioFecha = d.data.fechaEntrega !== fechaLima(t.fechaEntrega);
  if (cambioFecha && d.data.fechaEntrega < fechaLima(new Date())) return fallo("La fecha de entrega ya pasó.");
  const quitar = adjuntos.quitar ?? [];
  let validados;
  try {
    validados = validarAdjuntos(adjuntos.nuevos ?? [], await contarRestantes(ctx, { tareaId }, quitar));
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return fallo(e.message);
    throw e;
  }
  await quitarAdjuntos(ctx, { tareaId }, quitar);
  await guardarAdjuntos(ctx, { tareaId }, validados);
  await ctx.db.tarea.updateMany({
    where: { id: tareaId },
    data: {
      titulo: d.data.titulo,
      descripcion: d.data.descripcion || null,
      ...(cambioFecha ? { fechaEntrega: instanteLima(d.data.fechaEntrega, "08:00") } : {}),
    },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "tarea", entidadId: tareaId });
  return ok("Tarea actualizada.");
}
