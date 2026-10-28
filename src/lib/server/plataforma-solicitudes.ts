import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { Prisma, SolicitudDemo } from "@/generated/prisma/client";
import type { EstadoSolicitud } from "@/generated/prisma/enums";
import { nombreCompleto } from "@/lib/mensajes";
import { ESTADOS_SOLICITUD, NOMBRE_ESTADO_SOLICITUD } from "@/lib/solicitudes";
import { ErrorDeNegocio } from "./contexto-accion";
import { db } from "./db";
import type { AdminContext } from "./plataforma";
import { registrarAuditoriaPlataforma } from "./plataforma-auditoria";

// Solicitudes de demo de la landing, lado del equipo Khipu (specs/25). Tabla global: cliente `db` tras `requireAdminPlataforma()`.
// Todo cambio queda en `auditoria_plataforma` (acciones `solicitud_*`) sin datos personales en el detalle.

const uuid = z.uuid();

export const esquemaFiltroSolicitudes = z.object({
  /** «todas» (por defecto) o un estado. */
  estado: z.enum(["todas", ...ESTADOS_SOLICITUD] as [string, ...string[]]).catch("todas").default("todas"),
  q: z.string().trim().max(80).optional().catch(undefined),
  orden: z.enum(["recientes", "antiguas"]).catch("recientes").default("recientes"),
});
export type FiltroSolicitudes = z.input<typeof esquemaFiltroSolicitudes>;

function dondeDe(filtro: FiltroSolicitudes): { where: Prisma.SolicitudDemoWhereInput; orden: "recientes" | "antiguas" } {
  const f = esquemaFiltroSolicitudes.parse(filtro);
  const where: Prisma.SolicitudDemoWhereInput = {};
  if (f.estado !== "todas") where.estado = f.estado as EstadoSolicitud;
  if (f.q) {
    const c = { contains: f.q, mode: "insensitive" as const };
    where.OR = [{ colegio: c }, { nombre: c }, { correo: c }, { ciudad: c }];
  }
  return { where, orden: f.orden };
}

/** Solicitudes nuevas (sin atender): contador del menú. */
export async function pendientesSolicitudes(admin: AdminContext): Promise<number> {
  void admin; // solo lo produce requireAdminPlataforma()
  return db.solicitudDemo.count({ where: { estado: "nueva" } });
}

export async function listarSolicitudes(admin: AdminContext, filtro: FiltroSolicitudes = {}): Promise<SolicitudDemo[]> {
  void admin;
  const { where, orden } = dondeDe(filtro);
  return db.solicitudDemo.findMany({ where, orderBy: { createdAt: orden === "recientes" ? "desc" : "asc" }, take: 500 });
}

export type DetalleSolicitud = {
  solicitud: SolicitudDemo;
  atendidaPorNombre: string | null;
  colegio: { id: string; nombre: string; slug: string } | null;
  equipo: { userId: string; nombre: string }[];
};

async function solicitudOError(id: string): Promise<SolicitudDemo> {
  if (!uuid.safeParse(id).success) notFound();
  const s = await db.solicitudDemo.findUnique({ where: { id } });
  if (!s) notFound();
  return s;
}

export async function obtenerSolicitud(admin: AdminContext, id: string): Promise<DetalleSolicitud> {
  void admin;
  const solicitud = await solicitudOError(id);
  const [equipo, colegio] = await Promise.all([
    db.adminPlataforma.findMany({ where: { activo: true }, select: { userId: true, user: { select: { nombres: true, apellidos: true } } }, orderBy: { createdAt: "asc" } }),
    solicitud.tenantId ? db.tenant.findUnique({ where: { id: solicitud.tenantId }, select: { id: true, nombre: true, slug: true } }) : null,
  ]);
  const miembros = equipo.flatMap((e) => (e.user ? [{ userId: e.userId, nombre: nombreCompleto(e.user) }] : []));
  return {
    solicitud,
    atendidaPorNombre: miembros.find((m) => m.userId === solicitud.atendidaPor)?.nombre ?? null,
    colegio,
    equipo: miembros,
  };
}

