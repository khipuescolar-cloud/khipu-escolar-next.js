import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Prisma, type ContactoColegio } from "@/generated/prisma/client";
import { TIPOS_ELEGIBLES } from "@/lib/comercial";
import { ErrorDeNegocio } from "./contexto-accion";
import { db } from "./db";
import { agregarAdministrador, type AdminContext } from "./plataforma";

// Responsables del colegio ante Khipu (specs/20-responsables-y-suscripciones.md).
// Un colegio puede tener varios contactos; exactamente uno es el principal. Quien tiene acceso al sistema
// enlaza su membresía `direccion` (`membershipId`). Son datos del personal del colegio, nunca de alumnos.

/** Acciones de este módulo en `auditoria_plataforma` (la columna es texto libre). */
export type AccionComercial =
  | "agregar_responsable"
  | "editar_responsable"
  | "marcar_responsable_principal"
  | "quitar_responsable"
  | "guardar_suscripcion"
  | "registrar_pago"
  | "anular_pago";

/** Misma bitácora que `auditarPlataforma`, con las acciones del módulo comercial. */
export async function auditarComercial(admin: AdminContext, accion: AccionComercial, tenantId: string, detalle: Prisma.InputJsonValue): Promise<void> {
  await db.auditoriaPlataforma.create({ data: { actorId: admin.user.id, accion, tenantId, detalle } });
}

export async function colegioExistente(id: string) {
  if (!z.uuid().safeParse(id).success) notFound();
  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) notFound();
  return tenant;
}

export function validarEntrada<T extends z.ZodType>(esquema: T, entrada: unknown): z.output<T> {
  const r = esquema.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa los datos.");
  return r.data;
}

const opcional = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => v || null);

export const esquemaResponsable = z.object({
  tipo: z.enum(TIPOS_ELEGIBLES as [string, ...string[]], "Elige el tipo de responsable.") as z.ZodType<Exclude<ContactoColegio["tipo"], "principal">>,
  nombres: z.string().trim().min(1, "Escribe los nombres.").max(80),
  apellidos: z.string().trim().max(80).default(""),
  cargo: opcional(80),
  email: z.email("Escribe un correo válido.").transform((v) => v.trim().toLowerCase()),
  telefono: opcional(20),
  notas: opcional(300),
});
export type EntradaResponsable = z.input<typeof esquemaResponsable>;

export type EntradaAcceso = { tipoDocumento: "dni" | "ce" | "pasaporte"; numeroDocumento: string; genero?: "femenino" | "masculino" | "no_especifica" };

export type Responsable = ContactoColegio & {
  /** Estado de la membresía enlazada; `null` si el responsable no tiene acceso al sistema. */
  acceso: { membershipId: string; estado: "activa" | "invitada" | "inactiva"; ultimoIngresoAt: Date | null; debeCambiarPassword: boolean } | null;
};

/** Responsables del colegio: el principal primero, luego por antigüedad. */
export async function listarResponsables(admin: AdminContext, tenantId: string): Promise<Responsable[]> {
  void admin;
  const t = await colegioExistente(tenantId);
  return responsablesDe(t.id);
}

async function responsablesDe(tenantId: string): Promise<Responsable[]> {
  const contactos = await db.contactoColegio.findMany({ where: { tenantId }, orderBy: [{ principal: "desc" }, { createdAt: "asc" }] });
  const ids = contactos.map((c) => c.membershipId).filter((x): x is string => !!x);
  const membresias = ids.length
    ? await db.membership.findMany({
        where: { tenantId, id: { in: ids } },
        select: { id: true, estado: true, user: { select: { ultimoIngresoAt: true, debeCambiarPassword: true } } },
      })
    : [];
  const porId = new Map(membresias.map((m) => [m.id, m]));
  return contactos.map((c) => {
    const m = c.membershipId ? porId.get(c.membershipId) : undefined;
    return {
      ...c,
      acceso: m ? { membershipId: m.id, estado: m.estado, ultimoIngresoAt: m.user.ultimoIngresoAt, debeCambiarPassword: m.user.debeCambiarPassword } : null,
    };
  });
}

/** Vista de solo lectura para la dirección del propio colegio (`/configuracion`): sin notas internas. */
export async function responsablesAnteKhipu(tenantId: string) {
  const filas = await db.contactoColegio.findMany({
    where: { tenantId },
    orderBy: [{ principal: "desc" }, { createdAt: "asc" }],
    select: { id: true, tipo: true, nombres: true, apellidos: true, cargo: true, email: true, telefono: true, principal: true },
  });
  return filas;
}

function errorDuplicado(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    throw new ErrorDeNegocio("Ya hay un responsable con ese correo en este colegio.");
  }
  throw e;
}

/**
 * Agrega un responsable. Con `acceso` se le da ingreso como dirección: reutiliza `agregarAdministrador`
 * (cuenta con documento como contraseña inicial, membresía y correo de bienvenida).
 * Quien llama debe procesar la cola después (after() + procesarCola) si hubo acceso.
 */
