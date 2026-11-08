import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { Nivel } from "@/generated/prisma/client";
import { esquemaCrearPlan, esquemaMotivo } from "@/lib/plan-anual/contratos";
import { puedeTransicionar } from "@/lib/plan-anual/estados";
import { auditar } from "@/lib/server/auditoria";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import type { TenantContext } from "@/lib/server/tenant";
import { docentesDelGrupo, exigirPlanificacion, gruposDelDocente, requireAccesoPlan, type GrupoCurricular } from "./acceso";

const validar = <T>(esquema: z.ZodType<T>, valor: unknown): T => {
  const r = esquema.safeParse(valor);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa los datos.");
  return r.data;
};
export async function registrarEvento(ctx: TenantContext, planId: string, tipo: string, detalle: Record<string, string | number | boolean | null> = {}) {
  await ctx.db.planAnualEvento.create({ data: { tenantId: ctx.tenant.id, planId, actorId: ctx.membership.id, tipo, detalle } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "plan_anual", entidadId: planId, detalle: { tipo, ...detalle } });
}
export async function listarPlanes(ctx: TenantContext, filtro: { anio?: number; nivel?: Nivel; grado?: number; area?: string } = {}) {
  exigirPlanificacion(ctx);
  if (ctx.rol !== "profesor" && ctx.rol !== "direccion") notFound();
  const where = { ...filtro, ...(ctx.rol === "profesor" ? { participantes: { some: { membershipId: ctx.membership.id, activo: true } } } : {}) };
  return ctx.db.planAnual.findMany({ where, orderBy: [{ anio: "desc" }, { nivel: "asc" }, { grado: "asc" }, { area: "asc" }], include: { _count: { select: { temas: true, participantes: true } } } });
}
export async function obtenerPlan(ctx: TenantContext, planId: string) {
  await requireAccesoPlan(ctx, planId);
  return ctx.db.planAnual.findFirstOrThrow({ where: { id: planId }, include: {
    temas: { orderBy: { orden: "asc" } }, unidades: { orderBy: { orden: "asc" } },
    participantes: { include: { membership: { select: { user: { select: { nombres: true, apellidos: true } } } } }, orderBy: { createdAt: "asc" } },
    comentarios: { orderBy: { createdAt: "asc" }, include: { autor: { select: { user: { select: { nombres: true, apellidos: true } } } } } }, conformidades: { orderBy: { createdAt: "desc" } },
  } });
}
export async function crearPlan(ctx: TenantContext, entrada: unknown) {
  exigirPlanificacion(ctx);
  if (ctx.rol !== "profesor" && ctx.rol !== "direccion") notFound();
  const d = validar(esquemaCrearPlan, entrada);
  if (ctx.rol === "profesor" && !(await gruposDelDocente(ctx)).some(g => g.anio === d.anio && g.nivel === d.nivel && g.grado === d.grado && g.area === d.area)) notFound();
  const grupo: GrupoCurricular = { ...d, nombreCurso: "" };
  const cursos = await ctx.db.curso.findMany({ where: { areaCneb: d.area, salon: { anio: d.anio, nivel: d.nivel, grado: d.grado, archivadoAt: null } }, select: { nombre: true }, take: 1 });
  if (!cursos.length) throw new ErrorDeNegocio("No existe un curso de ese grupo curricular.");
  grupo.nombreCurso = cursos[0].nombre;
  if (await ctx.db.planAnual.findFirst({ where: d, select: { id: true } })) throw new ErrorDeNegocio("Ya existe un plan para ese grupo y año.");
  const docentes = await docentesDelGrupo(ctx.db, grupo);
  const plan = await ctx.db.planAnual.create({ data: { ...d, tenantId: ctx.tenant.id, nombreCurso: grupo.nombreCurso, creadoPorId: ctx.membership.id,
    participantes: { create: docentes.map(docente => ({ tenantId: ctx.tenant.id, membershipId: docente.membershipId, rol: "docente" as const })) },
    eventos: { create: { tenantId: ctx.tenant.id, actorId: ctx.membership.id, tipo: "crear", detalle: { docentes: docentes.length } } },
  } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "plan_anual", entidadId: plan.id });
  return plan;
}
export async function sincronizarParticipantes(ctx: TenantContext, planId: string) {
  const plan = await requireAccesoPlan(ctx, planId);
  if (plan.estado === "archivado") throw new ErrorDeNegocio("El plan archivado es de solo lectura.");
  const docentes = await docentesDelGrupo(ctx.db, plan);
  const asignados = new Set(docentes.map(d => d.membershipId));
  const participantes = await ctx.db.planAnualParticipante.findMany({ where: { planId } });
  let agregados = 0;
  let cambiosAsignacion = 0;
  for (const docente of docentes) {
    const anterior = participantes.find(p => p.membershipId === docente.membershipId);
    if (!anterior) {
      await ctx.db.planAnualParticipante.create({ data: { tenantId: ctx.tenant.id, planId, membershipId: docente.membershipId, agregadoPorId: ctx.membership.id } });
      agregados++;
    } else if (anterior.fueraDeAsignacion) {
      await ctx.db.planAnualParticipante.updateMany({ where: { id: anterior.id }, data: { fueraDeAsignacion: false } });
      cambiosAsignacion++;
    }
  }
  for (const anterior of participantes.filter(p => p.activo && !asignados.has(p.membershipId) && !p.fueraDeAsignacion)) {
    await ctx.db.planAnualParticipante.updateMany({ where: { id: anterior.id }, data: { fueraDeAsignacion: true } });
    cambiosAsignacion++;
  }
  if (agregados || cambiosAsignacion) await registrarEvento(ctx, planId, "sincronizar_participantes", { agregados, cambiosAsignacion });
  return { agregados, cambiosAsignacion };
}
function exigirDireccion(ctx: TenantContext) {
  exigirPlanificacion(ctx);
  if (ctx.rol !== "direccion") notFound();
}
export async function designarCoordinador(ctx: TenantContext, planId: string, membershipId: string, motivo: string) {
  exigirDireccion(ctx); validar(esquemaMotivo, motivo);
  await requireAccesoPlan(ctx, planId);
  await ctx.db.$transaction(async tx => {
    const plan = await tx.planAnual.findFirst({ where: { id: planId, tenantId: ctx.tenant.id } });
    if (!plan || plan.estado === "archivado") throw new ErrorDeNegocio("El plan archivado no admite cambios.");
    const participante = await tx.planAnualParticipante.findFirst({ where: { planId, tenantId: ctx.tenant.id, membershipId, activo: true } });
    if (!participante) throw new ErrorDeNegocio("El coordinador debe ser un participante activo.");
    await tx.planAnualParticipante.updateMany({ where: { planId, tenantId: ctx.tenant.id, rol: "coordinador" }, data: { rol: "docente" } });
    await tx.planAnualParticipante.update({ where: { id: participante.id }, data: { rol: "coordinador" } });
    await tx.planAnual.update({ where: { id: planId }, data: { coordinadorId: membershipId } });
    await tx.planAnualEvento.create({ data: { tenantId: ctx.tenant.id, planId, actorId: ctx.membership.id, tipo: "designar_coordinador", detalle: { membershipId, motivo } } });
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "plan_anual", entidadId: planId, detalle: { tipo: "designar_coordinador", membershipId, motivo } });
}
export async function agregarParticipante(ctx: TenantContext, planId: string, membershipId: string, motivo: string) {
  exigirDireccion(ctx); validar(esquemaMotivo, motivo);
  const plan = await requireAccesoPlan(ctx, planId);
  if (plan.estado === "archivado") throw new ErrorDeNegocio("El plan archivado no admite cambios.");
  const docente = await ctx.db.membership.findFirst({ where: { id: membershipId, rol: "profesor", estado: "activa" } });
  if (!docente) throw new ErrorDeNegocio("El docente no pertenece al colegio.");
  await ctx.db.planAnualParticipante.upsert({ where: { planId_membershipId: { planId, membershipId } }, create: { tenantId: ctx.tenant.id, planId, membershipId, agregadoPorId: ctx.membership.id, motivo }, update: { activo: true, fueraDeAsignacion: false, retiradoAt: null, motivo, agregadoPorId: ctx.membership.id } });
  await registrarEvento(ctx, planId, "agregar_participante", { membershipId, motivo });
}
export async function retirarParticipante(ctx: TenantContext, planId: string, membershipId: string, motivo: string) {
  exigirDireccion(ctx); validar(esquemaMotivo, motivo);
  const plan = await requireAccesoPlan(ctx, planId);
  if (plan.estado === "archivado") throw new ErrorDeNegocio("El plan archivado no admite cambios.");
  if (plan.coordinadorId === membershipId) throw new ErrorDeNegocio("Designa otro coordinador antes de retirar a este docente.");
  const r = await ctx.db.planAnualParticipante.updateMany({ where: { planId, membershipId, activo: true }, data: { activo: false, retiradoAt: new Date(), motivo } });
  if (!r.count) throw new ErrorDeNegocio("El docente no participa activamente en el plan.");
  await registrarEvento(ctx, planId, "retirar_participante", { membershipId, motivo });
}
export async function copiarPlan(ctx: TenantContext, planOrigenId: string, anioDestino: number) {
  exigirPlanificacion(ctx);
  const origen = await obtenerPlan(ctx, planOrigenId);
  if (origen.estado === "archivado") throw new ErrorDeNegocio("No puedes copiar un plan archivado.");
  if (!Number.isInteger(anioDestino) || anioDestino < 2020 || anioDestino > 2100 || anioDestino === origen.anio) throw new ErrorDeNegocio("Elige otro año válido.");
  if (ctx.rol === "profesor" && !(await gruposDelDocente(ctx)).some(g => g.anio === anioDestino && g.nivel === origen.nivel && g.grado === origen.grado && g.area === origen.area)) notFound();
  const grupo = { anio: anioDestino, nivel: origen.nivel, grado: origen.grado, area: origen.area, nombreCurso: origen.nombreCurso };
  const docentes = await docentesDelGrupo(ctx.db, grupo);
  const copia = await ctx.db.$transaction(async tx => {
    const fuente = await tx.planAnual.findFirst({ where: { id: origen.id, tenantId: ctx.tenant.id } });
    if (!fuente || fuente.estado === "archivado") throw new ErrorDeNegocio("El plan de origen ya no está disponible para copiar.");
    const [unidadesOrigen, temasOrigen] = await Promise.all([
      tx.planAnualUnidad.findMany({ where: { tenantId: ctx.tenant.id, planId: origen.id }, orderBy: { orden: "asc" } }),
      tx.planAnualTema.findMany({ where: { tenantId: ctx.tenant.id, planId: origen.id }, orderBy: { orden: "asc" } }),
    ]);
    const actual = await tx.planAnual.findFirst({ where: { tenantId: ctx.tenant.id, anio: anioDestino, nivel: origen.nivel, grado: origen.grado, area: origen.area } });
    if (actual) throw new ErrorDeNegocio("Ya existe un plan para ese grupo y año.");
    const plan = await tx.planAnual.create({ data: { tenantId: ctx.tenant.id, anio: anioDestino, nivel: origen.nivel, grado: origen.grado, area: origen.area, nombreCurso: origen.nombreCurso, copiadoDeId: origen.id, creadoPorId: ctx.membership.id } });
    const unidades = new Map<string, string>();
    for (const u of unidadesOrigen) {
      const nueva = await tx.planAnualUnidad.create({ data: { tenantId: ctx.tenant.id, planId: plan.id, titulo: u.titulo, orden: u.orden } });
      unidades.set(u.id, nueva.id);
    }
    if (temasOrigen.length) await tx.planAnualTema.createMany({ data: temasOrigen.map(t => ({ tenantId: ctx.tenant.id, planId: plan.id, temaClave: t.temaClave, unidadId: t.unidadId ? unidades.get(t.unidadId) ?? null : null, orden: t.orden, nota: t.nota, propuestoPorId: ctx.membership.id })) });
    if (docentes.length) await tx.planAnualParticipante.createMany({ data: docentes.map(d => ({ tenantId: ctx.tenant.id, planId: plan.id, membershipId: d.membershipId, agregadoPorId: ctx.membership.id })) });
    await tx.planAnualEvento.create({ data: { tenantId: ctx.tenant.id, planId: plan.id, actorId: ctx.membership.id, tipo: "copiar", detalle: { origenId: origen.id, anioDestino } } });
    return plan;
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "plan_anual", entidadId: copia.id, detalle: { origenId: origen.id } });
  return copia;
}
export async function archivarPlan(ctx: TenantContext, planId: string, motivo: string) {
  exigirDireccion(ctx); validar(esquemaMotivo, motivo);
  await requireAccesoPlan(ctx, planId);
  await ctx.db.$transaction(async tx => {
    const plan = await tx.planAnual.findFirst({ where: { id: planId, tenantId: ctx.tenant.id } });
    if (!plan) notFound();
    const t = puedeTransicionar(plan.estado, "archivar", { esCoordinador: false, esDireccion: true, observacionesAbiertas: 0, participantesActivos: 0, conformesRonda: 0, cantidadTemas: 0, hayCoordinador: !!plan.coordinadorId });
    if (!t.ok) throw new ErrorDeNegocio(t.motivo);
    await tx.planAnual.update({ where: { id: planId }, data: { estado: t.siguiente, archivadoAt: new Date() } });
    await tx.planAnualEvento.create({ data: { tenantId: ctx.tenant.id, planId, actorId: ctx.membership.id, tipo: "archivar", detalle: { motivo } } });
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "plan_anual", entidadId: planId, detalle: { tipo: "archivar", motivo } });
}
