/* eslint-disable @typescript-eslint/no-unused-vars -- `_admin` solo exige haber pasado por requireAdminPlataforma() */
import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { urlRaiz } from "@/lib/dominio";
import { ErrorDeNegocio } from "./contexto-accion";
import { db } from "./db";
import type { AdminContext } from "./plataforma";
import { registrarPlataforma } from "./plataforma-registro";
import { supabaseAdmin } from "./supabase";

// Equipo Khipu (specs/22): quién es super administrador. También lo usa `scripts/crear-superadmin.ts`.
// Nunca se devuelve ni se muestra una contraseña por la web: o es el documento, o se envía un enlace de recuperación al correo.

export const esquemaMiembro = z.object({
  email: z.email("Escribe un correo válido.").transform((v) => v.trim().toLowerCase()),
  nombres: z.string("Falta el nombre.").trim().min(1, "Falta el nombre.").max(80),
  apellidos: z.string("Faltan los apellidos.").trim().min(1, "Faltan los apellidos.").max(80),
  documento: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined)
    .pipe(z.string().regex(/^[A-Za-z0-9]{8,12}$/, "El documento debe tener entre 8 y 12 letras o números (DNI: 8 dígitos).").optional()),
});

export type EntradaMiembro = z.input<typeof esquemaMiembro>;

export type ResultadoProvision = {
  userId: string;
  cuentaNueva: boolean;
  /** Cuenta nueva sin documento y modo «consola»: contraseña temporal para mostrar UNA vez en la terminal. */
  contrasenaTemporal?: string;
  /** Cuenta nueva sin documento y modo «web»: se envió el enlace para crear su contraseña. */
  enlaceEnviado: boolean;
};

/**
 * Crea o promueve a super administrador. Cuenta nueva: contraseña inicial = documento, o (sin documento)
 * una temporal aleatoria que, en modo «web», nadie ve y se reemplaza con el enlace de recuperación por correo.
 * Cuenta existente: conserva su contraseña. En ambos casos `debeCambiarPassword = true` y el admin queda activo.
 */
export async function provisionarSuperadmin(entrada: EntradaMiembro, modo: "web" | "consola" = "web"): Promise<ResultadoProvision> {
  const r = esquemaMiembro.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa los datos.");
  const { email, nombres, apellidos, documento } = r.data;

  let perfil = await db.profile.findUnique({ where: { email } });
  const cuentaNueva = !perfil;
  let contrasenaTemporal: string | undefined;
  let enlaceEnviado = false;

  if (!perfil) {
    const aleatoria = randomBytes(12).toString("base64url");
    const password = documento ?? aleatoria;
    const supabase = supabaseAdmin();
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nombres, apellidos } });
    if (error || !data.user) {
      throw new ErrorDeNegocio(error?.message?.toLowerCase().includes("already") ? "Ese correo ya tiene una cuenta en Khipu." : "No se pudo crear la cuenta.");
    }
    perfil = await db.profile.create({
      data: {
        id: data.user.id,
        email,
        nombres,
        apellidos,
        ...(documento ? { tipoDocumento: /^\d{8}$/.test(documento) ? "dni" : "ce", numeroDocumento: documento } : {}),
        debeCambiarPassword: true,
      },
    });
    if (!documento) {
      if (modo === "consola") contrasenaTemporal = aleatoria;
      else {
        const { error: errorEnlace } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: urlRaiz("/auth/callback?next=/restablecer") });
        enlaceEnviado = !errorEnlace;
      }
    }
  } else {
    await db.profile.update({ where: { id: perfil.id }, data: { debeCambiarPassword: true } });
  }
  await db.adminPlataforma.upsert({ where: { userId: perfil.id }, update: { activo: true }, create: { userId: perfil.id } });
  return { userId: perfil.id, cuentaNueva, contrasenaTemporal, enlaceEnviado };
}

export type MiembroEquipo = {
  adminId: string;
  userId: string;
  nombre: string;
  email: string;
  activo: boolean;
  ultimoIngresoAt: Date | null;
  altaAt: Date;
};

export async function listarEquipo(_admin: AdminContext): Promise<MiembroEquipo[]> {
  const filas = await db.adminPlataforma.findMany({ include: { user: true }, orderBy: { createdAt: "asc" } });
  return filas.map((f) => ({
    adminId: f.id,
    userId: f.userId,
    nombre: `${f.user.nombres} ${f.user.apellidos}`.trim(),
    email: f.user.email,
    activo: f.activo,
    ultimoIngresoAt: f.user.ultimoIngresoAt,
    altaAt: f.createdAt,
  }));
}

export async function agregarMiembro(admin: AdminContext, entrada: EntradaMiembro): Promise<ResultadoProvision> {
  const r = await provisionarSuperadmin(entrada, "web");
  await registrarPlataforma(admin.user.id, "equipo_agregar", null, { miembroId: r.userId, cuentaNueva: r.cuentaNueva });
  return r;
}

/** Regla pura: no puedes desactivarte ni dejar la plataforma sin ningún admin activo. Devuelve el motivo del rechazo, o null. */
export function motivoNoDesactivar(c: { esYo: boolean; otrosActivos: number }): string | null {
  if (c.esYo) return "No puedes desactivarte a ti mismo.";
  if (c.otrosActivos === 0) return "La plataforma debe tener al menos un super administrador activo.";
  return null;
}

/** Desactiva o reactiva a un miembro. No puedes desactivarte ni dejar la plataforma sin ningún admin activo. */
export async function cambiarActivoMiembro(admin: AdminContext, adminId: string, activo: boolean): Promise<void> {
  const miembro = await db.adminPlataforma.findUnique({ where: { id: adminId } });
  if (!miembro) throw new ErrorDeNegocio("Esa persona ya no está en el equipo.");
  if (!activo) {
    const otrosActivos = await db.adminPlataforma.count({ where: { activo: true, id: { not: adminId } } });
    const motivo = motivoNoDesactivar({ esYo: miembro.userId === admin.user.id, otrosActivos });
    if (motivo) throw new ErrorDeNegocio(motivo);
  }
  if (miembro.activo === activo) return;
  await db.adminPlataforma.update({ where: { id: adminId }, data: { activo } });
  await registrarPlataforma(admin.user.id, activo ? "equipo_reactivar" : "equipo_desactivar", null, { miembroId: miembro.userId });
}