export async function agregarResponsable(
  admin: AdminContext,
  tenantId: string,
  entrada: EntradaResponsable,
  acceso?: EntradaAcceso | null,
): Promise<{ id: string; conAcceso: boolean; cuentaNueva: boolean }> {
  const tenant = await colegioExistente(tenantId);
  const d = validarEntrada(esquemaResponsable, entrada);
  const duplicado = await db.contactoColegio.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email: d.email } }, select: { id: true } });
  if (duplicado) throw new ErrorDeNegocio("Ya hay un responsable con ese correo en este colegio.");

  if (acceso) {
    if (!d.apellidos) throw new ErrorDeNegocio("Para darle acceso al sistema escribe también sus apellidos.");
    const r = await agregarAdministrador(
      admin,
      tenant.id,
      { email: d.email, nombres: d.nombres, apellidos: d.apellidos, telefono: d.telefono ?? undefined, cargo: d.cargo ?? "Dirección", ...acceso },
      d.tipo,
    );
    // `agregarAdministrador` ya creó (o enlazó) el contacto: completa lo que solo conoce este formulario.
    const contacto = await db.contactoColegio.findUniqueOrThrow({ where: { tenantId_email: { tenantId: tenant.id, email: d.email } } });
    await db.contactoColegio.update({
      where: { id: contacto.id },
      data: { apellidos: d.apellidos, notas: d.notas, ...(contacto.principal ? {} : { tipo: d.tipo }) },
    });
    await auditarComercial(admin, "agregar_responsable", tenant.id, { contactoId: contacto.id, tipo: contacto.principal ? "principal" : d.tipo, conAcceso: true });
    return { id: contacto.id, conAcceso: true, cuentaNueva: r.cuentaNueva };
  }

  const hayPrincipal = (await db.contactoColegio.count({ where: { tenantId: tenant.id, principal: true } })) > 0;
  const contacto = await db.contactoColegio
    .create({ data: { tenantId: tenant.id, ...d, tipo: hayPrincipal ? d.tipo : "principal", principal: !hayPrincipal } })
    .catch(errorDuplicado);
  await auditarComercial(admin, "agregar_responsable", tenant.id, { contactoId: contacto.id, tipo: contacto.tipo, conAcceso: false });
  return { id: contacto.id, conAcceso: false, cuentaNueva: false };
}

async function contactoDelColegio(tenantId: string, id: string): Promise<ContactoColegio> {
  if (!z.uuid().safeParse(id).success) notFound();
  const c = await db.contactoColegio.findFirst({ where: { id, tenantId } });
  if (!c) notFound();
  return c;
}

/** Edita los datos del responsable. El correo no cambia si ya tiene acceso (es su usuario). El tipo del principal no se toca. */
export async function editarResponsable(admin: AdminContext, tenantId: string, id: string, entrada: EntradaResponsable): Promise<void> {
  const tenant = await colegioExistente(tenantId);
  const actual = await contactoDelColegio(tenant.id, id);
  const d = validarEntrada(esquemaResponsable, entrada);
  const email = actual.membershipId ? actual.email : d.email;
  const { tipo, ...resto } = d;
  await db.contactoColegio
    .update({ where: { id: actual.id }, data: { ...resto, email, ...(actual.principal ? {} : { tipo }) } })
    .catch(errorDuplicado);
  const campos = (["tipo", "nombres", "apellidos", "cargo", "email", "telefono", "notas"] as const).filter(
    (k) => (k === "tipo" && actual.principal ? false : (k === "email" ? email : d[k]) !== actual[k]),
  );
  await auditarComercial(admin, "editar_responsable", tenant.id, { contactoId: actual.id, campos });
}

/** Deja exactamente un principal en el colegio (transacción). El anterior pasa a «Dirección académica». */
export async function marcarPrincipal(admin: AdminContext, tenantId: string, id: string): Promise<void> {
  const tenant = await colegioExistente(tenantId);
  const nuevo = await contactoDelColegio(tenant.id, id);
  if (nuevo.principal) return;
  await db.$transaction(async (tx) => {
    await tx.contactoColegio.updateMany({ where: { tenantId: tenant.id, principal: true }, data: { principal: false, tipo: "direccion_academica" } });
    await tx.contactoColegio.update({ where: { id: nuevo.id }, data: { principal: true, tipo: "principal" } });
  });
  await auditarComercial(admin, "marcar_responsable_principal", tenant.id, { contactoId: nuevo.id });
}

/**
 * Quita un responsable. Si es el principal hay que elegir quién lo reemplaza (`reemplazoId`).
 * Con `desactivarAcceso`, su membresía queda inactiva (no pierde su cuenta ni su historial).
 */
export async function quitarResponsable(
  admin: AdminContext,
  tenantId: string,
  id: string,
  opciones: { reemplazoId?: string | null; desactivarAcceso?: boolean } = {},
): Promise<void> {
  const tenant = await colegioExistente(tenantId);
  const c = await contactoDelColegio(tenant.id, id);
  let reemplazo: ContactoColegio | null = null;
  if (c.principal) {
    if (!opciones.reemplazoId) throw new ErrorDeNegocio("Es el responsable principal: elige quién lo reemplaza antes de quitarlo.");
    if (opciones.reemplazoId === c.id) throw new ErrorDeNegocio("El reemplazo debe ser otra persona.");
    reemplazo = await contactoDelColegio(tenant.id, opciones.reemplazoId);
  }
  await db.$transaction(async (tx) => {
    if (reemplazo) await tx.contactoColegio.update({ where: { id: reemplazo.id }, data: { principal: true, tipo: "principal" } });
    await tx.contactoColegio.delete({ where: { id: c.id } });
    if (opciones.desactivarAcceso && c.membershipId) {
      await tx.membership.updateMany({ where: { id: c.membershipId, tenantId: tenant.id, rol: "direccion" }, data: { estado: "inactiva" } });
    }
  });
  await auditarComercial(admin, "quitar_responsable", tenant.id, {
    contactoId: c.id,
    eraPrincipal: c.principal,
    reemplazoId: reemplazo?.id ?? null,
    accesoDesactivado: !!(opciones.desactivarAcceso && c.membershipId),
  });
}

