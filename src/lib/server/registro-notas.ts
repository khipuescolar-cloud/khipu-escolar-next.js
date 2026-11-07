import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import { interpretarEntradaNota } from "@/lib/calificaciones";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { auditar } from "./auditoria";
import { cursoEscritura, cursoLectura, listarPeriodos, periodoAbierto, periodoEnCurso } from "./notas";
import { requireFeature } from "./plan";
import { type TenantContext } from "./tenant";

const seleccionCurso = { id: true, nombre: true, profesorId: true, salon: { select: { id: true, nombre: true, nivel: true, grado: true, seccion: true, anio: true, tutorId: true, alumnos: { where: { estado: "activo" as const }, select: { id: true } } } } };
const ordenCursos = [{ salon: { grado: "asc" as const } }, { salon: { nombre: "asc" as const } }, { nombre: "asc" as const }];

/** Año académico vigente: el del periodo en curso del colegio; sin periodos, el más reciente entre sus salones activos. */
export async function anioAcademicoVigente(ctx: TenantContext): Promise<number> {
  const periodo = periodoEnCurso(await listarPeriodos(ctx));
  if (periodo) return periodo.anio;
  const reciente = await ctx.db.salon.aggregate({ where: { archivadoAt: null }, _max: { anio: true } });
  return reciente._max.anio ?? new Date().getFullYear();
}

/**
 * Cursos del registro. `propios`: los que el profesor dicta (dirección: todos).
 * `tutoria`: los demás cursos del salón que tutora, de solo lectura (cursoLectura ya lo permite).
 */
export async function cursosDelRegistro(ctx: TenantContext) {
  requireFeature(ctx, "notas");
  if (ctx.rol !== "profesor" && ctx.rol !== "direccion") forbidden();
  const anio = await anioAcademicoVigente(ctx);
  const salon = { archivadoAt: null, anio };
  if (ctx.rol === "direccion") return { anio, propios: await ctx.db.curso.findMany({ where: { salon }, select: seleccionCurso, orderBy: ordenCursos }), tutoria: [] };
  const [propios, tutoria] = await Promise.all([
    ctx.db.curso.findMany({ where: { salon, profesorId: ctx.membership.id }, select: seleccionCurso, orderBy: ordenCursos }),
    ctx.db.curso.findMany({ where: { salon: { ...salon, tutorId: ctx.membership.id }, NOT: { profesorId: ctx.membership.id } }, select: seleccionCurso, orderBy: ordenCursos }),
  ]);
  return { anio, propios, tutoria };
}

/**
 * Competencias activas del curso para el registro. No se usa `competenciasDelCurso` (curriculo.ts): exige que el
 * profesor dicte el curso, y el tutor del salón también lee este registro en modo solo lectura.
 */
export async function competenciasActivasDelCurso(ctx: TenantContext, cursoId: string) {
  return ctx.db.competencia.findMany({ where: { cursoId, desactivadaAt: null }, select: { id: true, nombre: true, orden: true }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] });
}

export async function registroDelCurso(ctx: TenantContext, cursoId: string, periodoId?: string) {
  await cursoLectura(ctx, cursoId);
  const curso = await ctx.db.curso.findFirst({ where: { id: cursoId }, select: { id: true, nombre: true, profesorId: true, salon: { select: { id: true, nombre: true, nivel: true, anio: true } } } });
  if (!curso) forbidden();
  const [periodos, alumnos, competencias] = await Promise.all([
    listarPeriodos(ctx, curso.salon.nivel),
    ctx.db.alumno.findMany({ where: { salonId: curso.salon.id, estado: "activo" }, select: { id: true, nombres: true, apellidos: true }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }] }),
    competenciasActivasDelCurso(ctx, cursoId),
  ]);
  const periodo = periodos.find((p) => p.id === periodoId) ?? periodoEnCurso(periodos);
  const evaluaciones = periodo ? await ctx.db.evaluacion.findMany({
    where: { cursoId, periodoId: periodo.id },
    include: { competencia: { select: { id: true, nombre: true } }, creadaPor: { select: { user: { select: { nombres: true, apellidos: true } } } }, notas: { select: { alumnoId: true, valorLiteral: true, valorNumerico: true, marca: true, updatedAt: true } } },
    orderBy: [{ fecha: "asc" }, { creadaAt: "asc" }],
  }) : [];
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "registro_notas", entidadId: cursoId, detalle: { periodoId: periodo?.id ?? null } });
  return { curso, periodos, periodo, alumnos, competencias, evaluaciones: evaluaciones.map((e) => ({ ...e, peso: Number(e.peso), notas: e.notas.map((n) => ({ ...n, valorNumerico: n.valorNumerico === null ? null : Number(n.valorNumerico) })) })), escala: ctx.tenant.escalaCalificacion, soloLectura: ctx.rol === "profesor" && curso.profesorId !== ctx.membership.id, puedeEditar: ctx.rol === "profesor" && curso.profesorId === ctx.membership.id && !!periodo && !periodo.cerrado };
}

const esquema = z.object({
  cursoId: z.uuid(), periodoId: z.uuid(), competenciaId: z.uuid(), claveIdempotencia: z.uuid(),
  nombre: z.string().trim().min(2).max(120), descripcion: z.string().trim().max(500).optional(),
  fecha: z.iso.date(), notas: z.array(z.object({ alumnoId: z.uuid(), valor: z.string().max(10) })).max(500),
});

