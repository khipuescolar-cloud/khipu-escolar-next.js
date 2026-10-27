import "server-only";
import { cache } from "react";
import { forbidden, notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Prisma, type Membership, type Profile, type Tenant } from "@/generated/prisma/client";
import type { EstadoAviso, EstadoTenant, Plan } from "@/generated/prisma/enums";
import { urlColegio, urlPlataforma, urlRaiz } from "@/lib/dominio";
import { fechaDb, fechaLima, inicioDiaLima, restarDias } from "@/lib/fechas";
import { errorDeSlug } from "@/lib/slug-colegio";
import { esAdminPlataforma } from "./auth";
import { ErrorDeNegocio } from "./contexto-accion";
import { crearCuentaConDocumento, encolarBienvenida, ErrorCuenta, esquemaPersona, revertirCamposCompletados, type CuentaCreada } from "./cuentas";
import { db, dbTenant } from "./db";
import { exportarColegioZip } from "./exportar";
import { avisarInicioSoporte } from "./notificaciones/aviso-soporte";
import { leerLimites } from "./notificaciones/limites";
import { ENVIANDO_MAX_MINUTOS } from "./notificaciones/cola";
import { reemplazarLogo, retirarLogo, urlLogoColegio, validarLogo } from "./logo";
import { borrarArchivoDelProveedor } from "./storage";
import { supabaseAdmin } from "./supabase";
import { usuarioActual, type TenantContext } from "./tenant";

// Panel del super administrador de Khipu (specs/16-plataforma-superadmin.md).
// - Sin TenantContext: las escrituras de un colegio usan dbTenant(tenant.id) y cada id del cliente se vuelve a consultar.
// - Privacidad (Ley 29733): las métricas son conteos agregados. Nunca se leen nombres de alumnos, notas ni chats.
// - Toda acción queda en `auditoria_plataforma`.

/** Contexto del super administrador (solo lo produce `verificarAdminPlataforma`). */
export type AdminContext = { user: Profile };

/** Meta de apertura de correos de la semana (specs/06). */
export const META_APERTURA = 0.7;

// ───────────── Acceso ─────────────

/** Valida que el usuario sea super administrador activo: sin sesión → login; contraseña inicial → cambiarla; si no → 403. */
export async function verificarAdminPlataforma(user: Profile | null): Promise<AdminContext> {
  if (!user) redirect(urlRaiz("/login"));
  if (user.debeCambiarPassword) redirect(urlRaiz(`/cambiar-password?siguiente=${encodeURIComponent(urlPlataforma("/"))}`));
  if (!(await esAdminPlataforma(user.id))) forbidden();
  return { user };
}

/** Para cada página, action y route handler del panel (una consulta por request). */
export const requireAdminPlataforma = cache(async (): Promise<AdminContext> => verificarAdminPlataforma(await usuarioActual()));

export type AccionPlataforma =
  | "crear_colegio"
  | "cambiar_plan"
  | "cambiar_estado"
  | "editar_colegio"
  | "cambiar_insignia"
  | "reenviar_bienvenida"
  | "agregar_administrador"
  | "exportar_colegio"
  | "soporte_inicio"
  | "soporte_fin";

export async function auditarPlataforma(
  admin: AdminContext,
  accion: AccionPlataforma,
  tenantId: string | null,
  detalle?: Prisma.InputJsonValue,
): Promise<void> {
  await db.auditoriaPlataforma.create({ data: { actorId: admin.user.id, accion, tenantId, detalle: detalle ?? Prisma.JsonNull } });
}

async function colegioOError(id: string): Promise<Tenant> {
  if (!z.uuid().safeParse(id).success) notFound();
  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) notFound();
  return tenant;
}

function validar<T extends z.ZodType>(esquema: T, entrada: unknown): z.infer<T> {
  const r = esquema.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa los datos.");
  return r.data;
}

// ───────────── Esquemas ─────────────

const textoOpcional = (max: number) =>
  z.string().trim().max(max).optional().nullable().transform((v) => v || null);

const esquemaDominios = z
  .string()
  .optional()
  .transform((v) => [...new Set((v ?? "").split(/[,\s]+/).map((d) => d.trim().toLowerCase().replace(/^@/, "")).filter(Boolean))])
  .refine((ds) => ds.every((d) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)), "Revisa los dominios de correo (p. ej. micolegio.edu.pe).");

