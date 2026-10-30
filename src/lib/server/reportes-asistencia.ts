import "server-only";
import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import { fechaDb, isoDeFechaDb } from "@/lib/fechas";
import {
  diasHabilesDelRango, rangoSchema, resumirAlumno, sumarResumenes,
  type DetalleDia, type FiltrosReporte, type RegistroDia, type ResumenAlumno,
} from "@/lib/reportes-asistencia";
import { esVistaFamilia } from "@/lib/roles";
import { hoyDelColegio } from "./asistencia";
import { auditar } from "./auditoria";
import { feriadosAplicables } from "./plataforma-configuracion";
import { requireFeature } from "./plan";
import { whereSalonActivo } from "./salones-activos";
import { requireAlumnoVisible, salonIdsVisibles, type TenantContext } from "./tenant";

// Reportes de asistencia por alumno, salón y rango de fechas (specs/27-reportes-asistencia.md).
// Porcentaje = (llegó + tarde) / días hábiles con registro. Las reglas puras viven en src/lib/reportes-asistencia.ts.

export type AccionReporte = { accion: "ver" } | { accion: "exportar"; formato: "excel" | "pdf" };

const entradaSalon = z.object({ salonId: z.uuid() }).and(rangoSchema);
const entradaAlumno = z.object({ alumnoId: z.uuid() }).and(rangoSchema);

export type ReporteAlumno = {
  tipo: "alumno";
  colegio: string;
  alumno: { id: string; nombres: string; apellidos: string; codigo: string | null; salonId: string; salon: string };
  desde: string;
  hasta: string;
  /** Último día contado: nunca después de hoy en la zona del colegio. */
  hastaEfectivo: string;
  resumen: ResumenAlumno;
  detalle: DetalleDia[];
};

export type FilaAlumnoReporte = { alumnoId: string; nombres: string; apellidos: string; codigo: string | null; resumen: ResumenAlumno };

export type ReporteSalon = {
  tipo: "salon";
  colegio: string;
  salon: { id: string; nombre: string };
  desde: string;
  hasta: string;
  hastaEfectivo: string;
  filas: FilaAlumnoReporte[];
  total: ResumenAlumno;
};

export type FilaSalonReporte = { salonId: string; salon: string; alumnos: number; resumen: ResumenAlumno };

export type ReporteColegio = {
  tipo: "colegio";
  colegio: string;
  desde: string;
  hasta: string;
  hastaEfectivo: string;
  filas: FilaSalonReporte[];
  total: ResumenAlumno;
};

export type ReporteAsistencia = ReporteAlumno | ReporteSalon | ReporteColegio;

const veTodo = (ctx: TenantContext) => ctx.rol === "direccion" || ctx.rol === "administrativo";

/** Salones que el rol puede ver en reportes: null = todos. Familias y portería no ven reportes de salón (403). */
async function alcanceDeSalones(ctx: TenantContext): Promise<string[] | null> {
  if (veTodo(ctx)) return null;
  if (ctx.rol === "profesor") return salonIdsVisibles(ctx);
  forbidden();
}

async function requireSalonDelReporte(ctx: TenantContext, salonId: string) {
  const alcance = await alcanceDeSalones(ctx);
  if (alcance && !alcance.includes(salonId)) forbidden();
  const salon = await ctx.db.salon.findFirst({ where: { id: salonId }, select: { id: true, nombre: true } });
  if (!salon) notFound();
  return salon;
}

/** Último día que cuenta: hoy en la zona del colegio si el rango llega al futuro. */
export function hastaEfectivoDe(ctx: TenantContext, hasta: string): string {
  const hoy = hoyDelColegio(ctx).isoFecha;
  return hasta > hoy ? hoy : hasta;
}

/** Días hábiles del rango (con los feriados nacionales y los extra del colegio), sin pasar de hoy. */
export async function diasHabiles(ctx: TenantContext, desde: string, hastaEfectivo: string): Promise<string[]> {
  if (desde > hastaEfectivo) return [];
  const feriados = await feriadosAplicables(ctx.tenant.id, desde, hastaEfectivo);
  return diasHabilesDelRango(desde, hastaEfectivo, feriados);
}

