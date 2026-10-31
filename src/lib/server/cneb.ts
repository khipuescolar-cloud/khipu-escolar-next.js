import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import type { Nivel } from "@/generated/prisma/enums";
import {
  areaPorClave, areasDelNivel, detectarArea, gradoValido, mensajeImportacion, planearImportacion, plantillaCneb, reordenar, textoGrado,
  GRADOS_POR_NIVEL, ETIQUETA_NIVEL,
} from "@/lib/cneb/catalogo";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { auditar } from "./auditoria";
import type { DbTenant } from "./db";
import { requireFeature } from "./plan";
import { requireCursoDelProfesor, requireRol, type TenantContext } from "./tenant";

// Capacidades y desempeños del CNEB por curso (specs/30). Lectura: profesor del curso o dirección.
// Escritura (capacidades, desempeños, importar, grado del salón): solo dirección.

const MENSAJE_SIN_GRADO = "Primero indica el grado del salón: los desempeños dependen del nivel y del grado.";

async function cursoLectura(ctx: TenantContext, cursoId: string) {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["profesor", "direccion"]);
  await requireCursoDelProfesor(ctx, cursoId);
  const curso = await ctx.db.curso.findFirst({ where: { id: cursoId }, include: { salon: true } });
  if (!curso) forbidden();
  return curso;
}

async function cursoGestion(ctx: TenantContext, cursoId: string) {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["direccion"]);
  const curso = await ctx.db.curso.findFirst({ where: { id: cursoId }, include: { salon: true } });
  if (!curso) forbidden();
  return curso;
}

/** Competencia del colegio con su curso y salón; solo dirección la gestiona. */
async function competenciaGestion(ctx: TenantContext, competenciaId: string) {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["direccion"]);
  return ctx.db.competencia.findFirst({ where: { id: competenciaId }, include: { curso: { include: { salon: true } } } });
}

/** Grado del salón válido para su nivel, o null. */
const gradoDe = (salon: { nivel: Nivel; grado: number | null }) => (gradoValido(salon.nivel, salon.grado) ? salon.grado : null);

// ───────────── Lectura ─────────────

export type EstructuraCneb = Awaited<ReturnType<typeof estructuraCurso>>;

/**
 * Competencias del curso con sus capacidades y los desempeños del nivel y grado del salón.
 * Si el salón no tiene grado, `grado` es null y no se listan desempeños.
 */
export async function estructuraCurso(ctx: TenantContext, cursoId: string) {
  const curso = await cursoLectura(ctx, cursoId);
  const grado = gradoDe(curso.salon);
  const competencias = await ctx.db.competencia.findMany({
    where: { cursoId },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    include: {
      capacidades: { orderBy: [{ orden: "asc" }, { nombre: "asc" }] },
      desempenos: {
        where: grado === null ? { id: { in: [] } } : { nivel: curso.salon.nivel, grado },
        orderBy: [{ orden: "asc" }, { descripcion: "asc" }],
        include: { _count: { select: { evaluaciones: true } } },
      },
    },
  });
  const area = detectarArea(curso.nombre, curso.salon.nivel);
  return {
    curso: { id: curso.id, nombre: curso.nombre },
    salon: { id: curso.salon.id, nombre: curso.salon.nombre, nivel: curso.salon.nivel, grado },
    gradosDelNivel: GRADOS_POR_NIVEL[curso.salon.nivel],
    textoGrado: grado === null ? null : textoGrado(curso.salon.nivel, grado),
    areaSugerida: area?.area ?? null,
    areas: areasDelNivel(curso.salon.nivel).map((a) => ({ area: a.area, nombre: a.nombre })),
    puedeEditar: ctx.rol === "direccion",
    competencias: competencias.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      capacidades: c.capacidades.map((x) => ({ id: x.id, nombre: x.nombre, descripcion: x.descripcion })),
      desempenos: c.desempenos.map((d) => ({
        id: d.id, capacidadId: d.capacidadId, descripcion: d.descripcion, codigo: d.codigo, usos: d._count.evaluaciones,
      })),
    })),
  };
}

/** Desempeños del nivel y grado del salón por competencia (para etiquetar evaluaciones). */
export async function desempenosParaEvaluar(ctx: TenantContext, cursoId: string) {
  const curso = await cursoLectura(ctx, cursoId);
  const grado = gradoDe(curso.salon);
  const porCompetencia: Record<string, { id: string; descripcion: string; codigo: string | null }[]> = {};
  if (grado === null) return { textoGrado: null, porCompetencia };
  const desempenos = await ctx.db.desempeno.findMany({
    where: { competencia: { cursoId }, nivel: curso.salon.nivel, grado },
    orderBy: [{ orden: "asc" }, { descripcion: "asc" }],
    select: { id: true, competenciaId: true, descripcion: true, codigo: true },
  });
  for (const d of desempenos) (porCompetencia[d.competenciaId] ??= []).push({ id: d.id, descripcion: d.descripcion, codigo: d.codigo });
  return { textoGrado: textoGrado(curso.salon.nivel, grado), porCompetencia };
}

