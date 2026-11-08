import "server-only";
import { notFound } from "next/navigation";
import type { AccionPlan, ContextoTransicion } from "@/lib/plan-anual/estados";
import { puedeTransicionar } from "@/lib/plan-anual/estados";
import { esquemaComentar, esquemaConformidad, esquemaMotivo } from "@/lib/plan-anual/contratos";
import { auditar } from "@/lib/server/auditoria";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import type { TenantContext } from "@/lib/server/tenant";
import { requireAccesoPlan } from "./acceso";
import { registrarEvento, sincronizarParticipantes } from "./planes";

export async function comentar(ctx: TenantContext, planId: string, entrada: unknown) {
  const plan = await requireAccesoPlan(ctx, planId);
  const r = esquemaComentar.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa el comentario.");
  const d = r.data;
  if (plan.estado === "archivado") throw new ErrorDeNegocio("El plan archivado es de solo lectura.");
  if (d.esObservacion && plan.estado !== "en_revision" && plan.estado !== "con_observaciones") throw new ErrorDeNegocio("Las observaciones se registran durante la revisión.");
  if (d.temaClave && !(await ctx.db.planAnualTema.findFirst({ where: { planId, temaClave: d.temaClave } }))) throw new ErrorDeNegocio("El tema no pertenece al plan.");
  const comentario = await ctx.db.$transaction(async tx => {
    const actual = await tx.planAnual.findFirst({ where: { id: planId, tenantId: ctx.tenant.id } });
    if (!actual || actual.estado === "archivado") throw new ErrorDeNegocio("El plan no admite comentarios.");
    if (d.esObservacion && actual.estado !== "en_revision" && actual.estado !== "con_observaciones") throw new ErrorDeNegocio("Las observaciones se registran durante la revisión.");
    const c = await tx.planAnualComentario.create({ data: { tenantId: ctx.tenant.id, planId, temaClave: d.temaClave ?? null, autorId: ctx.membership.id, contenido: d.contenido, esObservacion: d.esObservacion, estado: d.esObservacion ? "abierta" : null } });
    if (d.esObservacion && actual.estado === "en_revision") {
      const transicion = puedeTransicionar(actual.estado, "registrar_observacion", { esCoordinador: false, esDireccion: ctx.rol === "direccion", observacionesAbiertas: 0, participantesActivos: 0, conformesRonda: 0, cantidadTemas: 0, hayCoordinador: !!actual.coordinadorId });
      if (!transicion.ok) throw new ErrorDeNegocio(transicion.motivo);
      const cambio = await tx.planAnual.updateMany({ where: { id: planId, tenantId: ctx.tenant.id, estado: actual.estado }, data: { estado: transicion.siguiente } });
      if (!cambio.count) throw new ErrorDeNegocio("El plan cambió. Actualiza la página.");
    }
    await tx.planAnualEvento.create({ data: { tenantId: ctx.tenant.id, planId, actorId: ctx.membership.id, tipo: d.esObservacion ? "observar" : "comentar", detalle: { comentarioId: c.id } } });
    return c;
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "plan_anual_comentario", entidadId: comentario.id });
  return comentario;
}
export async function resolverObservacion(ctx: TenantContext, comentarioId: string, resolucion: string) {
  const comentario = await ctx.db.planAnualComentario.findFirst({ where: { id: comentarioId } });
  if (!comentario) notFound();
  await requireAccesoPlan(ctx, comentario.planId, { coordinador: true });
  const motivo = esquemaMotivo.safeParse(resolucion);
  if (!motivo.success) throw new ErrorDeNegocio(motivo.error.issues[0]?.message ?? "Explica cómo se resolvió.");
  const r = await ctx.db.planAnualComentario.updateMany({ where: { id: comentarioId, planId: comentario.planId, esObservacion: true, estado: "abierta" }, data: { estado: "resuelta", resolucion: motivo.data, resueltoPorId: ctx.membership.id, resueltoAt: new Date() } });
  if (!r.count) throw new ErrorDeNegocio("La observación ya fue resuelta.");
  await registrarEvento(ctx, comentario.planId, "resolver_observacion", { comentarioId });
}
export async function registrarConformidad(ctx: TenantContext, planId: string, entrada: unknown) {
  const plan = await requireAccesoPlan(ctx, planId);
  if (ctx.rol !== "profesor") notFound();
  if (plan.estado !== "en_revision" && plan.estado !== "con_observaciones") throw new ErrorDeNegocio("El plan no está en revisión.");
  const r = esquemaConformidad.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa tu decisión.");
  const d = r.data;
  await ctx.db.planAnualConformidad.upsert({ where: { planId_ronda_membershipId: { planId, ronda: plan.rondaRevision, membershipId: ctx.membership.id } }, create: { tenantId: ctx.tenant.id, planId, ronda: plan.rondaRevision, membershipId: ctx.membership.id, decision: d.decision, comentario: d.comentario ?? null }, update: { decision: d.decision, comentario: d.comentario ?? null } });
  if (d.decision === "observaciones") await comentar(ctx, planId, { contenido: d.comentario, esObservacion: true });
  await registrarEvento(ctx, planId, "registrar_conformidad", { decision: d.decision, ronda: plan.rondaRevision });
}
async function transicionar(ctx: TenantContext, planId: string, accion: AccionPlan, motivo?: string) {
  await requireAccesoPlan(ctx, planId, { coordinador: true });
  const resultado = await ctx.db.$transaction(async tx => {
    const plan = await tx.planAnual.findFirst({ where: { id: planId, tenantId: ctx.tenant.id } });
    if (!plan) notFound();
    const [participantes, conformidades, observacionesAbiertas, cantidadTemas] = await Promise.all([
      tx.planAnualParticipante.findMany({ where: { planId, tenantId: ctx.tenant.id, activo: true }, select: { membershipId: true } }),
      tx.planAnualConformidad.findMany({ where: { planId, tenantId: ctx.tenant.id, ronda: plan.rondaRevision, decision: "conforme" }, select: { membershipId: true } }),
      tx.planAnualComentario.count({ where: { planId, tenantId: ctx.tenant.id, estado: "abierta" } }),
      tx.planAnualTema.count({ where: { planId, tenantId: ctx.tenant.id } }),
    ]);
    const activos = new Set(participantes.map(p => p.membershipId));
    const c: ContextoTransicion = { esCoordinador: plan.coordinadorId === ctx.membership.id, esDireccion: false, observacionesAbiertas, participantesActivos: activos.size, conformesRonda: conformidades.filter(c => activos.has(c.membershipId)).length, cantidadTemas, hayCoordinador: !!plan.coordinadorId };
    const t = puedeTransicionar(plan.estado, accion, c);
    if (accion === "publicar" && (activos.size < 1 || c.conformesRonda !== activos.size)) throw new ErrorDeNegocio("Falta la conformidad de todos los participantes activos en esta ronda.");
    if (!t.ok) throw new ErrorDeNegocio(t.motivo);
    const cambio = await tx.planAnual.updateMany({ where: { id: planId, tenantId: ctx.tenant.id, estado: plan.estado, rondaRevision: plan.rondaRevision, versionPublicada: plan.versionPublicada }, data: { estado: t.siguiente,
      ...(accion === "enviar_revision" || accion === "reenviar_revision" ? { rondaRevision: { increment: 1 } } : {}),
      ...(accion === "aprobar" ? { aprobadoPorId: ctx.membership.id, aprobadoAt: new Date() } : {}),
      ...(accion === "abrir_revision" ? { aprobadoPorId: null, aprobadoAt: null } : {}),
    } });
    if (!cambio.count) throw new ErrorDeNegocio("El plan cambió mientras realizabas la acción. Actualiza la página.");
    if (accion === "publicar") {
      const [temas, unidades, conformidadesFoto] = await Promise.all([
        tx.planAnualTema.findMany({ where: { planId, tenantId: ctx.tenant.id }, orderBy: { orden: "asc" }, select: { temaClave: true, orden: true, unidadId: true, nota: true } }),
        tx.planAnualUnidad.findMany({ where: { planId, tenantId: ctx.tenant.id }, orderBy: { orden: "asc" }, select: { id: true, titulo: true, orden: true } }),
        tx.planAnualConformidad.findMany({ where: { planId, tenantId: ctx.tenant.id, ronda: plan.rondaRevision }, select: { membershipId: true, decision: true, comentario: true } }),
      ]);
      await tx.planAnualVersion.create({ data: { tenantId: ctx.tenant.id, planId, numero: plan.versionPublicada + 1, temas, unidades, conformidades: conformidadesFoto, motivo: motivo ?? null, publicadoPorId: ctx.membership.id } });
      await tx.planAnual.update({ where: { id: planId }, data: { versionPublicada: plan.versionPublicada + 1, publicadoPorId: ctx.membership.id, publicadoAt: new Date() } });
    }
    await tx.planAnualEvento.create({ data: { tenantId: ctx.tenant.id, planId, actorId: ctx.membership.id, tipo: accion, detalle: { ronda: accion === "enviar_revision" || accion === "reenviar_revision" ? plan.rondaRevision + 1 : plan.rondaRevision, version: accion === "publicar" ? plan.versionPublicada + 1 : plan.versionPublicada, ...(motivo ? { motivo } : {}) } } });
    return { estado: t.siguiente };
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "plan_anual", entidadId: planId, detalle: { tipo: accion } });
  return resultado;
}
export async function enviarARevision(ctx: TenantContext, planId: string) { await sincronizarParticipantes(ctx, planId); return transicionar(ctx, planId, "enviar_revision"); }
export async function reenviarARevision(ctx: TenantContext, planId: string) { return transicionar(ctx, planId, "reenviar_revision"); }
export async function aprobar(ctx: TenantContext, planId: string) { return transicionar(ctx, planId, "aprobar"); }
export async function publicar(ctx: TenantContext, planId: string) { return transicionar(ctx, planId, "publicar"); }
export async function abrirRevision(ctx: TenantContext, planId: string, motivo: string) {
  const r = esquemaMotivo.safeParse(motivo);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Explica el motivo.");
  const res = await transicionar(ctx, planId, "abrir_revision", r.data);
  await sincronizarParticipantes(ctx, planId);
  return res;
}
export async function versiones(ctx: TenantContext, planId: string) {
  await requireAccesoPlan(ctx, planId);
  return ctx.db.planAnualVersion.findMany({ where: { planId }, orderBy: { numero: "desc" } });
}
export async function eventos(ctx: TenantContext, planId: string) {
  await requireAccesoPlan(ctx, planId);
  return ctx.db.planAnualEvento.findMany({ where: { planId }, orderBy: { createdAt: "desc" } });
}
