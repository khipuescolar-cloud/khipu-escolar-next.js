import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { CicloFacturacion, EstadoSuscripcion, Plan } from "@/generated/prisma/enums";
import { DIAS_AVISO_RENOVACION, estadoRenovacion, ingresoMensualRecurrente, METODOS_PAGO, type EstadoRenovacion } from "@/lib/comercial";
import { esFechaIso, fechaDb, fechaLima, isoDeFechaDb, sumarDias } from "@/lib/fechas";
import { db } from "./db";
import type { AdminContext } from "./plataforma";
import { auditarComercial, colegioExistente, validarEntrada } from "./plataforma-responsables";

// Suscripción y pagos de cada colegio (specs/20). Registro MANUAL: no hay pasarela ni cobro automático.
// Solo importes y fechas del contrato; nada de datos de alumnos.

const fechaIso = (mensaje: string) => z.string().refine((v) => esFechaIso(v), mensaje);
const monto = (mensaje: string) =>
  z.coerce.number(mensaje).refine((n) => Number.isFinite(n) && n >= 0 && n < 10_000_000, mensaje).transform((n) => Math.round(n * 100) / 100);

export const esquemaSuscripcion = z
  .object({
    plan: z.enum(["basico", "fase2", "promax"], "Elige un plan."),
    ciclo: z.enum(["mensual", "anual"], "Elige el ciclo."),
    estado: z.enum(["prueba", "activa", "suspendida", "cancelada"], "Elige el estado."),
    montoPorCiclo: monto("Escribe el monto por ciclo en soles."),
    alumnosContratados: z
      .union([z.literal(""), z.coerce.number().int("Los alumnos contratados deben ser un número entero.").min(0).max(100_000)])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : v)),
    inicio: fechaIso("Elige la fecha de inicio."),
    proximaRenovacion: fechaIso("Elige la próxima renovación."),
    notas: z.string().trim().max(500).optional().nullable().transform((v) => v || null),
  })
  .refine((d) => d.proximaRenovacion >= d.inicio, { message: "La renovación no puede ser antes del inicio.", path: ["proximaRenovacion"] });
export type EntradaSuscripcion = z.input<typeof esquemaSuscripcion>;

export const esquemaPago = z
  .object({
    monto: monto("Escribe el monto en soles.").refine((n) => n > 0, "El monto debe ser mayor que cero."),
    fechaPago: fechaIso("Elige la fecha del pago."),
    periodoDesde: fechaIso("Elige el inicio del periodo."),
    periodoHasta: fechaIso("Elige el fin del periodo."),
    metodo: z.enum(METODOS_PAGO, "Elige el método de pago."),
    comprobante: z.string().trim().max(40).optional().nullable().transform((v) => v || null),
    /** Mueve la próxima renovación al día siguiente del fin del periodo (si es posterior). */
    avanzarRenovacion: z.union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("")]).optional().transform((v) => v === true || v === "on" || v === "true"),
  })
  .refine((d) => d.periodoHasta >= d.periodoDesde, { message: "El periodo termina antes de empezar.", path: ["periodoHasta"] });
export type EntradaPago = z.input<typeof esquemaPago>;

const num = (d: { toString(): string }) => Number(d.toString());

export type SuscripcionDto = {
  id: string;
  plan: Plan;
  ciclo: CicloFacturacion;
  estado: EstadoSuscripcion;
  montoPorCiclo: number;
  alumnosContratados: number | null;
  inicio: string;
  proximaRenovacion: string;
  notas: string | null;
};
export type PagoDto = {
  id: string;
  monto: number;
  fechaPago: string;
  periodoDesde: string;
  periodoHasta: string;
  metodo: string;
  comprobante: string | null;
  registradoPor: string;
};

export function alumnosActivos(tenantId: string): Promise<number> {
  return db.alumno.count({ where: { tenantId, estado: "activo" } });
}

