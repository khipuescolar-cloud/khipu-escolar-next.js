import "server-only";
import { whereSalonActivo } from "./salones-activos";
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
