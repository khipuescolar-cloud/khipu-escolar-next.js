import "server-only";
import { z } from "zod";
import type { Nivel } from "@/generated/prisma/enums";
import { urlColegio, urlRaiz } from "@/lib/dominio";
import { leerCsvAlumnos, type ErrorFila } from "@/lib/importar-alumnos";
import { auditar } from "./auditoria";
import { ErrorDeNegocio } from "./contexto-accion";
import { db } from "./db";
import { encolarAviso } from "./notificaciones/encolar";
import { requireFeature } from "./plan";
import { supabaseAdmin } from "./supabase";
import { requireRol, type TenantContext } from "./tenant";

// Panel de gestión de dirección (specs/10-panel-direccion-gestion.md): profesores, salones, cursos, alumnos y apoderados.

/** Todas las funciones de este módulo exigen dirección y un plan que incluya «gestion». */
export function exigirGestion(ctx: TenantContext): void {
  requireRol(ctx, ["direccion"]);
  requireFeature(ctx, "gestion");
}

function validar<T extends z.ZodType>(esquema: T, entrada: unknown): z.infer<T> {
  const r = esquema.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0].message);
  return r.data;
}

const texto = (max: number, mensaje: string) => z.string().trim().min(1, mensaje).max(max, "Es demasiado largo.");
const textoOpcional = (max: number) => z.string().trim().max(max, "Es demasiado largo.").transform((v) => v || null);

// ───────────── Invitaciones (profesores y apoderados) ─────────────

const esquemaInvitacion = z.object({
  email: z.email("Escribe un correo válido.").transform((v) => v.trim().toLowerCase()),
  nombres: texto(80, "Escribe los nombres."),
  apellidos: texto(120, "Escribe los apellidos."),
  rol: z.enum(["profesor", "apoderado"]),
});

/**
 * Invita por correo (Supabase `inviteUserByEmail`, enlace para fijar la contraseña), crea el `Profile` si no existe
 * y la `Membership` activa del colegio. Si el correo ya tenía cuenta (p. ej. una familia con hijos en otro colegio), solo se agrega la membresía.
 */
export async function invitarUsuario(ctx: TenantContext, entrada: z.input<typeof esquemaInvitacion>): Promise<{ membershipId: string; userId: string }> {
  exigirGestion(ctx);
  const d = validar(esquemaInvitacion, entrada);

  let perfil = await db.profile.findUnique({ where: { email: d.email } });
  if (!perfil) {
    const { data, error } = await supabaseAdmin().auth.admin.inviteUserByEmail(d.email, {
      redirectTo: urlRaiz("/auth/callback?next=/restablecer"),
      data: { nombres: d.nombres, apellidos: d.apellidos },
    });
    if (error || !data.user) throw new ErrorDeNegocio("No se pudo enviar la invitación. Revisa el correo e inténtalo de nuevo.");
    perfil = await db.profile.create({ data: { id: data.user.id, email: d.email, nombres: d.nombres, apellidos: d.apellidos } });
  }

  const existente = await ctx.db.membership.findFirst({ where: { userId: perfil.id, rol: d.rol } });
  let membershipId: string;
  if (existente) {
    if (existente.estado === "activa") throw new ErrorDeNegocio("Esa persona ya tiene ese rol en el colegio.");
    await ctx.db.membership.update({ where: { id: existente.id }, data: { estado: "activa" } });
    membershipId = existente.id;
  } else {
    membershipId = (await ctx.db.membership.create({ data: { tenantId: ctx.tenant.id, userId: perfil.id, rol: d.rol } })).id;
  }

  await encolarAviso(ctx, {
    plantilla: "invitacion",
    destinatario: d.email,
    apoderadoId: d.rol === "apoderado" ? membershipId : undefined,
    payload: { colegio: ctx.tenant.nombre, nombre: d.nombres, rol: d.rol === "profesor" ? "profesor(a)" : "familia", url: urlColegio(ctx.tenant.slug, "/inicio") },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "membresia", entidadId: membershipId, detalle: { rol: d.rol } });
  return { membershipId, userId: perfil.id };
}

/** Desactiva o reactiva una membresía de profesor o familia (nunca se borra). Al desactivar a un profesor se liberan sus tutorías y cursos. */
export async function cambiarEstadoMembresia(ctx: TenantContext, membershipId: string, estado: "activa" | "inactiva"): Promise<void> {
  exigirGestion(ctx);
  const m = await ctx.db.membership.findFirst({ where: { id: membershipId, rol: { in: ["profesor", "apoderado"] } } });
  if (!m) throw new ErrorDeNegocio("No se encontró a esa persona.");
  await ctx.db.membership.update({ where: { id: m.id }, data: { estado } });
  if (estado === "inactiva" && m.rol === "profesor") {
    await ctx.db.salon.updateMany({ where: { tutorId: m.id }, data: { tutorId: null } });
    await ctx.db.curso.updateMany({ where: { profesorId: m.id }, data: { profesorId: null } });
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "membresia", entidadId: m.id, detalle: { estado } });
}