/** Suscripción, alumnos activos reales e historial de pagos de un colegio. */
export async function suscripcionDelColegio(admin: AdminContext, tenantId: string) {
  void admin;
  const tenant = await colegioExistente(tenantId);
  const [s, pagos, activos] = await Promise.all([
    db.suscripcion.findUnique({ where: { tenantId: tenant.id } }),
    db.pagoRegistro.findMany({ where: { tenantId: tenant.id }, orderBy: [{ fechaPago: "desc" }, { createdAt: "desc" }] }),
    alumnosActivos(tenant.id),
  ]);
  const quienes = pagos.length
    ? await db.profile.findMany({ where: { id: { in: [...new Set(pagos.map((p) => p.registradoPorId))] } }, select: { id: true, nombres: true, apellidos: true } })
    : [];
  const nombre = new Map(quienes.map((q) => [q.id, `${q.nombres} ${q.apellidos}`.trim()]));
  const suscripcion: SuscripcionDto | null = s && {
    id: s.id,
    plan: s.plan,
    ciclo: s.ciclo,
    estado: s.estado,
    montoPorCiclo: num(s.montoPorCiclo),
    alumnosContratados: s.alumnosContratados,
    inicio: isoDeFechaDb(s.inicio),
    proximaRenovacion: isoDeFechaDb(s.proximaRenovacion),
    notas: s.notas,
  };
  const historial: PagoDto[] = pagos.map((p) => ({
    id: p.id,
    monto: num(p.monto),
    fechaPago: isoDeFechaDb(p.fechaPago),
    periodoDesde: isoDeFechaDb(p.periodoDesde),
    periodoHasta: isoDeFechaDb(p.periodoHasta),
    metodo: p.metodo,
    comprobante: p.comprobante,
    registradoPor: nombre.get(p.registradoPorId) ?? "Equipo Khipu",
  }));
  return { tenant, suscripcion, pagos: historial, alumnosActivos: activos, hoy: fechaLima(new Date()) };
}

/** Crea o actualiza la suscripción del colegio (una por colegio). */
export async function guardarSuscripcion(admin: AdminContext, tenantId: string, entrada: EntradaSuscripcion): Promise<void> {
  const tenant = await colegioExistente(tenantId);
  const d = validarEntrada(esquemaSuscripcion, entrada);
  const datos = {
    plan: d.plan,
    ciclo: d.ciclo,
    estado: d.estado,
    montoPorCiclo: d.montoPorCiclo,
    alumnosContratados: d.alumnosContratados,
    inicio: fechaDb(d.inicio),
    proximaRenovacion: fechaDb(d.proximaRenovacion),
    notas: d.notas,
  };
  const antes = await db.suscripcion.findUnique({ where: { tenantId: tenant.id } });
  await db.suscripcion.upsert({ where: { tenantId: tenant.id }, create: { tenantId: tenant.id, ...datos }, update: datos });
  await auditarComercial(admin, "guardar_suscripcion", tenant.id, {
    nueva: !antes,
    ...(antes ? { antes: { plan: antes.plan, ciclo: antes.ciclo, estado: antes.estado, monto: num(antes.montoPorCiclo) } } : {}),
    despues: { plan: d.plan, ciclo: d.ciclo, estado: d.estado, monto: d.montoPorCiclo },
  });
}

/** Registra un pago recibido (manual). Opcionalmente adelanta la próxima renovación. */
export async function registrarPago(admin: AdminContext, tenantId: string, entrada: EntradaPago): Promise<{ id: string; renovacion: string | null }> {
  const tenant = await colegioExistente(tenantId);
  const d = validarEntrada(esquemaPago, entrada);
  const pago = await db.pagoRegistro.create({
    data: {
      tenantId: tenant.id,
      monto: d.monto,
      fechaPago: fechaDb(d.fechaPago),
      periodoDesde: fechaDb(d.periodoDesde),
      periodoHasta: fechaDb(d.periodoHasta),
      metodo: d.metodo,
      comprobante: d.comprobante,
      registradoPorId: admin.user.id,
    },
  });
  let renovacion: string | null = null;
  if (d.avanzarRenovacion) {
    const s = await db.suscripcion.findUnique({ where: { tenantId: tenant.id } });
    const siguiente = sumarDias(d.periodoHasta, 1);
    if (s && siguiente > isoDeFechaDb(s.proximaRenovacion)) {
      await db.suscripcion.update({ where: { id: s.id }, data: { proximaRenovacion: fechaDb(siguiente) } });
      renovacion = siguiente;
    }
  }
  await auditarComercial(admin, "registrar_pago", tenant.id, {
    pagoId: pago.id, monto: d.monto, metodo: d.metodo, periodo: `${d.periodoDesde}/${d.periodoHasta}`, comprobante: d.comprobante, renovacion,
  });
  return { id: pago.id, renovacion };
}

/** Anular = borrar el registro; el detalle completo queda en la auditoría. */
export async function anularPago(admin: AdminContext, tenantId: string, pagoId: string): Promise<void> {
  const tenant = await colegioExistente(tenantId);
  if (!z.uuid().safeParse(pagoId).success) notFound();
  const p = await db.pagoRegistro.findFirst({ where: { id: pagoId, tenantId: tenant.id } });
  if (!p) notFound();
  await db.pagoRegistro.delete({ where: { id: p.id } });
  await auditarComercial(admin, "anular_pago", tenant.id, {
    pagoId: p.id,
    monto: num(p.monto),
    fechaPago: isoDeFechaDb(p.fechaPago),
    periodo: `${isoDeFechaDb(p.periodoDesde)}/${isoDeFechaDb(p.periodoHasta)}`,
    metodo: p.metodo,
    comprobante: p.comprobante,
  });
}

