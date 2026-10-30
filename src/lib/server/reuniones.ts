import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { instanteLima } from "@/lib/fechas";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { generarInvitados, puedeResponderReunion, resumirRespuestas, type ConteoRespuestas } from "@/lib/reuniones";
import { auditar } from "./auditoria";
import { avisarReunion } from "./notificaciones/avisos-reuniones";
import { requireFeature } from "./plan";
import { salonEsActivo, whereSalonActivo } from "./salones-activos";
import { alumnoIdsVisibles, requireRol, salonIdsVisibles, type TenantContext } from "./tenant";

// Reuniones de padres (specs/32). Todo el control de acceso es de servidor: quien convoca (dirección o el profesor
// que la creó) gestiona; las familias solo ven y responden las reuniones donde tienen una fila de invitado.

const ROLES = ["direccion", "profesor", "apoderado"] as const;
const ESPERA_RECORDATORIO_MS = 6 * 3_600_000;

function entrar(ctx: TenantContext) {
  requireFeature(ctx, "reuniones");
  requireRol(ctx, [...ROLES]);
}

function esOrganizadorRol(ctx: TenantContext): boolean {
  return ctx.rol === "direccion" || ctx.rol === "profesor";
}

/** Filtro de reuniones visibles: dirección todas; profesor las que convocó; familia las que la invitan. */
function dondeVisible(ctx: TenantContext): Prisma.ReunionWhereInput {
  if (ctx.rol === "direccion") return {};
  if (ctx.rol === "profesor") return { convocadaPorId: ctx.membership.id };
  return { invitados: { some: { membershipId: ctx.membership.id } } };
}

/** Filtro de reuniones que el usuario puede gestionar (convocó, o es dirección). */
function dondeGestiona(ctx: TenantContext): Prisma.ReunionWhereInput {
  return ctx.rol === "direccion" ? {} : { convocadaPorId: ctx.membership.id };
}

// ───────────── Convocar ─────────────

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Elige una hora válida.");
const opcional = (max: number) => z.string().trim().max(max).optional().or(z.literal("").transform(() => undefined));

const esquemaConvocatoria = z
  .object({
    titulo: z.string().trim().min(3, "Escribe el título de la reunión.").max(150),
    descripcion: opcional(1000),
    fecha: z.iso.date("Elige la fecha."),
    hora,
    horaFin: hora.optional().or(z.literal("").transform(() => undefined)),
    lugar: opcional(200),
    enlace: z.url({ protocol: /^https?$/, error: "El enlace debe empezar con https://." }).max(500).optional().or(z.literal("").transform(() => undefined)),
    alcance: z.enum(["colegio", "salon", "individual"], "Elige a quién convocas."),
    salonId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
    alumnoId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  })
  .refine((d) => d.lugar || d.enlace, { message: "Indica el lugar o el enlace de la reunión.", path: ["lugar"] });

