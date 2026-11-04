import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import type { EstadoEntregaTarea, Prisma } from "@/generated/prisma/client";
import type { AdjuntoVista } from "@/lib/adjuntos";
import { grupoEntrega, type GrupoEntrega } from "@/lib/fechas";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { estaVencida, MAX_COMENTARIO_TAREA } from "@/lib/tareas";
import { adjuntoVista } from "../adjuntos";
import { auditar } from "../auditoria";
import { cursosDelDocente } from "../cursos";
import { requireFeature } from "../plan";
import { textoDeNota } from "../nsp";
import { alumnoIdsVisibles, requireRol, salonIdsVisibles, type TenantContext } from "../tenant";
import {
  asegurarAsignacionesDeAlumnos, limiteDe, puedeRevisarSeccion, requireAsignacionFamilia, requireTareaDocente, sincronizarAsignaciones, whereTareaVisible,
} from "./comun";

// Vistas del módulo de tareas (specs/39): listas y detalle para familia/alumno y docente, revisión, comentarios y la
// consulta que usa la agenda. Ningún alumno ve entregas, comentarios privados ni notas de otro.

const nombreDe = (p: { nombres: string; apellidos: string | null } | null | undefined) => (p ? `${p.nombres} ${p.apellidos ?? ""}`.trim() : null);

export type ItemTareaFamilia = {
  id: string; titulo: string; descripcion: string | null; curso: string; docente: string | null;
  fechaEntrega: Date | null; limite: Date | null; conHora: boolean; vencida: boolean;
  estado: EstadoEntregaTarea; tarde: boolean; cerrada: boolean; adjuntos: AdjuntoVista[];
};
export type TareasDeHijo = Awaited<ReturnType<typeof tareasDeFamilia>>[number];

/**
 * Tareas por hijo (o del propio alumno): las asignaciones vigentes de tareas visibles. `pendientes` agrupadas por fecha
 * (Para mañana · Esta semana · Más adelante · Sin fecha) y `historial` (entregadas, revisadas o vencidas).
 */