/** Registros de asistencia por alumno en el rango, con el estado de su justificación más reciente. */
async function registrosPorAlumno(ctx: TenantContext, alumnoIds: string[], desde: string, hasta: string): Promise<Map<string, RegistroDia[]>> {
  const mapa = new Map<string, RegistroDia[]>();
  if (alumnoIds.length === 0) return mapa;
  const filas = await ctx.db.asistencia.findMany({
    where: { alumnoId: { in: alumnoIds }, fecha: { gte: fechaDb(desde), lte: fechaDb(hasta) } },
    select: {
      alumnoId: true, fecha: true, ambito: true, hora: true, estado: true,
      justificaciones: { orderBy: { createdAt: "desc" }, take: 1, select: { estado: true } },
    },
  });
  for (const f of filas) {
    const lista = mapa.get(f.alumnoId) ?? [];
    lista.push({ fecha: isoDeFechaDb(f.fecha), ambito: f.ambito, hora: f.hora, estado: f.estado, justificacion: f.justificaciones[0]?.estado ?? null });
    mapa.set(f.alumnoId, lista);
  }
  return mapa;
}

function auditarReporte(ctx: TenantContext, entidadId: string, detalle: Record<string, string>, como: AccionReporte) {
  return auditar({
    tenantId: ctx.tenant.id,
    actorId: ctx.user.id,
    accion: como.accion,
    entidad: "reporte_asistencia",
    entidadId,
    detalle: como.accion === "exportar" ? { ...detalle, formato: como.formato } : detalle,
  });
}

/** Reporte de un salón: una fila por alumno activo y el total del salón. Profesor: solo sus salones. */
export async function reporteSalon(ctx: TenantContext, entrada: unknown, como: AccionReporte = { accion: "ver" }): Promise<ReporteSalon> {
  requireFeature(ctx, "asistencia");
  const { salonId, desde, hasta } = entradaSalon.parse(entrada);
  const salon = await requireSalonDelReporte(ctx, salonId);
  const hastaEfectivo = hastaEfectivoDe(ctx, hasta);
  const [alumnos, dias] = await Promise.all([
    ctx.db.alumno.findMany({
      where: { salonId, estado: "activo" },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      select: { id: true, nombres: true, apellidos: true, codigo: true },
    }),
    diasHabiles(ctx, desde, hastaEfectivo),
  ]);
  const registros = await registrosPorAlumno(ctx, alumnos.map((a) => a.id), desde, hastaEfectivo);
  const filas = alumnos.map<FilaAlumnoReporte>((a) => ({
    alumnoId: a.id, nombres: a.nombres, apellidos: a.apellidos, codigo: a.codigo,
    resumen: resumirAlumno(dias, registros.get(a.id) ?? []).resumen,
  }));
  await auditarReporte(ctx, salon.id, { tipo: "salon", desde, hasta }, como);
  return { tipo: "salon", colegio: ctx.tenant.nombre, salon, desde, hasta, hastaEfectivo, filas, total: sumarResumenes(filas.map((f) => f.resumen)) };
}

/** Reporte de un alumno con el detalle día a día. Apoderado/alumno: solo los suyos. */
export async function reporteAlumno(ctx: TenantContext, entrada: unknown, como: AccionReporte = { accion: "ver" }): Promise<ReporteAlumno> {
  requireFeature(ctx, "asistencia");
  const { alumnoId, desde, hasta } = entradaAlumno.parse(entrada);
  if (ctx.rol === "porteria") forbidden();
  if (!veTodo(ctx)) await requireAlumnoVisible(ctx, alumnoId);
  const alumno = await ctx.db.alumno.findFirst({
    where: { id: alumnoId },
    select: { id: true, nombres: true, apellidos: true, codigo: true, salonId: true, salon: { select: { nombre: true } } },
  });
  if (!alumno) notFound();
  const hastaEfectivo = hastaEfectivoDe(ctx, hasta);
  const dias = await diasHabiles(ctx, desde, hastaEfectivo);
  const registros = await registrosPorAlumno(ctx, [alumnoId], desde, hastaEfectivo);
  const { resumen, detalle } = resumirAlumno(dias, registros.get(alumnoId) ?? []);
  await auditarReporte(ctx, alumnoId, { tipo: "alumno", desde, hasta }, como);
  return {
    tipo: "alumno", colegio: ctx.tenant.nombre,
    alumno: { id: alumno.id, nombres: alumno.nombres, apellidos: alumno.apellidos, codigo: alumno.codigo, salonId: alumno.salonId, salon: alumno.salon.nombre },
    desde, hasta, hastaEfectivo, resumen, detalle,
  };
}

