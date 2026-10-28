import "server-only";
import { cache } from "react";
import type { Tenant } from "@/generated/prisma/client";
import type { Plan, Rol } from "@/generated/prisma/enums";
import { esModulo, MODULO_ESENCIAL, MODULOS, resolverModulos, type AccesoModulos, type AjusteModulo, type ModulosResueltos } from "@/lib/modulos";
import { NOMBRE_PLAN, ORDEN_PLANES, planMinimo, type Feature } from "@/lib/planes";
import { db } from "./db";

// Resolución central de módulos (specs/19-planes-modulos-y-roles.md): qué módulos tiene cada colegio y
// qué módulos ve cada rol. Fuente de verdad: PlanModulo + TenantModulo + RolModulo (BD), con respaldo en
// `FEATURES` (código) si un plan no tiene filas. Caché en memoria de 30 s por proceso (se invalida al guardar
// desde el panel) y `cache` de React por request.

export const TTL_CACHE_MODULOS_MS = 30_000;

export type PlanDelCatalogo = { plan: Plan; nombre: string; orden: number; activo: boolean; modulos: string[] };

export type CatalogoModulos = {
  planes: PlanDelCatalogo[];
  /** Módulos desactivados por rol para todos los colegios (RolModulo con habilitado=false). */
  desactivadosPorRol: Map<Rol, Set<Feature>>;
};

type Entrada<T> = { valor: T; expira: number };

let memoriaCatalogo: Entrada<CatalogoModulos> | null = null;
const memoriaColegios = new Map<string, Entrada<AjusteModulo[]>>();

/** Vacía la caché en memoria: todo el catálogo, o solo los ajustes de un colegio. */
export function invalidarCacheModulos(alcance: { tenantId: string } | "todo" = "todo"): void {
  if (alcance === "todo") {
    memoriaCatalogo = null;
    memoriaColegios.clear();
  } else {
    memoriaColegios.delete(alcance.tenantId);
  }
}

async function leerCatalogo(): Promise<CatalogoModulos> {
  const [planes, roles] = await Promise.all([
    db.planCatalogo.findMany({ orderBy: { orden: "asc" }, include: { modulos: { select: { modulo: true } } } }),
    db.rolModulo.findMany({ where: { habilitado: false } }),
  ]);
  const desactivadosPorRol = new Map<Rol, Set<Feature>>();
  for (const r of roles) {
    if (!esModulo(r.modulo) || r.modulo === MODULO_ESENCIAL) continue;
    const s = desactivadosPorRol.get(r.rol) ?? new Set<Feature>();
    s.add(r.modulo);
    desactivadosPorRol.set(r.rol, s);
  }
  return {
    planes: planes.map((p) => ({ plan: p.plan, nombre: p.nombre, orden: p.orden, activo: p.activo, modulos: p.modulos.map((m) => m.modulo) })),
    desactivadosPorRol,
  };
}

/** Catálogo de planes y roles (caché en memoria de 30 s). */
export async function catalogoModulos(ahora = Date.now()): Promise<CatalogoModulos> {
  if (memoriaCatalogo && memoriaCatalogo.expira > ahora) return memoriaCatalogo.valor;
  const valor = await leerCatalogo();
  memoriaCatalogo = { valor, expira: ahora + TTL_CACHE_MODULOS_MS };
  return valor;
}

async function ajustesDelColegio(tenantId: string, ahora = Date.now()): Promise<AjusteModulo[]> {
  const guardado = memoriaColegios.get(tenantId);
  if (guardado && guardado.expira > ahora) return guardado.valor;
  const valor = await db.tenantModulo.findMany({ where: { tenantId }, select: { modulo: true, habilitado: true } });
  memoriaColegios.set(tenantId, { valor, expira: ahora + TTL_CACHE_MODULOS_MS });
  return valor;
}

const catalogoDelRequest = cache(() => catalogoModulos());
const ajustesDelRequest = cache((tenantId: string) => ajustesDelColegio(tenantId));

/** Módulos del colegio: los de su plan (BD, o `FEATURES` si el plan no tiene filas) ± ajustes TenantModulo. */
export async function modulosDelColegio(tenant: Pick<Tenant, "id" | "plan">): Promise<ModulosResueltos> {
  const [catalogo, ajustes] = await Promise.all([catalogoDelRequest(), ajustesDelRequest(tenant.id)]);
  const delPlan = catalogo.planes.find((p) => p.plan === tenant.plan)?.modulos ?? null;
  return resolverModulos(tenant.plan, delPlan, ajustes);
}

/** Nombre comercial de un plan según el catálogo (respaldo: NOMBRE_PLAN). */
export function nombreDelPlan(catalogo: CatalogoModulos, plan: Plan): string {
  return catalogo.planes.find((p) => p.plan === plan)?.nombre ?? NOMBRE_PLAN[plan];
}

/**
 * Plan más bajo (por orden) que incluye el módulo, para el candado. Prefiere planes activos (los que se ofrecen);
 * si ninguno lo incluye, null («No incluido»).
 */
export function planMinimoDelCatalogo(catalogo: CatalogoModulos, modulo: Feature): { plan: Plan; nombre: string } | null {
  if (catalogo.planes.length === 0) return { plan: planMinimo(modulo), nombre: NOMBRE_PLAN[planMinimo(modulo)] };
  const incluyen = catalogo.planes
    .filter((p) => (p.modulos.length > 0 ? p.modulos.includes(modulo) : ORDEN_PLANES[p.plan] >= ORDEN_PLANES[planMinimo(modulo)]))
    .sort((a, b) => Number(b.activo) - Number(a.activo) || a.orden - b.orden);
  const p = incluyen[0];
  return p ? { plan: p.plan, nombre: p.nombre } : null;
}

/** Módulos activos y datos de candado para el contexto del colegio (lo usa `resolverContextoColegio`). */
export async function accesoModulos(tenant: Pick<Tenant, "id" | "plan">, rol: Rol): Promise<{ modulos: ReadonlySet<Feature>; accesoModulos: AccesoModulos }> {
  const [catalogo, resueltos] = await Promise.all([catalogoDelRequest(), modulosDelColegio(tenant)]);
  const planMinimoPorModulo: Partial<Record<Feature, string | null>> = {};
  for (const m of MODULOS) {
    if (!resueltos.activos.has(m)) planMinimoPorModulo[m] = planMinimoDelCatalogo(catalogo, m)?.nombre ?? null;
  }
  return {
    modulos: resueltos.activos,
    accesoModulos: {
      quitadosColegio: resueltos.quitados,
      quitadosRol: catalogo.desactivadosPorRol.get(rol) ?? new Set(),
      nombrePlan: nombreDelPlan(catalogo, tenant.plan),
      planMinimo: planMinimoPorModulo,
    },
  };
}
