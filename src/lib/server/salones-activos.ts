import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { TenantContext } from "./tenant";

// Salones archivados (specs/10-panel-direccion-gestion.md): dejan de salir en listas del día y selectores,
// pero conservan alumnos, asistencia y notas (las vistas históricas los siguen mostrando).

/** Cláusula `where` para un `Salon`: solo los que no están archivados. */
export const whereSalonActivo = { archivadoAt: null } satisfies Prisma.SalonWhereInput;

/** Salones no archivados del colegio (para selectores). `extra` se combina con Y. */
export function salonesActivos<S extends Prisma.SalonSelect>(ctx: TenantContext, select: S, extra: Prisma.SalonWhereInput = {}) {
  return ctx.db.salon.findMany({ where: { AND: [whereSalonActivo, extra] }, select, orderBy: { nombre: "asc" } });
}

/** true si el salón existe y no está archivado. */
export async function salonEsActivo(ctx: TenantContext, salonId: string): Promise<boolean> {
  return (await ctx.db.salon.count({ where: { id: salonId, ...whereSalonActivo } })) > 0;
}