const esquemaDatosColegio = z.object({
  nombre: z.string().trim().min(3, "Escribe el nombre del colegio.").max(120),
  eslogan: textoOpcional(140),
  ciudad: textoOpcional(80),
  emailDomains: esquemaDominios,
  escalaCalificacion: z.enum(["literal", "vigesimal"]).default("literal"),
});

const esquemaSlug = z
  .string()
  .trim()
  .toLowerCase()
  .superRefine((s, c) => {
    const e = errorDeSlug(s);
    if (e) c.addIssue({ code: "custom", message: e });
  });

export const esquemaAdministrador = esquemaPersona.and(
  z.object({ cargo: z.string().trim().min(2, "Escribe el cargo (p. ej. Director general).").max(80) }),
);

export const esquemaNuevoColegio = z.object({
  colegio: esquemaDatosColegio.extend({
    slug: esquemaSlug,
    plan: z.enum(["basico", "fase2", "promax"]),
    estado: z.enum(["piloto", "activo"]),
  }),
  administrador: esquemaAdministrador,
});

export type EntradaNuevoColegio = z.input<typeof esquemaNuevoColegio>;
export type EntradaAdministrador = z.input<typeof esquemaAdministrador>;

// ───────────── Crear colegio ─────────────

export type ColegioCreado = { tenant: Tenant; userId: string; cuentaNueva: boolean; avisoId: string };

/**
 * Crea el colegio, su insignia, la cuenta del administrador principal (contraseña = documento),
 * su membresía `direccion` activa y el correo de bienvenida en la cola. Si algo falla a la mitad,
 * deshace lo hecho: borra el colegio (cascade), la insignia del proveedor y la cuenta si era nueva.
 * Quien llama debe procesar la cola después (after() + procesarCola).
 */
