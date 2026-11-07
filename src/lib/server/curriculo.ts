import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import type { OrigenCompetencia } from "@/generated/prisma/enums";
import { areaPorClave, competenciasOficiales, detectarArea, esNivelCneb, gradoValido, normalizar } from "@/lib/cneb/catalogo";
import { auditar } from "./auditoria";
import { ErrorDeNegocio } from "./contexto-accion";
import { requireFeature } from "./plan";
import type { TenantContext } from "./tenant";

export type CompetenciaCurso = {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  origen: OrigenCompetencia;
  codigoOficial: string | null;
  desactivadaAt: Date | null;
};

export type DatosCompetencia = { cursoId: string; nombre: string; descripcion?: string; codigoOficial?: string };
const campos = { id: true, nombre: true, descripcion: true, orden: true, origen: true, codigoOficial: true, desactivadaAt: true } as const;
const nombreValido = z.string().trim().min(3).max(200);
const descripcionValida = z.string().trim().max(500);

/** Dirección gestiona por rol; el profesor requiere autorización explícita en su membresía activa. */
export function puedeGestionarCompetencias(ctx: TenantContext): boolean {
  return !ctx.soporte && (ctx.rol === "direccion" || (ctx.rol === "profesor" && ctx.membership.gestionaCompetencias && ctx.membership.estado === "activa"));
}

async function cursoPermitido(ctx: TenantContext, cursoId: string, gestion: boolean) {
  requireFeature(ctx, "notas");
  if (gestion ? !puedeGestionarCompetencias(ctx) : !["direccion", "profesor"].includes(ctx.rol)) forbidden();
  const curso = await ctx.db.curso.findFirst({ where: { id: cursoId }, select: { id: true, nombre: true, profesorId: true, areaCneb: true, salon: { select: { nivel: true, grado: true } } } });
  if (!curso || (ctx.rol === "profesor" && curso.profesorId !== ctx.membership.id)) forbidden();
  return curso;
}

async function competenciaPermitida(ctx: TenantContext, competenciaId: string) {
  requireFeature(ctx, "notas");
  if (!puedeGestionarCompetencias(ctx)) forbidden();
  const comp = await ctx.db.competencia.findFirst({ where: { id: competenciaId }, include: {
    _count: { select: { evaluaciones: true, calificacionesPeriodo: true, tareas: true, informesProgreso: true, rectificaciones: true } },
  } });
  if (!comp) forbidden();
  await cursoPermitido(ctx, comp.cursoId, true);
  return comp;
}

function vista(c: { id: string; nombre: string; descripcion: string | null; orden: number; origen: OrigenCompetencia; codigoOficial: string | null; desactivadaAt: Date | null }): CompetenciaCurso {
  return { id: c.id, nombre: c.nombre, descripcion: c.descripcion, orden: c.orden, origen: c.origen, codigoOficial: c.codigoOficial, desactivadaAt: c.desactivadaAt };
}

function vistaAuditoria(c: CompetenciaCurso) {
  return { ...c, desactivadaAt: c.desactivadaAt?.toISOString() ?? null };
}

/** Solo activas salvo solicitud expresa; la lectura sigue limitada al curso del profesor. */
export async function competenciasDelCurso(ctx: TenantContext, cursoId: string, opciones: { incluirDesactivadas?: boolean } = {}): Promise<CompetenciaCurso[]> {
  await cursoPermitido(ctx, cursoId, false);
  return ctx.db.competencia.findMany({ where: { cursoId, ...(opciones.incluirDesactivadas ? {} : { desactivadaAt: null }) }, orderBy: [{ orden: "asc" }, { nombre: "asc" }], select: campos });
}

