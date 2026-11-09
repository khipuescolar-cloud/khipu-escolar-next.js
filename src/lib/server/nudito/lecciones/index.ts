import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Tema } from "@/lib/nudito/contratos";
import { clavesDeVersion } from "@/lib/nudito/plan-publicado-reglas";
import { temaPorClaveConBanco } from "@/lib/nudito/conocimiento/servidor";
import { temaDeColegio } from "../catalogo";
import { esquemaLeccion, hashContenido, puedeTransicionarLeccion, validarLeccion, type AccionLeccion, type Leccion } from "@/lib/nudito/leccion";
import { auditar } from "../../auditoria";
import { ErrorDeNegocio } from "../../contexto-accion";
import { db, type DbTenant } from "../../db";
import type { TenantContext } from "../../tenant";
import { requireAccesoPlan } from "../../plan-anual/acceso";
import { muestrasDelTema } from "./muestras";

export async function leccionVigente(dbTenant: DbTenant, temaClave: string) {
  return dbTenant.nuditoLeccion.findFirst({ where: { temaClave, estado: "publicada" }, orderBy: { version: "desc" } });
}

export async function fotoDelPlan(ctx: TenantContext, planId: string) {
  const plan = await requireAccesoPlan(ctx, planId);
  if (!plan.versionPublicada) throw new ErrorDeNegocio("Publica el plan antes de preparar materiales.");
  const version = await ctx.db.planAnualVersion.findFirst({ where: { planId, numero: plan.versionPublicada } });
  if (!version) throw new ErrorDeNegocio("No se encontró la versión publicada.");
  return { plan, version, claves: clavesDeVersion(version.temas) };
}

export async function listarLeccionesDelPlan(ctx: TenantContext, planId: string) {
  const { plan, claves } = await fotoDelPlan(ctx, planId);
  const lecciones = await ctx.db.nuditoLeccion.findMany({ where: { temaClave: { in: claves }, area: plan.area }, orderBy: { version: "desc" } });
  const vigentes = new Map<string, typeof lecciones[number]>();
  for (const l of lecciones) if (!vigentes.has(l.temaClave)) vigentes.set(l.temaClave, l);
  return claves.map(temaClave => ({ temaClave, leccion: vigentes.get(temaClave) ?? null }));
}

export { armarLeccionCatalogo } from "./muestras";

/** Nombre visible de cada tema (catálogo global o tema propio del colegio) para no mostrar claves internas. */
export async function nombresDeTemas(dbTenant: DbTenant, claves: string[]): Promise<Map<string, string>> {
  const propios = claves.filter(c => c.startsWith("col:")).map(c => c.slice(4));
  const filas = propios.length ? await dbTenant.nuditoTemaColegio.findMany({ where: { id: { in: propios } }, select: { id: true, nombre: true } }) : [];
  return new Map(await Promise.all(claves.map(async clave => [clave, (await temaPorClaveConBanco(clave))?.nombre ?? filas.find(f => "col:" + f.id === clave)?.nombre ?? clave] as const)));
}


async function validarContenido(ctx: TenantContext, temaClave: string, contenido: Leccion) {
  const [sitios, propio] = await Promise.all([
    db.sitioPermitido.findMany({ where: { activo: true }, select: { dominio: true } }),
    temaClave.startsWith("col:") ? ctx.db.nuditoTemaColegio.findFirst({ where: { id: temaClave.slice(4) } }) : Promise.resolve(null),
  ]);
  const tema = temaClave.startsWith("col:") ? (propio ? temaDeColegio(propio) : null) : await temaPorClaveConBanco(temaClave);
  const verificadas = tema ? muestrasDelTema(tema) : [];
  return validarLeccion(contenido, {
    permitirEnlace: url => sitios.some(s => url.hostname === s.dominio || url.hostname.endsWith("." + s.dominio)),
    evaluar: muestra => verificadas.some(v => v.enunciado === muestra.enunciado && v.respuesta === muestra.respuesta),
  });
}

