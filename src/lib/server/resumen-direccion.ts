import "server-only";
import { whereSalonActivo } from "./salones-activos";
import { momentoEnZona } from "@/lib/fechas";
import type { TenantContext } from "./tenant";

// Resumen del día para el inicio de dirección: asistencia por salón.

/** Fecha de hoy (YYYY-MM-DD) en la zona horaria del colegio. */
export function hoyEnZona(zona: string, ahora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit" }).format(ahora);
}

export type ResumenSalon = { salonId: string; salon: string; llego: number; tarde: number; falta: number; problema: number; sinRegistrar: number; total: number };

export async function resumenAsistenciaHoy(ctx: TenantContext): Promise<ResumenSalon[]> {
  const fecha = new Date(`${hoyEnZona(ctx.tenant.zonaHoraria)}T00:00:00.000Z`);
  const [salones, asistencias] = await Promise.all([
    ctx.db.salon.findMany({ where: whereSalonActivo, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, alumnos: { where: { estado: "activo" }, select: { id: true } } } }),
    ctx.db.asistencia.findMany({ where: { fecha }, select: { alumnoId: true, ambito: true, estado: true, hora: true } }),
  ]);
  // Por alumno prevalece la asistencia del día; si no hay, la primera registrada.
  const porAlumno = new Map<string, { ambito: string; estado: string; hora: string }>();
  for (const a of asistencias) {
    const actual = porAlumno.get(a.alumnoId);
    if (!actual || (a.ambito === "dia" && actual.ambito !== "dia") || (actual.ambito !== "dia" && a.hora < actual.hora)) porAlumno.set(a.alumnoId, a);
  }
  return salones.map((s) => {
    const r: ResumenSalon = { salonId: s.id, salon: s.nombre, llego: 0, tarde: 0, falta: 0, problema: 0, sinRegistrar: 0, total: s.alumnos.length };
    for (const al of s.alumnos) {
      const e = porAlumno.get(al.id)?.estado as "llego" | "tarde" | "falta" | "problema" | undefined;
      if (e) r[e]++;
      else r.sinRegistrar++;
    }
    return r;
  });
}

/** Instante en que empezó hoy en la zona del colegio (medianoche local). */
export function inicioDiaEnZona(zona: string, ahora = new Date()): Date {
  const [h, m] = momentoEnZona(ahora, zona).hora.split(":").map(Number);
  const sobrante = ahora.getUTCSeconds() * 1000 + ahora.getUTCMilliseconds();
  return new Date(ahora.getTime() - (h * 60 + m) * 60_000 - sobrante);
}

export type ResumenAvisosHoy = { enviados: number; abiertos: number; conError: number };

/** Avisos creados hoy (zona del colegio): enviados, abiertos y con error (error, rebotado o queja). */
export async function resumenAvisosHoy(ctx: TenantContext, ahora = new Date()): Promise<ResumenAvisosHoy> {
  const desde = { gte: inicioDiaEnZona(ctx.tenant.zonaHoraria, ahora) };
  // Los avisos de la mesa de ayuda (al equipo Khipu o a la dirección) no son avisos a las familias.
  const tipo = { not: "soporte" as const };
  const [enviados, abiertos, conError] = await Promise.all([
    ctx.db.aviso.count({ where: { createdAt: desde, tipo, enviadoAt: { not: null } } }),
    ctx.db.aviso.count({ where: { createdAt: desde, tipo, abiertoAt: { not: null } } }),
    ctx.db.aviso.count({ where: { createdAt: desde, tipo, estado: { in: ["error", "rebotado", "queja"] } } }),
  ]);
  return { enviados, abiertos, conError };
}