export async function crearCalificacion(ctx: TenantContext, entrada: unknown): Promise<Resultado & { evaluacionId?: string }> {
  const d = esquema.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const x = d.data;
  const existente = await ctx.db.evaluacion.findFirst({ where: { claveIdempotencia: x.claveIdempotencia }, select: { id: true, cursoId: true } });
  if (existente) { await cursoEscritura(ctx, existente.cursoId); return { ok: true, evaluacionId: existente.id }; }
  const curso = await cursoEscritura(ctx, x.cursoId);
  if (curso.profesorId !== ctx.membership.id) return fallo("Solo quien dicta el curso registra calificaciones aquí; el tutor del salón consulta en solo lectura.");
  const abierto = await periodoAbierto(ctx, x.periodoId, x.cursoId);
  if (abierto.error) return fallo(abierto.error);
  const periodo = abierto.periodo;
  if (!periodo) return fallo("No encontramos ese periodo.");
  const fecha = new Date(`${x.fecha}T00:00:00.000Z`);
  if (fecha < periodo.inicio || fecha > periodo.fin) return fallo("La fecha de la actividad debe estar dentro del periodo elegido.");
  const competencia = await ctx.db.competencia.findFirst({ where: { id: x.competenciaId, cursoId: x.cursoId, desactivadaAt: null }, select: { id: true } });
  if (!competencia) return fallo("Elige una competencia activa de este curso.");
  const ids = x.notas.map((n) => n.alumnoId);
  if (new Set(ids).size !== ids.length) return fallo("Hay alumnos repetidos.");
  const cantidad = await ctx.db.alumno.count({ where: { id: { in: ids }, salonId: curso.salonId, estado: "activo" } });
  if (cantidad !== ids.length) return fallo("Hay alumnos que no pertenecen a este curso.");
  const notas: { alumnoId: string; valorLiteral: "AD" | "A" | "B" | "C" | null; valorNumerico: number | null; marca: "no_entrego" | "nsp" | null; texto: string }[] = [];
  for (const n of x.notas) {
    const valor = interpretarEntradaNota(ctx.tenant.escalaCalificacion, n.valor);
    if (!valor.ok) return fallo(valor.error);
    if (valor.valor || valor.marca) notas.push({ alumnoId: n.alumnoId, valorLiteral: valor.valor?.valorLiteral ?? null, valorNumerico: valor.valor?.valorNumerico ?? null, marca: valor.marca, texto: n.valor.trim().toUpperCase() });
  }
  try {
    const id = await ctx.db.$transaction(async (tx) => {
      const evaluacion = await tx.evaluacion.create({ data: { tenantId: ctx.tenant.id, cursoId: x.cursoId, periodoId: x.periodoId, competenciaId: x.competenciaId, titulo: x.nombre, descripcion: x.descripcion || null, fecha, creadaPorId: ctx.membership.id, claveIdempotencia: x.claveIdempotencia, estado: "programada" } });
      if (notas.length) {
        await tx.nota.createMany({ data: notas.map((n) => ({ tenantId: ctx.tenant.id, evaluacionId: evaluacion.id, alumnoId: n.alumnoId, valorLiteral: n.valorLiteral, valorNumerico: n.valorNumerico, marca: n.marca, registradoPorId: ctx.membership.id })) });
        await tx.historialNota.createMany({ data: notas.map((n) => ({ tenantId: ctx.tenant.id, evaluacionId: evaluacion.id, alumnoId: n.alumnoId, valorNuevo: n.texto, cambiadoPorId: ctx.membership.id, tipo: "registro" as const })) });
      }
      await tx.auditoria.create({ data: { tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "evaluacion", entidadId: evaluacion.id, detalle: { alumnos: notas.length } } });
      return evaluacion.id;
    });
    return { ...ok("Calificación guardada."), evaluacionId: id };
  } catch (error) {
    const retry = await ctx.db.evaluacion.findFirst({ where: { claveIdempotencia: x.claveIdempotencia, cursoId: x.cursoId }, select: { id: true } });
    if (retry) return { ok: true, evaluacionId: retry.id };
    throw error;
  }
}

export async function asignarCompetenciaTareaAntigua(ctx: TenantContext, evaluacionId: string, competenciaId: string): Promise<Resultado> {
  const evaluacion = await ctx.db.evaluacion.findFirst({ where: { id: evaluacionId }, select: { cursoId: true, tareaId: true, competenciaId: true } });
  if (!evaluacion?.tareaId || evaluacion.competenciaId) return fallo("Esta tarea ya tiene competencia o no existe.");
  await cursoEscritura(ctx, evaluacion.cursoId);
  const valida = await ctx.db.competencia.count({ where: { id: competenciaId, cursoId: evaluacion.cursoId, desactivadaAt: null } });
  if (!valida) return fallo("Elige una competencia activa de este curso.");
  await ctx.db.evaluacion.updateMany({ where: { id: evaluacionId, competenciaId: null }, data: { competenciaId } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "evaluacion", entidadId: evaluacionId, detalle: { competenciaId } });
  return ok("Competencia asignada.");
}
