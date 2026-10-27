import "server-only";
import { z } from "zod";
import type { Genero, Rol, TipoIdentificacion } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { leerCsvPersonal, type FilaPersonal } from "@/lib/importar-personal";
import type { ErrorFila } from "@/lib/importar-alumnos";
import { auditar } from "./auditoria";
import { ErrorDeNegocio } from "./contexto-accion";
import { crearCuentaConDocumento, encolarBienvenida, ErrorCuenta, esquemaDocumento, esquemaPersona } from "./cuentas";
import { db } from "./db";
import { exigirGestion } from "./gestion";
import type { TenantContext } from "./tenant";

// CRM del colegio: profesores y personal (specs/17-crm-personal-colegio.md). Solo dirección.
// El documento y los datos personales solo los ve la dirección: todas las funciones pasan por `exigirGestion`.

export type RolPersonal = "profesor" | "administrativo" | "porteria";
export const ROLES_PERSONAL: RolPersonal[] = ["profesor", "administrativo", "porteria"];
export const ROLES_NO_DOCENTES: RolPersonal[] = ["administrativo", "porteria"];

const esquemaCargo = z.string().trim().max(80, "El cargo es demasiado largo.").optional().transform((v) => v || null);

async function conCuenta<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ErrorCuenta) throw new ErrorDeNegocio(e.message);
    throw e;
  }
}

function validarPersona<T>(esquema: z.ZodType<T>, entrada: unknown): T {
  const r = esquema.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0].message);
  return r.data;
}

export type EntradaAlta = z.input<typeof esquemaPersona> & { rol: RolPersonal; cargo?: string | null };
export type ResultadoAlta = { membershipId: string; userId: string; cuentaNueva: boolean };

/**
 * Alta con datos personales: crea la cuenta (contraseña inicial = documento, cambio obligatorio), la membresía `activa`
 * con su cargo y encola la bienvenida (sin el número). Quien llama debe disparar `procesarCola()` (p. ej. con `after()`).
 * Si el correo ya tenía cuenta en Khipu solo se agrega la membresía.
 */
export async function altaPersonal(ctx: TenantContext, entrada: EntradaAlta): Promise<ResultadoAlta> {
  exigirGestion(ctx);
  if (!ROLES_PERSONAL.includes(entrada.rol)) throw new ErrorDeNegocio("Ese rol no se puede dar de alta aquí.");
  const cargo = validarPersona(esquemaCargo, entrada.cargo ?? undefined);
  const datos = validarPersona(esquemaPersona, entrada);

  const previo = await db.profile.findUnique({ where: { email: datos.email }, select: { id: true } });
  if (previo) {
    const m = await ctx.db.membership.findFirst({ where: { userId: previo.id, rol: entrada.rol } });
    if (m) {
      throw new ErrorDeNegocio(m.estado === "inactiva" ? "Esa persona ya está registrada con ese rol y está inactiva. Reactívala desde su ficha." : "Esa persona ya tiene ese rol en el colegio.");
    }
  }

  const { userId, nueva } = await conCuenta(() => crearCuentaConDocumento(entrada));
  const perfil = await db.profile.findUniqueOrThrow({ where: { id: userId }, select: { nombres: true, genero: true } });
  const membership = await ctx.db.membership.create({ data: { tenantId: ctx.tenant.id, userId, rol: entrada.rol as Rol, estado: "activa", cargo } });
  await encolarBienvenida(ctx.db, {
    tenant: { id: ctx.tenant.id, slug: ctx.tenant.slug, nombre: ctx.tenant.nombre },
    email: datos.email,
    nombre: perfil.nombres,
    rol: entrada.rol as Rol,
    genero: perfil.genero,
    tipoDocumento: datos.tipoDocumento as TipoIdentificacion,
    cuentaNueva: nueva,
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "membresia", entidadId: membership.id, detalle: { rol: entrada.rol, cuentaNueva: nueva } });
  return { membershipId: membership.id, userId, cuentaNueva: nueva };
}

/** Reenvía la bienvenida (sin el número de documento). Dice «contraseña inicial» solo si la persona aún no la cambió. */
export async function reenviarBienvenida(ctx: TenantContext, membershipId: string): Promise<void> {
  exigirGestion(ctx);
  const m = await ctx.db.membership.findFirst({
    where: { id: membershipId, rol: { in: ROLES_PERSONAL } },
    select: { id: true, rol: true, user: { select: { email: true, nombres: true, genero: true, tipoDocumento: true, debeCambiarPassword: true } } },
  });
  if (!m) throw new ErrorDeNegocio("No se encontró a esa persona.");
  await encolarBienvenida(ctx.db, {
    tenant: { id: ctx.tenant.id, slug: ctx.tenant.slug, nombre: ctx.tenant.nombre },
    email: m.user.email,
    nombre: m.user.nombres,
    rol: m.rol,
    genero: m.user.genero,
    tipoDocumento: m.user.tipoDocumento ?? "dni",
    cuentaNueva: m.user.debeCambiarPassword,
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "enviar", entidad: "membresia", entidadId: m.id, detalle: { reenvio: "bienvenida" } });
}