/** Resumen del colegio: una fila por salón activo. Dirección y administrativo ven todos; el profesor, solo los suyos. */
export async function resumenColegio(ctx: TenantContext, entrada: unknown, como: AccionReporte = { accion: "ver" }): Promise<ReporteColegio> {
  requireFeature(ctx, "asistencia");
  const { desde, hasta } = rangoSchema.parse(entrada);
  const alcance = await alcanceDeSalones(ctx);
  const hastaEfectivo = hastaEfectivoDe(ctx, hasta);
  const [salones, dias] = await Promise.all([
    ctx.db.salon.findMany({
      where: { ...whereSalonActivo, ...(alcance ? { id: { in: alcance } } : {}) },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, alumnos: { where: { estado: "activo" }, select: { id: true } } },
    }),
    diasHabiles(ctx, desde, hastaEfectivo),
  ]);
  const registros = await registrosPorAlumno(ctx, salones.flatMap((s) => s.alumnos.map((a) => a.id)), desde, hastaEfectivo);
  const filas = salones.map<FilaSalonReporte>((s) => ({
    salonId: s.id, salon: s.nombre, alumnos: s.alumnos.length,
    resumen: sumarResumenes(s.alumnos.map((a) => resumirAlumno(dias, registros.get(a.id) ?? []).resumen)),
  }));
  await auditarReporte(ctx, ctx.tenant.id, { tipo: "colegio", desde, hasta }, como);
  return { tipo: "colegio", colegio: ctx.tenant.nombre, desde, hasta, hastaEfectivo, filas, total: sumarResumenes(filas.map((f) => f.resumen)) };
}

/** Reporte según los filtros: alumno → detalle; salón → tabla de alumnos; nada → resumen por salón. */
export async function reporteSegunFiltros(ctx: TenantContext, filtros: FiltrosReporte, como: AccionReporte = { accion: "ver" }): Promise<ReporteAsistencia> {
  if (filtros.alumnoId) return reporteAlumno(ctx, filtros, como);
  if (filtros.salonId) return reporteSalon(ctx, filtros, como);
  return resumenColegio(ctx, filtros, como);
}

export type OpcionesReporte = {
  salones: { id: string; nombre: string }[];
  alumnos: { id: string; nombres: string; apellidos: string; salonId: string }[];
  periodos: { nombre: string; inicio: string; fin: string }[];
};

/** Opciones de los filtros según el rol: salones y alumnos que puede ver y los periodos del año (para el atajo «Bimestre»). */
export async function opcionesDeReporte(ctx: TenantContext): Promise<OpcionesReporte> {
  requireFeature(ctx, "asistencia");
  const familia = esVistaFamilia(ctx.rol);
  if (!familia && !veTodo(ctx) && ctx.rol !== "profesor") forbidden();
  const alcance = familia ? [] : await alcanceDeSalones(ctx);
  const [salones, alumnos, periodos] = await Promise.all([
    familia ? Promise.resolve([]) : ctx.db.salon.findMany({ where: { ...whereSalonActivo, ...(alcance ? { id: { in: alcance } } : {}) }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    ctx.db.alumno.findMany({
      where: familia
        ? { estado: "activo", OR: [{ cuentaId: ctx.membership.id }, { apoderados: { some: { apoderadoId: ctx.membership.id } } }] }
        : { estado: "activo", ...(alcance ? { salonId: { in: alcance } } : {}) },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      select: { id: true, nombres: true, apellidos: true, salonId: true },
    }),
    ctx.db.periodo.findMany({ where: { anio: Number(hoyDelColegio(ctx).isoFecha.slice(0, 4)) }, orderBy: { inicio: "asc" }, select: { nombre: true, inicio: true, fin: true } }),
  ]);
  return { salones, alumnos, periodos: periodos.map((p) => ({ nombre: p.nombre, inicio: isoDeFechaDb(p.inicio), fin: isoDeFechaDb(p.fin) })) };
}