/** Crea solo una competencia personalizada; el cliente nunca decide su procedencia oficial. */
export async function crearCompetencia(ctx: TenantContext, datos: DatosCompetencia): Promise<CompetenciaCurso> {
  await cursoPermitido(ctx, datos.cursoId, true);
  if (datos.codigoOficial) throw new ErrorDeNegocio("El código oficial solo se asigna desde la plantilla CNEB.");
  const nombre = nombreValido.parse(datos.nombre);
  const descripcion = descripcionValida.parse(datos.descripcion ?? "") || null;
  const duplicada = await ctx.db.competencia.findFirst({ where: { cursoId: datos.cursoId, nombre: { equals: nombre, mode: "insensitive" } }, select: { id: true } });
  if (duplicada) throw new ErrorDeNegocio("Ya existe una competencia con ese nombre en el curso.");
  const ultimo = await ctx.db.competencia.aggregate({ where: { cursoId: datos.cursoId }, _max: { orden: true } });
  const creada = await ctx.db.competencia.create({ data: { tenantId: ctx.tenant.id, cursoId: datos.cursoId, nombre, descripcion, orden: (ultimo._max.orden ?? -1) + 1, origen: "personalizada" }, select: campos });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "competencia", entidadId: creada.id, detalle: { antes: null, despues: vistaAuditoria(vista(creada)), cursoId: datos.cursoId } });
  return vista(creada);
}

/** Si ya hay evidencias, el nombre se congela para que el historial conserve su etiqueta. */
export async function editarCompetencia(ctx: TenantContext, competenciaId: string, cambios: Pick<DatosCompetencia, "nombre" | "descripcion">): Promise<CompetenciaCurso> {
  const actual = await competenciaPermitida(ctx, competenciaId);
  const nombre = nombreValido.parse(cambios.nombre);
  const descripcion = descripcionValida.parse(cambios.descripcion ?? "") || null;
  const usada = Object.values(actual._count).some((n) => n > 0);
  if (usada && nombre !== actual.nombre) throw new ErrorDeNegocio("Esta competencia ya tiene registros. Conserva su nombre para proteger el historial.");
  const duplicada = await ctx.db.competencia.findFirst({ where: { cursoId: actual.cursoId, id: { not: actual.id }, nombre: { equals: nombre, mode: "insensitive" } }, select: { id: true } });
  if (duplicada) throw new ErrorDeNegocio("Ya existe una competencia con ese nombre en el curso.");
  const cambiaOficial = actual.origen === "oficial" && nombre !== actual.nombre;
  const editada = await ctx.db.competencia.update({ where: { id: actual.id }, data: { nombre, descripcion, ...(cambiaOficial ? { origen: "personalizada" as const, codigoOficial: null } : {}) }, select: campos });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "competencia", entidadId: actual.id, detalle: { antes: vistaAuditoria(vista(actual)), despues: vistaAuditoria(vista(editada)) } });
  return vista(editada);
}

/** Desactiva sin borrar evaluaciones, tareas ni valoraciones. */
export async function desactivarCompetencia(ctx: TenantContext, competenciaId: string): Promise<void> {
  const actual = await competenciaPermitida(ctx, competenciaId);
  if (actual.desactivadaAt) return;
  const ahora = new Date();
  await ctx.db.competencia.update({ where: { id: actual.id }, data: { desactivadaAt: ahora, desactivadaPorId: ctx.membership.id } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "competencia", entidadId: actual.id, detalle: { antes: { desactivadaAt: null }, despues: { desactivadaAt: ahora.toISOString(), desactivadaPorId: ctx.membership.id } } });
}

/** Reactiva la misma fila, con todas sus relaciones históricas. */
export async function reactivarCompetencia(ctx: TenantContext, competenciaId: string): Promise<void> {
  const actual = await competenciaPermitida(ctx, competenciaId);
  if (!actual.desactivadaAt) return;
  await ctx.db.competencia.update({ where: { id: actual.id }, data: { desactivadaAt: null, desactivadaPorId: null } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "competencia", entidadId: actual.id, detalle: { antes: { desactivadaAt: actual.desactivadaAt.toISOString(), desactivadaPorId: actual.desactivadaPorId }, despues: { desactivadaAt: null } } });
}