// ───────────── Lista ─────────────

export type FiltroPersonal = { q?: string; estado?: "activa" | "inactiva" | "invitada"; salonId?: string; cursoId?: string };

export async function listarPersonal(ctx: TenantContext, roles: RolPersonal[], filtro: FiltroPersonal = {}) {
  exigirGestion(ctx);
  const q = filtro.q?.trim();
  const where: Prisma.MembershipWhereInput = {
    rol: { in: roles },
    ...(filtro.estado ? { estado: filtro.estado } : {}),
    ...(filtro.salonId ? { OR: [{ salonesTutor: { some: { id: filtro.salonId } } }, { cursosDictados: { some: { salonId: filtro.salonId } } }] } : {}),
    ...(filtro.cursoId ? { cursosDictados: { some: { id: filtro.cursoId } } } : {}),
    ...(q
      ? {
          user: {
            OR: [
              { nombres: { contains: q, mode: "insensitive" } },
              { apellidos: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { numeroDocumento: { contains: q } },
            ],
          },
        }
      : {}),
  };
  const filas = await ctx.db.membership.findMany({
    where,
    orderBy: { user: { apellidos: "asc" } },
    select: {
      id: true,
      rol: true,
      estado: true,
      cargo: true,
      user: { select: { nombres: true, apellidos: true, email: true, telefono: true, tipoDocumento: true, numeroDocumento: true, genero: true } },
      salonesTutor: { select: { id: true, nombre: true } },
      cursosDictados: { select: { id: true, nombre: true, salon: { select: { nombre: true } } } },
    },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "personal_lista", detalle: { roles } });
  return filas;
}

// ───────────── Ficha ─────────────

export async function obtenerFicha(ctx: TenantContext, membershipId: string, roles: RolPersonal[]) {
  exigirGestion(ctx);
  const m = await ctx.db.membership.findFirst({
    where: { id: membershipId, rol: { in: roles } },
    select: {
      id: true,
      rol: true,
      estado: true,
      cargo: true,
      createdAt: true,
      user: {
        select: {
          id: true, nombres: true, apellidos: true, email: true, telefono: true, genero: true, tipoDocumento: true,
          numeroDocumento: true, fechaNacimiento: true, direccion: true, debeCambiarPassword: true,
        },
      },
      salonesTutor: { select: { id: true, nombre: true } },
      cursosDictados: { select: { id: true, nombre: true, salon: { select: { id: true, nombre: true } } } },
    },
  });
  if (!m) return null;
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "membresia", entidadId: m.id });
  const eventos = await ctx.db.auditoria.findMany({ where: { entidad: "membresia", entidadId: m.id }, orderBy: { createdAt: "desc" }, take: 30 });
  const actores = await db.profile.findMany({
    where: { id: { in: [...new Set(eventos.map((e) => e.actorId).filter((x): x is string => !!x))] } },
    select: { id: true, nombres: true, apellidos: true },
  });
  const nombreActor = new Map(actores.map((a) => [a.id, `${a.nombres} ${a.apellidos}`.trim()]));
  const historial = eventos.map((e) => ({
    id: String(e.id),
    accion: e.accion,
    actor: e.actorId ? (nombreActor.get(e.actorId) ?? "—") : "Sistema",
    fecha: e.createdAt,
    detalle: (e.detalle ?? null) as Record<string, unknown> | null,
  }));
  return { ...m, historial };
}

const esquemaEdicion = z
  .object({
    nombres: z.string().trim().min(1, "Escribe los nombres.").max(80),
    apellidos: z.string().trim().min(1, "Escribe los apellidos.").max(80),
    telefono: z.string().trim().max(20).transform((v) => v || null),
    genero: z.enum(["femenino", "masculino", "no_especifica"]).nullable().catch(null),
    fechaNacimiento: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de nacimiento no válida.")]).transform((v) => v || null),
    direccion: z.string().trim().max(200).transform((v) => v || null),
    cargo: esquemaCargo,
  })
  .and(esquemaDocumento);

export type EntradaEdicion = z.input<typeof esquemaEdicion>;

