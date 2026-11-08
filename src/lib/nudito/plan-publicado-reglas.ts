import { z } from "zod";

const temaVersion = z.object({ temaClave: z.string().min(1), orden: z.number().optional() }).passthrough();

/** La foto publicada manda; las filas editables del plan no cambian la vista del alumno. */
export function clavesDeVersion(temas: unknown): string[] {
  const parsed = z.array(temaVersion).safeParse(temas);
  if (!parsed.success) return [];
  return [...new Set([...parsed.data].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)).map(t => t.temaClave))];
}

export function clavesDisponibles(temas: unknown, leccionesPublicadas: readonly { temaClave: string; version: number }[]): string[] {
  const publicadas = new Set(leccionesPublicadas.map(l => l.temaClave));
  return clavesDeVersion(temas).filter(clave => publicadas.has(clave));
}

export function planCompleto(estados: readonly string[]): boolean {
  return estados.length > 0 && estados.every(estado => estado === "dominado");
}
