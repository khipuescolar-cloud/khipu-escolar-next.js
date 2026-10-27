import "server-only";
import { z } from "zod";
import type { TipoIdentificacion } from "@/generated/prisma/enums";
import { auditar } from "./auditoria";
import { ErrorDeNegocio } from "./contexto-accion";
import { crearCuentaConDocumento, encolarBienvenida, ErrorCuenta, esquemaDocumento } from "./cuentas";
import { db } from "./db";
import { exigirAlumnosFamilias } from "./gestion";
import type { TenantContext } from "./tenant";

// Cuenta propia del alumno (rol `alumno`, specs/03 y specs/10). La crean dirección o el personal administrativo
// desde la lista de alumnos. Datos de menores (specs/15): exige el consentimiento vigente de al menos un apoderado
// vinculado. Contraseña inicial = documento del alumno, con cambio obligatorio en el primer ingreso.

export const MOTIVO_SIN_CONSENTIMIENTO =
  "Ningún apoderado vinculado ha dado su consentimiento de datos. Por ser menor de edad, primero un apoderado debe aceptarlo al entrar a Khipu.";

export type EstadoCuentaAlumno = {
  /** Cuenta propia del alumno, si tiene. */
  cuenta: { membershipId: string; email: string; estado: "activa" | "inactiva" | "invitada"; debeCambiarPassword: boolean } | null;
  /** Al menos un apoderado vinculado tiene su consentimiento vigente. */
  consentimiento: boolean;
};

/** Apoderados vinculados con consentimiento vigente (sin revocar). */
async function tieneConsentimiento(ctx: TenantContext, alumnoId: string): Promise<boolean> {
  const n = await ctx.db.apoderadoAlumno.count({
    where: { alumnoId, apoderado: { consentimientos: { some: { revocadoAt: null } } } },
  });
  return n > 0;
}

/** Estado de la cuenta y del consentimiento de varios alumnos (para la lista de gestión). */
export async function estadoCuentasAlumnos(ctx: TenantContext, alumnoIds: string[]): Promise<Map<string, EstadoCuentaAlumno>> {
  exigirAlumnosFamilias(ctx);
  const [alumnos, conConsentimiento] = await Promise.all([
    ctx.db.alumno.findMany({
      where: { id: { in: alumnoIds } },
      select: { id: true, cuenta: { select: { id: true, estado: true, user: { select: { email: true, debeCambiarPassword: true } } } } },
    }),
    ctx.db.apoderadoAlumno.findMany({
      where: { alumnoId: { in: alumnoIds }, apoderado: { consentimientos: { some: { revocadoAt: null } } } },
      select: { alumnoId: true },
    }),
  ]);
  const consiente = new Set(conConsentimiento.map((v) => v.alumnoId));
  return new Map(
    alumnos.map((a) => [
      a.id,
      {
        cuenta: a.cuenta
          ? { membershipId: a.cuenta.id, email: a.cuenta.user.email, estado: a.cuenta.estado, debeCambiarPassword: a.cuenta.user.debeCambiarPassword }
          : null,
        consentimiento: consiente.has(a.id),
      },
    ]),
  );
}

const esquemaCuenta = z
  .object({
    alumnoId: z.uuid("Elige un alumno."),
    email: z.email("Escribe un correo válido.").transform((v) => v.trim().toLowerCase()),
  })
  .and(esquemaDocumento);

export type EntradaCuentaAlumno = z.input<typeof esquemaCuenta>;

/**
 * Crea la cuenta propia del alumno: usuario con contraseña inicial = documento (`debeCambiarPassword`),
 * membresía `alumno` activa enlazada en `Alumno.cuentaId` y correo de bienvenida (sin el número).
 * Quien llama debe disparar `procesarCola()`.
 */
