import "server-only";
import { z } from "zod";
import type { Genero, Rol, TipoIdentificacion } from "@/generated/prisma/enums";
import { urlColegio } from "@/lib/dominio";
import { nombreRol } from "@/lib/roles";
import type { DbTenant } from "./db";
import { db } from "./db";
import { encolarAviso } from "./notificaciones/encolar";
import { supabaseAdmin } from "./supabase";

// Cuentas creadas por la plataforma o por dirección con contraseña inicial = número de documento
// (specs/16-plataforma-superadmin.md). La persona DEBE cambiarla en su primer ingreso
// (Profile.debeCambiarPassword). El número de documento nunca viaja en el correo.

export const esquemaDocumento = z
  .object({
    tipoDocumento: z.enum(["dni", "ce", "pasaporte"]).default("dni"),
    numeroDocumento: z.string().trim(),
  })
  .superRefine((d, c) => {
    const ok =
      d.tipoDocumento === "dni" ? /^\d{8}$/.test(d.numeroDocumento) : /^[A-Za-z0-9]{8,12}$/.test(d.numeroDocumento);
    if (!ok) {
      c.addIssue({
        code: "custom",
        path: ["numeroDocumento"],
        message: d.tipoDocumento === "dni" ? "El DNI debe tener 8 dígitos." : "El documento debe tener entre 8 y 12 letras o números.",
      });
    }
  });

export const esquemaPersona = z
  .object({
    email: z.email("Escribe un correo válido.").transform((v) => v.trim().toLowerCase()),
    nombres: z.string().trim().min(1, "Escribe los nombres.").max(80),
    apellidos: z.string().trim().min(1, "Escribe los apellidos.").max(80),
    telefono: z.string().trim().max(20).optional().transform((v) => v || undefined),
    genero: z.enum(["femenino", "masculino", "no_especifica"]).optional(),
    fechaNacimiento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    direccion: z.string().trim().max(200).optional().transform((v) => v || undefined),
  })
  .and(esquemaDocumento);

export type DatosPersona = z.input<typeof esquemaPersona>;

export class ErrorCuenta extends Error {}

/**
 * Crea (o reutiliza) el usuario global. Si el correo ya tenía cuenta, NO cambia su contraseña
 * (puede tener hijos o trabajar en otro colegio); solo completa datos personales vacíos.
 */
export async function crearCuentaConDocumento(entrada: DatosPersona): Promise<{ userId: string; nueva: boolean }> {
  const r = esquemaPersona.safeParse(entrada);
  if (!r.success) throw new ErrorCuenta(r.error.issues[0].message);
  const d = r.data;
  const datosPerfil = {
    nombres: d.nombres,
    apellidos: d.apellidos,
    telefono: d.telefono ?? null,
    genero: (d.genero ?? null) as Genero | null,
    tipoDocumento: d.tipoDocumento as TipoIdentificacion,
    numeroDocumento: d.numeroDocumento,
    fechaNacimiento: d.fechaNacimiento ? new Date(`${d.fechaNacimiento}T00:00:00.000Z`) : null,
    direccion: d.direccion ?? null,
  };

  const existente = await db.profile.findUnique({ where: { email: d.email } });
  if (existente) {
    const completar = Object.fromEntries(
      Object.entries(datosPerfil).filter(([k, v]) => v !== null && (existente as Record<string, unknown>)[k] == null),
    );
    if (Object.keys(completar).length) await db.profile.update({ where: { id: existente.id }, data: completar });
    return { userId: existente.id, nueva: false };
  }

  const { data, error } = await supabaseAdmin().auth.admin.createUser({
    email: d.email,
    password: d.numeroDocumento,
    email_confirm: true,
    user_metadata: { nombres: d.nombres, apellidos: d.apellidos },
  });
  if (error || !data.user) {
    throw new ErrorCuenta(
      error?.message?.toLowerCase().includes("already") ? "Ese correo ya tiene una cuenta en Khipu." : "No se pudo crear la cuenta.",
    );
  }
  await db.profile.create({ data: { id: data.user.id, email: d.email, ...datosPerfil, debeCambiarPassword: true } });
  return { userId: data.user.id, nueva: true };
}

/** Encola el correo de bienvenida con el usuario y la indicación de la contraseña (sin el número). */
export async function encolarBienvenida(
  tdb: DbTenant,
  datos: {
    tenant: { id: string; slug: string; nombre: string };
    email: string;
    nombre: string;
    rol: Rol;
    genero?: Genero | null;
    tipoDocumento: TipoIdentificacion;
    cuentaNueva: boolean;
  },
): Promise<string> {
  const url = urlColegio(datos.tenant.slug, "/inicio");
  return encolarAviso(tdb, {
    tenantId: datos.tenant.id,
    tipo: "invitacion",
    canal: "correo",
    destinatario: datos.email,
    plantilla: "bienvenida",
    payload: {
      colegio: datos.tenant.nombre,
      nombre: datos.nombre,
      rol: nombreRol(datos.rol, datos.genero ?? null),
      email: datos.email,
      documento: datos.tipoDocumento === "dni" ? "DNI" : datos.tipoDocumento === "ce" ? "carné de extranjería" : "pasaporte",
      cuentaNueva: datos.cuentaNueva,
      url,
      dominio: url.replace(/^https?:\/\//, "").replace(/\/inicio$/, ""),
    },
  });
}