/** Dirección convoca cualquier alcance; el profesor, sus salones o una familia de uno de sus alumnos. */
export async function convocarReunion(ctx: TenantContext, entrada: unknown, ahora = new Date()): Promise<Resultado & { id?: string }> {
  entrar(ctx);
  requireRol(ctx, ["direccion", "profesor"]);
  const d = esquemaConvocatoria.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const { alcance } = d.data;
  const inicio = instanteLima(d.data.fecha, d.data.hora);
  const fin = d.data.horaFin ? instanteLima(d.data.fecha, d.data.horaFin) : null;
  if (inicio.getTime() <= ahora.getTime()) return fallo("Elige una fecha y hora futuras.");
  if (fin && fin.getTime() < inicio.getTime()) return fallo("La hora de fin no puede ser anterior a la de inicio.");

  let salonId: string | null = null;
  let alumnoId: string | null = null;
  if (alcance === "colegio") {
    if (ctx.rol !== "direccion") return fallo("Solo dirección convoca a todo el colegio.");
  } else if (alcance === "salon") {
    if (!d.data.salonId) return fallo("Elige el salón.");
    if (ctx.rol === "profesor" && !(await salonIdsVisibles(ctx)).includes(d.data.salonId)) return fallo("Solo puedes convocar a tus salones.");
    if (!(await salonEsActivo(ctx, d.data.salonId))) return fallo("No encontramos ese salón.");
    salonId = d.data.salonId;
  } else {
    if (!d.data.alumnoId) return fallo("Elige al alumno cuya familia convocas.");
    if (ctx.rol === "profesor" && !(await alumnoIdsVisibles(ctx)).includes(d.data.alumnoId)) return fallo("Solo puedes convocar a familias de tus alumnos.");
    const alumno = await ctx.db.alumno.findFirst({ where: { id: d.data.alumnoId, estado: "activo" }, select: { id: true, salonId: true } });
    if (!alumno) return fallo("No encontramos a ese alumno.");
    alumnoId = alumno.id;
    salonId = alumno.salonId;
  }

  const vinculos = await ctx.db.apoderadoAlumno.findMany({
    where: {
      apoderado: { estado: "activa", rol: "apoderado" },
      alumno: alcance === "salon" ? { salonId: salonId!, estado: "activo" } : alcance === "individual" ? { id: alumnoId!, estado: "activo" } : { estado: "activo" },
    },
    select: { apoderadoId: true, alumnoId: true },
  });
  const invitados = generarInvitados(alcance, vinculos);
  if (invitados.length === 0) return fallo("No hay familias con apoderados activos para invitar a esta reunión.");

  const reunion = await ctx.db.reunion.create({
    data: {
      tenantId: ctx.tenant.id, titulo: d.data.titulo, descripcion: d.data.descripcion ?? null, inicio, fin,
      lugar: d.data.lugar ?? null, enlace: d.data.enlace ?? null, alcance, salonId, convocadaPorId: ctx.membership.id,
    },
  });
  await ctx.db.reunionInvitado.createMany({
    data: invitados.map((i) => ({ tenantId: ctx.tenant.id, reunionId: reunion.id, membershipId: i.membershipId, alumnoId: i.alumnoId })),
  });
  const familias = await avisarReunion(ctx, "reunion_convocada", reunion, invitados);
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "reunion", entidadId: reunion.id,
    detalle: { alcance, invitados: invitados.length, familiasAvisadas: familias },
  });
  return { ...ok(`Reunión convocada. Invitamos a ${new Set(invitados.map((i) => i.membershipId)).size} familias.`), id: reunion.id };
}