export async function listarProfesores(ctx: TenantContext) {
  exigirGestion(ctx);
  return ctx.db.membership.findMany({
    where: { rol: "profesor" },
    orderBy: { user: { apellidos: "asc" } },
    select: {
      id: true,
      estado: true,
      user: { select: { nombres: true, apellidos: true, email: true } },
      salonesTutor: { select: { nombre: true } },
      cursosDictados: { select: { nombre: true, salon: { select: { nombre: true } } } },
    },
  });
}

async function exigirProfesorActivo(ctx: TenantContext, id: string | null): Promise<void> {
  if (!id) return;
  const m = await ctx.db.membership.count({ where: { id, rol: "profesor", estado: "activa" } });
  if (m === 0) throw new ErrorDeNegocio("Elige un profesor activo.");
}

// ───────────── Salones y cursos ─────────────

const esquemaSalon = z.object({
  nombre: texto(40, "Escribe el nombre del salón (por ejemplo, 3.° B)."),
  nivel: z.enum(["inicial", "primaria", "secundaria", "academia"]),
  grado: z.coerce.number().int().min(0).max(12).nullable().catch(null),
  seccion: textoOpcional(10),
  anio: z.coerce.number().int().min(2020).max(2100),
  tutorId: z.uuid().nullable().catch(null),
});

export async function crearSalon(ctx: TenantContext, entrada: z.input<typeof esquemaSalon>): Promise<string> {
  exigirGestion(ctx);
  const d = validar(esquemaSalon, entrada);
  await exigirProfesorActivo(ctx, d.tutorId);
  const s = await ctx.db.salon.create({ data: { tenantId: ctx.tenant.id, ...d, nivel: d.nivel as Nivel } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "salon", entidadId: s.id });
  return s.id;
}

export async function editarSalon(ctx: TenantContext, id: string, entrada: z.input<typeof esquemaSalon>): Promise<void> {
  exigirGestion(ctx);
  const d = validar(esquemaSalon, entrada);
  await exigirProfesorActivo(ctx, d.tutorId);
  const r = await ctx.db.salon.updateMany({ where: { id }, data: { ...d, nivel: d.nivel as Nivel } });
  if (r.count === 0) throw new ErrorDeNegocio("No se encontró el salón.");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "salon", entidadId: id });
}

/** Solo se borra un salón vacío (sin alumnos ni cursos); si no, hay que retirar o mover primero. */
export async function eliminarSalon(ctx: TenantContext, id: string): Promise<void> {
  exigirGestion(ctx);
  const [alumnos, cursos] = await Promise.all([ctx.db.alumno.count({ where: { salonId: id } }), ctx.db.curso.count({ where: { salonId: id } })]);
  if (alumnos > 0 || cursos > 0) throw new ErrorDeNegocio("El salón tiene alumnos o cursos. Muévelos antes de borrarlo.");
  const r = await ctx.db.salon.deleteMany({ where: { id } });
  if (r.count === 0) throw new ErrorDeNegocio("No se encontró el salón.");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "salon", entidadId: id });
}

const esquemaCurso = z.object({
  salonId: z.uuid(),
  nombre: texto(80, "Escribe el nombre del curso."),
  profesorId: z.uuid().nullable().catch(null),
});

export async function crearCurso(ctx: TenantContext, entrada: z.input<typeof esquemaCurso>): Promise<string> {
  exigirGestion(ctx);
  const d = validar(esquemaCurso, entrada);
  if ((await ctx.db.salon.count({ where: { id: d.salonId } })) === 0) throw new ErrorDeNegocio("No se encontró el salón.");
  await exigirProfesorActivo(ctx, d.profesorId);
  const c = await ctx.db.curso.create({ data: { tenantId: ctx.tenant.id, ...d } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "curso", entidadId: c.id });
  return c.id;
}

export async function editarCurso(ctx: TenantContext, id: string, entrada: { nombre: string; profesorId: string | null }): Promise<void> {
  exigirGestion(ctx);
  const d = validar(esquemaCurso.omit({ salonId: true }), entrada);
  await exigirProfesorActivo(ctx, d.profesorId);
  const r = await ctx.db.curso.updateMany({ where: { id }, data: d });
  if (r.count === 0) throw new ErrorDeNegocio("No se encontró el curso.");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "curso", entidadId: id });
}

