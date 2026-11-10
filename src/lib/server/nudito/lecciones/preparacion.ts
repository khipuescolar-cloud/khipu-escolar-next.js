import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { temaPorClaveConBanco } from "@/lib/nudito/conocimiento/servidor";
import { esquemaLeccion, hashContenido, validarLeccion, type Leccion } from "@/lib/nudito/leccion";
import { dbTenant, type DbTenant } from "../../db";
import type { TenantContext } from "../../tenant";
import { ErrorDeNegocio } from "../../contexto-accion";
import { requireAccesoPlan } from "../../plan-anual/acceso";
import { temaDeColegio } from "../catalogo";
import { obtenerProveedorTutor } from "../ia/proveedor";
import { registrarConsumo } from "../ia/consumo";
import { armarLeccionCatalogo, fotoDelPlan } from "./index";
import { inicioMesLima } from "../../nudito-plus/uso";

export async function prepararMateriales(ctx: TenantContext, planId: string) {
  const { plan, claves } = await fotoDelPlan(ctx, planId);
  const trabajo = await ctx.db.nuditoTrabajoContenido.upsert({
    where: { tenantId_planId_versionPlan: { tenantId: ctx.tenant.id, planId, versionPlan: plan.versionPublicada } },
    create: { tenantId: ctx.tenant.id, planId, versionPlan: plan.versionPublicada, total: claves.length, creadoPorId: ctx.membership.id,
      items: { create: claves.map(temaClave => ({ tenantId: ctx.tenant.id, temaClave })) } },
    update: {},
  });
  return trabajo;
}

type Opciones = { lote?: number; concurrencia?: number };
const COSTO_RESERVA_USD = 0.01;

async function costoMes(dbT: DbTenant) {
  const inicio = inicioMesLima();
  const r = await dbT.nuditoConsumoIa.aggregate({ where: { createdAt: { gte: inicio } }, _sum: { costoEstimadoUsd: true } });
  return Number(r._sum.costoEstimadoUsd ?? 0);
}

async function temaDeItem(dbT: DbTenant, clave: string) {
  if (!clave.startsWith("col:")) return temaPorClaveConBanco(clave);
  const fila = await dbT.nuditoTemaColegio.findFirst({ where: { id: clave.slice(4), activo: true } });
  return fila ? temaDeColegio(fila) : null;
}

async function procesarItem(dbT: DbTenant, tenantId: string, itemId: string, temaClave: string, area: string) {
  const existente = await dbT.nuditoLeccion.findFirst({ where: { temaClave, estado: "publicada" }, orderBy: { version: "desc" } });
  if (existente) {
    await dbT.nuditoTrabajoItem.update({ where: { id: itemId }, data: { estado: "reutilizada", leccionId: existente.id, error: null } });
    return "reutilizada" as const;
  }
  const tema = await temaDeItem(dbT, temaClave);
  if (!tema || tema.area !== area) throw new Error("El tema no existe en el catálogo del plan.");
  const proveedor = await obtenerProveedorTutor();
  let contenido: Leccion;
  let consumo: Awaited<ReturnType<NonNullable<typeof proveedor.generarLeccion>>>["consumo"] | null = null;
  let origen: "catalogo" | "ia" | "ia_simulada";
  if (tema.origen === "cneb") {
    contenido = armarLeccionCatalogo(tema);
    origen = "catalogo";
  } else {
    if (!proveedor.generarLeccion) throw new Error("El proveedor no prepara lecciones.");
    let salida;
    try {
      salida = await proveedor.generarLeccion({ tema, grado: tema.grado, nivel: tema.nivel });
    } catch (error) {
      await registrarConsumo(dbT, { tenantId, alumnoId: null, sesionId: null, operacion: "generar_leccion", ok: false,
        error: String(error), consumo: { proveedor: proveedor.nombre, modelo: null, tokensEntrada: 0, tokensSalida: 0, latenciaMs: 0, cache: false, simulado: proveedor.simulado } });
      throw error;
    }
    const parsed = esquemaLeccion.safeParse(salida.datos);
    if (!parsed.success) {
      await registrarConsumo(dbT, { tenantId, alumnoId: null, sesionId: null, operacion: "generar_leccion", ok: false,
        error: "La lección generada no cumple el esquema.", consumo: salida.consumo });
      throw new Error("La lección generada no cumple el esquema.");
    }
    contenido = parsed.data;
    consumo = salida.consumo;
    origen = proveedor.simulado ? "ia_simulada" : "ia";
  }
  const validacion = validarLeccion(contenido);
  if (!validacion.ok && !validacion.errores.every(e => e === "El enlace no pertenece a un sitio permitido.")) throw new Error(validacion.errores.join(" "));
  const ultima = await dbT.nuditoLeccion.findFirst({ where: { temaClave }, orderBy: { version: "desc" }, select: { version: true } });
  const leccion = await dbT.nuditoLeccion.create({ data: {
    tenantId, temaClave, area, version: (ultima?.version ?? 0) + 1, estado: "borrador", origen,
    contenido: contenido as Prisma.InputJsonValue, contenidoHash: hashContenido(contenido),
    validacion: validacion as Prisma.InputJsonValue,
  } });
  if (consumo) await registrarConsumo(dbT, { tenantId, alumnoId: null, leccionId: leccion.id, sesionId: null, operacion: "generar_leccion", consumo, ok: true });
  await dbT.nuditoTrabajoItem.update({ where: { id: itemId }, data: { estado: "generada", leccionId: leccion.id, error: null } });
  return "generada" as const;
}