// ───────────── Módulo /suscripciones ─────────────

export const esquemaFiltroSuscripciones = z.object({
  estado: z.enum(["prueba", "activa", "suspendida", "cancelada", "sin"]).optional().catch(undefined),
  plan: z.enum(["basico", "fase2", "promax"]).optional().catch(undefined),
});
export type FiltroSuscripciones = z.infer<typeof esquemaFiltroSuscripciones>;

export type FilaSuscripcion = {
  tenantId: string;
  nombre: string;
  slug: string;
  planColegio: Plan;
  suscripcion: SuscripcionDto | null;
  renovacion: EstadoRenovacion | null;
  alumnosActivos: number;
  ultimoPago: string | null;
};

export type ResumenSuscripciones = {
  ingresoMensual: number;
  enPrueba: number;
  porRenovar: number;
  vencidas: number;
  sinSuscripcion: number;
};

/** Cuenta solo suscripciones vivas (prueba o activa): una cancelada o suspendida no «vence». */
const sigueVigente = (e: EstadoSuscripcion) => e === "prueba" || e === "activa";

export function resumir(filas: FilaSuscripcion[]): ResumenSuscripciones {
  const subs = filas.flatMap((f) => (f.suscripcion ? [f.suscripcion] : []));
  const vivas = filas.filter((f) => f.suscripcion && sigueVigente(f.suscripcion.estado) && f.renovacion);
  return {
    ingresoMensual: ingresoMensualRecurrente(subs.map((s) => ({ estado: s.estado, ciclo: s.ciclo, monto: s.montoPorCiclo }))),
    enPrueba: subs.filter((s) => s.estado === "prueba").length,
    porRenovar: vivas.filter((f) => f.renovacion!.tipo === "por_vencer").length,
    vencidas: vivas.filter((f) => f.renovacion!.tipo === "vencida").length,
    sinSuscripcion: filas.filter((f) => !f.suscripcion).length,
  };
}

/** Todos los colegios con su suscripción. El resumen es de TODOS; la tabla respeta los filtros. */
export async function reporteSuscripciones(admin: AdminContext, filtro: FiltroSuscripciones = {}, hoy: string = fechaLima(new Date())) {
  void admin;
  const [tenants, activos, ultimos] = await Promise.all([
    db.tenant.findMany({ orderBy: { nombre: "asc" }, include: { suscripcion: true } }),
    db.alumno.groupBy({ by: ["tenantId"], where: { estado: "activo" }, _count: { _all: true } }),
    db.pagoRegistro.groupBy({ by: ["tenantId"], _max: { fechaPago: true } }),
  ]);
  const nActivos = new Map(activos.map((a) => [a.tenantId, a._count._all]));
  const ultimo = new Map(ultimos.map((u) => [u.tenantId, u._max.fechaPago ? isoDeFechaDb(u._max.fechaPago) : null]));
  const todas: FilaSuscripcion[] = tenants.map((t) => {
    const s = t.suscripcion;
    const dto: SuscripcionDto | null = s && {
      id: s.id, plan: s.plan, ciclo: s.ciclo, estado: s.estado, montoPorCiclo: num(s.montoPorCiclo),
      alumnosContratados: s.alumnosContratados, inicio: isoDeFechaDb(s.inicio), proximaRenovacion: isoDeFechaDb(s.proximaRenovacion), notas: s.notas,
    };
    return {
      tenantId: t.id, nombre: t.nombre, slug: t.slug, planColegio: t.plan, suscripcion: dto,
      renovacion: dto ? estadoRenovacion(dto.proximaRenovacion, hoy) : null,
      alumnosActivos: nActivos.get(t.id) ?? 0,
      ultimoPago: ultimo.get(t.id) ?? null,
    };
  });
  const filas = todas.filter((f) => {
    if (filtro.estado === "sin") return !f.suscripcion;
    if (filtro.estado && f.suscripcion?.estado !== filtro.estado) return false;
    if (filtro.plan && (f.suscripcion?.plan ?? f.planColegio) !== filtro.plan) return false;
    return true;
  });
  return { filas, resumen: resumir(todas), hoy, diasAviso: DIAS_AVISO_RENOVACION };
}
