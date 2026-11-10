import "server-only";
import { notFound } from "next/navigation";
import { AREAS_NUDITO, type AreaNudito } from "@/lib/nudito/contratos";
import { temaPorClaveConBanco, temasDeConBanco } from "@/lib/nudito/conocimiento/servidor";
import { clavesDeVersion } from "@/lib/nudito/plan-publicado-reglas";
import { auditar } from "@/lib/server/auditoria";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import type { TenantContext } from "@/lib/server/tenant";
import { docentesDelGrupo, gruposDelDocente, requireAccesoPlan, type GrupoCurricular } from "./acceso";

export function areaPermitida(area: string): area is AreaNudito { return AREAS_NUDITO.some(a => a === area); }
export function aceptacionesCompletas(docentes: readonly string[], aceptaron: readonly string[]): boolean {
  return docentes.length > 0 && docentes.every(id => aceptaron.includes(id));
}
async function accesoEdicion(ctx: TenantContext, id: string) {
  if (ctx.rol !== "profesor") notFound();
  const plan = await requireAccesoPlan(ctx, id, { editar: true });
  if (!areaPermitida(plan.area) || plan.estado === "archivado") throw new ErrorDeNegocio("Este temario no se puede editar.");
  const docentes = await docentesDelGrupo(ctx.db, plan);
  if (!docentes.some(d => d.membershipId === ctx.membership.id)) notFound();
  return plan;
}
export async function crearTemario(ctx: TenantContext, grupo: GrupoCurricular) {
  if (ctx.rol !== "profesor") notFound();
  if (!areaPermitida(grupo.area)) throw new ErrorDeNegocio("Nudito solo admite Matemática, Comunicación y Ciencia y Tecnología.");
  if (!(await gruposDelDocente(ctx)).some(g => g.anio === grupo.anio && g.nivel === grupo.nivel && g.grado === grupo.grado && g.area === grupo.area)) notFound();
  const existente = await ctx.db.planAnual.findFirst({ where: { anio: grupo.anio, nivel: grupo.nivel, grado: grupo.grado, area: grupo.area } });
  if (existente) return existente;
  const docentes = await docentesDelGrupo(ctx.db, grupo);
  const plan = await ctx.db.planAnual.create({ data: { tenantId: ctx.tenant.id, anio: grupo.anio, nivel: grupo.nivel, grado: grupo.grado, area: grupo.area,
    nombreCurso: grupo.nombreCurso, creadoPorId: ctx.membership.id,
    participantes: { create: docentes.map(d => ({ tenantId: ctx.tenant.id, membershipId: d.membershipId, rol: "docente" as const })) } } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "plan_anual", entidadId: plan.id });
  return plan;
}
export async function sincronizarParticipantes(ctx: TenantContext, id: string) {
  const plan = await requireAccesoPlan(ctx, id);
  const docentes = await docentesDelGrupo(ctx.db, plan);
  const activos = new Set(docentes.map(d => d.membershipId));
  const anteriores = await ctx.db.planAnualParticipante.findMany({ where: { planId: id } });
  for (const d of docentes) {
    const anterior = anteriores.find(p => p.membershipId === d.membershipId);
    if (!anterior) await ctx.db.planAnualParticipante.create({ data: { tenantId: ctx.tenant.id, planId: id, membershipId: d.membershipId, rol: "docente" } });
    else if (!anterior.activo || anterior.fueraDeAsignacion) await ctx.db.planAnualParticipante.update({ where: { id: anterior.id }, data: { activo: true, fueraDeAsignacion: false } });
  }
  for (const p of anteriores.filter(p => p.activo && !activos.has(p.membershipId))) await ctx.db.planAnualParticipante.update({ where: { id: p.id }, data: { activo: false, fueraDeAsignacion: true } });
}
export async function detalleTemario(ctx: TenantContext, id: string) {
  const plan = await requireAccesoPlan(ctx, id);
  if (!areaPermitida(plan.area)) notFound();
  const [temas, comentarios, docentes, conformidades] = await Promise.all([
    ctx.db.planAnualTema.findMany({ where: { planId: id }, orderBy: { orden: "asc" } }),
    ctx.db.planAnualComentario.findMany({ where: { planId: id, esObservacion: false }, orderBy: { createdAt: "asc" }, include: { autor: { select: { user: { select: { nombres: true, apellidos: true } } } } } }),
    docentesDelGrupo(ctx.db, plan),
    ctx.db.planAnualConformidad.findMany({ where: { planId: id, ronda: plan.rondaRevision, decision: "conforme" }, select: { membershipId: true } }),
  ]);
  return { plan, temas, comentarios, docentes: docentes.map(d => ({ ...d, acepto: conformidades.some(c => c.membershipId === d.membershipId) })) };
}
export function estadoTemario(cantidad: number, docentes: readonly { nombre: string; acepto: boolean }[], habilitado: boolean): string {
  if (!cantidad && !habilitado) return "Sin temario";
  const faltan = docentes.filter(d => !d.acepto).map(d => d.nombre);
  return faltan.length ? "En revisión (falta aceptar: " + faltan.join(", ") + ")" : "Habilitado para alumnos";
}
async function cambiar(ctx: TenantContext, id: string, operacion: "agregar" | "quitar" | "mover", claves: string[], direccion?: "arriba" | "abajo") {
  const plan = await accesoEdicion(ctx, id);
  await ctx.db.$transaction(async tx => {
    const actual = await tx.planAnual.findFirst({ where: { id, tenantId: ctx.tenant.id } });
    if (!actual || actual.rondaRevision !== plan.rondaRevision) throw new ErrorDeNegocio("El temario cambió. Actualiza la página.");
    const temas = await tx.planAnualTema.findMany({ where: { planId: id }, orderBy: { orden: "asc" } });
    if (operacion === "agregar" && claves.every(c => temas.some(t => t.temaClave === c))) throw new ErrorDeNegocio("Los temas ya están en el temario.");
    if (operacion === "quitar" && !temas.some(t => t.temaClave === claves[0])) throw new ErrorDeNegocio("El tema no está en el temario.");
    if (operacion === "mover") {
      const i = temas.findIndex(t => t.temaClave === claves[0]), j = i + (direccion === "arriba" ? -1 : 1);
      if (i < 0 || j < 0 || j >= temas.length) throw new ErrorDeNegocio("El tema ya está en el extremo.");
      [temas[i], temas[j]] = [temas[j], temas[i]];
    }
    const bloqueo = await tx.planAnual.updateMany({ where: { id, tenantId: ctx.tenant.id, rondaRevision: actual.rondaRevision }, data: { rondaRevision: { increment: 1 }, estado: "borrador" } });
    if (!bloqueo.count) throw new ErrorDeNegocio("El temario cambió. Actualiza la página.");
    if (operacion === "agregar") {
      const nuevas = claves.filter(c => !temas.some(t => t.temaClave === c));
      await tx.planAnualTema.createMany({ data: nuevas.map((temaClave, i) => ({ tenantId: ctx.tenant.id, planId: id, temaClave, orden: temas.length + i, propuestoPorId: ctx.membership.id })) });
    } else if (operacion === "quitar") await tx.planAnualTema.deleteMany({ where: { planId: id, temaClave: claves[0] } });
    else for (let i = 0; i < temas.length; i++) await tx.planAnualTema.update({ where: { id: temas[i].id }, data: { orden: i } });
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "plan_anual", entidadId: id, detalle: { tipo: operacion } });
}
export async function agregarTemasTemario(ctx: TenantContext, id: string, claves: string[]) {
  const plan = await accesoEdicion(ctx, id);
  const unicas = [...new Set(claves)];
  if (!unicas.length || unicas.length > 300) throw new ErrorDeNegocio("Elige entre 1 y 300 temas.");
  const validas = new Set((await temasDeConBanco(plan.area as AreaNudito, plan.nivel as "primaria" | "secundaria", plan.grado)).map(t => t.clave));
  if (unicas.some(c => !validas.has(c) || c.startsWith("col:"))) throw new ErrorDeNegocio("Elige temas del catálogo global de este grado y curso.");
  await cambiar(ctx, id, "agregar", unicas);
}
export async function quitarTemaTemario(ctx: TenantContext, id: string, clave: string) { await cambiar(ctx, id, "quitar", [clave]); }
export async function moverTemaTemario(ctx: TenantContext, id: string, clave: string, direccion: "arriba" | "abajo") { await cambiar(ctx, id, "mover", [clave], direccion); }
export async function comentarTemaTemario(ctx: TenantContext, id: string, clave: string, contenido: string) {
  await accesoEdicion(ctx, id);
  const texto = contenido.trim();
  if (!texto || texto.length > 3000) throw new ErrorDeNegocio("Escribe un comentario de hasta 3000 caracteres.");
  if (!(await ctx.db.planAnualTema.findFirst({ where: { planId: id, temaClave: clave } }))) throw new ErrorDeNegocio("El tema no pertenece al temario.");
  const c = await ctx.db.planAnualComentario.create({ data: { tenantId: ctx.tenant.id, planId: id, temaClave: clave, autorId: ctx.membership.id, contenido: texto, esObservacion: false } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "plan_anual_comentario", entidadId: c.id });
}
export async function aceptarTemario(ctx: TenantContext, id: string) {
  const plan = await accesoEdicion(ctx, id);
  await sincronizarParticipantes(ctx, id);
  const docentes = await docentesDelGrupo(ctx.db, plan);
  await ctx.db.$transaction(async tx => {
    const actual = await tx.planAnual.findFirst({ where: { id, tenantId: ctx.tenant.id } });
    if (!actual || actual.rondaRevision !== plan.rondaRevision) throw new ErrorDeNegocio("El temario cambió. Actualiza la página.");
    const temas = await tx.planAnualTema.findMany({ where: { planId: id }, orderBy: { orden: "asc" } });
    if (!temas.length) throw new ErrorDeNegocio("Agrega al menos un tema antes de aceptar.");
    const bloqueo = await tx.planAnual.updateMany({ where: { id, tenantId: ctx.tenant.id, rondaRevision: actual.rondaRevision }, data: { updatedAt: new Date() } });
    if (!bloqueo.count) throw new ErrorDeNegocio("El temario cambió. Actualiza la página.");
    await tx.planAnualConformidad.upsert({ where: { planId_ronda_membershipId: { planId: id, ronda: actual.rondaRevision, membershipId: ctx.membership.id } }, create: { tenantId: ctx.tenant.id, planId: id, ronda: actual.rondaRevision, membershipId: ctx.membership.id, decision: "conforme" }, update: { decision: "conforme" } });
    const conformes = await tx.planAnualConformidad.findMany({ where: { planId: id, ronda: actual.rondaRevision, decision: "conforme" }, select: { membershipId: true } });
    if (aceptacionesCompletas(docentes.map(d => d.membershipId), conformes.map(c => c.membershipId)) && actual.estado !== "publicado") {
      const numero = actual.versionPublicada + 1;
      await tx.planAnualVersion.create({ data: { tenantId: ctx.tenant.id, planId: id, numero, temas: temas.map(t => ({ temaClave: t.temaClave, orden: t.orden })), unidades: [], conformidades: conformes, publicadoPorId: ctx.membership.id } });
      await tx.planAnual.update({ where: { id }, data: { estado: "publicado", versionPublicada: numero, publicadoPorId: ctx.membership.id, publicadoAt: new Date() } });
    } else if (actual.estado !== "publicado") await tx.planAnual.update({ where: { id }, data: { estado: "en_revision" } });
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "plan_anual", entidadId: id, detalle: { tipo: "aceptar_temario" } });
}
export async function copiarTemarioAnterior(ctx: TenantContext, id: string) {
  const actual = await accesoEdicion(ctx, id);
  if (await ctx.db.planAnualTema.count({ where: { planId: id } })) throw new ErrorDeNegocio("Solo puedes copiar en un temario vacío.");
  const anterior = await ctx.db.planAnual.findFirst({ where: { anio: actual.anio - 1, nivel: actual.nivel, grado: actual.grado, area: actual.area } });
  if (!anterior) throw new ErrorDeNegocio("No hay temario del año anterior.");
  const foto = anterior.versionPublicada > 0 ? await ctx.db.planAnualVersion.findFirst({ where: { planId: anterior.id, numero: anterior.versionPublicada }, select: { temas: true } }) : null;
  const claves = foto ? clavesDeVersion(foto.temas) : (await ctx.db.planAnualTema.findMany({ where: { planId: anterior.id }, orderBy: { orden: "asc" } })).map(t => t.temaClave);
  const validas = new Set((await temasDeConBanco(actual.area as AreaNudito, actual.nivel as "primaria" | "secundaria", actual.grado)).map(t => t.clave));
  await agregarTemasTemario(ctx, id, claves.filter(c => validas.has(c)));
}
export async function nombreTemaTemario(clave: string) { return (await temaPorClaveConBanco(clave))?.nombre ?? clave; }