/** Solo puede eliminarse una competencia sin ninguna referencia académica. */
export async function eliminarCompetenciaSinUso(ctx: TenantContext, competenciaId: string): Promise<void> {
  const actual = await competenciaPermitida(ctx, competenciaId);
  if (Object.values(actual._count).some((n) => n > 0)) throw new ErrorDeNegocio("La competencia tiene registros; desactívala para conservar el historial.");
  const desempenosUsados = await ctx.db.desempeno.count({ where: { competenciaId, OR: [{ evaluaciones: { some: {} } }, { criterios: { some: {} } }, { nuditoTemas: { some: {} } }] } });
  if (desempenosUsados > 0) throw new ErrorDeNegocio("La competencia tiene desempeños en uso; desactívala para conservar sus relaciones.");
  await ctx.db.competencia.delete({ where: { id: actual.id } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "competencia", entidadId: actual.id, detalle: { antes: vistaAuditoria(vista(actual)), despues: null } });
}

/** Restaura oficiales faltantes y reactiva las desactivadas, sin tocar las personalizadas. */
export async function restaurarPlantillaOficial(ctx: TenantContext, cursoId: string): Promise<CompetenciaCurso[]> {
  const curso = await cursoPermitido(ctx, cursoId, true);
  const area = (curso.areaCneb && areaPorClave(curso.areaCneb)) || detectarArea(curso.nombre, curso.salon.nivel);
  if (!area || !esNivelCneb(curso.salon.nivel) || !gradoValido(curso.salon.nivel, curso.salon.grado)) throw new ErrorDeNegocio("El curso necesita un área CNEB y un grado válido para restaurar la plantilla.");
  const oficiales = competenciasOficiales(area, curso.salon.nivel);
  const cambios: { accion: string; id: string; antes: Record<string, string | number | null> | null; despues: Record<string, string | number | null> }[] = [];
  await ctx.db.$transaction(async (tx) => {
    const existentes = await tx.competencia.findMany({ where: { cursoId }, include: { capacidades: { select: { nombre: true } } } });
    let orden = Math.max(-1, ...existentes.map((c) => c.orden)) + 1;
    for (const oficial of oficiales) {
      let comp = existentes.find((c) => c.codigoOficial === oficial.codigoOficial && c.origen === "oficial");
      if (!comp) comp = existentes.find((c) => c.codigoOficial === null && c.origen === "oficial" && normalizar(c.nombre) === normalizar(oficial.nombre));
      if (!comp) {
        const creada = await tx.competencia.create({ data: { tenantId: ctx.tenant.id, cursoId, nombre: oficial.nombre, orden: orden++, origen: "oficial", codigoOficial: oficial.codigoOficial } });
        comp = { ...creada, capacidades: [] };
        existentes.push(comp);
        cambios.push({ accion: "crear", id: comp.id, antes: null, despues: { codigoOficial: oficial.codigoOficial, nombre: oficial.nombre } });
      } else if (comp.desactivadaAt || comp.codigoOficial !== oficial.codigoOficial) {
        await tx.competencia.update({ where: { id: comp.id }, data: { desactivadaAt: null, desactivadaPorId: null, codigoOficial: oficial.codigoOficial } });
        cambios.push({ accion: comp.desactivadaAt ? "reactivar" : "vincular", id: comp.id, antes: { codigoOficial: comp.codigoOficial, desactivadaAt: comp.desactivadaAt?.toISOString() ?? null }, despues: { codigoOficial: oficial.codigoOficial, desactivadaAt: null } });
      }
      const nombres = new Set(comp.capacidades.map((c) => normalizar(c.nombre)));
      const nuevas = oficial.capacidades.filter((nombre) => !nombres.has(normalizar(nombre)));
      if (nuevas.length) {
        const base = await tx.capacidad.aggregate({ where: { competenciaId: comp.id }, _max: { orden: true } });
        await tx.capacidad.createMany({ data: nuevas.map((nombre, i) => ({ tenantId: ctx.tenant.id, competenciaId: comp.id, nombre, orden: (base._max.orden ?? -1) + 1 + i })) });
        cambios.push({ accion: "capacidades", id: comp.id, antes: { cantidad: comp.capacidades.length }, despues: { cantidad: comp.capacidades.length + nuevas.length } });
      }
    }
  });
  for (const cambio of cambios) await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: cambio.accion === "crear" ? "crear" : "editar", entidad: "competencia", entidadId: cambio.id, detalle: { antes: cambio.antes, despues: cambio.despues, accionPlantilla: cambio.accion, area: area.area } });
  return competenciasDelCurso(ctx, cursoId);
}