export async function tareasDeFamilia(ctx: TenantContext, ahora: Date = new Date()) {
  requireFeature(ctx, "tareas");
  requireRol(ctx, ["apoderado", "alumno"]);
  const ids = await alumnoIdsVisibles(ctx);
  const hijos = await ctx.db.alumno.findMany({
    where: { id: { in: ids }, estado: "activo" },
    select: { id: true, nombres: true, apellidos: true, salonId: true },
    orderBy: { nombres: "asc" },
  });
  await asegurarAsignacionesDeAlumnos(ctx.db, ctx.tenant.id, hijos, ahora);
  const asignaciones = await ctx.db.tareaAsignacion.findMany({
    where: { alumnoId: { in: hijos.map((h) => h.id) }, retiradaAt: null, tarea: whereTareaVisible(ahora) },
    include: {
      tareaCurso: { select: { fechaEntrega: true } },
      tarea: {
        include: {
          adjuntos: { orderBy: { createdAt: "asc" } },
          curso: { select: { nombre: true } },
          creadoPor: { select: { user: { select: { nombres: true, apellidos: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return hijos.map((h) => {
    const grupos: Record<Exclude<GrupoEntrega, "vencida"> | "sinFecha", ItemTareaFamilia[]> = { manana: [], semana: [], despues: [], sinFecha: [] };
    const historial: ItemTareaFamilia[] = [];
    for (const a of asignaciones.filter((x) => x.alumnoId === h.id)) {
      const t = a.tarea;
      const fecha = a.tareaCurso.fechaEntrega ?? t.fechaEntrega;
      const limite = limiteDe(t, a.tareaCurso, ctx.tenant.zonaHoraria);
      const item: ItemTareaFamilia = {
        id: t.id, titulo: t.titulo, descripcion: t.descripcion, curso: t.curso.nombre, docente: nombreDe(t.creadoPor.user),
        fechaEntrega: fecha, limite, conHora: t.conHora, vencida: estaVencida(limite, ahora), estado: a.estado, tarde: a.tarde,
        cerrada: t.estado === "cerrada", adjuntos: t.adjuntos.map(adjuntoVista),
      };
      const pendiente = a.estado === "asignada" || a.estado === "en_proceso" || a.estado === "devuelta";
      if (!pendiente || (item.vencida && a.estado !== "devuelta")) {
        historial.push(item);
        continue;
      }
      const g = fecha ? grupoEntrega(fecha, ahora) : "sinFecha";
      (g === "vencida" ? grupos.manana : grupos[g]).push(item);
    }
    for (const lista of Object.values(grupos)) lista.sort((x, y) => (x.limite?.getTime() ?? Infinity) - (y.limite?.getTime() ?? Infinity));
    return { alumno: { id: h.id, nombres: h.nombres, apellidos: h.apellidos }, grupos, historial };
  });
}

/** Detalle de una tarea para el alumno o su apoderado: materiales, su entrega, comentarios privados y nota publicada. */
export async function detalleTareaFamilia(ctx: TenantContext, tareaId: string, alumnoId: string, ahora = new Date()) {
  requireFeature(ctx, "tareas");
  const a = await requireAsignacionFamilia(ctx, tareaId, alumnoId, ahora);
  const t = a.tarea;
  const [adjuntos, enlaces, intentos, comentarios, alumno, docente] = await Promise.all([
    ctx.db.archivo.findMany({ where: { tareaId }, orderBy: { createdAt: "asc" } }),
    ctx.db.tareaEnlace.findMany({ where: { tareaId }, orderBy: { orden: "asc" } }),
    ctx.db.tareaEntrega.findMany({ where: { asignacionId: a.id }, orderBy: { numero: "asc" }, include: { archivos: { orderBy: { createdAt: "asc" } } } }),
    ctx.db.tareaComentario.findMany({
      where: { tareaId, ocultoAt: null, OR: [{ asignacionId: a.id }, ...(t.comentariosGenerales ? [{ asignacionId: null }] : [])] },
      orderBy: { createdAt: "asc" },
      include: { autor: { select: { rol: true, user: { select: { nombres: true, apellidos: true } } } } },
    }),
    ctx.db.alumno.findFirst({ where: { id: alumnoId }, select: { nombres: true, apellidos: true } }),
    ctx.db.membership.findFirst({ where: { id: t.creadoPorId }, select: { user: { select: { nombres: true, apellidos: true } } } }),
  ]);
  // Calificación: solo si la evaluación de la sección ya se publicó (flujo de Notas, specs/11).
  let calificacion: string | null = null;
  if (a.tareaCurso.evaluacionGrupoId) {
    const nota = await ctx.db.nota.findFirst({
      where: { alumnoId, evaluacion: { grupoId: a.tareaCurso.evaluacionGrupoId, tareaId, estado: "publicada" } },
    });
    calificacion = textoDeNota(nota);
  }
  const limite = limiteDe(t, a.tareaCurso, ctx.tenant.zonaHoraria);
  const borrador = intentos.at(-1)?.borrador ? intentos.at(-1)! : null;
  return {
    tarea: {
      id: t.id, titulo: t.titulo, descripcion: t.descripcion, indicacionesEntrega: t.indicacionesEntrega, curso: a.tareaCurso.curso.nombre,
      docente: nombreDe(docente?.user), estado: t.estado, permiteTardias: t.permiteTardias, comentariosGenerales: t.comentariosGenerales,
      fechaEntrega: a.tareaCurso.fechaEntrega ?? t.fechaEntrega, conHora: t.conHora, limite, vencida: estaVencida(limite, ahora),
      adjuntos: adjuntos.map(adjuntoVista), enlaces: enlaces.map((e) => ({ id: e.id, url: e.url, titulo: e.titulo })),
    },
    alumno: { id: alumnoId, nombre: nombreDe(alumno) ?? "" },
    asignacion: { estado: a.estado, tarde: a.tarde, entregadaAt: a.entregadaAt, enFisico: a.enFisico, devueltaAt: a.devueltaAt },
    borrador: borrador ? { texto: borrador.texto, archivos: borrador.archivos.map(adjuntoVista) } : null,
    intentos: intentos.filter((i) => !i.borrador).map((i) => ({ numero: i.numero, texto: i.texto, enviadaAt: i.enviadaAt, tarde: i.tarde, archivos: i.archivos.map(adjuntoVista) })),
    comentarios: comentarios.map((c) => ({ id: c.id, texto: c.texto, privado: c.asignacionId !== null, createdAt: c.createdAt, autor: nombreDe(c.autor.user) ?? "", esDocente: c.autor.rol === "profesor" || c.autor.rol === "direccion", propio: c.autorId === ctx.membership.id })),
    calificacion,
  };
}

/** Hijos (o el propio alumno) que tienen asignada la tarea: para elegir de quién ver el detalle. */
export async function alumnosConTarea(ctx: TenantContext, tareaId: string, ahora = new Date()) {
  requireRol(ctx, ["apoderado", "alumno"]);
  const ids = await alumnoIdsVisibles(ctx);
  const filas = await ctx.db.tareaAsignacion.findMany({
    where: { tareaId, alumnoId: { in: ids }, retiradaAt: null, tarea: whereTareaVisible(ahora) },
    select: { alumno: { select: { id: true, nombres: true, apellidos: true } } },
  });
  return filas.map((f) => f.alumno);
}

const FILTRO_ESTADO = z.enum(["borrador", "publicada", "cerrada", "archivada", "programada"]).optional().catch(undefined);

/** Tareas del docente (las que creó o de sus cursos) o de todo el colegio (dirección), con contadores de entrega. */
export async function tareasDelDocente(ctx: TenantContext, filtros: { cursoId?: string; estado?: string } = {}, ahora = new Date()) {
  requireFeature(ctx, "tareas");
  const cursos = await cursosDelDocente(ctx);
  const estado = FILTRO_ESTADO.parse(filtros.estado);
  const cursoIds = cursos.map((c) => c.id).filter((id) => !filtros.cursoId || id === filtros.cursoId);
  const where: Prisma.TareaWhereInput = {
    AND: [
      ctx.rol === "direccion" ? { cursos: { some: { cursoId: { in: cursoIds } } } } : { OR: [{ creadoPorId: ctx.membership.id }, { cursos: { some: { cursoId: { in: cursoIds } } } }] },
      filtros.cursoId ? { cursos: { some: { cursoId: filtros.cursoId } } } : {},
      estado === "programada"
        ? { estado: "publicada", publicarEn: { gt: ahora } }
        : estado ? { estado } : { estado: { not: "archivada" } },
    ],
  };
  const tareas = await ctx.db.tarea.findMany({
    where,
    include: {
      adjuntos: { orderBy: { createdAt: "asc" } },
      curso: { include: { salon: { select: { nombre: true } } } },
      cursos: { include: { curso: { select: { salon: { select: { nombre: true } } } } } },
      enlaces: { orderBy: { orden: "asc" } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 100,
  });
  const conteos = await ctx.db.tareaAsignacion.groupBy({
    by: ["tareaId", "estado", "tarde"],
    where: { tareaId: { in: tareas.map((t) => t.id) }, retiradaAt: null },
    _count: { _all: true },
  });
  return tareas.map((t) => {
    const mios = conteos.filter((c) => c.tareaId === t.id);
    const suma = (f: (c: (typeof mios)[number]) => boolean) => mios.filter(f).reduce((n, c) => n + c._count._all, 0);
    const limite = limiteDe(t, null, ctx.tenant.zonaHoraria);
    return {
      id: t.id, titulo: t.titulo, descripcion: t.descripcion, indicacionesEntrega: t.indicacionesEntrega, fechaEntrega: t.fechaEntrega, conHora: t.conHora,
      limite, vencida: estaVencida(limite, ahora), estado: t.estado, programada: t.estado === "publicada" && !!t.publicarEn && t.publicarEn > ahora, publicarEn: t.publicarEn,
      permiteTardias: t.permiteTardias, comentariosGenerales: t.comentariosGenerales, calificable: t.calificable,
      adjuntos: t.adjuntos.map(adjuntoVista), enlaces: t.enlaces.map((e) => ({ url: e.url, titulo: e.titulo })),
      curso: t.curso.nombre, salon: t.curso.salon.nombre, secciones: t.cursos.map((s) => s.curso.salon.nombre),
      esAutor: ctx.rol === "profesor" && t.creadoPorId === ctx.membership.id,
      contadores: {
        asignados: suma(() => true),
        entregaron: suma((c) => c.estado === "entregada" || c.estado === "revisada"),
        tarde: suma((c) => c.tarde && (c.estado === "entregada" || c.estado === "revisada")),
        pendientes: suma((c) => c.estado === "asignada" || c.estado === "en_proceso"),
        devueltas: suma((c) => c.estado === "devuelta"),
        revisadas: suma((c) => c.estado === "revisada"),
      },
    };
  });
}

/**
 * Revisión de entregas (`/tareas/[id]/revision`): profesor del curso de cada sección (o autor) y dirección. Por sección:
 * contadores y una fila por estudiante con estado, intentos y archivos, observaciones privadas y nota (si es calificable).
 */
export async function revisionDeTarea(ctx: TenantContext, tareaId: string, filtros: { cursoId?: string; estado?: string; q?: string } = {}, ahora = new Date()) {
  requireFeature(ctx, "tareas");
  const { tarea, secciones } = await requireTareaDocente(ctx, tareaId);
  if (tarea.estado !== "borrador" && !ctx.soporte) await sincronizarAsignaciones(ctx.db, ctx.tenant.id, tareaId);
  const visibles = secciones.filter((s) => !filtros.cursoId || s.cursoId === filtros.cursoId);
  const q = filtros.q?.trim().toLocaleLowerCase("es");
  const [asignaciones, adjuntos, enlaces, evaluaciones] = await Promise.all([
    ctx.db.tareaAsignacion.findMany({
      where: { tareaId, tareaCursoId: { in: visibles.map((s) => s.id) } },
      include: {
        alumno: { select: { id: true, nombres: true, apellidos: true } },
        entregas: { where: { borrador: false }, orderBy: { numero: "asc" }, include: { archivos: { orderBy: { createdAt: "asc" } } } },
        comentarios: { orderBy: { createdAt: "asc" }, include: { autor: { select: { rol: true, user: { select: { nombres: true, apellidos: true } } } } } },
      },
      orderBy: [{ alumno: { apellidos: "asc" } }, { alumno: { nombres: "asc" } }],
    }),
    ctx.db.archivo.findMany({ where: { tareaId }, orderBy: { createdAt: "asc" } }),
    ctx.db.tareaEnlace.findMany({ where: { tareaId }, orderBy: { orden: "asc" } }),
    ctx.db.evaluacion.findMany({ where: { tareaId }, select: { id: true, grupoId: true, estado: true, notas: true } }),
  ]);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "tarea_entregas", entidadId: tareaId });
  return {
    tarea: {
      id: tarea.id, titulo: tarea.titulo, descripcion: tarea.descripcion, estado: tarea.estado, calificable: tarea.calificable,
      fechaEntrega: tarea.fechaEntrega, conHora: tarea.conHora, permiteTardias: tarea.permiteTardias,
      esAutor: ctx.rol === "profesor" && tarea.creadoPorId === ctx.membership.id,
      adjuntos: adjuntos.map(adjuntoVista), enlaces: enlaces.map((e) => ({ url: e.url, titulo: e.titulo })),
    },
    secciones: visibles.map((s) => {
      const ev = evaluaciones.find((e) => e.grupoId === s.evaluacionGrupoId);
      const todas = asignaciones.filter((a) => a.tareaCursoId === s.id);
      const vigentes = todas.filter((a) => !a.retiradaAt);
      const cuenta = (f: (a: (typeof todas)[number]) => boolean) => vigentes.filter(f).length;
      const filas = todas
        .filter((a) => !filtros.estado || a.estado === filtros.estado)
        .filter((a) => !q || `${a.alumno.nombres} ${a.alumno.apellidos}`.toLocaleLowerCase("es").includes(q))
        .map((a) => ({
          asignacionId: a.id, alumno: { id: a.alumno.id, nombre: `${a.alumno.apellidos}, ${a.alumno.nombres}` },
          estado: a.estado, tarde: a.tarde, entregadaAt: a.entregadaAt, enFisico: a.enFisico, retirada: !!a.retiradaAt,
          intentos: a.entregas.map((i) => ({ numero: i.numero, texto: i.texto, enviadaAt: i.enviadaAt, tarde: i.tarde, archivos: i.archivos.map(adjuntoVista) })),
          comentarios: a.comentarios.map((c) => ({ id: c.id, texto: c.texto, oculto: !!c.ocultoAt, createdAt: c.createdAt, autor: nombreDe(c.autor.user) ?? "", esDocente: c.autor.rol === "profesor" || c.autor.rol === "direccion" })),
          nota: ev ? textoDeNota(ev.notas.find((n) => n.alumnoId === a.alumnoId) ?? null) : null,
        }));
      return {
        id: s.id, cursoId: s.cursoId, curso: s.curso.nombre, salon: s.curso.salon.nombre, todos: s.todos,
        limite: limiteDe(tarea, s, ctx.tenant.zonaHoraria), fechaPropia: s.fechaEntrega,
        evaluacion: ev ? { id: ev.id, grupoId: ev.grupoId, publicada: ev.estado === "publicada" } : null,
        contadores: {
          asignados: vigentes.length,
          entregaron: cuenta((a) => a.estado === "entregada" || a.estado === "revisada"),
          tarde: cuenta((a) => a.tarde && (a.estado === "entregada" || a.estado === "revisada")),
          pendientes: cuenta((a) => a.estado === "asignada" || a.estado === "en_proceso"),
          devueltas: cuenta((a) => a.estado === "devuelta"),
          revisadas: cuenta((a) => a.estado === "revisada"),
        },
        filas,
      };
    }),
    vencida: estaVencida(limiteDe(tarea, null, ctx.tenant.zonaHoraria), ahora),
  };
}

const esquemaComentario = z.object({
  texto: z.string().trim().min(1, "Escribe tu comentario.").max(MAX_COMENTARIO_TAREA, `El comentario es muy largo (máximo ${MAX_COMENTARIO_TAREA} caracteres).`),
  /** Familia/alumno: de qué alumno (comentario privado de su asignación). */
  alumnoId: z.uuid().optional(),
  /** Docente: asignación del comentario privado. */
  asignacionId: z.uuid().optional(),
  /** Comentario general de la tarea (solo si la tarea lo permite). */
  general: z.boolean().optional(),
});

/** Comentario privado (docente ↔ alumno/familia) o general (si la tarea lo permite). */
export async function comentarTarea(ctx: TenantContext, tareaId: string, entrada: unknown, ahora = new Date()): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  const d = esquemaComentario.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  let asignacionId: string | null = null;
  if (ctx.rol === "alumno" || ctx.rol === "apoderado") {
    if (!d.data.alumnoId) return fallo("Elige de quién es el comentario.");
    const a = await requireAsignacionFamilia(ctx, tareaId, d.data.alumnoId, ahora);
    if (d.data.general) {
      if (!a.tarea.comentariosGenerales) return fallo("Esta tarea no tiene comentarios generales.");
    } else asignacionId = a.id;
  } else {
    const { tarea } = await requireTareaDocente(ctx, tareaId);
    if (d.data.general) {
      if (!tarea.comentariosGenerales) return fallo("Esta tarea no tiene comentarios generales.");
    } else {
      const a = await ctx.db.tareaAsignacion.findFirst({ where: { id: d.data.asignacionId ?? "", tareaId }, include: { tareaCurso: { include: { curso: { select: { profesorId: true } } } } } });
      if (!a || !puedeRevisarSeccion(ctx, tarea, a.tareaCurso.curso)) forbidden();
      asignacionId = a.id;
    }
  }
  await ctx.db.tareaComentario.create({ data: { tenantId: ctx.tenant.id, tareaId, asignacionId, autorId: ctx.membership.id, texto: d.data.texto } });
  return ok("Comentario enviado.");
}

/** El docente oculta (modera) un comentario de su tarea. Queda registrado quién y cuándo. */
export async function ocultarComentario(ctx: TenantContext, comentarioId: string, ahora = new Date()): Promise<Resultado> {
  requireFeature(ctx, "tareas");
  const c = await ctx.db.tareaComentario.findFirst({ where: { id: comentarioId } });
  if (!c) return fallo("No encontramos ese comentario.");
  await requireTareaDocente(ctx, c.tareaId);
  await ctx.db.tareaComentario.updateMany({ where: { id: c.id }, data: { ocultoAt: ahora, ocultoPorId: ctx.membership.id } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "tarea_comentario_oculto", entidadId: c.id });
  return ok("Comentario ocultado.");
}

/** Comentarios generales visibles (no ocultos) de una tarea, para la vista docente. */
export async function comentariosGenerales(ctx: TenantContext, tareaId: string) {
  await requireTareaDocente(ctx, tareaId);
  const filas = await ctx.db.tareaComentario.findMany({
    where: { tareaId, asignacionId: null },
    orderBy: { createdAt: "asc" },
    include: { autor: { select: { user: { select: { nombres: true, apellidos: true } } } } },
  });
  return filas.map((c) => ({ id: c.id, texto: c.texto, oculto: !!c.ocultoAt, autor: nombreDe(c.autor.user) ?? "", createdAt: c.createdAt }));
}

export type EntregaAgenda = {
  id: string; titulo: string; descripcion: string | null; inicio: Date; curso: string; salon: string; salonId: string; adjuntos: AdjuntoVista[];
};

/**
 * Entregas de tareas para la agenda (specs/12): solo tareas publicadas y visibles (ya llegó su `publicar_en`) con fecha
 * límite en el rango. Familia/alumno: por sus asignaciones vigentes; personal: por las secciones de sus salones. Sin
 * fecha límite → no aparece. Fechas propias por sección incluidas (un ítem por sección y fecha, sin duplicados).
 */
export async function tareasVisiblesParaAgenda(ctx: TenantContext, desde: Date, hasta: Date, ahora = new Date()): Promise<EntregaAgenda[]> {
  const familia = ctx.rol === "apoderado" || ctx.rol === "alumno";
  const filtroSeccion: Prisma.TareaCursoWhereInput = familia
    ? { asignaciones: { some: { alumnoId: { in: await alumnoIdsVisibles(ctx) }, retiradaAt: null } } }
    : { curso: { salonId: { in: await salonIdsVisibles(ctx) } } };
  const secciones = await ctx.db.tareaCurso.findMany({
    where: {
      AND: [
        filtroSeccion,
        { tarea: whereTareaVisible(ahora) },
        { OR: [{ fechaEntrega: { gte: desde, lt: hasta } }, { fechaEntrega: null, tarea: { fechaEntrega: { gte: desde, lt: hasta } } }] },
      ],
    },
    include: {
      curso: { select: { nombre: true, salonId: true, salon: { select: { nombre: true } } } },
      tarea: { include: { adjuntos: { orderBy: { createdAt: "asc" } } } },
    },
  });
  const vistos = new Set<string>();
  const salida: EntregaAgenda[] = [];
  for (const s of secciones) {
    const inicio = s.fechaEntrega ?? s.tarea.fechaEntrega!;
    const clave = `${s.tareaId}:${inicio.getTime()}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push({
      id: secciones.filter((x) => x.tareaId === s.tareaId).length === 1 ? s.tareaId : `${s.tareaId}:${s.id}`,
      titulo: s.tarea.titulo, descripcion: s.tarea.descripcion, inicio, curso: s.curso.nombre, salon: s.curso.salon.nombre, salonId: s.curso.salonId,
      adjuntos: s.tarea.adjuntos.map(adjuntoVista),
    });
  }
  return salida;
}
