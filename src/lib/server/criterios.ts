import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import type { Instrumento } from "@/lib/calificaciones";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { auditar } from "./auditoria";
import { desempenosParaEvaluar, validarDesempenosEvaluacion } from "./cneb";
import { cursoEscritura, cursoLectura, periodoAbierto } from "./notas";
import type { TenantContext } from "./tenant";

// Instrumentos de evaluación con criterios (specs/11): rúbricas (criterio con puntaje de 0 a N) y listas de cotejo
// (criterio cumple / no cumple). Los resultados se guardan tal cual: Khipu NO los convierte en AD/A/B/C ni en una nota;
// la calificación de la competencia la pone el profesor en el registro auxiliar (la conversión no está validada).

export const MAX_CRITERIOS = 30;

const num = (d: { toString(): string } | null): number | null => (d === null ? null : Number(d.toString()));

async function evaluacionDe(ctx: TenantContext, evaluacionId: string) {
  const e = await ctx.db.evaluacion.findFirst({
    where: { id: evaluacionId },
    include: { curso: { select: { id: true, nombre: true, salonId: true, salon: { select: { nombre: true } } } }, competencia: { select: { id: true, nombre: true } } },
  });
  if (!e) forbidden();
  return e;
}

/** Criterios de una columna (evaluación + competencia), los alumnos y sus resultados. Profesor del curso o dirección. */
export async function criteriosDeEvaluacion(ctx: TenantContext, evaluacionId: string) {
  const e = await evaluacionDe(ctx, evaluacionId);
  await cursoLectura(ctx, e.cursoId);
  const [criterios, alumnos, p, opciones] = await Promise.all([
    ctx.db.criterioEvaluacion.findMany({
      where: { evaluacionId },
      orderBy: [{ orden: "asc" }, { descripcion: "asc" }],
      include: { desempeno: { select: { codigo: true, descripcion: true } }, resultados: true },
    }),
    ctx.db.alumno.findMany({
      where: { salonId: e.curso.salonId, estado: "activo" },
      select: { id: true, nombres: true, apellidos: true },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    periodoAbierto(ctx, e.periodoId, e.cursoId),
    desempenosParaEvaluar(ctx, e.cursoId),
  ]);
  return {
    evaluacion: {
      id: e.id, titulo: e.titulo, fecha: e.fecha.toISOString().slice(0, 10), instrumento: e.instrumento as Instrumento | null,
      curso: e.curso.nombre, salon: e.curso.salon.nombre, cursoId: e.cursoId, periodoId: e.periodoId, competencia: e.competencia,
    },
    criterios: criterios.map((c) => ({
      id: c.id, descripcion: c.descripcion, escala: c.escala, puntajeMaximo: c.puntajeMaximo,
      desempeno: c.desempeno ? `${c.desempeno.codigo ? `${c.desempeno.codigo} · ` : ""}${c.desempeno.descripcion}` : null,
    })),
    resultados: criterios.flatMap((c) => c.resultados.map((r) => ({ criterioId: c.id, alumnoId: r.alumnoId, puntaje: num(r.puntaje), cumple: r.cumple }))),
    alumnos,
    /** Desempeños del grado de la competencia de esta columna, para vincular criterios. */
    desempenos: e.competenciaId ? (opciones.porCompetencia[e.competenciaId] ?? []) : [],
    editable: ctx.rol === "profesor" && !p.error,
    motivoBloqueo: ctx.rol !== "profesor" ? "Solo el profesor del curso registra los criterios." : (p.error ?? null),
  };
}

const esquemaCriterio = z
  .object({
    evaluacionId: z.uuid(),
    descripcion: z.string().trim().min(3, "Describe el criterio.").max(300, "El criterio es muy largo (máximo 300 caracteres)."),
    escala: z.enum(["puntaje", "cumple"], "Elige la escala del criterio."),
    puntajeMaximo: z.coerce.number().int("El puntaje máximo debe ser un número entero.").min(1, "El puntaje máximo va de 1 a 100.").max(100, "El puntaje máximo va de 1 a 100.").optional(),
    desempenoId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  })
  .refine((d) => d.escala === "cumple" || d.puntajeMaximo !== undefined, { message: "Indica el puntaje máximo del criterio.", path: ["puntajeMaximo"] });

export async function crearCriterio(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  const d = esquemaCriterio.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const e = await evaluacionDe(ctx, d.data.evaluacionId);
  await cursoEscritura(ctx, e.cursoId);
  const p = await periodoAbierto(ctx, e.periodoId, e.cursoId);
  if (p.error) return fallo(p.error);
  if (d.data.desempenoId) {
    const error = await validarDesempenosEvaluacion(ctx, e.cursoId, e.competenciaId, [d.data.desempenoId]);
    if (error) return fallo(error);
  }
  const cantidad = await ctx.db.criterioEvaluacion.count({ where: { evaluacionId: e.id } });
  if (cantidad >= MAX_CRITERIOS) return fallo(`Una evaluación admite como máximo ${MAX_CRITERIOS} criterios.`);
  const c = await ctx.db.criterioEvaluacion.create({
    data: {
      tenantId: ctx.tenant.id, evaluacionId: e.id, descripcion: d.data.descripcion, escala: d.data.escala,
      puntajeMaximo: d.data.escala === "puntaje" ? d.data.puntajeMaximo! : null, desempenoId: d.data.desempenoId ?? null, orden: cantidad,
    },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "criterio_evaluacion", entidadId: c.id, detalle: { evaluacionId: e.id } });
  return ok("Criterio agregado.");
}

export async function eliminarCriterio(ctx: TenantContext, criterioId: string): Promise<Resultado> {
  const c = await ctx.db.criterioEvaluacion.findFirst({ where: { id: criterioId }, include: { evaluacion: { select: { cursoId: true, periodoId: true } } } });
  if (!c) return fallo("No encontramos ese criterio.");
  await cursoEscritura(ctx, c.evaluacion.cursoId);
  const p = await periodoAbierto(ctx, c.evaluacion.periodoId, c.evaluacion.cursoId);
  if (p.error) return fallo(p.error);
  await ctx.db.criterioEvaluacion.deleteMany({ where: { id: c.id } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "criterio_evaluacion", entidadId: c.id });
  return ok("Criterio eliminado con sus resultados.");
}

/**
 * Resultado de un alumno en un criterio. Puntaje: número de 0 al máximo (hasta 2 decimales, punto o coma). Cumple: «si» o
 * «no». Vacío borra el resultado. Se guarda tal cual, sin convertirlo en nota.
 */
export async function guardarResultadoCriterio(ctx: TenantContext, entrada: { criterioId: string; alumnoId: string; valor: string }): Promise<Resultado> {
  const d = z.object({ criterioId: z.uuid(), alumnoId: z.uuid(), valor: z.string().trim().max(10) }).safeParse(entrada);
  if (!d.success) return fallo("Los datos no son válidos.");
  const c = await ctx.db.criterioEvaluacion.findFirst({ where: { id: d.data.criterioId }, include: { evaluacion: { select: { cursoId: true, periodoId: true } } } });
  if (!c) return fallo("No encontramos ese criterio.");
  const curso = await cursoEscritura(ctx, c.evaluacion.cursoId);
  const p = await periodoAbierto(ctx, c.evaluacion.periodoId, c.evaluacion.cursoId);
  if (p.error) return fallo(p.error);
  const alumno = await ctx.db.alumno.findFirst({ where: { id: d.data.alumnoId, salonId: curso.salonId, estado: "activo" } });
  if (!alumno) return fallo("Ese alumno no está en este curso.");
  const clave = { criterioId: c.id, alumnoId: alumno.id };
  if (d.data.valor === "") {
    await ctx.db.resultadoCriterio.deleteMany({ where: clave });
    return ok();
  }
  let valor: { puntaje: number | null; cumple: boolean | null };
  if (c.escala === "cumple") {
    if (d.data.valor !== "si" && d.data.valor !== "no") return fallo("Elige «Cumple» o «No cumple».");
    valor = { puntaje: null, cumple: d.data.valor === "si" };
  } else {
    const n = Number(d.data.valor.replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > (c.puntajeMaximo ?? 0)) return fallo(`Escribe un puntaje de 0 a ${c.puntajeMaximo}.`);
    valor = { puntaje: Math.round(n * 100) / 100, cumple: null };
  }
  await ctx.db.resultadoCriterio.upsert({
    where: { criterioId_alumnoId: clave },
    create: { tenantId: ctx.tenant.id, ...clave, ...valor, registradoPorId: ctx.membership.id },
    update: { ...valor, registradoPorId: ctx.membership.id },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "resultado_criterio", entidadId: c.id, detalle: { alumnoId: alumno.id } });
  return ok();
}