export async function crearBorrador(ctx: TenantContext, planId: string, tema: Tema, contenido: Leccion, origen: "catalogo" | "ia" | "ia_simulada" | "docente") {
  const { plan, claves } = await fotoDelPlan(ctx, planId);
  if (!claves.includes(tema.clave) || plan.area !== tema.area) throw new ErrorDeNegocio("Ese tema no pertenece al plan publicado.");
  const parsed = esquemaLeccion.parse(contenido);
  const ultima = await ctx.db.nuditoLeccion.findFirst({ where: { temaClave: tema.clave }, orderBy: { version: "desc" }, select: { version: true } });
  const leccion = await ctx.db.nuditoLeccion.create({ data: {
    tenantId: ctx.tenant.id, temaClave: tema.clave, area: tema.area, version: (ultima?.version ?? 0) + 1,
    estado: "borrador", origen, contenido: parsed as Prisma.InputJsonValue, contenidoHash: hashContenido(parsed),
    creadoPorId: ctx.membership.id,
  } });
  await ctx.db.nuditoLeccionRevision.create({ data: { tenantId: ctx.tenant.id, leccionId: leccion.id, actorId: ctx.membership.id, accion: "crear" } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "nudito_leccion", entidadId: leccion.id });
  return leccion;
}

async function leccionConAcceso(ctx: TenantContext, planId: string, leccionId: string) {
  const { plan, claves } = await fotoDelPlan(ctx, planId);
  const leccion = await ctx.db.nuditoLeccion.findFirst({ where: { id: leccionId, area: plan.area } });
  if (!leccion || !claves.includes(leccion.temaClave)) throw new ErrorDeNegocio("No se encontró la lección de este plan.");
  return { plan, leccion };
}

export async function editarLeccion(ctx: TenantContext, planId: string, leccionId: string, contenido: unknown) {
  const { leccion } = await leccionConAcceso(ctx, planId, leccionId);
  if (!["borrador", "cambios_solicitados"].includes(leccion.estado)) throw new ErrorDeNegocio("Esta lección no está editable.");
  const parsed = esquemaLeccion.parse(contenido);
  const validacion = await validarContenido(ctx, leccion.temaClave, parsed);
  const actualizada = await ctx.db.nuditoLeccion.update({ where: { id: leccionId }, data: {
    contenido: parsed as Prisma.InputJsonValue, contenidoHash: hashContenido(parsed),
    origen: "docente", validacion: validacion as Prisma.InputJsonValue,
  } });
  await ctx.db.nuditoLeccionRevision.create({ data: { tenantId: ctx.tenant.id, leccionId, actorId: ctx.membership.id, accion: "editar" } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "nudito_leccion", entidadId: leccionId });
  return actualizada;
}

async function transicionar(ctx: TenantContext, planId: string, leccionId: string, accion: AccionLeccion, comentario?: string) {
  const { plan, leccion } = await leccionConAcceso(ctx, planId, leccionId);
  if (accion === "publicar" && ctx.rol !== "direccion" && plan.coordinadorId !== ctx.membership.id) throw new ErrorDeNegocio("Solo la coordinación o dirección puede publicar.");
  const validacion = await validarContenido(ctx, leccion.temaClave, esquemaLeccion.parse(leccion.contenido));
  const decision = puedeTransicionarLeccion(leccion.estado, accion, { origen: leccion.origen, valida: validacion.ok });
  if (!decision.ok) throw new ErrorDeNegocio(decision.motivo);
  const ahora = new Date();
  const actualizada = await ctx.db.nuditoLeccion.update({ where: { id: leccionId }, data: {
    estado: decision.siguiente, validacion: validacion as Prisma.InputJsonValue, comentarioRevision: comentario?.slice(0, 1000) ?? null,
    ...(accion === "aprobar" ? { aprobadoPorId: ctx.membership.id, aprobadoAt: ahora } : {}),
    ...(accion === "publicar" ? { publicadoPorId: ctx.membership.id, publicadaAt: ahora } : {}),
  } });
  await ctx.db.nuditoLeccionRevision.create({ data: { tenantId: ctx.tenant.id, leccionId, actorId: ctx.membership.id, accion, comentario: comentario?.slice(0, 1000) } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "nudito_leccion", entidadId: leccionId, detalle: { accion } });
  return actualizada;
}

export const enviarARevision = (ctx: TenantContext, planId: string, leccionId: string) => transicionar(ctx, planId, leccionId, "enviar_revision");
export const solicitarCambios = (ctx: TenantContext, planId: string, leccionId: string, comentario: string) => transicionar(ctx, planId, leccionId, "solicitar_cambios", comentario);
export const aprobarLeccion = (ctx: TenantContext, planId: string, leccionId: string) => transicionar(ctx, planId, leccionId, "aprobar");
export const publicarLeccion = (ctx: TenantContext, planId: string, leccionId: string) => transicionar(ctx, planId, leccionId, "publicar");
export const retirarLeccion = (ctx: TenantContext, planId: string, leccionId: string, comentario: string) => transicionar(ctx, planId, leccionId, "retirar", comentario);