export async function crearCuentaAlumno(ctx: TenantContext, entrada: EntradaCuentaAlumno): Promise<{ membershipId: string; userId: string; cuentaNueva: boolean }> {
  exigirAlumnosFamilias(ctx);
  const r = esquemaCuenta.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0].message);
  const d = r.data;

  const alumno = await ctx.db.alumno.findFirst({ where: { id: d.alumnoId }, select: { id: true, nombres: true, apellidos: true, estado: true, cuentaId: true } });
  if (!alumno) throw new ErrorDeNegocio("No encontramos a ese alumno.");
  if (alumno.estado !== "activo") throw new ErrorDeNegocio("El alumno está retirado. Reactívalo antes de crear su cuenta.");
  if (alumno.cuentaId) throw new ErrorDeNegocio("Este alumno ya tiene una cuenta. Puedes reactivarla o desactivarla desde sus acciones.");
  if (!(await tieneConsentimiento(ctx, alumno.id))) throw new ErrorDeNegocio(MOTIVO_SIN_CONSENTIMIENTO);

  // El correo debe ser del alumno: no se reutiliza el de un apoderado ni el de alguien del personal de este colegio.
  const previo = await db.profile.findUnique({ where: { email: d.email }, select: { id: true } });
  if (previo) {
    const otras = await ctx.db.membership.findMany({ where: { userId: previo.id }, select: { rol: true } });
    if (otras.length > 0) {
      throw new ErrorDeNegocio(
        otras.some((m) => m.rol === "alumno") ? "Ese correo ya es la cuenta de otro alumno del colegio." : "Ese correo ya es de otra persona del colegio. Usa el correo del alumno.",
      );
    }
  }

  let cuenta;
  try {
    cuenta = await crearCuentaConDocumento({
      email: d.email,
      nombres: alumno.nombres,
      apellidos: alumno.apellidos,
      tipoDocumento: d.tipoDocumento,
      numeroDocumento: d.numeroDocumento,
    });
  } catch (e) {
    if (e instanceof ErrorCuenta) throw new ErrorDeNegocio(e.message);
    throw e;
  }

  const membership = await ctx.db.membership.create({ data: { tenantId: ctx.tenant.id, userId: cuenta.userId, rol: "alumno", estado: "activa" } });
  // Enlace atómico: solo si el alumno sigue sin cuenta (dos altas simultáneas no pisan el vínculo).
  const enlazado = await ctx.db.alumno.updateMany({ where: { id: alumno.id, cuentaId: null }, data: { cuentaId: membership.id } });
  if (enlazado.count === 0) {
    await ctx.db.membership.deleteMany({ where: { id: membership.id } });
    throw new ErrorDeNegocio("Este alumno ya tiene una cuenta.");
  }

  await encolarBienvenida(ctx.db, {
    tenant: { id: ctx.tenant.id, slug: ctx.tenant.slug, nombre: ctx.tenant.nombre },
    email: d.email,
    nombre: alumno.nombres,
    rol: "alumno",
    tipoDocumento: d.tipoDocumento as TipoIdentificacion,
    cuentaNueva: cuenta.nueva,
  });
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "cuenta_alumno", entidadId: alumno.id,
    detalle: { membershipId: membership.id, cuentaNueva: cuenta.nueva },
  });
  return { membershipId: membership.id, userId: cuenta.userId, cuentaNueva: cuenta.nueva };
}

/** Desactiva o reactiva la cuenta del alumno. Reactivar vuelve a exigir el consentimiento vigente de un apoderado. */
export async function cambiarEstadoCuentaAlumno(ctx: TenantContext, alumnoId: string, estado: "activa" | "inactiva"): Promise<void> {
  exigirAlumnosFamilias(ctx);
  const alumno = await ctx.db.alumno.findFirst({ where: { id: alumnoId }, select: { id: true, cuentaId: true } });
  if (!alumno?.cuentaId) throw new ErrorDeNegocio("Este alumno no tiene cuenta.");
  if (estado === "activa" && !(await tieneConsentimiento(ctx, alumno.id))) throw new ErrorDeNegocio(MOTIVO_SIN_CONSENTIMIENTO);
  await ctx.db.membership.updateMany({ where: { id: alumno.cuentaId, rol: "alumno" }, data: { estado } });
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "cuenta_alumno", entidadId: alumno.id,
    detalle: { membershipId: alumno.cuentaId, estado },
  });
}