/** No se borra un curso con asistencia, evaluaciones o tareas registradas. */
export async function eliminarCurso(ctx: TenantContext, id: string): Promise<void> {
  exigirGestion(ctx);
  const usos = await ctx.db.curso.findFirst({ where: { id }, select: { _count: { select: { asistencias: true, evaluaciones: true, tareas: true } } } });
  if (!usos) throw new ErrorDeNegocio("No se encontró el curso.");
  if (usos._count.asistencias + usos._count.evaluaciones + usos._count.tareas > 0) {
    throw new ErrorDeNegocio("El curso ya tiene asistencia, notas o tareas. No se puede borrar.");
  }
  await ctx.db.curso.deleteMany({ where: { id } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "curso", entidadId: id });
}

export async function listarSalones(ctx: TenantContext) {
  exigirGestion(ctx);
  return ctx.db.salon.findMany({
    orderBy: [{ anio: "desc" }, { nombre: "asc" }],
    include: { cursos: { orderBy: { nombre: "asc" } }, _count: { select: { alumnos: true } } },
  });
}

// ───────────── Alumnos ─────────────

const esquemaAlumno = z.object({
  nombres: texto(80, "Escribe los nombres."),
  apellidos: texto(120, "Escribe los apellidos."),
  codigo: textoOpcional(40),
  salonId: z.uuid("Elige un salón."),
});

async function exigirCodigoLibre(ctx: TenantContext, codigo: string | null, exceptoId?: string): Promise<void> {
  if (!codigo) return;
  const otro = await ctx.db.alumno.count({ where: { codigo, ...(exceptoId ? { id: { not: exceptoId } } : {}) } });
  if (otro > 0) throw new ErrorDeNegocio(`El código ${codigo} ya lo tiene otro alumno.`);
}

export async function crearAlumno(ctx: TenantContext, entrada: z.input<typeof esquemaAlumno>): Promise<string> {
  exigirGestion(ctx);
  const d = validar(esquemaAlumno, entrada);
  if ((await ctx.db.salon.count({ where: { id: d.salonId } })) === 0) throw new ErrorDeNegocio("No se encontró el salón.");
  await exigirCodigoLibre(ctx, d.codigo);
  const a = await ctx.db.alumno.create({ data: { tenantId: ctx.tenant.id, ...d } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "alumno", entidadId: a.id });
  return a.id;
}

export async function editarAlumno(ctx: TenantContext, id: string, entrada: z.input<typeof esquemaAlumno>): Promise<void> {
  exigirGestion(ctx);
  const d = validar(esquemaAlumno, entrada);
  if ((await ctx.db.salon.count({ where: { id: d.salonId } })) === 0) throw new ErrorDeNegocio("No se encontró el salón.");
  await exigirCodigoLibre(ctx, d.codigo, id);
  const r = await ctx.db.alumno.updateMany({ where: { id }, data: d });
  if (r.count === 0) throw new ErrorDeNegocio("No se encontró al alumno.");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "alumno", entidadId: id });
}

/** Retirar no borra: el alumno deja de salir en listas, avisos y chats, pero su historial se conserva. */
export async function cambiarEstadoAlumno(ctx: TenantContext, id: string, estado: "activo" | "retirado"): Promise<void> {
  exigirGestion(ctx);
  const r = await ctx.db.alumno.updateMany({ where: { id }, data: { estado } });
  if (r.count === 0) throw new ErrorDeNegocio("No se encontró al alumno.");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "alumno", entidadId: id, detalle: { estado } });
}

export type ResultadoImportacion = { ok: boolean; creados: number; errores: ErrorFila[] };

/**
 * Importa alumnos desde un CSV (nombres, apellidos, codigo, salon). Todo o nada: si alguna fila es inválida
 * (salón desconocido, código repetido…) no se crea ninguno y se devuelve la lista de errores por línea.
 */
export async function importarAlumnosCsv(ctx: TenantContext, csv: string): Promise<ResultadoImportacion> {
  exigirGestion(ctx);
  const { filas, errores } = leerCsvAlumnos(csv);
  const salones = await ctx.db.salon.findMany({ select: { id: true, nombre: true } });
  const porNombre = new Map(salones.map((s) => [s.nombre.trim().toLowerCase(), s.id]));
  const codigosExistentes = new Set((await ctx.db.alumno.findMany({ where: { codigo: { not: null } }, select: { codigo: true } })).map((a) => a.codigo));

  const validas: { fila: (typeof filas)[number]; salonId: string }[] = [];
  for (const fila of filas) {
    const salonId = porNombre.get(fila.salon.toLowerCase());
    if (!salonId) errores.push({ linea: fila.linea, mensaje: `No existe el salón «${fila.salon}».` });
    else if (fila.codigo && codigosExistentes.has(fila.codigo)) errores.push({ linea: fila.linea, mensaje: `El código ${fila.codigo} ya lo tiene otro alumno.` });
    else validas.push({ fila, salonId });
  }
  if (errores.length > 0 || validas.length === 0) {
    return { ok: false, creados: 0, errores: errores.sort((a, b) => a.linea - b.linea) };
  }
  await ctx.db.alumno.createMany({
    data: validas.map(({ fila, salonId }) => ({ tenantId: ctx.tenant.id, salonId, nombres: fila.nombres, apellidos: fila.apellidos, codigo: fila.codigo })),
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "alumno", detalle: { importados: validas.length } });
  return { ok: true, creados: validas.length, errores: [] };
}