/** Salones y alumnos entre los que el usuario puede elegir al convocar. */
export async function opcionesParaConvocar(ctx: TenantContext) {
  entrar(ctx);
  requireRol(ctx, ["direccion", "profesor"]);
  const ids = await salonIdsVisibles(ctx);
  const [salones, alumnos] = await Promise.all([
    ctx.db.salon.findMany({ where: { id: { in: ids }, ...whereSalonActivo }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    ctx.db.alumno.findMany({
      where: { salonId: { in: ids }, estado: "activo", apoderados: { some: {} } },
      select: { id: true, nombres: true, apellidos: true, salon: { select: { nombre: true } } },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
  ]);
  return { salones, alumnos: alumnos.map((a) => ({ id: a.id, nombre: `${a.apellidos}, ${a.nombres}`, salon: a.salon.nombre })), puedeColegio: ctx.rol === "direccion" };
}

// ───────────── Lectura ─────────────

export type ReunionVista = {
  id: string;
  titulo: string;
  descripcion: string | null;
  inicio: Date;
  fin: Date | null;
  lugar: string | null;
  enlace: string | null;
  alcance: "colegio" | "salon" | "individual";
  ambito: string;
  estado: "programada" | "realizada" | "cancelada";
  convocadaPor: string;
  /** Puede gestionarla (convocó o es dirección). */
  gestiona: boolean;
  /** Acta: a las familias solo se les entrega si está publicada; a quien gestiona, siempre. */
  acta: string | null;
  actaPublicadaAt: Date | null;
  /** Solo para familias. */
  mia: { respuesta: "pendiente" | "asistire" | "no_asistire"; comentario: string | null; alumnos: string[]; asistio: boolean | null } | null;
  /** Solo para quien gestiona. */
  resumen: ConteoRespuestas | null;
};

type FilaReunion = Prisma.ReunionGetPayload<{
  include: {
    salon: { select: { nombre: true } };
    convocadaPor: { select: { user: { select: { nombres: true; apellidos: true } } } };
    invitados: { include: { alumno: { select: { nombres: true } } } };
  };
}>;

const incluirLista = {
  salon: { select: { nombre: true } },
  convocadaPor: { select: { user: { select: { nombres: true, apellidos: true } } } },
  invitados: { include: { alumno: { select: { nombres: true } } } },
} satisfies Prisma.ReunionInclude;

function aVista(ctx: TenantContext, r: FilaReunion): ReunionVista {
  const gestiona = esOrganizadorRol(ctx) && (ctx.rol === "direccion" || r.convocadaPorId === ctx.membership.id);
  const propias = r.invitados.filter((i) => i.membershipId === ctx.membership.id);
  const mia = propias.length > 0
    ? {
        respuesta: propias[0].respuesta,
        comentario: propias.find((p) => p.comentario)?.comentario ?? null,
        alumnos: [...new Set(propias.flatMap((p) => (p.alumno ? [p.alumno.nombres.split(/\s+/)[0]] : [])))],
        asistio: propias[0].asistio,
      }
    : null;
  const veActa = gestiona || r.actaPublicadaAt !== null;
  return {
    id: r.id, titulo: r.titulo, descripcion: r.descripcion, inicio: r.inicio, fin: r.fin, lugar: r.lugar, enlace: r.enlace,
    alcance: r.alcance,
    ambito: r.alcance === "colegio" ? "Todo el colegio" : r.salon ? (r.alcance === "individual" ? `Individual · ${r.salon.nombre}` : r.salon.nombre) : "Individual",
    estado: r.estado,
    convocadaPor: `${r.convocadaPor.user.nombres} ${r.convocadaPor.user.apellidos ?? ""}`.trim(),
    gestiona,
    acta: veActa ? r.acta : null,
    actaPublicadaAt: veActa ? r.actaPublicadaAt : null,
    mia,
    resumen: gestiona ? resumirRespuestas(r.invitados) : null,
  };
}

/** Reuniones visibles para el usuario (más recientes primero). */
export async function listarReuniones(ctx: TenantContext): Promise<ReunionVista[]> {
  entrar(ctx);
  const filas = await ctx.db.reunion.findMany({ where: dondeVisible(ctx), include: incluirLista, orderBy: { inicio: "desc" }, take: 200 });
  return filas.map((r) => aVista(ctx, r));
}

export type PersonaInvitada = {
  membershipId: string;
  nombre: string;
  alumnos: string[];
  respuesta: "pendiente" | "asistire" | "no_asistire";
  comentario: string | null;
  respondidaAt: Date | null;
  asistio: boolean | null;
};

export type DetalleReunion = ReunionVista & { personas: PersonaInvitada[] | null };

/** Detalle de una reunión visible; null si no existe o no se puede ver (nunca distingue una de otra). */
export async function detalleReunion(ctx: TenantContext, reunionId: string): Promise<DetalleReunion | null> {
  entrar(ctx);
  if (!z.uuid().safeParse(reunionId).success) return null;
  const r = await ctx.db.reunion.findFirst({ where: { id: reunionId, ...dondeVisible(ctx) }, include: incluirLista });
  if (!r) return null;
  const vista = aVista(ctx, r);
  if (!vista.gestiona) return { ...vista, personas: null };
  const usuarios = await ctx.db.membership.findMany({
    where: { id: { in: [...new Set(r.invitados.map((i) => i.membershipId))] } },
    select: { id: true, user: { select: { nombres: true, apellidos: true } } },
  });
  const nombre = new Map(usuarios.map((u) => [u.id, `${u.user.nombres} ${u.user.apellidos ?? ""}`.trim()]));
  const porPersona = new Map<string, PersonaInvitada>();
  for (const i of r.invitados) {
    const p = porPersona.get(i.membershipId) ?? {
      membershipId: i.membershipId, nombre: nombre.get(i.membershipId) ?? "Familia", alumnos: [], respuesta: i.respuesta,
      comentario: null, respondidaAt: i.respondidaAt, asistio: i.asistio,
    };
    if (i.alumno) p.alumnos.push(i.alumno.nombres.split(/\s+/)[0]);
    if (i.comentario) p.comentario = i.comentario;
    porPersona.set(i.membershipId, p);
  }
  const personas = [...porPersona.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return { ...vista, personas };
}

// ───────────── Responder ─────────────

const esquemaRespuesta = z.object({
  respuesta: z.enum(["asistire", "no_asistire"], "Elige «Asistiré» o «No asistiré»."),
  comentario: z.string().trim().max(300, "El comentario es muy largo (máximo 300 caracteres).").optional().or(z.literal("").transform(() => undefined)),
});

/** La familia responde (o cambia su respuesta) hasta la hora de inicio. Aplica a todas sus filas de la reunión. */
export async function responderInvitacion(ctx: TenantContext, reunionId: string, entrada: unknown, ahora = new Date()): Promise<Resultado> {
  entrar(ctx);
  const propias = await ctx.db.reunionInvitado.findMany({
    where: { reunionId, membershipId: ctx.membership.id },
    select: { id: true, reunion: { select: { estado: true, inicio: true } } },
  });
  if (propias.length === 0) forbidden(); // no invitado (o de otro colegio): igual que no existir
  const d = esquemaRespuesta.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  if (!puedeResponderReunion(propias[0].reunion, ahora)) {
    return fallo(propias[0].reunion.estado === "cancelada" ? "Esta reunión se canceló." : "La reunión ya empezó: no se puede responder.");
  }
  await ctx.db.reunionInvitado.updateMany({
    where: { id: { in: propias.map((p) => p.id) } },
    data: { respuesta: d.data.respuesta, comentario: d.data.comentario ?? null, respondidaAt: ahora },
  });
  return ok(d.data.respuesta === "asistire" ? "Listo, confirmamos que asistirás." : "Listo, avisamos que no asistirás.");
}

// ───────────── Gestión de quien convoca ─────────────

async function reunionGestionable(ctx: TenantContext, reunionId: string) {
  entrar(ctx);
  requireRol(ctx, ["direccion", "profesor"]);
  if (!z.uuid().safeParse(reunionId).success) forbidden();
  const r = await ctx.db.reunion.findFirst({ where: { id: reunionId, ...dondeGestiona(ctx) } });
  if (!r) forbidden();
  return r;
}

/** Recordatorio a las familias que aún no respondieron (no más de uno cada 6 horas). */
export async function recordarPendientes(ctx: TenantContext, reunionId: string, ahora = new Date()): Promise<Resultado> {
  const r = await reunionGestionable(ctx, reunionId);
  if (!puedeResponderReunion(r, ahora)) return fallo("Solo se puede recordar antes de que empiece una reunión programada.");
  const reciente = await ctx.db.aviso.count({
    where: { plantilla: "reunion_recordatorio", referenciaId: r.id, createdAt: { gt: new Date(ahora.getTime() - ESPERA_RECORDATORIO_MS) } },
  });
  if (reciente > 0) return fallo("Ya enviaste un recordatorio hace poco. Intenta de nuevo en unas horas.");
  const pendientes = await ctx.db.reunionInvitado.findMany({
    where: { reunionId: r.id, respuesta: "pendiente" },
    select: { membershipId: true, alumnoId: true },
  });
  if (pendientes.length === 0) return fallo("Todas las familias ya respondieron.");
  const familias = await avisarReunion(ctx, "reunion_recordatorio", r, pendientes);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "enviar", entidad: "reunion", entidadId: r.id, detalle: { aviso: "recordatorio", familias } });
  return ok(familias === 1 ? "Recordatorio enviado a 1 familia." : `Recordatorio enviado a ${familias} familias.`);
}

/** Marca quién asistió: los ids recibidos = asistieron; el resto de invitados = no asistieron. Solo desde que empieza. */
export async function marcarAsistencia(ctx: TenantContext, reunionId: string, asistentes: string[], ahora = new Date()): Promise<Resultado> {
  const r = await reunionGestionable(ctx, reunionId);
  if (r.estado === "cancelada") return fallo("La reunión está cancelada.");
  if (r.inicio.getTime() > ahora.getTime()) return fallo("Podrás marcar la asistencia cuando empiece la reunión.");
  const presentes = z.array(z.uuid()).max(2000).safeParse(asistentes);
  if (!presentes.success) return fallo("Revisa la lista de asistentes.");
  await ctx.db.reunionInvitado.updateMany({ where: { reunionId: r.id, membershipId: { in: presentes.data } }, data: { asistio: true } });
  await ctx.db.reunionInvitado.updateMany({ where: { reunionId: r.id, membershipId: { notIn: presentes.data } }, data: { asistio: false } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "reunion", entidadId: r.id, detalle: { asistencia: presentes.data.length } });
  return ok("Asistencia guardada.");
}

export async function marcarRealizada(ctx: TenantContext, reunionId: string, ahora = new Date()): Promise<Resultado> {
  const r = await reunionGestionable(ctx, reunionId);
  if (r.estado !== "programada") return fallo("Solo se puede marcar como realizada una reunión programada.");
  if (r.inicio.getTime() > ahora.getTime()) return fallo("La reunión todavía no empieza.");
  await ctx.db.reunion.updateMany({ where: { id: r.id }, data: { estado: "realizada" } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "reunion", entidadId: r.id, detalle: { estado: "realizada" } });
  return ok("Reunión marcada como realizada.");
}

const esquemaActa = z.object({
  acta: z.string().trim().min(10, "Escribe el acta (al menos unas líneas).").max(20_000, "El acta es muy larga."),
  publicar: z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean()),
});

/**
 * Guarda el acta (borrador) y, si `publicar`, la publica a las familias invitadas (y las avisa la primera vez).
 * Publicar marca la reunión como realizada. Solo desde que empieza la reunión.
 */
export async function guardarActa(ctx: TenantContext, reunionId: string, entrada: unknown, ahora = new Date()): Promise<Resultado> {
  const r = await reunionGestionable(ctx, reunionId);
  if (r.estado === "cancelada") return fallo("La reunión está cancelada.");
  if (r.inicio.getTime() > ahora.getTime()) return fallo("Podrás escribir el acta cuando empiece la reunión.");
  const d = esquemaActa.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const primeraPublicacion = d.data.publicar && !r.actaPublicadaAt;
  await ctx.db.reunion.updateMany({
    where: { id: r.id },
    data: {
      acta: d.data.acta,
      ...(d.data.publicar ? { estado: "realizada" as const, actaPublicadaAt: r.actaPublicadaAt ?? ahora } : {}),
    },
  });
  if (primeraPublicacion) {
    const invitados = await ctx.db.reunionInvitado.findMany({ where: { reunionId: r.id }, select: { membershipId: true, alumnoId: true } });
    await avisarReunion(ctx, "reunion_acta", r, invitados);
  }
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "reunion_acta", entidadId: r.id,
    detalle: { publicada: d.data.publicar || r.actaPublicadaAt !== null },
  });
  return ok(d.data.publicar ? "Acta publicada. Las familias invitadas ya pueden leerla." : "Borrador del acta guardado. Las familias aún no lo ven.");
}

/** Cancela una reunión programada y avisa a todos los invitados. */
export async function cancelarReunion(ctx: TenantContext, reunionId: string): Promise<Resultado> {
  const r = await reunionGestionable(ctx, reunionId);
  if (r.estado !== "programada") return fallo("Solo se puede cancelar una reunión programada.");
  await ctx.db.reunion.updateMany({ where: { id: r.id }, data: { estado: "cancelada" } });
  const invitados = await ctx.db.reunionInvitado.findMany({ where: { reunionId: r.id }, select: { membershipId: true, alumnoId: true } });
  const familias = await avisarReunion(ctx, "reunion_cancelada", r, invitados);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "reunion", entidadId: r.id, detalle: { cancelada: true, familiasAvisadas: familias } });
  return ok("Reunión cancelada. Avisamos a las familias invitadas.");
}