export async function crearColegio(admin: AdminContext, entrada: EntradaNuevoColegio, insignia?: Buffer | null): Promise<ColegioCreado> {
  const { colegio, administrador } = validar(esquemaNuevoColegio, entrada);
  if (insignia && insignia.length > 0) validarLogo(insignia);
  if (await db.tenant.findUnique({ where: { slug: colegio.slug }, select: { id: true } })) {
    throw new ErrorDeNegocio(`La dirección «${colegio.slug}» ya está en uso. Elige otra.`);
  }

  let tenant: Tenant;
  try {
    tenant = await db.tenant.create({
      data: {
        slug: colegio.slug,
        nombre: colegio.nombre,
        eslogan: colegio.eslogan,
        ciudad: colegio.ciudad,
        plan: colegio.plan,
        estado: colegio.estado,
        emailDomains: colegio.emailDomains,
        escalaCalificacion: colegio.escalaCalificacion,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ErrorDeNegocio(`La dirección «${colegio.slug}» ya está en uso. Elige otra.`);
    }
    throw e;
  }

  let cuenta: CuentaCreada | null = null;
  try {
    if (insignia && insignia.length > 0) {
      await reemplazarLogo(tenant, insignia, admin.user.id);
      tenant = await db.tenant.findUniqueOrThrow({ where: { id: tenant.id } });
    }
    cuenta = await crearCuentaConDocumento(administrador);
    const tdb = dbTenant(tenant.id);
    await tdb.membership.create({
      data: { tenantId: tenant.id, userId: cuenta.userId, rol: "direccion", estado: "activa", cargo: administrador.cargo },
    });
    const avisoId = await encolarBienvenida(tdb, {
      tenant,
      email: administrador.email,
      nombre: administrador.nombres,
      rol: "direccion",
      genero: administrador.genero ?? null,
      tipoDocumento: administrador.tipoDocumento,
      cuentaNueva: cuenta.nueva,
    });
    await auditarPlataforma(admin, "crear_colegio", tenant.id, {
      slug: tenant.slug,
      nombre: tenant.nombre,
      plan: tenant.plan,
      estado: tenant.estado,
      administradorId: cuenta.userId,
      cuentaNueva: cuenta.nueva,
    });
    return { tenant, userId: cuenta.userId, cuentaNueva: cuenta.nueva, avisoId };
  } catch (e) {
    await deshacerColegio(tenant.id, cuenta, administrador);
    if (e instanceof ErrorCuenta) throw new ErrorDeNegocio(e.message);
    throw e;
  }
}

/**
 * Compensación de `crearColegio`: archivos del proveedor, colegio (cascade) y cuenta nueva (Auth + perfil).
 * Si la cuenta ya existía, vuelve a `null` los datos personales vacíos que se completaron.
 */
async function deshacerColegio(tenantId: string, cuenta: CuentaCreada | null, administrador: EntradaAdministrador): Promise<void> {
  try {
    const archivos = await db.archivo.findMany({ where: { tenantId } });
    for (const a of archivos) await borrarArchivoDelProveedor(a).catch(() => undefined);
    await db.tenant.deleteMany({ where: { id: tenantId } });
    if (cuenta?.nueva) {
      await supabaseAdmin().auth.admin.deleteUser(cuenta.userId).catch(() => undefined);
      await db.profile.deleteMany({ where: { id: cuenta.userId } });
    } else if (cuenta) {
      await revertirCamposCompletados(cuenta, administrador);
    }
  } catch (error) {
    console.error("[plataforma] no se pudo deshacer la creación del colegio", tenantId, error);
  }
}

// ───────────── Acciones sobre un colegio ─────────────

export async function cambiarPlan(admin: AdminContext, tenantId: string, plan: Plan): Promise<void> {
  const tenant = await colegioOError(tenantId);
  const nuevo = validar(z.enum(["basico", "fase2", "promax"], "Elige un plan válido."), plan);
  if (nuevo === tenant.plan) return;
  await db.tenant.update({ where: { id: tenant.id }, data: { plan: nuevo } });
  await auditarPlataforma(admin, "cambiar_plan", tenant.id, { antes: tenant.plan, despues: nuevo });
}

export async function cambiarEstado(admin: AdminContext, tenantId: string, estado: EstadoTenant): Promise<void> {
  const tenant = await colegioOError(tenantId);
  const nuevo = validar(z.enum(["piloto", "activo", "suspendido"], "Elige un estado válido."), estado);
  if (nuevo === tenant.estado) return;
  await db.tenant.update({ where: { id: tenant.id }, data: { estado: nuevo } });
  await auditarPlataforma(admin, "cambiar_estado", tenant.id, { antes: tenant.estado, despues: nuevo });
}

export async function editarColegio(admin: AdminContext, tenantId: string, entrada: z.input<typeof esquemaDatosColegio>): Promise<void> {
  const tenant = await colegioOError(tenantId);
  const d = validar(esquemaDatosColegio, entrada);
  await db.tenant.update({ where: { id: tenant.id }, data: d });
  const cambios = (Object.keys(d) as (keyof typeof d)[]).filter((k) => JSON.stringify(d[k]) !== JSON.stringify(tenant[k]));
  await auditarPlataforma(admin, "editar_colegio", tenant.id, { campos: cambios });
}

export async function cambiarInsignia(admin: AdminContext, tenantId: string, insignia: Buffer | null): Promise<void> {
  const tenant = await colegioOError(tenantId);
  if (insignia) {
    const archivoId = await reemplazarLogo(tenant, insignia, admin.user.id);
    await auditarPlataforma(admin, "cambiar_insignia", tenant.id, { archivoId });
  } else {
    await retirarLogo(tenant);
    await auditarPlataforma(admin, "cambiar_insignia", tenant.id, { quitada: true });
  }
}

/** Administradores (membresías `direccion`) del colegio, con su contacto. Datos del personal, no de alumnos. */
export async function administradoresDelColegio(tenantId: string) {
  return db.membership.findMany({
    where: { tenantId, rol: "direccion" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      estado: true,
      cargo: true,
      createdAt: true,
      user: { select: { id: true, email: true, nombres: true, apellidos: true, telefono: true, debeCambiarPassword: true } },
    },
  });
}

/** Vuelve a encolar la bienvenida de un administrador del colegio. Devuelve el id del aviso. */
export async function reenviarBienvenida(admin: AdminContext, tenantId: string, membershipId: string): Promise<string> {
  const tenant = await colegioOError(tenantId);
  if (!z.uuid().safeParse(membershipId).success) notFound();
  const tdb = dbTenant(tenant.id);
  const m = await tdb.membership.findFirst({ where: { id: membershipId, rol: "direccion" }, include: { user: true } });
  if (!m) notFound();
  if (!m.user.tipoDocumento) throw new ErrorDeNegocio("Esta cuenta no tiene documento registrado: usa «Olvidé mi contraseña».");
  const avisoId = await encolarBienvenida(tdb, {
    tenant,
    email: m.user.email,
    nombre: m.user.nombres,
    rol: "direccion",
    genero: m.user.genero,
    tipoDocumento: m.user.tipoDocumento,
    // Mientras no cambie la contraseña inicial, sigue siendo su documento.
    cuentaNueva: m.user.debeCambiarPassword,
  });
  await auditarPlataforma(admin, "reenviar_bienvenida", tenant.id, { membershipId: m.id });
  return avisoId;
}

/** Agrega otro administrador (rol `direccion`, activo) al colegio y le envía la bienvenida. */
export async function agregarAdministrador(
  admin: AdminContext,
  tenantId: string,
  entrada: EntradaAdministrador,
): Promise<{ userId: string; cuentaNueva: boolean; membership: Membership }> {
  const tenant = await colegioOError(tenantId);
  const d = validar(esquemaAdministrador, entrada);
  const tdb = dbTenant(tenant.id);
  let cuenta: CuentaCreada;
  try {
    cuenta = await crearCuentaConDocumento(d);
  } catch (e) {
    if (e instanceof ErrorCuenta) throw new ErrorDeNegocio(e.message);
    throw e;
  }
  try {
    const existente = await tdb.membership.findFirst({ where: { userId: cuenta.userId, rol: "direccion" } });
    if (existente?.estado === "activa") throw new ErrorDeNegocio("Esa persona ya es administradora de este colegio.");
    const membership = existente
      ? await tdb.membership.update({ where: { id: existente.id }, data: { estado: "activa", cargo: d.cargo } })
      : await tdb.membership.create({ data: { tenantId: tenant.id, userId: cuenta.userId, rol: "direccion", estado: "activa", cargo: d.cargo } });
    await encolarBienvenida(tdb, {
      tenant,
      email: d.email,
      nombre: d.nombres,
      rol: "direccion",
      genero: d.genero ?? null,
      tipoDocumento: d.tipoDocumento,
      cuentaNueva: cuenta.nueva,
    });
    await auditarPlataforma(admin, "agregar_administrador", tenant.id, { userId: cuenta.userId, cuentaNueva: cuenta.nueva });
    return { userId: cuenta.userId, cuentaNueva: cuenta.nueva, membership };
  } catch (e) {
    if (cuenta.nueva) {
      await supabaseAdmin().auth.admin.deleteUser(cuenta.userId).catch(() => undefined);
      await db.profile.deleteMany({ where: { id: cuenta.userId } });
    } else {
      await revertirCamposCompletados(cuenta, d).catch(() => undefined);
    }
    throw e;
  }
}

/**
 * Garantía de salida (specs/15): el mismo ZIP que descarga dirección. El super administrador actúa
 * como «dirección» solo para esta exportación; queda en la auditoría del colegio y en la de plataforma.
 */
export async function exportarColegioDesdePlataforma(admin: AdminContext, tenantId: string): Promise<{ tenant: Tenant; zip: Uint8Array }> {
  const tenant = await colegioOError(tenantId);
  const membership: Membership = {
    id: "00000000-0000-0000-0000-000000000000",
    tenantId: tenant.id,
    userId: admin.user.id,
    rol: "direccion",
    estado: "activa",
    cargo: "Equipo Khipu",
    createdAt: new Date(),
  };
  const ctx: TenantContext = { tenant, user: admin.user, membership, rol: "direccion", roles: ["direccion"], db: dbTenant(tenant.id) };
  const zip = await exportarColegioZip(ctx);
  await auditarPlataforma(admin, "exportar_colegio", tenant.id, { bytes: zip.length });
  return { tenant, zip };
}

// ───────────── Métricas (solo conteos agregados) ─────────────

const ESTADOS_ENVIADOS: EstadoAviso[] = ["enviado", "entregado", "abierto", "rebotado", "queja"];

export type MetricasPlataforma = {
  colegios: { total: number; porEstado: Record<EstadoTenant, number>; porPlan: Record<Plan, number> };
  alumnos: number;
  usuariosActivos7d: number;
  correos24h: number;
  limiteDiario: number;
  apertura7d: { enviados: number; abiertos: number; tasa: number | null };
  rebotes7d: number;
  quejas7d: number;
  cola: { pendientes: number; vencidos: number; atascados: number; errores7d: number };
};

export async function metricasPlataforma(_admin: AdminContext, ahora = new Date()): Promise<MetricasPlataforma> {
  const hace24h = new Date(ahora.getTime() - 86_400_000);
  const hace7d = new Date(ahora.getTime() - 7 * 86_400_000);
  const limiteAtasco = new Date(ahora.getTime() - ENVIANDO_MAX_MINUTOS * 60_000);
  const [porEstado, porPlan, alumnos, logins, correos24h, avisos7d, pendientes, vencidos, atascados] = await Promise.all([
    db.tenant.groupBy({ by: ["estado"], _count: { _all: true } }),
    db.tenant.groupBy({ by: ["plan"], _count: { _all: true } }),
    db.alumno.count({ where: { estado: "activo" } }),
    // Personas con membresía activa en algún colegio que ingresaron en la ventana (profiles.ultimo_ingreso_at).
    db.profile.count({ where: { ultimoIngresoAt: { gte: hace7d }, memberships: { some: { estado: "activa" } } } }),
    db.aviso.count({ where: { canal: "correo", enviadoAt: { gte: hace24h } } }),
    db.aviso.groupBy({ by: ["estado"], where: { canal: "correo", createdAt: { gte: hace7d } }, _count: { _all: true } }),
    db.aviso.count({ where: { estado: "pendiente" } }),
    db.aviso.count({ where: { estado: "pendiente", programadoPara: { lt: new Date(ahora.getTime() - 15 * 60_000) } } }),
    db.aviso.count({ where: { estado: "enviando", programadoPara: { lt: limiteAtasco } } }),
  ]);
  const cuenta = (estado: EstadoAviso) => avisos7d.find((a) => a.estado === estado)?._count._all ?? 0;
  const enviados = ESTADOS_ENVIADOS.reduce((s, e) => s + cuenta(e), 0);
  const abiertos = cuenta("abierto");
  const total = porEstado.reduce((s, e) => s + e._count._all, 0);
  return {
    colegios: {
      total,
      porEstado: { activo: 0, piloto: 0, suspendido: 0, ...Object.fromEntries(porEstado.map((e) => [e.estado, e._count._all])) },
      porPlan: { basico: 0, fase2: 0, promax: 0, ...Object.fromEntries(porPlan.map((e) => [e.plan, e._count._all])) },
    },
    alumnos,
    usuariosActivos7d: logins,
    correos24h,
    limiteDiario: leerLimites().limiteDiario,
    apertura7d: { enviados, abiertos, tasa: enviados > 0 ? abiertos / enviados : null },
    rebotes7d: cuenta("rebotado"),
    quejas7d: cuenta("queja"),
    cola: { pendientes, vencidos, atascados, errores7d: cuenta("error") },
  };
}

// ───────────── Reporte de colegios ─────────────

export const esquemaFiltroReporte = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  plan: z.enum(["basico", "fase2", "promax"]).optional().catch(undefined),
  estado: z.enum(["activo", "piloto", "suspendido"]).optional().catch(undefined),
});
export type FiltroReporte = z.input<typeof esquemaFiltroReporte>;