export async function cambiarEstadoSolicitud(admin: AdminContext, id: string, estado: string): Promise<void> {
  const nuevo = z.enum(ESTADOS_SOLICITUD as [EstadoSolicitud, ...EstadoSolicitud[]]).safeParse(estado);
  if (!nuevo.success) throw new ErrorDeNegocio("Elige un estado válido.");
  const s = await solicitudOError(id);
  if (s.estado === nuevo.data) return;
  await db.solicitudDemo.update({ where: { id: s.id }, data: { estado: nuevo.data, atendidaPor: s.atendidaPor ?? (nuevo.data === "nueva" ? null : admin.user.id) } });
  await registrarAuditoriaPlataforma(admin, "solicitud_estado", s.tenantId, { solicitudId: s.id, de: s.estado, a: nuevo.data });
}

export async function guardarNotasSolicitud(admin: AdminContext, id: string, notas: string): Promise<void> {
  const limpio = z.string().max(4000, "Las notas son demasiado largas.").safeParse(notas.trim());
  if (!limpio.success) throw new ErrorDeNegocio(limpio.error.issues[0]?.message ?? "Revisa las notas.");
  const s = await solicitudOError(id);
  await db.solicitudDemo.update({ where: { id: s.id }, data: { notas: limpio.data || null } });
  await registrarAuditoriaPlataforma(admin, "solicitud_notas", s.tenantId, { solicitudId: s.id, caracteres: limpio.data.length });
}

/** Asigna a un miembro activo del equipo (o quita la asignación con null). */
export async function asignarSolicitud(admin: AdminContext, id: string, userId: string | null): Promise<void> {
  if (userId !== null && !uuid.safeParse(userId).success) throw new ErrorDeNegocio("Elige a alguien del equipo.");
  const s = await solicitudOError(id);
  if (userId) {
    const miembro = await db.adminPlataforma.findFirst({ where: { userId, activo: true } });
    if (!miembro) throw new ErrorDeNegocio("Esa persona no es parte activa del equipo Khipu.");
  }
  await db.solicitudDemo.update({ where: { id: s.id }, data: { atendidaPor: userId } });
  await registrarAuditoriaPlataforma(admin, "solicitud_asignar", s.tenantId, { solicitudId: s.id, asignadaA: userId });
}

/** Marca la solicitud como convertida y la enlaza con el colegio creado a partir de ella. */
export async function vincularSolicitudColegio(admin: AdminContext, id: string, tenantId: string): Promise<void> {
  if (!uuid.safeParse(id).success || !uuid.safeParse(tenantId).success) throw new ErrorDeNegocio("La solicitud no es válida.");
  const s = await db.solicitudDemo.findUnique({ where: { id } });
  if (!s) throw new ErrorDeNegocio("No encontramos esa solicitud.");
  const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) throw new ErrorDeNegocio("No encontramos ese colegio.");
  await db.solicitudDemo.update({ where: { id: s.id }, data: { estado: "convertida", tenantId, atendidaPor: s.atendidaPor ?? admin.user.id } });
  await registrarAuditoriaPlataforma(admin, "solicitud_convertir", tenantId, { solicitudId: s.id, de: s.estado });
}

/** Borra la solicitud y sus datos personales (pedidos de borrado). El detalle de la auditoría no guarda datos de la persona. */
export async function eliminarSolicitud(admin: AdminContext, id: string): Promise<void> {
  const s = await solicitudOError(id);
  await db.solicitudDemo.delete({ where: { id: s.id } });
  await registrarAuditoriaPlataforma(admin, "solicitud_eliminar", s.tenantId, { solicitudId: s.id, estado: s.estado });
}

export async function exportarSolicitudes(admin: AdminContext, filtro: FiltroSolicitudes = {}): Promise<{ encabezados: string[]; filas: (string | number | null)[][] }> {
  const filas = await listarSolicitudes(admin, filtro);
  await registrarAuditoriaPlataforma(admin, "solicitud_exportar", null, { filas: filas.length });
  const iso = (d: Date) => d.toISOString();
  return {
    encabezados: ["fecha", "estado", "nombre", "cargo", "colegio", "ciudad", "correo", "telefono", "alumnos", "plan_interes", "mensaje", "notas"],
    filas: filas.map((f) => [iso(f.createdAt), NOMBRE_ESTADO_SOLICITUD[f.estado], f.nombre, f.cargo, f.colegio, f.ciudad, f.correo, f.telefono, f.alumnos, f.planInteres, f.mensaje, f.notas]),
  };
}