export async function listarAlumnos(ctx: TenantContext, filtro: { salonId?: string; incluirRetirados?: boolean } = {}) {
  exigirGestion(ctx);
  return ctx.db.alumno.findMany({
    where: { ...(filtro.salonId ? { salonId: filtro.salonId } : {}), ...(filtro.incluirRetirados ? {} : { estado: "activo" }) },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    take: 500,
    include: { salon: { select: { nombre: true } } },
  });
}

// ───────────── Apoderados ─────────────

const esquemaVinculo = z.object({
  apoderadoId: z.uuid(),
  alumnoId: z.uuid("Elige un alumno."),
  parentesco: texto(30, "Escribe el parentesco (madre, padre, tutor legal…)."),
});

/** Vincula un apoderado con un alumno. Si la familia ya aceptó el consentimiento, el vínculo nuevo lo hereda. */
export async function vincularApoderado(ctx: TenantContext, entrada: z.input<typeof esquemaVinculo>): Promise<void> {
  exigirGestion(ctx);
  const d = validar(esquemaVinculo, entrada);
  const [apoderado, alumno] = await Promise.all([
    ctx.db.membership.count({ where: { id: d.apoderadoId, rol: "apoderado" } }),
    ctx.db.alumno.count({ where: { id: d.alumnoId } }),
  ]);
  if (!apoderado || !alumno) throw new ErrorDeNegocio("No se encontró al apoderado o al alumno.");
  const ya = await ctx.db.apoderadoAlumno.count({ where: { apoderadoId: d.apoderadoId, alumnoId: d.alumnoId } });
  if (ya > 0) throw new ErrorDeNegocio("Ese apoderado ya está vinculado a ese alumno.");
  const consentimiento = await ctx.db.consentimiento.findFirst({ where: { apoderadoId: d.apoderadoId, revocadoAt: null }, orderBy: { aceptadoAt: "desc" } });
  const v = await ctx.db.apoderadoAlumno.create({
    data: { tenantId: ctx.tenant.id, apoderadoId: d.apoderadoId, alumnoId: d.alumnoId, parentesco: d.parentesco, consentimientoId: consentimiento?.id ?? null },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "apoderado_alumno", entidadId: v.id });
}

export async function desvincularApoderado(ctx: TenantContext, vinculoId: string): Promise<void> {
  exigirGestion(ctx);
  const r = await ctx.db.apoderadoAlumno.deleteMany({ where: { id: vinculoId } });
  if (r.count === 0) throw new ErrorDeNegocio("No se encontró el vínculo.");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "apoderado_alumno", entidadId: vinculoId });
}

/** Invita a un apoderado a su correo personal y lo vincula al alumno. */
export async function invitarApoderado(ctx: TenantContext, entrada: { email: string; nombres: string; apellidos: string; alumnoId: string; parentesco: string }): Promise<void> {
  exigirGestion(ctx);
  validar(esquemaVinculo.omit({ apoderadoId: true }), entrada);
  const { membershipId } = await invitarUsuario(ctx, { email: entrada.email, nombres: entrada.nombres, apellidos: entrada.apellidos, rol: "apoderado" });
  await vincularApoderado(ctx, { apoderadoId: membershipId, alumnoId: entrada.alumnoId, parentesco: entrada.parentesco });
}

export async function listarApoderados(ctx: TenantContext) {
  exigirGestion(ctx);
  const filas = await ctx.db.membership.findMany({
    where: { rol: "apoderado" },
    orderBy: { user: { apellidos: "asc" } },
    select: {
      id: true,
      estado: true,
      user: { select: { nombres: true, apellidos: true, email: true } },
      hijos: { select: { id: true, parentesco: true, alumno: { select: { nombres: true, apellidos: true, salon: { select: { nombre: true } } } } } },
      consentimientos: { select: { revocadoAt: true } },
    },
  });
  return filas.map(({ consentimientos, ...f }) => ({
    ...f,
    consentimiento: (consentimientos.length === 0 ? "pendiente" : consentimientos.some((c) => !c.revocadoAt) ? "vigente" : "revocado") as "pendiente" | "vigente" | "revocado",
  }));
}