// ───────────── Desempeños de una evaluación (lo usa notas.ts) ─────────────

/**
 * Valida que los desempeños sean de la competencia elegida (y por lo tanto del curso) y del nivel y grado
 * del salón. Devuelve el mensaje de error o null.
 */
export async function validarDesempenosEvaluacion(
  ctx: TenantContext, cursoId: string, competenciaId: string | null, desempenoIds: string[],
): Promise<string | null> {
  if (desempenoIds.length === 0) return null;
  if (!competenciaId) return "Elige la competencia antes de marcar desempeños.";
  if (desempenoIds.length > 30) return "Marca como máximo 30 desempeños por evaluación.";
  const curso = await ctx.db.curso.findFirst({ where: { id: cursoId }, include: { salon: true } });
  if (!curso) return "No encontramos ese curso.";
  const grado = gradoDe(curso.salon);
  if (grado === null) return MENSAJE_SIN_GRADO;
  const validos = await ctx.db.desempeno.count({
    where: { id: { in: desempenoIds }, competenciaId, nivel: curso.salon.nivel, grado, competencia: { cursoId } },
  });
  return validos === new Set(desempenoIds).size ? null : "Algún desempeño no es de esta competencia o del grado del salón.";
}

/** Reemplaza los desempeños vinculados a una evaluación. */
export async function guardarDesempenosEvaluacion(db: DbTenant, tenantId: string, evaluacionId: string, desempenoIds: string[]) {
  const unicos = [...new Set(desempenoIds)];
  await db.$transaction([
    db.evaluacionDesempeno.deleteMany({ where: { evaluacionId } }),
    db.evaluacionDesempeno.createMany({ data: unicos.map((desempenoId) => ({ tenantId, evaluacionId, desempenoId })) }),
  ]);
}

// ───────────── Grado del salón ─────────────

export async function fijarGradoSalon(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["direccion"]);
  const d = z.object({ salonId: z.uuid(), grado: z.coerce.number("Elige el grado.").int("Elige el grado.") }).safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const salon = await ctx.db.salon.findFirst({ where: { id: d.data.salonId } });
  if (!salon) return fallo("No encontramos ese salón.");
  if (GRADOS_POR_NIVEL[salon.nivel].length === 0) return fallo(`Los salones de ${ETIQUETA_NIVEL[salon.nivel].toLowerCase()} no usan grados del CNEB.`);
  if (!gradoValido(salon.nivel, d.data.grado)) return fallo(`Ese grado no existe en ${ETIQUETA_NIVEL[salon.nivel].toLowerCase()}.`);
  await ctx.db.salon.updateMany({ where: { id: salon.id }, data: { grado: d.data.grado } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "salon", entidadId: salon.id, detalle: { grado: d.data.grado } });
  return ok(`Grado guardado: ${textoGrado(salon.nivel, d.data.grado)}.`);
}

// ───────────── Capacidades ─────────────

const esquemaCapacidad = z.object({
  nombre: z.string().trim().min(3, "Escribe el nombre de la capacidad.").max(200, "El nombre es muy largo (máximo 200 caracteres)."),
  descripcion: z.string().trim().max(500, "La descripción es muy larga (máximo 500 caracteres).").optional(),
});

export async function crearCapacidad(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  const d = esquemaCapacidad.extend({ competenciaId: z.uuid() }).safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const comp = await competenciaGestion(ctx, d.data.competenciaId);
  if (!comp) return fallo("No encontramos esa competencia.");
  const ultimo = await ctx.db.capacidad.aggregate({ where: { competenciaId: comp.id }, _max: { orden: true } });
  await ctx.db.capacidad.create({
    data: { tenantId: ctx.tenant.id, competenciaId: comp.id, nombre: d.data.nombre, descripcion: d.data.descripcion || null, orden: (ultimo._max.orden ?? -1) + 1 },
  });
  return ok("Capacidad agregada.");
}

export async function editarCapacidad(ctx: TenantContext, capacidadId: string, entrada: unknown): Promise<Resultado> {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["direccion"]);
  const d = esquemaCapacidad.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const r = await ctx.db.capacidad.updateMany({ where: { id: capacidadId }, data: { nombre: d.data.nombre, descripcion: d.data.descripcion || null } });
  return r.count === 0 ? fallo("No encontramos esa capacidad.") : ok("Capacidad actualizada.");
}

