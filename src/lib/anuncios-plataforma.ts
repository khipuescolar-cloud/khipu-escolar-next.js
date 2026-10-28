// Anuncios del equipo Khipu a los colegios (specs/22). Lógica pura: sin servidor ni React.
import type { AudienciaAnuncio, NivelAnuncio, Plan, Rol } from "@/generated/prisma/enums";

export const NOMBRE_NIVEL: Record<NivelAnuncio, string> = { info: "Información", novedad: "Novedad", mantenimiento: "Mantenimiento", urgente: "Urgente" };
export const NOMBRE_AUDIENCIA: Record<AudienciaAnuncio, string> = { direccion: "Dirección", personal: "Personal del colegio", todos: "Todos" };
/** Urgente primero. */
export const PESO_NIVEL: Record<NivelAnuncio, number> = { urgente: 0, mantenimiento: 1, novedad: 2, info: 3 };

const ROLES_PERSONAL: readonly Rol[] = ["direccion", "profesor", "administrativo", "porteria"];

/** ¿El anuncio le corresponde a este rol y a este plan? (planes vacío = todos). */
export function anuncioAplica(a: { audiencia: AudienciaAnuncio; planes: readonly Plan[] }, c: { rol: Rol; plan: Plan }): boolean {
  if (a.planes.length > 0 && !a.planes.includes(c.plan)) return false;
  if (a.audiencia === "todos") return true;
  if (a.audiencia === "direccion") return c.rol === "direccion";
  return ROLES_PERSONAL.includes(c.rol);
}

export type EstadoAnuncio = "programado" | "vigente" | "terminado";
export const NOMBRE_ESTADO_ANUNCIO: Record<EstadoAnuncio, string> = { programado: "Programado", vigente: "Vigente", terminado: "Terminado" };

export function estadoAnuncio(a: { desde: Date; hasta: Date }, ahora = new Date()): EstadoAnuncio {
  if (ahora < a.desde) return "programado";
  return ahora < a.hasta ? "vigente" : "terminado";
}

/** Lima es UTC−5 todo el año: «2026-11-03T08:00» (hora de Lima) → instante. */
export function instanteDeLima(local: string): Date {
  return new Date(`${local}:00-05:00`);
}

/** Instante → «AAAA-MM-DDTHH:mm» en hora de Lima (para `<input type="datetime-local">`). */
export function localDeLima(d: Date): string {
  return new Date(d.getTime() - 5 * 3_600_000).toISOString().slice(0, 16);
}
