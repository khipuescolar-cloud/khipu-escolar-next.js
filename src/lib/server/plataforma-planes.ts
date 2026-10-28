import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { Tenant } from "@/generated/prisma/client";
import type { Plan } from "@/generated/prisma/enums";
import { esModulo, MODULO_ESENCIAL, MODULOS, modulosDeCodigo, resolverModulos } from "@/lib/modulos";
import type { Feature } from "@/lib/planes";
import { ErrorDeNegocio } from "./contexto-accion";
import { db } from "./db";
import { invalidarCacheModulos } from "./modulos";
import { auditarPlataforma, type AdminContext } from "./plataforma";

// Panel de plataforma · «Planes y módulos» y «Módulos del colegio» (specs/19-planes-modulos-y-roles.md).
// Cada cambio se audita en `auditoria_plataforma` e invalida la caché de módulos (src/lib/server/modulos.ts).

export const PLANES: Plan[] = ["basico", "fase2", "promax"];

function validar<T extends z.ZodType>(esquema: T, entrada: unknown): z.infer<T> {
  const r = esquema.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa los datos.");
  return r.data;
}

const esquemaPlan = z.enum(["basico", "fase2", "promax"], "Elige un plan válido.");
const esquemaModulo = z.string().refine(esModulo, "Elige un módulo válido.");

/** Estados que cuentan como «colegio que usa el plan» (el suspendido no se ve afectado hoy). */
const ESTADOS_EN_USO = ["piloto", "activo"] as const;

// ───────────── Catálogo de planes ─────────────

export type PlanPanel = {
  plan: Plan;
  nombre: string;
  descripcion: string | null;
  precioPorAlumno: number | null;
  precioMinimoMensual: number | null;
  maxAlumnos: number | null;
  activo: boolean;
  orden: number;
  /** Módulos del plan (BD; si el plan no tiene filas, el respaldo en código). */
  modulos: Feature[];
  /** Colegios en piloto o activos con este plan. */
  colegios: number;
};

export async function planesDelCatalogo(_admin: AdminContext): Promise<PlanPanel[]> {
  void _admin; // solo se llama con un super administrador verificado
  const [planes, usos] = await Promise.all([
    db.planCatalogo.findMany({ orderBy: { orden: "asc" }, include: { modulos: { select: { modulo: true } } } }),
    db.tenant.groupBy({ by: ["plan"], where: { estado: { in: [...ESTADOS_EN_USO] } }, _count: { _all: true } }),
  ]);
  return planes.map((p) => ({
    plan: p.plan,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precioPorAlumno: p.precioPorAlumno === null ? null : Number(p.precioPorAlumno),
    precioMinimoMensual: p.precioMinimoMensual === null ? null : Number(p.precioMinimoMensual),
    maxAlumnos: p.maxAlumnos,
    activo: p.activo,
    orden: p.orden,
    modulos: [...resolverModulos(p.plan, p.modulos.map((m) => m.modulo)).delPlan],
    colegios: usos.find((u) => u.plan === p.plan)?._count._all ?? 0,
  }));
}

const numeroOpcional = (mensaje: string, max: number) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => (v === null || v === undefined || String(v).trim() === "" ? null : Number(String(v).replace(",", "."))))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= max), mensaje);

export const esquemaEditarPlan = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre comercial del plan.").max(40, "El nombre es muy largo."),
  descripcion: z.string().trim().max(300, "La descripción es muy larga (máx. 300).").optional().nullable().transform((v) => v || null),
  precioPorAlumno: numeroOpcional("El precio por alumno debe ser un monto entre 0 y 9 999.", 9999),
  precioMinimoMensual: numeroOpcional("El mínimo mensual debe ser un monto entre 0 y 999 999.", 999_999),
  maxAlumnos: numeroOpcional("El tope de alumnos debe ser un número entero positivo.", 1_000_000).refine(
    (v) => v === null || (Number.isInteger(v) && v > 0),
    "El tope de alumnos debe ser un número entero positivo.",
  ),
  activo: z.boolean(),
});

export async function editarPlan(admin: AdminContext, planCrudo: string, entrada: z.input<typeof esquemaEditarPlan>): Promise<void> {
  const plan = validar(esquemaPlan, planCrudo);
  const d = validar(esquemaEditarPlan, entrada);
  const antes = await db.planCatalogo.findUnique({ where: { plan } });
  if (!antes) notFound();
  await db.planCatalogo.update({ where: { plan }, data: d });
  invalidarCacheModulos();
  await auditarPlataforma(admin, "editar_plan", null, {
    plan,
    antes: {
      nombre: antes.nombre,
      descripcion: antes.descripcion,
      precioPorAlumno: antes.precioPorAlumno === null ? null : Number(antes.precioPorAlumno),
      precioMinimoMensual: antes.precioMinimoMensual === null ? null : Number(antes.precioMinimoMensual),
      maxAlumnos: antes.maxAlumnos,
      activo: antes.activo,
    },
    despues: d,
  });
}

/** Colegios en piloto o activos con ese plan (para «Afecta a N colegios»). */
export async function colegiosConPlan(plan: Plan): Promise<number> {
  return db.tenant.count({ where: { plan, estado: { in: [...ESTADOS_EN_USO] } } });
}

/**
 * Incluye o quita un módulo de un plan. `gestion` es esencial y no se quita. Si el plan aún no tenía filas
 * (respaldo en código), primero se guardan los módulos del código para no perderlos.
 */