export type FilaReporte = {
  id: string;
  slug: string;
  nombre: string;
  ciudad: string | null;
  plan: Plan;
  estado: EstadoTenant;
  alumnos: number;
  profesores: number;
  familias: number;
  ultimoIngreso: Date | null;
  /** Perfiles con membresía activa en el colegio y `ultimoIngresoAt` en los últimos 7 días. */
  usuariosActivos7d: number;
  asistencias7d: number;
  avisos7d: number;
  abiertos7d: number;
  rebotes7d: number;
  createdAt: Date;
};

const porTenant = <T extends { tenantId: string }>(filas: T[], valor: (f: T) => number) => {
  const m = new Map<string, number>();
  for (const f of filas) m.set(f.tenantId, (m.get(f.tenantId) ?? 0) + valor(f));
  return m;
};

/** Una fila por colegio con conteos agregados. No incluye ningún dato personal de alumnos ni familias. */
export async function reporteColegios(_admin: AdminContext, filtroCrudo: FiltroReporte = {}, ahora = new Date()): Promise<FilaReporte[]> {
  return filasReporte(esquemaFiltroReporte.parse(filtroCrudo), ahora);
}

async function filasReporte(filtro: z.output<typeof esquemaFiltroReporte> & { id?: string }, ahora: Date): Promise<FilaReporte[]> {
  const tenants = await db.tenant.findMany({
    where: {
      ...(filtro.id ? { id: filtro.id } : {}),
      ...(filtro.plan ? { plan: filtro.plan } : {}),
      ...(filtro.estado ? { estado: filtro.estado } : {}),
      ...(filtro.q
        ? { OR: [{ nombre: { contains: filtro.q, mode: "insensitive" } }, { slug: { contains: filtro.q.toLowerCase() } }, { ciudad: { contains: filtro.q, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, nombre: true, ciudad: true, plan: true, estado: true, createdAt: true },
  });
  if (tenants.length === 0) return [];
  const ids = tenants.map((t) => t.id);
  const hace7d = new Date(ahora.getTime() - 7 * 86_400_000);
  const desdeFecha = fechaDb(restarDias(fechaLima(ahora), 6));

  const [alumnos, miembros, asistencias, avisos, ingresos] = await Promise.all([
    db.alumno.groupBy({ by: ["tenantId"], where: { tenantId: { in: ids }, estado: "activo" }, _count: { _all: true } }),
    db.membership.groupBy({ by: ["tenantId", "rol"], where: { tenantId: { in: ids }, estado: "activa", rol: { in: ["profesor", "apoderado"] } }, _count: { _all: true } }),
    db.asistencia.groupBy({ by: ["tenantId"], where: { tenantId: { in: ids }, fecha: { gte: desdeFecha } }, _count: { _all: true } }),
    db.aviso.groupBy({ by: ["tenantId", "estado"], where: { tenantId: { in: ids }, canal: "correo", createdAt: { gte: hace7d } }, _count: { _all: true } }),
    db.$queryRaw<{ tenant_id: string; ultimo: Date | null; activos: bigint }[]>`
      SELECT m.tenant_id::text AS tenant_id,
             max(p.ultimo_ingreso_at) AS ultimo,
             count(DISTINCT p.id) FILTER (WHERE p.ultimo_ingreso_at >= ${hace7d}) AS activos
      FROM memberships m
      JOIN profiles p ON p.id = m.user_id
      WHERE m.tenant_id = ANY(${ids}::uuid[]) AND m.estado = 'activa'
      GROUP BY m.tenant_id`,
  ]);
  const nAlumnos = porTenant(alumnos, (f) => f._count._all);
  const nProfes = porTenant(miembros.filter((m) => m.rol === "profesor"), (f) => f._count._all);
  const nFamilias = porTenant(miembros.filter((m) => m.rol === "apoderado"), (f) => f._count._all);
  const nAsist = porTenant(asistencias, (f) => f._count._all);
  const nEnviados = porTenant(avisos.filter((a) => ESTADOS_ENVIADOS.includes(a.estado)), (f) => f._count._all);
  const nAbiertos = porTenant(avisos.filter((a) => a.estado === "abierto"), (f) => f._count._all);
  const nRebotes = porTenant(avisos.filter((a) => a.estado === "rebotado" || a.estado === "queja"), (f) => f._count._all);
  const ultimo = new Map(ingresos.map((i) => [i.tenant_id, i.ultimo]));
  const activos = new Map(ingresos.map((i) => [i.tenant_id, Number(i.activos)]));

  return tenants.map((t) => ({
    ...t,
    alumnos: nAlumnos.get(t.id) ?? 0,
    profesores: nProfes.get(t.id) ?? 0,
    familias: nFamilias.get(t.id) ?? 0,
    ultimoIngreso: ultimo.get(t.id) ?? null,
    usuariosActivos7d: activos.get(t.id) ?? 0,
    asistencias7d: nAsist.get(t.id) ?? 0,
    avisos7d: nEnviados.get(t.id) ?? 0,
    abiertos7d: nAbiertos.get(t.id) ?? 0,
    rebotes7d: nRebotes.get(t.id) ?? 0,
  }));
}

// ───────────── Detalle de un colegio ─────────────

export type DiaMetricas = { fecha: string; asistencias: number; avisos: number; abiertos: number; rebotes: number; ingresos: number };

export async function detalleColegio(_admin: AdminContext, tenantId: string, ahora = new Date()) {
  const tenant = await colegioOError(tenantId);
  const hoy = fechaLima(ahora);
  const desde = restarDias(hoy, 29);
  const desdeInstante = inicioDiaLima(desde);

  const [fila] = await filasReporte({ id: tenant.id }, ahora);
  const [administradores, logoUrl, asistencias, avisos, ingresos] = await Promise.all([
    administradoresDelColegio(tenant.id),
    urlLogoColegio(tenant),
    db.asistencia.groupBy({ by: ["fecha"], where: { tenantId: tenant.id, fecha: { gte: fechaDb(desde) } }, _count: { _all: true } }),
    db.$queryRaw<{ dia: string; total: bigint; abiertos: bigint; rebotes: bigint }[]>`
      SELECT to_char(created_at AT TIME ZONE 'America/Lima', 'YYYY-MM-DD') AS dia,
             count(*) FILTER (WHERE estado IN ('enviado','entregado','abierto','rebotado','queja')) AS total,
             count(*) FILTER (WHERE estado = 'abierto') AS abiertos,
             count(*) FILTER (WHERE estado IN ('rebotado','queja')) AS rebotes
      FROM avisos
      WHERE tenant_id = ${tenant.id}::uuid AND canal = 'correo' AND created_at >= ${desdeInstante}
      GROUP BY 1`,
    db.$queryRaw<{ dia: string; usuarios: bigint }[]>`
      SELECT to_char(l.created_at AT TIME ZONE 'America/Lima', 'YYYY-MM-DD') AS dia, count(DISTINCT l.user_id) AS usuarios
      FROM login_intentos l
      WHERE l.exito AND l.user_id IS NOT NULL AND l.created_at >= ${desdeInstante}
        AND l.user_id IN (SELECT m.user_id FROM memberships m WHERE m.tenant_id = ${tenant.id}::uuid AND m.estado = 'activa')
      GROUP BY 1`,
  ]);

  const dias: DiaMetricas[] = [];
  for (let i = 29; i >= 0; i--) {
    const fecha = restarDias(hoy, i);
    const a = avisos.find((x) => x.dia === fecha);
    dias.push({
      fecha,
      asistencias: asistencias.find((x) => x.fecha.toISOString().slice(0, 10) === fecha)?._count._all ?? 0,
      avisos: Number(a?.total ?? 0),
      abiertos: Number(a?.abiertos ?? 0),
      rebotes: Number(a?.rebotes ?? 0),
      ingresos: Number(ingresos.find((x) => x.dia === fecha)?.usuarios ?? 0),
    });
  }
  return { tenant, fila, administradores, logoUrl, dias };
}

/**
 * Bitácora de plataforma de un colegio (más recientes primero). Filtra y ordena por (tenant_id, created_at),
 * que es el índice `auditoria_plataforma_tenant_id_created_at_idx`.
 */
export async function auditoriaDelColegio(_admin: AdminContext, tenantId: string, limite = 20, desde?: Date) {
  const filas = await db.auditoriaPlataforma.findMany({
    where: { tenantId, ...(desde ? { createdAt: { gte: desde } } : {}) },
    orderBy: [{ tenantId: "asc" }, { createdAt: "desc" }],
    take: limite,
  });
  const actores = await db.profile.findMany({
    where: { id: { in: [...new Set(filas.map((f) => f.actorId))] } },
    select: { id: true, nombres: true, apellidos: true },
  });
  const nombre = new Map(actores.map((a) => [a.id, `${a.nombres} ${a.apellidos}`.trim()]));
  return filas.map((f) => ({ id: f.id.toString(), accion: f.accion, createdAt: f.createdAt, actor: nombre.get(f.actorId) ?? "Cuenta eliminada" }));
}

// ───────────── Series de 30 días de toda la plataforma (vista principal) ─────────────

export type DiaPlataforma = { fecha: string; ingresos: number; enviados: number; abiertos: number };

/**
 * Una fila por día (zona Lima) de los últimos 30 días: personas distintas que ingresaron
 * (`login_intentos.user_id`) y correos enviados frente a abiertos. Solo conteos.
 */
export async function serieDiariaPlataforma(_admin: AdminContext, ahora = new Date()): Promise<DiaPlataforma[]> {
  const hoy = fechaLima(ahora);
  const desdeInstante = inicioDiaLima(restarDias(hoy, 29));
  const [ingresos, avisos] = await Promise.all([
    db.$queryRaw<{ dia: string; usuarios: bigint }[]>`
      SELECT to_char(created_at AT TIME ZONE 'America/Lima', 'YYYY-MM-DD') AS dia, count(DISTINCT user_id) AS usuarios
      FROM login_intentos
      WHERE exito AND user_id IS NOT NULL AND created_at >= ${desdeInstante}
      GROUP BY 1`,
    db.$queryRaw<{ dia: string; enviados: bigint; abiertos: bigint }[]>`
      SELECT to_char(created_at AT TIME ZONE 'America/Lima', 'YYYY-MM-DD') AS dia,
             count(*) FILTER (WHERE estado IN ('enviado','entregado','abierto','rebotado','queja')) AS enviados,
             count(*) FILTER (WHERE estado = 'abierto') AS abiertos
      FROM avisos
      WHERE canal = 'correo' AND created_at >= ${desdeInstante}
      GROUP BY 1`,
  ]);
  const dias: DiaPlataforma[] = [];
  for (let i = 29; i >= 0; i--) {
    const fecha = restarDias(hoy, i);
    const a = avisos.find((x) => x.dia === fecha);
    dias.push({
      fecha,
      ingresos: Number(ingresos.find((x) => x.dia === fecha)?.usuarios ?? 0),
      enviados: Number(a?.enviados ?? 0),
      abiertos: Number(a?.abiertos ?? 0),
    });
  }
  return dias;
}

// ───────────── Acceso de soporte a un colegio ─────────────

/** Duraciones permitidas del acceso de soporte, en minutos. */
export const DURACIONES_SOPORTE = [30, 60, 120] as const;

export const esquemaAccesoSoporte = z.object({
  motivo: z.string().trim().min(5, "Escribe el motivo del acceso (mínimo 5 caracteres).").max(300, "El motivo es muy largo (máximo 300 caracteres)."),
  minutos: z.coerce
    .number()
    .refine((n) => (DURACIONES_SOPORTE as readonly number[]).includes(n), "Elige una duración de 30, 60 o 120 minutos."),
});

/**
 * Abre un acceso de soporte de solo lectura al colegio (specs/16). Cierra antes cualquier acceso
 * abierto del mismo administrador en ese colegio. Devuelve la URL de entrada al subdominio.
 */
export async function iniciarAccesoSoporte(
  admin: AdminContext,
  tenantId: string,
  entrada: z.input<typeof esquemaAccesoSoporte>,
  ahora = new Date(),
): Promise<{ accesoId: string; expiraAt: Date; url: string }> {
  const tenant = await colegioOError(tenantId);
  const { motivo, minutos } = validar(esquemaAccesoSoporte, entrada);
  // Un colegio suspendido también admite soporte (es cuando más se necesita): sigue siendo solo lectura y auditado.
  await db.accesoSoporte.updateMany({ where: { tenantId: tenant.id, adminId: admin.user.id, cerradoAt: null }, data: { cerradoAt: ahora } });
  const acceso = await db.accesoSoporte.create({
    data: { tenantId: tenant.id, adminId: admin.user.id, motivo, inicioAt: ahora, expiraAt: new Date(ahora.getTime() + minutos * 60_000) },
  });
  await auditarPlataforma(admin, "soporte_inicio", tenant.id, { accesoId: acceso.id, motivo, minutos, suspendido: tenant.estado === "suspendido" });
  // Transparencia: la dirección del colegio recibe un aviso (correo/push según su perfil).
  await avisarInicioSoporte(tenant.id, acceso);
  return { accesoId: acceso.id, expiraAt: acceso.expiraAt, url: urlColegio(tenant.slug, "/inicio") };
}

/** Cierra un acceso de soporte propio. Devuelve el colegio, o null si no existe o ya estaba cerrado. */
export async function terminarAccesoSoporte(admin: AdminContext, accesoId: string, ahora = new Date()): Promise<{ tenantId: string } | null> {
  if (!z.uuid().safeParse(accesoId).success) return null;
  const acceso = await db.accesoSoporte.findFirst({ where: { id: accesoId, adminId: admin.user.id } });
  if (!acceso) return null;
  if (acceso.cerradoAt) return { tenantId: acceso.tenantId };
  await db.accesoSoporte.update({ where: { id: acceso.id }, data: { cerradoAt: ahora } });
  await auditarPlataforma(admin, "soporte_fin", acceso.tenantId, {
    accesoId: acceso.id,
    vencido: acceso.expiraAt <= ahora,
  });
  return { tenantId: acceso.tenantId };
}

/** Acceso de soporte vigente del administrador en el colegio (para la ficha), o null. */
export async function accesoSoporteActual(admin: AdminContext, tenantId: string, ahora = new Date()) {
  return db.accesoSoporte.findFirst({
    where: { tenantId, adminId: admin.user.id, cerradoAt: null, expiraAt: { gt: ahora } },
    orderBy: { expiraAt: "desc" },
    select: { id: true, motivo: true, inicioAt: true, expiraAt: true },
  });
}
