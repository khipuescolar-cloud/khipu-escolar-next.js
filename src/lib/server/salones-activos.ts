import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { TenantContext } from "./tenant";

// Salones archivados (specs/10-panel-direccion-gestion.md): dejan de salir en listas del día y selectores,
// pero conservan alumnos, asistencia y notas (las vistas históricas los siguen mostrando).

/** Cláusula `where` para un `Salon`: solo los que no están archivados. */
export const whereSalonActivo = { archivadoAt: null } satisfies Prisma.SalonWhereInput;

/** Salones no archivados del colegio (para selectores). `extra` se combina con Y. */
// El tipo del resultado se declara a mano: inferirlo desde el cliente extendido (`ctx.db`) con un `select` genérico
// hace que TypeScript se pierda comparando tipos (TS2321 «Excessive stack depth»).
export function salonesActivos<S extends Prisma.SalonSelect>(
  ctx: TenantContext,
  select: S,
  extra: Prisma.SalonWhereInput = {},
): Promise<Prisma.SalonGetPayload<{ select: S }>[]> {
  const consulta: Prisma.SalonFindManyArgs = { where: { AND: [whereSalonActivo, extra] }, select, orderBy: { nombre: "asc" } };
  return ctx.db.salon.findMany(consulta) as unknown as Promise<Prisma.SalonGetPayload<{ select: S }>[]>;
}

/** true si el salón existe y no está archivado. */
export async function salonEsActivo(ctx: TenantContext, salonId: string): Promise<boolean> {
  return (await ctx.db.salon.count({ where: { id: salonId, ...whereSalonActivo } })) > 0;
}
