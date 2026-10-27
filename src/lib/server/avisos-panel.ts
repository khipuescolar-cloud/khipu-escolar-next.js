import "server-only";
import type { EstadoAviso, TipoAviso } from "@/generated/prisma/enums";
import { auditar } from "./auditoria";
import { exigirAlumnosFamilias } from "./gestion";
import type { TenantContext } from "./tenant";

// Tabla de avisos y tasa de apertura semanal para dirección (specs/10 · /avisos).

export const META_APERTURA = 70;

/** Porcentaje entero de abiertos sobre enviados; null si aún no hay envíos. */
export function porcentajeApertura(enviados: number, abiertos: number): number | null {
  return enviados === 0 ? null : Math.round((abiertos / enviados) * 100);
}

export type FiltroAvisos = { estado?: EstadoAviso; tipo?: TipoAviso; q?: string };

export async function panelAvisos(ctx: TenantContext, filtro: FiltroAvisos) {
  exigirAlumnosFamilias(ctx); // solo lectura; el administrativo también
  const desde = new Date(Date.now() - 7 * 24 * 3600_000);
  const [avisos, enviados, abiertos] = await Promise.all([
    ctx.db.aviso.findMany({
      where: {
        ...(filtro.estado ? { estado: filtro.estado } : {}),
        ...(filtro.tipo ? { tipo: filtro.tipo } : {}),
        ...(filtro.q ? { destinatario: { contains: filtro.q, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, tipo: true, canal: true, destinatario: true, asunto: true, estado: true, createdAt: true, enviadoAt: true, abiertoAt: true, error: true },
    }),
    ctx.db.aviso.count({ where: { createdAt: { gte: desde }, enviadoAt: { not: null } } }),
    ctx.db.aviso.count({ where: { createdAt: { gte: desde }, abiertoAt: { not: null } } }),
  ]);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "avisos" });
  return { avisos, semana: { enviados, abiertos, porcentaje: porcentajeApertura(enviados, abiertos), meta: META_APERTURA } };
}
