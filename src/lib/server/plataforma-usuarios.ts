import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { auditar } from "./auditoria";
import { esAdminPlataforma, pedirRecuperacion } from "./auth";
import { ErrorDeNegocio } from "./contexto-accion";
import { esquemaDocumento } from "./cuentas";
import { db } from "./db";
import type { AdminContext } from "./plataforma";
import { registrarAuditoriaPlataforma } from "./plataforma-auditoria";
import { supabaseAdmin } from "./supabase";

// Soporte a personas (specs/21-operacion-de-plataforma.md §Usuarios).
// Solo datos de la cuenta y sus membresías: nunca alumnos, notas ni chats. Nunca se muestran contraseñas.

export const POR_PAGINA_USUARIOS = 20;

/** IP enmascarada: IPv4 → «190.12.•.•»; IPv6 → primeros dos grupos. Nunca la dirección completa. */
export function enmascararIp(ip: string): string {
  if (ip.includes(":")) return `${ip.split(":").slice(0, 2).join(":")}:•••`;
  const p = ip.split(".");
  return p.length === 4 ? `${p[0]}.${p[1]}.•.•` : "•••";
}

export const esquemaBusquedaUsuarios = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export async function buscarUsuarios(_admin: AdminContext, entrada: { q?: string; pagina?: number | string } = {}) {
  const { q, pagina } = esquemaBusquedaUsuarios.parse(entrada);
  const donde: Prisma.ProfileWhereInput = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { nombres: { contains: q, mode: "insensitive" } },
          { apellidos: { contains: q, mode: "insensitive" } },
          { numeroDocumento: { contains: q } },
        ],
      }
    : {};
  const [total, filas] = await Promise.all([
    db.profile.count({ where: donde }),
    db.profile.findMany({
      where: donde,
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }, { id: "asc" }],
      skip: (pagina - 1) * POR_PAGINA_USUARIOS,
      take: POR_PAGINA_USUARIOS,
      select: {
        id: true, email: true, nombres: true, apellidos: true, ultimoIngresoAt: true, debeCambiarPassword: true,
        adminPlataforma: { select: { userId: true } },
        memberships: { select: { id: true, rol: true, estado: true, tenant: { select: { id: true, nombre: true } } }, orderBy: { createdAt: "asc" } },
      },
    }),
  ]);
  return {
    total,
    pagina,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA_USUARIOS)),
    filas: filas.map(({ adminPlataforma, ...f }) => ({ ...f, esSuperAdmin: adminPlataforma !== null })),
  };
}

async function perfilOError(userId: string) {
  if (!z.uuid().safeParse(userId).success) throw new ErrorDeNegocio("No se encontró a esa persona.");
  const perfil = await db.profile.findUnique({ where: { id: userId } });
  if (!perfil) throw new ErrorDeNegocio("No se encontró a esa persona.");
  return perfil;
}

/** Ficha de una persona (sin datos de alumnos). `null` si no existe. */
export async function fichaUsuario(_admin: AdminContext, userId: string) {
  if (!z.uuid().safeParse(userId).success) return null;
  const perfil = await db.profile.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, nombres: true, apellidos: true, telefono: true, tipoDocumento: true, numeroDocumento: true,
      debeCambiarPassword: true, ultimoIngresoAt: true, createdAt: true,
      memberships: {
        orderBy: { createdAt: "asc" },
        select: { id: true, rol: true, estado: true, cargo: true, tenant: { select: { id: true, nombre: true, slug: true } } },
      },
    },
  });
  if (!perfil) return null;
  const intentos = await db.loginIntento.findMany({
    where: { OR: [{ userId }, { email: perfil.email.toLowerCase() }] },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, exito: true, ip: true, createdAt: true },
  });
  const { numeroDocumento, ...resto } = perfil;
  return {
    ...resto,
    // Solo se informa si tiene documento y de qué tipo; el número no se muestra.
    tieneDocumento: esquemaDocumento.safeParse({ tipoDocumento: perfil.tipoDocumento ?? "dni", numeroDocumento: numeroDocumento ?? "" }).success,
    esSuperAdmin: await esAdminPlataforma(userId),
    intentos: intentos.map((i) => ({ id: i.id.toString(), exito: i.exito, ip: enmascararIp(i.ip), fecha: i.createdAt })),
  };
}