/** Borra la capacidad; sus desempeños se quedan sin capacidad (no se borran). */
export async function eliminarCapacidad(ctx: TenantContext, capacidadId: string): Promise<Resultado> {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["direccion"]);
  const r = await ctx.db.capacidad.deleteMany({ where: { id: capacidadId } });
  return r.count === 0 ? fallo("No encontramos esa capacidad.") : ok("Capacidad eliminada.");
}

export async function moverCapacidad(ctx: TenantContext, capacidadId: string, direccion: "arriba" | "abajo"): Promise<Resultado> {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["direccion"]);
  const cap = await ctx.db.capacidad.findFirst({ where: { id: capacidadId } });
  if (!cap) return fallo("No encontramos esa capacidad.");
  const hermanas = await ctx.db.capacidad.findMany({ where: { competenciaId: cap.competenciaId }, orderBy: [{ orden: "asc" }, { nombre: "asc" }], select: { id: true } });
  const ids = reordenar(hermanas, capacidadId, direccion);
  await ctx.db.$transaction(ids.map((id, orden) => ctx.db.capacidad.updateMany({ where: { id }, data: { orden } })));
  return ok();
}

// ───────────── Desempeños ─────────────

const opcional = z.string().trim().transform((v) => v || null);
const esquemaDesempeno = z.object({
  capacidadId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  descripcion: z.string().trim().min(10, "Describe el desempeño (al menos 10 caracteres).").max(2000, "El desempeño es muy largo (máximo 2000 caracteres)."),
  codigo: opcional.pipe(z.string().max(30, "El código es muy largo (máximo 30 caracteres).").nullable()).optional(),
});

async function capacidadDeLaCompetencia(ctx: TenantContext, capacidadId: string | undefined, competenciaId: string) {
  if (!capacidadId) return true;
  return (await ctx.db.capacidad.count({ where: { id: capacidadId, competenciaId } })) > 0;
}

/** Crea un desempeño para el nivel y grado del salón del curso. */
export async function crearDesempeno(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  const d = esquemaDesempeno.extend({ competenciaId: z.uuid() }).safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const comp = await competenciaGestion(ctx, d.data.competenciaId);
  if (!comp) return fallo("No encontramos esa competencia.");
  const grado = gradoDe(comp.curso.salon);
  if (grado === null) return fallo(MENSAJE_SIN_GRADO);
  if (!(await capacidadDeLaCompetencia(ctx, d.data.capacidadId, comp.id))) return fallo("Esa capacidad no es de esta competencia.");
  const nivel = comp.curso.salon.nivel;
  const ultimo = await ctx.db.desempeno.aggregate({ where: { competenciaId: comp.id, nivel, grado }, _max: { orden: true } });
  await ctx.db.desempeno.create({
    data: {
      tenantId: ctx.tenant.id, competenciaId: comp.id, capacidadId: d.data.capacidadId ?? null, nivel, grado,
      descripcion: d.data.descripcion, codigo: d.data.codigo ?? null, orden: (ultimo._max.orden ?? -1) + 1,
    },
  });
  return ok("Desempeño agregado.");
}

export async function editarDesempeno(ctx: TenantContext, desempenoId: string, entrada: unknown): Promise<Resultado> {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["direccion"]);
  const d = esquemaDesempeno.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const actual = await ctx.db.desempeno.findFirst({ where: { id: desempenoId } });
  if (!actual) return fallo("No encontramos ese desempeño.");
  if (!(await capacidadDeLaCompetencia(ctx, d.data.capacidadId, actual.competenciaId))) return fallo("Esa capacidad no es de esta competencia.");
  await ctx.db.desempeno.updateMany({
    where: { id: desempenoId },
    data: { capacidadId: d.data.capacidadId ?? null, descripcion: d.data.descripcion, codigo: d.data.codigo ?? null },
  });
  return ok("Desempeño actualizado.");
}

/** Borra el desempeño y lo quita de las evaluaciones que lo usaban (las notas no cambian). */
export async function eliminarDesempeno(ctx: TenantContext, desempenoId: string): Promise<Resultado> {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["direccion"]);
  const r = await ctx.db.desempeno.deleteMany({ where: { id: desempenoId } });
  return r.count === 0 ? fallo("No encontramos ese desempeño.") : ok("Desempeño eliminado.");
}