export async function cambiarModuloDePlan(admin: AdminContext, planCrudo: string, moduloCrudo: string, incluir: boolean): Promise<{ afectados: number }> {
  const plan = validar(esquemaPlan, planCrudo);
  const modulo = validar(esquemaModulo, moduloCrudo) as Feature;
  if (modulo === MODULO_ESENCIAL && !incluir) throw new ErrorDeNegocio("Gestión es un módulo esencial: todos los planes lo incluyen.");
  if (!(await db.planCatalogo.findUnique({ where: { plan }, select: { plan: true } }))) notFound();

  const afectados = await db.$transaction(async (tx) => {
    const filas = await tx.planModulo.findMany({ where: { plan }, select: { modulo: true } });
    if (filas.length === 0) {
      await tx.planModulo.createMany({ data: [...modulosDeCodigo(plan), MODULO_ESENCIAL].map((m) => ({ plan, modulo: m })), skipDuplicates: true });
    }
    if (incluir) await tx.planModulo.upsert({ where: { plan_modulo: { plan, modulo } }, create: { plan, modulo }, update: {} });
    else await tx.planModulo.deleteMany({ where: { plan, modulo } });
    // gestion siempre presente.
    await tx.planModulo.upsert({ where: { plan_modulo: { plan, modulo: MODULO_ESENCIAL } }, create: { plan, modulo: MODULO_ESENCIAL }, update: {} });
    return tx.tenant.count({ where: { plan, estado: { in: [...ESTADOS_EN_USO] } } });
  });
  invalidarCacheModulos();
  await auditarPlataforma(admin, "plan_modulo", null, { plan, modulo, incluido: incluir, colegiosAfectados: afectados });
  return { afectados };
}

// ───────────── Módulos de un colegio ─────────────

export type EstadoModuloColegio = "plan" | "extra" | "quitado" | "no_incluido";

export type ModuloColegioPanel = { modulo: Feature; estado: EstadoModuloColegio; motivo: string | null; esencial: boolean };

async function colegioOError(id: string): Promise<Tenant> {
  if (!z.uuid().safeParse(id).success) notFound();
  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) notFound();
  return tenant;
}

async function modulosDelPlanEnBd(plan: Plan): Promise<string[]> {
  return (await db.planModulo.findMany({ where: { plan }, select: { modulo: true } })).map((m) => m.modulo);
}

export async function modulosDeColegioParaPanel(_admin: AdminContext, tenantId: string): Promise<ModuloColegioPanel[]> {
  const tenant = await colegioOError(tenantId);
  const [delPlan, ajustes] = await Promise.all([
    modulosDelPlanEnBd(tenant.plan),
    db.tenantModulo.findMany({ where: { tenantId: tenant.id }, select: { modulo: true, habilitado: true, motivo: true } }),
  ]);
  const r = resolverModulos(tenant.plan, delPlan, ajustes);
  return MODULOS.map((m) => ({
    modulo: m,
    estado: r.extras.has(m) ? "extra" : r.quitados.has(m) ? "quitado" : r.delPlan.has(m) ? "plan" : "no_incluido",
    motivo: ajustes.find((a) => a.modulo === m && (r.extras.has(m) || r.quitados.has(m)))?.motivo ?? null,
    esencial: m === MODULO_ESENCIAL,
  }));
}

export const esquemaCambioModuloColegio = z.object({
  modulo: esquemaModulo,
  /** agregar: módulo extra fuera del plan · quitar: lo saca aunque el plan lo incluya · restablecer: vuelve a lo del plan. */
  accion: z.enum(["agregar", "quitar", "restablecer"], "Elige una acción válida."),
  motivo: z.string().trim().max(200, "El motivo es muy largo (máx. 200).").optional().default(""),
});

export async function cambiarModuloDeColegio(admin: AdminContext, tenantId: string, entrada: z.input<typeof esquemaCambioModuloColegio>): Promise<string> {
  const tenant = await colegioOError(tenantId);
  const { modulo: m, accion, motivo } = validar(esquemaCambioModuloColegio, entrada);
  const modulo = m as Feature;
  if (modulo === MODULO_ESENCIAL) throw new ErrorDeNegocio("Gestión es un módulo esencial: no se puede quitar ni cambiar.");
  if (accion !== "restablecer" && motivo.length < 5) throw new ErrorDeNegocio("Escribe el motivo del cambio (mínimo 5 caracteres).");

  const delPlan = resolverModulos(tenant.plan, await modulosDelPlanEnBd(tenant.plan)).delPlan;
  const enPlan = delPlan.has(modulo);
  let mensaje: string;
  if (accion === "restablecer" || (accion === "agregar" && enPlan) || (accion === "quitar" && !enPlan)) {
    // Agregar algo que el plan ya trae o quitar un extra = volver a lo del plan.
    await db.tenantModulo.deleteMany({ where: { tenantId: tenant.id, modulo } });
    mensaje = "El módulo volvió a lo que indica el plan.";
  } else {
    const habilitado = accion === "agregar";
    await db.tenantModulo.upsert({
      where: { tenantId_modulo: { tenantId: tenant.id, modulo } },
      create: { tenantId: tenant.id, modulo, habilitado, motivo },
      update: { habilitado, motivo },
    });
    mensaje = habilitado ? "Módulo agregado al colegio." : "Módulo quitado del colegio.";
  }
  invalidarCacheModulos({ tenantId: tenant.id });
  await auditarPlataforma(admin, "colegio_modulo", tenant.id, { modulo, accion, motivo: motivo || null, enPlan });
  return mensaje;
}