/** Edita los datos personales (el perfil es global: el cambio vale en todos los colegios de la persona) y el cargo. */
export async function editarFicha(ctx: TenantContext, membershipId: string, roles: RolPersonal[], entrada: EntradaEdicion): Promise<void> {
  exigirGestion(ctx);
  const d = validarPersona(esquemaEdicion, entrada);
  const m = await ctx.db.membership.findFirst({ where: { id: membershipId, rol: { in: roles } }, select: { id: true, userId: true } });
  if (!m) throw new ErrorDeNegocio("No se encontró a esa persona.");
  const antes = await db.profile.findUniqueOrThrow({ where: { id: m.userId } });
  const cambios = {
    nombres: d.nombres,
    apellidos: d.apellidos,
    telefono: d.telefono,
    genero: d.genero as Genero | null,
    tipoDocumento: d.tipoDocumento as TipoIdentificacion,
    numeroDocumento: d.numeroDocumento,
    fechaNacimiento: d.fechaNacimiento ? new Date(`${d.fechaNacimiento}T00:00:00.000Z`) : null,
    direccion: d.direccion,
  };
  const modificados = (Object.keys(cambios) as (keyof typeof cambios)[]).filter((k) => {
    const a = antes[k] instanceof Date ? (antes[k] as Date).toISOString() : antes[k];
    const b = cambios[k] instanceof Date ? (cambios[k] as Date).toISOString() : cambios[k];
    return (a ?? null) !== (b ?? null);
  });
  await db.profile.update({ where: { id: m.userId }, data: cambios });
  await ctx.db.membership.update({ where: { id: m.id }, data: { cargo: d.cargo } });
  // Solo se guardan los NOMBRES de los campos cambiados, nunca los valores (p. ej. el documento).
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "membresia", entidadId: m.id, detalle: { campos: modificados } });
}

// ───────────── Importación CSV ─────────────

export type ResultadoImportacionPersonal = { ok: boolean; creados: number; errores: ErrorFila[] };

const GENEROS: Record<string, "femenino" | "masculino" | "no_especifica"> = {
  femenino: "femenino", f: "femenino", masculino: "masculino", m: "masculino", no_especifica: "no_especifica",
};

function entradaDeFila(f: FilaPersonal): EntradaAlta {
  return {
    rol: f.rol as RolPersonal,
    nombres: f.nombres,
    apellidos: f.apellidos,
    email: f.email,
    tipoDocumento: f.tipoDocumento as "dni",
    numeroDocumento: f.numeroDocumento,
    telefono: f.telefono || undefined,
    genero: GENEROS[f.genero],
    fechaNacimiento: f.fechaNacimiento || undefined,
    direccion: f.direccion || undefined,
    cargo: f.cargo || null,
  };
}

/**
 * Importa profesores o personal desde un CSV. Todo o nada: se valida cada línea (datos, correos y roles repetidos en el colegio)
 * antes de crear nada y se devuelven los errores por línea. Quien llama debe disparar `procesarCola()`.
 */
export async function importarPersonalCsv(ctx: TenantContext, csv: string, tipo: "profesores" | "personal"): Promise<ResultadoImportacionPersonal> {
  exigirGestion(ctx);
  const { filas, errores } = leerCsvPersonal(csv, tipo);
  const emails = filas.map((f) => f.email);
  const perfiles = await db.profile.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } });
  const idPorEmail = new Map(perfiles.map((p) => [p.email, p.id]));
  const existentes = await ctx.db.membership.findMany({ where: { userId: { in: perfiles.map((p) => p.id) } }, select: { userId: true, rol: true } });

  for (const fila of filas) {
    const entrada = entradaDeFila(fila);
    const r = esquemaPersona.safeParse(entrada);
    if (!r.success) {
      errores.push({ linea: fila.linea, mensaje: r.error.issues[0].message });
      continue;
    }
    if (fila.genero && !GENEROS[fila.genero]) errores.push({ linea: fila.linea, mensaje: "El género debe ser femenino, masculino o no_especifica." });
    else if (fila.cargo.length > 80) errores.push({ linea: fila.linea, mensaje: "El cargo es demasiado largo." });
    else {
      const uid = idPorEmail.get(r.data.email);
      if (uid && existentes.some((e) => e.userId === uid && e.rol === entrada.rol)) {
        errores.push({ linea: fila.linea, mensaje: `${r.data.email} ya tiene ese rol en el colegio.` });
      }
    }
  }
  if (errores.length > 0 || filas.length === 0) return { ok: false, creados: 0, errores: errores.sort((a, b) => a.linea - b.linea) };

  const hechos: string[] = [];
  try {
    for (const fila of filas) {
      await altaPersonal(ctx, entradaDeFila(fila));
      hechos.push(fila.email);
    }
  } catch (e) {
    // Fallo inesperado a mitad (p. ej. Auth caído): se informa cuántas quedaron creadas para no repetirlas.
    const msg = e instanceof Error ? e.message : "Error inesperado.";
    return { ok: false, creados: hechos.length, errores: [{ linea: filas[hechos.length].linea, mensaje: `${msg} Ya se crearon ${hechos.length} personas; quita esas líneas y vuelve a importar.` }] };
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "membresia", detalle: { importados: hechos.length, tipo } });
  return { ok: true, creados: hechos.length, errores: [] };
}