export async function moverDesempeno(ctx: TenantContext, desempenoId: string, direccion: "arriba" | "abajo"): Promise<Resultado> {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["direccion"]);
  const actual = await ctx.db.desempeno.findFirst({ where: { id: desempenoId } });
  if (!actual) return fallo("No encontramos ese desempeño.");
  const hermanos = await ctx.db.desempeno.findMany({
    where: { competenciaId: actual.competenciaId, nivel: actual.nivel, grado: actual.grado },
    orderBy: [{ orden: "asc" }, { descripcion: "asc" }],
    select: { id: true },
  });
  const ids = reordenar(hermanos, desempenoId, direccion);
  await ctx.db.$transaction(ids.map((id, orden) => ctx.db.desempeno.updateMany({ where: { id }, data: { orden } })));
  return ok();
}

/** Sube o baja una competencia del curso (orden en notas, libreta y PDF). */
export async function moverCompetencia(ctx: TenantContext, competenciaId: string, direccion: "arriba" | "abajo"): Promise<Resultado> {
  const comp = await competenciaGestion(ctx, competenciaId);
  if (!comp) return fallo("No encontramos esa competencia.");
  const hermanas = await ctx.db.competencia.findMany({ where: { cursoId: comp.cursoId }, orderBy: [{ orden: "asc" }, { nombre: "asc" }], select: { id: true } });
  const ids = reordenar(hermanas, competenciaId, direccion);
  await ctx.db.$transaction(ids.map((id, orden) => ctx.db.competencia.updateMany({ where: { id }, data: { orden } })));
  return ok();
}

// ───────────── Importar desde el catálogo CNEB ─────────────

/**
 * Crea en el curso las competencias, capacidades y desempeños del catálogo para el nivel y grado del salón.
 * Idempotente: lo que ya existe (por nombre, código o descripción) se omite.
 */
export async function importarCneb(ctx: TenantContext, cursoId: string, areaClave?: string): Promise<Resultado> {
  const curso = await cursoGestion(ctx, cursoId);
  const area = areaClave ? areaPorClave(areaClave) : detectarArea(curso.nombre, curso.salon.nivel);
  if (!area) return fallo("Elige el área del CNEB que corresponde a este curso.");
  const grado = gradoDe(curso.salon);
  if (grado === null) return fallo(MENSAJE_SIN_GRADO);
  const plantilla = plantillaCneb(area, curso.salon.nivel, grado);
  if (!plantilla.ok) return fallo(plantilla.error);

  const tenantId = ctx.tenant.id;
  const resumen = await ctx.db.$transaction(async (tx) => {
    const existentes = await tx.competencia.findMany({
      where: { cursoId },
      include: {
        capacidades: { select: { id: true, nombre: true, orden: true } },
        desempenos: { where: { nivel: curso.salon.nivel, grado }, select: { codigo: true, descripcion: true, orden: true } },
      },
    });
    const plan = planearImportacion(plantilla.competencias, existentes);
    for (const paso of plan.pasos) {
      const competenciaId = paso.competenciaId
        ?? (await tx.competencia.create({ data: { tenantId, cursoId, nombre: paso.nombre, orden: paso.orden } })).id;
      const capacidades = { ...paso.capacidadesExistentes };
      if (paso.capacidadesNuevas.length > 0) {
        const creadas = await tx.capacidad.createManyAndReturn({
          data: paso.capacidadesNuevas.map((c) => ({ tenantId, competenciaId, nombre: c.nombre, orden: c.orden })),
          select: { id: true, nombre: true },
        });
        for (const c of creadas) capacidades[c.nombre] = c.id;
      }
      if (paso.desempenosNuevos.length > 0) {
        await tx.desempeno.createMany({
          data: paso.desempenosNuevos.map((d) => ({
            tenantId, competenciaId, capacidadId: d.capacidad ? (capacidades[d.capacidad] ?? null) : null,
            nivel: curso.salon.nivel, grado, descripcion: d.descripcion, codigo: d.codigo, orden: d.orden,
          })),
        });
      }
    }
    return plan.resumen;
  });
  await auditar({ tenantId, actorId: ctx.user.id, accion: "crear", entidad: "cneb_importacion", entidadId: cursoId, detalle: { area: area.area, grado, ...resumen } });
  const faltan = plantilla.sinDesempenos.length;
  const aviso = faltan === 0 ? "" : faltan === 1
    ? ` «${plantilla.sinDesempenos[0]}» aún no tiene desempeños de ${textoGrado(curso.salon.nivel, grado)} en el catálogo: agrégalos a mano.`
    : ` ${faltan} competencias aún no tienen desempeños de ${textoGrado(curso.salon.nivel, grado)} en el catálogo: agrégalos a mano.`;
  return ok(mensajeImportacion(resumen) + aviso);
}