/** Worker acotado y reanudable: nunca toma más de cinco ítems por llamada. */
export async function procesarLoteInterno(tenantId: string, trabajoId: string, opciones: Opciones = {}) {
  const dbT = dbTenant(tenantId);
  const trabajo = await dbT.nuditoTrabajoContenido.findFirst({ where: { id: trabajoId } });
  if (!trabajo || trabajo.estado === "cancelado") throw new ErrorDeNegocio("No se encontró el trabajo de contenido.");
  const plan = await dbT.planAnual.findFirst({ where: { id: trabajo.planId }, select: { area: true } });
  if (!plan) throw new ErrorDeNegocio("No se encontró el plan.");
  const lote = Math.min(5, Math.max(1, opciones.lote ?? 5));
  const concurrencia = Math.min(2, Math.max(1, opciones.concurrencia ?? 2));
  // Recupera un ítem reclamado por una ejecución interrumpida.
  await dbT.nuditoTrabajoItem.updateMany({ where: { trabajoId, estado: "en_proceso", updatedAt: { lt: new Date(Date.now() - 10 * 60_000) } }, data: { estado: "fallida", error: "La preparación se interrumpió; se retomará en el siguiente lote." } });
  const items = await dbT.nuditoTrabajoItem.findMany({ where: { trabajoId, estado: { in: ["pendiente", "fallida"] }, intentos: { lt: 3 } }, orderBy: { updatedAt: "asc" }, take: lote });
  const config = await dbT.nuditoConfigColegio.findFirst({ select: { topeCostoUsdMes: true } });
  let costoTrabajo = Number(trabajo.costoUsd);
  let costoColegio = await costoMes(dbT);
  await dbT.nuditoTrabajoContenido.update({ where: { id: trabajoId }, data: { estado: "en_proceso", iniciadoAt: trabajo.iniciadoAt ?? new Date() } });
  for (let i = 0; i < items.length; i += concurrencia) {
    const grupo = items.slice(i, i + concurrencia);
    // Se reserva costo antes de la llamada para que dos solicitudes del mismo lote no rebasen el cupo.
    const elegibles = [];
    for (const item of grupo) {
      const vigente = await dbT.nuditoLeccion.findFirst({ where: { temaClave: item.temaClave, estado: "publicada" }, select: { id: true } });
      const requiereIa = item.temaClave.startsWith("col:") && !vigente;
      if (requiereIa && ((trabajo.presupuestoUsd !== null && costoTrabajo + COSTO_RESERVA_USD > Number(trabajo.presupuestoUsd))
        || (config?.topeCostoUsdMes !== null && config?.topeCostoUsdMes !== undefined && costoColegio + COSTO_RESERVA_USD > Number(config.topeCostoUsdMes)))) continue;
      if (requiereIa) { costoTrabajo += COSTO_RESERVA_USD; costoColegio += COSTO_RESERVA_USD; }
      elegibles.push(item);
    }
    await Promise.all(elegibles.map(async item => {
      const reclamado = await dbT.nuditoTrabajoItem.updateMany({ where: { id: item.id, estado: { in: ["pendiente", "fallida"] }, intentos: { lt: 3 } }, data: { estado: "en_proceso", intentos: { increment: 1 } } });
      if (!reclamado.count) return;
      try { await procesarItem(dbT, tenantId, item.id, item.temaClave, plan.area); }
      catch (error) {
        await dbT.nuditoTrabajoItem.update({ where: { id: item.id }, data: { estado: "fallida", error: String(error).slice(0,300) } });
      }
    }));
  }
  const conteos = await dbT.nuditoTrabajoItem.groupBy({ by: ["estado"], where: { trabajoId }, _count: { _all: true } });
  const n = (estado: string) => conteos.find(c => c.estado === estado)?._count._all ?? 0;
  const consumos = await dbT.nuditoConsumoIa.aggregate({ where: { leccionId: { in: (await dbT.nuditoTrabajoItem.findMany({ where: { trabajoId }, select: { leccionId: true } })).flatMap(i => i.leccionId ? [i.leccionId] : []) }, operacion: "generar_leccion" }, _sum: { costoEstimadoUsd: true } });
  const pendientes = n("pendiente") + n("en_proceso") + n("fallida");
  const terminado = pendientes === 0;
  const reintentables = await dbT.nuditoTrabajoItem.count({ where: { trabajoId, estado: { in: ["pendiente", "fallida"] }, intentos: { lt: 3 } } });
  const agotado = pendientes > 0 && reintentables === 0;
  return dbT.nuditoTrabajoContenido.update({ where: { id: trabajoId }, data: {
    procesados: n("reutilizada") + n("generada") + n("omitida"), reutilizados: n("reutilizada"), generados: n("generada"), fallidos: n("fallida"),
    costoUsd: Number(consumos._sum.costoEstimadoUsd ?? 0), estado: terminado ? "completado" : agotado ? "fallido" : "pendiente", terminadoAt: terminado || agotado ? new Date() : null,
  } });
}