/** Deja un rastro en la auditoría de cada colegio donde la persona tiene membresía. */
async function auditarEnColegios(admin: AdminContext, userId: string, detalle: Prisma.InputJsonValue, tenantIds?: string[]) {
  const ids = tenantIds ?? (await db.membership.findMany({ where: { userId }, select: { tenantId: true }, distinct: ["tenantId"] })).map((m) => m.tenantId);
  for (const tenantId of ids) {
    await auditar({ tenantId, actorId: admin.user.id, accion: "editar", entidad: "cuenta", entidadId: userId, detalle });
  }
}

/** Contraseña = documento; la persona debe cambiarla al entrar. No devuelve ni registra la contraseña. */
export async function restablecerPasswordUsuario(admin: AdminContext, userId: string): Promise<void> {
  const perfil = await perfilOError(userId);
  if (perfil.id === admin.user.id) throw new ErrorDeNegocio("Cambia tu propia contraseña desde tu cuenta, no desde aquí.");
  const doc = esquemaDocumento.safeParse({ tipoDocumento: perfil.tipoDocumento ?? "dni", numeroDocumento: perfil.numeroDocumento ?? "" });
  if (!doc.success) throw new ErrorDeNegocio("Esta persona no tiene un documento válido. Envíale un enlace de recuperación.");
  const { error } = await supabaseAdmin().auth.admin.updateUserById(userId, { password: doc.data.numeroDocumento });
  if (error) throw new ErrorDeNegocio("No se pudo restablecer la contraseña. Inténtalo de nuevo en unos minutos.");
  await db.profile.update({ where: { id: userId }, data: { debeCambiarPassword: true } });
  await registrarAuditoriaPlataforma(admin, "usuario_restablecer_password", null, { userId, metodo: "documento" });
  await auditarEnColegios(admin, userId, { reinicioPassword: "documento", origen: "plataforma" });
}

/** Envía el enlace de recuperación de Supabase al correo de la persona. `enviar` se puede cambiar en tests. */
export async function enviarRecuperacionUsuario(admin: AdminContext, userId: string, enviar: (email: string) => Promise<void> = pedirRecuperacion): Promise<void> {
  const perfil = await perfilOError(userId);
  await enviar(perfil.email);
  await registrarAuditoriaPlataforma(admin, "usuario_enviar_recuperacion", null, { userId });
  await auditarEnColegios(admin, userId, { recuperacionEnviada: true, origen: "plataforma" });
}

export async function forzarCambioPasswordUsuario(admin: AdminContext, userId: string): Promise<void> {
  await perfilOError(userId);
  await db.profile.update({ where: { id: userId }, data: { debeCambiarPassword: true } });
  await registrarAuditoriaPlataforma(admin, "usuario_forzar_cambio_password", null, { userId });
  await auditarEnColegios(admin, userId, { forzarCambioPassword: true, origen: "plataforma" });
}

/** Activa o desactiva una membresía (la persona conserva su cuenta y sus otros colegios). */
export async function cambiarEstadoMembresiaUsuario(admin: AdminContext, membershipId: string, activa: boolean): Promise<void> {
  if (!z.uuid().safeParse(membershipId).success) throw new ErrorDeNegocio("No se encontró la membresía.");
  const m = await db.membership.findUnique({ where: { id: membershipId }, select: { id: true, tenantId: true, userId: true, rol: true, estado: true } });
  if (!m) throw new ErrorDeNegocio("No se encontró la membresía.");
  const estado = activa ? "activa" : "inactiva";
  if (m.estado === estado) throw new ErrorDeNegocio(activa ? "Esa membresía ya está activa." : "Esa membresía ya está inactiva.");
  await db.membership.update({ where: { id: m.id }, data: { estado } });
  await registrarAuditoriaPlataforma(admin, "usuario_membresia_estado", m.tenantId, { userId: m.userId, membershipId: m.id, rol: m.rol, de: m.estado, a: estado });
  await auditarEnColegios(admin, m.userId, { membresia: m.id, rol: m.rol, de: m.estado, a: estado, origen: "plataforma" }, [m.tenantId]);
}
