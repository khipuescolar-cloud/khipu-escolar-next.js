import "server-only";
import { z } from "zod";
import { auditar } from "../auditoria";
import { requireFeature } from "../plan";
import type { Prisma } from "@/generated/prisma/client";
import type { Rol } from "@/generated/prisma/enums";
import { alumnoIdsVisibles, requireRol, type TenantContext } from "../tenant";

// Bandeja interna de notificaciones (specs/38). Módulo `avisos` (Khipu Base): «Notificaciones dentro de Khipu».
// Cada persona ve solo las de su membresía (`membership_id`). Si una notificación trata de un alumno, la familia (o el
// alumno) solo la ve mientras siga viéndolo hoy (si se desvinculó, desaparece). Persisten aunque el push no llegue.

export const POR_PAGINA_BANDEJA = 30;

/** Roles con bandeja: familias, alumnos con cuenta, profesores y personal (portería no recibe notificaciones). */
export const ROLES_BANDEJA: Rol[] = ["apoderado", "alumno", "profesor", "direccion", "administrativo"];

async function alcance(ctx: TenantContext): Promise<Prisma.NotificacionWhereInput> {
  requireFeature(ctx, "avisos");
  requireRol(ctx, ROLES_BANDEJA);
  if (ctx.rol !== "apoderado" && ctx.rol !== "alumno") return { membershipId: ctx.membership.id };
  return { membershipId: ctx.membership.id, OR: [{ alumnoId: null }, { alumnoId: { in: await alumnoIdsVisibles(ctx) } }] };
}

export async function listarNotificaciones(ctx: TenantContext, entrada: unknown = {}) {
  const { pagina } = z.object({ pagina: z.coerce.number().int().min(1).max(1000).default(1) }).parse(entrada);
  const where = await alcance(ctx);
  const [filas, total, sinLeer] = await Promise.all([
    ctx.db.notificacion.findMany({
      where, orderBy: { createdAt: "desc" }, take: POR_PAGINA_BANDEJA, skip: (pagina - 1) * POR_PAGINA_BANDEJA,
      select: { id: true, tipo: true, titulo: true, cuerpo: true, url: true, leidaAt: true, createdAt: true, alumno: { select: { nombres: true } } },
    }),
    ctx.db.notificacion.count({ where }),
    ctx.db.notificacion.count({ where: { ...where, leidaAt: null } }),
  ]);
  return { filas, total, sinLeer, pagina, paginas: Math.max(1, Math.ceil(total / POR_PAGINA_BANDEJA)) };
}

/** Contador del menú (0 si el rol no tiene bandeja). */
export async function contarNotificacionesSinLeer(ctx: TenantContext): Promise<number> {
  if (!ROLES_BANDEJA.includes(ctx.rol)) return 0;
  return ctx.db.notificacion.count({ where: { ...(await alcance(ctx)), leidaAt: null } });
}

/** Marca como leída y devuelve la ruta de la actividad, o null si no es del usuario (no revela si existe). */
export async function abrirNotificacion(ctx: TenantContext, id: string): Promise<string | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const where = await alcance(ctx);
  const n = await ctx.db.notificacion.findFirst({ where: { ...where, id }, select: { id: true, url: true, alumnoId: true, leidaAt: true } });
  if (!n) return null;
  if (!n.leidaAt) await ctx.db.notificacion.updateMany({ where: { id: n.id, leidaAt: null }, data: { leidaAt: new Date() } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "notificacion", entidadId: n.id, detalle: { alumnoId: n.alumnoId } });
  return n.url;
}

export async function marcarTodasLeidas(ctx: TenantContext): Promise<number> {
  const r = await ctx.db.notificacion.updateMany({ where: { ...(await alcance(ctx)), leidaAt: null }, data: { leidaAt: new Date() } });
  return r.count;
}
