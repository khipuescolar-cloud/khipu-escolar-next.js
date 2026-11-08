import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { esquemaOrdenarTemas } from "@/lib/plan-anual/contratos";
import { editable } from "@/lib/plan-anual/estados";
import { temaPorClave, temasDe, fuenteConocida } from "@/lib/nudito/catalogo";
import { esquemaArea, esquemaTema, type AreaNudito, type Tema } from "@/lib/nudito/contratos";
import { auditar } from "@/lib/server/auditoria";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { PREFIJO_TEMA_COLEGIO, esquemaTemaColegioEntrada, temaDeColegio } from "@/lib/server/nudito/catalogo";
import type { TenantContext } from "@/lib/server/tenant";
import { requireAccesoPlan } from "./acceso";
import { registrarEvento } from "./planes";

async function catalogoDelPlan(ctx: TenantContext, planId: string) {
  const plan = await requireAccesoPlan(ctx, planId);
  const area = esquemaArea.safeParse(plan.area);
  if (!area.success) return { plan, temas: [] as Tema[] };
  const propios = await ctx.db.nuditoTemaColegio.findMany({ where: { area: plan.area, nivel: plan.nivel, grado: plan.grado, activo: true } });
  return { plan, temas: [...temasDe(area.data as AreaNudito, plan.nivel as "primaria" | "secundaria").filter(t => t.grado === plan.grado), ...propios.map(temaDeColegio)] };
}
export async function buscarCatalogo(ctx: TenantContext, planId: string, filtro: { texto?: string; competencia?: number; pagina?: number } = {}) {
  const { temas } = await catalogoDelPlan(ctx, planId);
  const seleccionados = new Set((await ctx.db.planAnualTema.findMany({ where: { planId }, select: { temaClave: true } })).map(t => t.temaClave));
  const texto = filtro.texto?.trim().toLocaleLowerCase("es-PE") ?? "";
  const filtrados = temas.filter(t => (!texto || [t.nombre, t.subtema, t.descripcionCorta, ...t.palabrasClave].filter(Boolean).join(" ").toLocaleLowerCase("es-PE").includes(texto)) && (!filtro.competencia || t.competenciaCneb === filtro.competencia));
  const pagina = Math.max(1, Math.floor(filtro.pagina || 1));
  const tamano = 20;
  return { total: filtrados.length, pagina, paginas: Math.max(1, Math.ceil(filtrados.length / tamano)), temas: filtrados.slice((pagina - 1) * tamano, pagina * tamano).map(t => ({ ...t, seleccionado: seleccionados.has(t.clave) })) };
}
function exigirEditable(estado: string) {
  if (!editable(estado as "borrador" | "con_observaciones")) throw new ErrorDeNegocio("Solo puedes editar temas en borrador o con observaciones.");
}
export async function agregarTemas(ctx: TenantContext, planId: string, temaClaves: string[]) {
  const { plan, temas } = await catalogoDelPlan(ctx, planId);
  exigirEditable(plan.estado);
  const claves = [...new Set(temaClaves)];
  if (!claves.length || claves.length > 100) throw new ErrorDeNegocio("Elige entre 1 y 100 temas.");
  const validas = new Set(temas.map(t => t.clave));
  if (claves.some(c => !validas.has(c))) throw new ErrorDeNegocio("Hay temas que no pertenecen al catálogo de este grado.");
  const existentes = new Set((await ctx.db.planAnualTema.findMany({ where: { planId }, select: { temaClave: true } })).map(t => t.temaClave));
  const nuevas = claves.filter(c => !existentes.has(c));
  if (nuevas.length) {
    await ctx.db.planAnualTema.createMany({ data: nuevas.map((temaClave, i) => ({ tenantId: ctx.tenant.id, planId, temaClave, orden: existentes.size + i, propuestoPorId: ctx.membership.id })) });
    await registrarEvento(ctx, planId, "agregar_temas", { cantidad: nuevas.length });
  }
  return { agregados: nuevas.length };
}
export async function quitarTema(ctx: TenantContext, planId: string, temaClave: string) {
  const plan = await requireAccesoPlan(ctx, planId); exigirEditable(plan.estado);
  const r = await ctx.db.planAnualTema.deleteMany({ where: { planId, temaClave } });
  if (!r.count) throw new ErrorDeNegocio("El tema no está en el plan.");
  await registrarEvento(ctx, planId, "quitar_tema", { temaClave });
}
export async function ordenarTemas(ctx: TenantContext, planId: string, entrada: unknown) {
  const plan = await requireAccesoPlan(ctx, planId); exigirEditable(plan.estado);
  const r = esquemaOrdenarTemas.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa el orden.");
  const actuales = await ctx.db.planAnualTema.findMany({ where: { planId }, select: { temaClave: true } });
  if (r.data.length !== actuales.length || r.data.some(t => !actuales.some(a => a.temaClave === t.temaClave))) throw new ErrorDeNegocio("El orden debe incluir todos los temas del plan.");
  const ids = new Set((await ctx.db.planAnualUnidad.findMany({ where: { planId }, select: { id: true } })).map(u => u.id));
  if (r.data.some(t => t.unidadId && !ids.has(t.unidadId))) throw new ErrorDeNegocio("Una unidad no pertenece al plan.");
  await ctx.db.$transaction(async tx => {
    for (const t of r.data) await tx.planAnualTema.updateMany({ where: { tenantId: ctx.tenant.id, planId, temaClave: t.temaClave }, data: { orden: t.orden, unidadId: t.unidadId ?? null } });
    await tx.planAnualEvento.create({ data: { tenantId: ctx.tenant.id, planId, actorId: ctx.membership.id, tipo: "ordenar_temas", detalle: { cantidad: r.data.length } } });
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "plan_anual", entidadId: planId, detalle: { tipo: "ordenar_temas" } });
}
export async function crearUnidad(ctx: TenantContext, planId: string, titulo: string) {
  const plan = await requireAccesoPlan(ctx, planId); exigirEditable(plan.estado);
  const nombre = z.string().trim().min(1).max(120).safeParse(titulo);
  if (!nombre.success) throw new ErrorDeNegocio("Escribe un título de hasta 120 caracteres.");
  const orden = await ctx.db.planAnualUnidad.count({ where: { planId } });
  const unidad = await ctx.db.planAnualUnidad.create({ data: { tenantId: ctx.tenant.id, planId, titulo: nombre.data, orden } });
  await registrarEvento(ctx, planId, "crear_unidad", { unidadId: unidad.id });
  return unidad;
}
export async function renombrarUnidad(ctx: TenantContext, planId: string, unidadId: string, titulo: string) {
  const plan = await requireAccesoPlan(ctx, planId); exigirEditable(plan.estado);
  const nombre = z.string().trim().min(1).max(120).safeParse(titulo);
  if (!nombre.success) throw new ErrorDeNegocio("Escribe un título de hasta 120 caracteres.");
  const r = await ctx.db.planAnualUnidad.updateMany({ where: { id: unidadId, planId }, data: { titulo: nombre.data } });
  if (!r.count) notFound();
  await registrarEvento(ctx, planId, "renombrar_unidad", { unidadId });
}
export async function eliminarUnidad(ctx: TenantContext, planId: string, unidadId: string) {
  const plan = await requireAccesoPlan(ctx, planId); exigirEditable(plan.estado);
  const r = await ctx.db.planAnualUnidad.deleteMany({ where: { id: unidadId, planId } });
  if (!r.count) notFound();
  await registrarEvento(ctx, planId, "eliminar_unidad", { unidadId });
}
export async function proponerTemaColegio(ctx: TenantContext, planId: string, entrada: unknown) {
  const plan = await requireAccesoPlan(ctx, planId); exigirEditable(plan.estado);
  const r = esquemaTemaColegioEntrada.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa los datos del tema.");
  const d = r.data;
  if (d.area !== plan.area || d.nivel !== plan.nivel || d.grado !== plan.grado) throw new ErrorDeNegocio("El tema debe ser del área y grado de este plan.");
  if (!fuenteConocida(d.fuente)) throw new ErrorDeNegocio("La fuente de ejercicios no existe.");
  const propios = d.prerrequisitos.filter(c => c.startsWith(PREFIJO_TEMA_COLEGIO)).map(c => c.slice(PREFIJO_TEMA_COLEGIO.length));
  const temasPropios = await ctx.db.nuditoTemaColegio.findMany({ where: { id: { in: propios }, activo: true } });
  if (d.prerrequisitos.some(c => c.startsWith(PREFIJO_TEMA_COLEGIO) ? !temasPropios.some(t => t.id === c.slice(PREFIJO_TEMA_COLEGIO.length) && t.area === d.area && t.nivel === d.nivel && t.grado <= d.grado) : (() => { const t = temaPorClave(c); return !t || t.area !== d.area || t.nivel !== d.nivel || t.grado > d.grado; })())) throw new ErrorDeNegocio("Revisa los prerrequisitos del tema.");
  const activo = d.fuente.tipo !== "banco";
  const tema = await ctx.db.nuditoTemaColegio.create({ data: {
    tenantId: ctx.tenant.id, area: d.area, nivel: d.nivel, grado: d.grado, competenciaCneb: d.competenciaCneb, capacidad: d.capacidad ?? null,
    nombre: d.nombre, subtema: d.subtema ?? null, descripcion: d.descripcion, palabrasClave: d.palabrasClave,
    prerrequisitos: d.prerrequisitos, dificultadMin: d.dificultadMin, dificultadMax: d.dificultadMax, tipos: d.tipos,
    fuente: d.fuente, recursos: [], activo, creadoPorId: ctx.user.id,
  } });
  if (!esquemaTema.safeParse(temaDeColegio(tema)).success) {
    await ctx.db.nuditoTemaColegio.deleteMany({ where: { id: tema.id } });
    throw new ErrorDeNegocio("Revisa los datos del tema.");
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "nudito_tema_colegio", entidadId: tema.id, detalle: { planId } });
  await registrarEvento(ctx, planId, "proponer_tema", { temaClave: PREFIJO_TEMA_COLEGIO + tema.id });
  return { id: tema.id, clave: PREFIJO_TEMA_COLEGIO + tema.id, activo };
}