export async function procesarLote(ctx: TenantContext, trabajoId: string, opciones: Opciones = {}) {
  const trabajo = await ctx.db.nuditoTrabajoContenido.findFirst({ where: { id: trabajoId } });
  if (!trabajo) throw new ErrorDeNegocio("No se encontró el trabajo.");
  await requireAccesoPlan(ctx, trabajo.planId);
  return procesarLoteInterno(ctx.tenant.id, trabajoId, opciones);
}

export async function metricasContenido(ctx: TenantContext, rango: { desde?: Date; hasta?: Date } = {}) {
  const consumos = await ctx.db.nuditoConsumoIa.findMany({ where: { operacion: "generar_leccion", createdAt: { ...(rango.desde ? { gte: rango.desde } : {}), ...(rango.hasta ? { lte: rango.hasta } : {}) } },
    select: { tokensEntrada: true, tokensSalida: true, costoEstimadoUsd: true, ok: true } });
  const items = await ctx.db.nuditoTrabajoItem.groupBy({ by: ["estado"], _count: { _all: true } });
  const n = (estado: string) => items.find(i => i.estado === estado)?._count._all ?? 0;
  const pendientesAprobacion = await ctx.db.nuditoLeccion.count({ where: { estado: { in: ["borrador", "en_revision", "cambios_solicitados", "aprobada"] } } });
  const activos = await ctx.db.nuditoSesion.groupBy({ by: ["alumnoId"], where: { iniciadaAt: { ...(rango.desde ? { gte: rango.desde } : {}), ...(rango.hasta ? { lte: rango.hasta } : {}) } } });
  const costoColegioUsd = consumos.reduce((s,c) => s + Number(c.costoEstimadoUsd), 0);
  return { reutilizadas: n("reutilizada"), generadas: n("generada"), solicitudesIa: consumos.length,
    tokens: consumos.reduce((s,c) => s + c.tokensEntrada + c.tokensSalida, 0), costoColegioUsd,
    costoPorAlumnoActivoUsd: activos.length ? costoColegioUsd / activos.length : 0,
    errores: consumos.filter(c => !c.ok).length + n("fallida"), pendientesAprobacion };
}
