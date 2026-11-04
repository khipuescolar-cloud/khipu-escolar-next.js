import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { EstadoReunion, ModalidadReunion, RespuestaReunion, RolInvitadoReunion, TipoReunion } from "@/generated/prisma/enums";
import { instanteEnZona } from "@/lib/dias-habiles";
import { DURACIONES, MINUTO, calcularDisponibilidad, seCruzan } from "@/lib/disponibilidad";
import { fechaDb, momentoEnZona, sumarDias } from "@/lib/fechas";
import { esHora } from "@/lib/horario";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import {
  ROLES_PERSONAL, TIPOS_POR_ROL, esPersonal, familiasDelTipo, generarInvitados, motivoAntiabuso, puedeConvocar, puedeResponderReunion,
  resumirRespuestas, tipoPorAlcance, type ConteoRespuestas, type InvitadoNuevo,
} from "@/lib/reuniones";
import { auditar } from "./auditoria";
import { franjasDeAtencion, leerAgendas, personalValido, type FranjaVista, type Tdb } from "./disponibilidad";
import { avisarReunion, avisarSinCorreo, notificarReunion } from "./notificaciones/avisos-reuniones";
import { requireFeature } from "./plan";
import { salonEsActivo, whereSalonActivo } from "./salones-activos";
import { alumnoIdsVisibles, requireRol, salonIdsVisibles, type TenantContext } from "./tenant";

// Reuniones institucionales con disponibilidad (specs/32 y specs/40). Todo el control de acceso es de servidor:
// quien organiza (o dirección) gestiona; los invitados (personal o familias) ven y responden; las familias solo
// solicitan. Confirmar y reprogramar revalidan SIEMPRE la disponibilidad dentro de una transacción con candados por
// persona; la restricción de exclusión de `reservas_agenda` es la última barrera.

const ROLES = ["direccion", "profesor", "administrativo", "apoderado"] as const;
const ESPERA_RECORDATORIO_MS = 6 * 3_600_000;
export const MENSAJE_FRANJA_OCUPADA = "Esa franja se acaba de ocupar. Elige otra.";

function entrar(ctx: TenantContext) {
  requireFeature(ctx, "reuniones");
  requireRol(ctx, [...ROLES]);
}

const nombreDe = (u: { nombres: string; apellidos: string | null }) => `${u.nombres} ${u.apellidos ?? ""}`.trim();

/** Reuniones visibles: dirección todas; personal las que organiza, convocó o donde está invitado; familia donde está invitada. */
function dondeVisible(ctx: TenantContext): Prisma.ReunionWhereInput {
  if (ctx.rol === "direccion") return {};
  const invitado = { invitados: { some: { membershipId: ctx.membership.id } } };
  if (ctx.rol === "apoderado") return invitado;
  return { OR: [{ organizadorId: ctx.membership.id }, { convocadaPorId: ctx.membership.id }, invitado] };
}

/** Reuniones que el usuario gestiona: dirección todas; el resto, las que organiza. */
function dondeGestiona(ctx: TenantContext): Prisma.ReunionWhereInput {
  return ctx.rol === "direccion" ? {} : { organizadorId: ctx.membership.id };
}

// ───────────── Revalidación transaccional ─────────────

class ConflictoAgenda extends Error {}

/** Error de la restricción de exclusión (23P01) venga como venga envuelto por Prisma o el adaptador. */
function esConflictoExclusion(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  let texto = String((e as Error).message ?? "");
  try {
    texto += JSON.stringify(e, Object.getOwnPropertyNames(e));
  } catch {
    /* objetos circulares: basta el mensaje */
  }
  return texto.includes("23P01") || texto.includes("reservas_agenda_sin_solape") || texto.includes("exclusion constraint");
}

type ParticipantePersonal = { id: string; nombre: string; requerido: boolean };

type OpcionesReserva = {
  inicio: Date;
  fin: Date;
  excluirReunionId?: string;
  /** Acepta programar fuera de las horas laborales o en día no lectivo. */
  fueraDeHorario?: boolean;
  /** Dirección/administrativo: forzar sobre una CLASE (nunca sobre otra reunión, bloqueo o ausencia), con motivo. */
  forzarClase?: boolean;
};

/**
 * Dentro de la transacción: candado por persona (orden de id), relee clases, reservas, bloqueos y no lectivos y decide a
 * quién se reserva. Lanza `ConflictoAgenda` si un requerido no está libre. Opcionales ocupados: invitados sin reserva.
 */
async function revalidarEnTransaccion(tx: Tdb & { $executeRaw: DbTx["$executeRaw"] }, ctx: TenantContext, personas: ParticipantePersonal[], o: OpcionesReserva) {
  const ordenadas = [...personas].sort((a, b) => a.id.localeCompare(b.id));
  for (const p of ordenadas) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${ctx.tenant.id}:${p.id}`}, 0))`;
  }
  const zona = ctx.tenant.zonaHoraria;
  const desde = momentoEnZona(o.inicio, zona).isoFecha;
  const hasta = momentoEnZona(new Date(o.fin.getTime() - 1), zona).isoFecha;
  const agendas = await leerAgendas(tx, ctx.tenant, ordenadas.map((p) => p.id), desde, hasta, { excluirReunionId: o.excluirReunionId });
  const franja = { inicio: o.inicio.getTime(), fin: o.fin.getTime() };
  const dentro = agendas.ventana.some((v) => v.inicio <= franja.inicio && franja.fin <= v.fin);
  if (!dentro && !o.fueraDeHorario) {
    throw new ConflictoAgenda("Esa hora está fuera del horario laboral o cae en un día no lectivo. Elige otra franja o confirma que quieres programarla igual.");
  }
  const reservar: string[] = [];
  let clasesForzadas = 0;
  for (const p of ordenadas) {
    const choques = (agendas.ocupacion.get(p.id) ?? []).filter((x) => seCruzan(x, franja));
    if (choques.length === 0) {
      reservar.push(p.id);
      continue;
    }
    if (!p.requerido) continue;
    if (choques.some((c) => c.motivo !== "clase")) throw new ConflictoAgenda(MENSAJE_FRANJA_OCUPADA);
    const puedeForzar = o.forzarClase && (ctx.rol === "direccion" || ctx.rol === "administrativo");
    if (!puedeForzar) {
      const veClases = ctx.rol === "direccion" || ctx.rol === "administrativo";
      throw new ConflictoAgenda(veClases ? `${p.nombre} tiene clase a esa hora. Elige otra franja o fuerza la reunión con un motivo.` : `${p.nombre} está ocupado a esa hora. Elige otra franja.`);
    }
    clasesForzadas++;
    reservar.push(p.id);
  }
  return { reservar, clasesForzadas };
}

type DbTx = Parameters<Parameters<TenantContext["db"]["$transaction"]>[0]>[0];

/** Alternativas frescas tras un conflicto (fuera de la transacción). */
async function alternativasTrasConflicto(ctx: TenantContext, personas: ParticipantePersonal[], inicio: Date, fin: Date, excluirReunionId?: string): Promise<FranjaVista[]> {
  const zona = ctx.tenant.zonaHoraria;
  const desde = momentoEnZona(inicio, zona).isoFecha;
  const agendas = await leerAgendas(ctx.db, ctx.tenant, personas.map((p) => p.id), desde, sumarDias(desde, 6), { excluirReunionId });
  const calculo = calcularDisponibilidad({
    personas: personas.map((p) => ({ id: p.id, requerido: p.requerido, ocupado: agendas.ocupacion.get(p.id) ?? [] })),
    ventana: agendas.ventana, duracionMin: Math.round((fin.getTime() - inicio.getTime()) / MINUTO), preferida: { inicio: inicio.getTime(), fin: fin.getTime() },
    noAntesDe: Date.now(),
  });
  return calculo.alternativas.map((a) => {
    const m = momentoEnZona(new Date(a.inicio), zona);
    return { inicio: new Date(a.inicio).toISOString(), fin: new Date(a.fin).toISOString(), fecha: m.isoFecha, hora: m.hora, horaFin: momentoEnZona(new Date(a.fin), zona).hora, opcionalesLibres: a.opcionalesLibres };
  });
}

export type ResultadoReserva = Resultado & { id?: string; alternativas?: FranjaVista[] };

// ───────────── Convocar (confirmar en el asistente) ─────────────

const horaValida = z.string().refine(esHora, "Elige una hora válida.");
const opcional = (max: number) => z.string().trim().max(max).optional().or(z.literal("").transform(() => undefined));
const uuidOpcional = z.uuid().optional().or(z.literal("").transform(() => undefined));
const casilla = z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean()).default(false);
const listaIds = z.preprocess((v) => (typeof v === "string" ? (v ? v.split(",") : []) : v), z.array(z.uuid()).max(30)).default([]);
const duracionValida = z.coerce.number().refine((n) => (DURACIONES as readonly number[]).includes(n), "Elige una duración válida.");

const esquemaConvocatoria = z.object({
  titulo: z.string().trim().min(3, "Escribe el título de la reunión.").max(150),
  descripcion: opcional(1000),
  motivo: opcional(500),
  observaciones: opcional(1000),
  tipo: z.enum(["docente_apoderado", "tutoria", "coordinacion", "direccion", "administrativa", "institucional"]).optional().or(z.literal("").transform(() => undefined)),
  modalidad: z.enum(["presencial", "virtual", "mixta"]).default("presencial"),
  fecha: z.iso.date("Elige la fecha."),
  hora: horaValida,
  horaFin: horaValida.optional().or(z.literal("").transform(() => undefined)),
  duracion: duracionValida.optional().or(z.literal("").transform(() => undefined)),
  lugar: opcional(200),
  enlace: z.url({ protocol: /^https?$/, error: "El enlace debe empezar con https://." }).max(500).optional().or(z.literal("").transform(() => undefined)),
  /** Familias: todo el colegio, un salón, la familia de un alumno o ninguna. */
  alcance: z.enum(["colegio", "salon", "individual", "ninguno"], "Elige a quién convocas.").default("ninguno"),
  salonId: uuidOpcional,
  alumnoId: uuidOpcional,
  requeridos: listaIds,
  opcionales: listaIds,
  fueraDeHorario: casilla,
  forzarClase: casilla,
  motivoForzar: opcional(300),
}).refine((d) => d.lugar || d.enlace, { message: "Indica el lugar o el enlace de la reunión.", path: ["lugar"] });

async function esTutorDe(ctx: TenantContext, salonId: string | null): Promise<boolean> {
  if (!salonId) return false;
  return (await ctx.db.salon.count({ where: { id: salonId, tutorId: ctx.membership.id } })) > 0;
}

/**
 * Crea y confirma una reunión: valida el tipo según el rol (matriz de `src/lib/reuniones.ts`), las familias y el personal
 * invitado, y reserva la franja de todo el personal dentro de una transacción (candados por persona, revalidación y
 * restricción de exclusión). Avisa por bandeja, push y correo.
 */
export async function convocarReunion(ctx: TenantContext, entrada: unknown, ahora = new Date()): Promise<ResultadoReserva> {
  entrar(ctx);
  requireRol(ctx, [...ROLES_PERSONAL]);
  const d = esquemaConvocatoria.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const zona = ctx.tenant.zonaHoraria;
  const { alcance } = d.data;
  const inicio = instanteEnZona(d.data.fecha, d.data.hora, zona);
  const fin = d.data.horaFin ? instanteEnZona(d.data.fecha, d.data.horaFin, zona) : new Date(inicio.getTime() + (d.data.duracion ?? 60) * MINUTO);
  if (inicio.getTime() <= ahora.getTime()) return fallo("Elige una fecha y hora futuras.");
  if (fin.getTime() <= inicio.getTime()) return fallo("La hora de fin debe ser posterior a la de inicio.");

  // Familias según el alcance (mismo control que antes).
  let salonId: string | null = null;
  let alumnoId: string | null = null;
  const veTodo = ctx.rol === "direccion" || ctx.rol === "administrativo";
  if (alcance === "colegio") {
    if (!veTodo) return fallo("Solo dirección convoca a todo el colegio.");
  } else if (alcance === "salon") {
    if (!d.data.salonId) return fallo("Elige el salón.");
    if (!veTodo && !(await salonIdsVisibles(ctx)).includes(d.data.salonId)) return fallo("Solo puedes convocar a tus salones.");
    if (!(await salonEsActivo(ctx, d.data.salonId))) return fallo("No encontramos ese salón.");
    salonId = d.data.salonId;
  } else if (alcance === "individual") {
    if (!d.data.alumnoId) return fallo("Elige al alumno cuya familia convocas.");
    if (!veTodo && !(await alumnoIdsVisibles(ctx)).includes(d.data.alumnoId)) return fallo("Solo puedes convocar a familias de tus alumnos.");
    const alumno = await ctx.db.alumno.findFirst({ where: { id: d.data.alumnoId, estado: "activo" }, select: { id: true, salonId: true } });
    if (!alumno) return fallo("No encontramos a ese alumno.");
    alumnoId = alumno.id;
    salonId = alumno.salonId;
  }

  const tipo: TipoReunion = d.data.tipo ?? (alcance === "ninguno" ? (ctx.rol === "profesor" ? "coordinacion" : ctx.rol === "administrativo" ? "administrativa" : "direccion") : tipoPorAlcance(alcance, await esTutorDe(ctx, salonId)));
  if (!puedeConvocar(ctx.rol, tipo)) return fallo("No puedes convocar este tipo de reunión.");
  const reglaFamilias = familiasDelTipo(tipo);
  if (reglaFamilias === "obligatorias" && alcance === "ninguno") return fallo("Elige la familia o el salón que convocas.");
  if (reglaFamilias === "prohibidas" && alcance !== "ninguno") return fallo("Las reuniones de coordinación son solo con personal del colegio.");
  if (tipo === "tutoria" && ctx.rol === "profesor" && !(await esTutorDe(ctx, salonId))) return fallo("Solo el tutor del salón convoca reuniones de tutoría.");

  // Personal invitado (sin repetir, sin quien organiza).
  const opcionalesIds = d.data.opcionales.filter((id) => id !== ctx.membership.id && !d.data.requeridos.includes(id));
  const requeridosIds = [...new Set(d.data.requeridos.filter((id) => id !== ctx.membership.id))];
  const personalIds = [...requeridosIds, ...opcionalesIds];
  const personal = await personalValido(ctx.db, personalIds);
  if (personal.length !== personalIds.length) return fallo("Revisa los participantes: solo puedes invitar a personal activo del colegio.");
  const nombre = new Map(personal.map((p) => [p.id, nombreDe(p.user)]));

  const vinculos = alcance === "ninguno" ? [] : await ctx.db.apoderadoAlumno.findMany({
    where: {
      apoderado: { estado: "activa", rol: "apoderado" },
      alumno: alcance === "salon" ? { salonId: salonId!, estado: "activo" } : alcance === "individual" ? { id: alumnoId!, estado: "activo" } : { estado: "activo" },
    },
    select: { apoderadoId: true, alumnoId: true },
  });
  const familias = alcance === "ninguno" ? [] : generarInvitados(alcance, vinculos);
  if (alcance !== "ninguno" && familias.length === 0) return fallo("No hay familias con apoderados activos para invitar a esta reunión.");
  if (familias.length === 0 && personal.length === 0) return fallo("Agrega al menos un participante.");
  if (d.data.forzarClase && !d.data.motivoForzar) return fallo("Escribe el motivo para programar sobre una clase.");

  const participantes: ParticipantePersonal[] = [
    { id: ctx.membership.id, nombre: nombreDe(ctx.user), requerido: true },
    ...requeridosIds.map((id) => ({ id, nombre: nombre.get(id)!, requerido: true })),
    ...opcionalesIds.map((id) => ({ id, nombre: nombre.get(id)!, requerido: false })),
  ];
  const filasInvitados: (InvitadoNuevo & { rol: RolInvitadoReunion })[] = [
    ...requeridosIds.map((id) => ({ membershipId: id, alumnoId: null, rol: "requerido" as const })),
    ...opcionalesIds.map((id) => ({ membershipId: id, alumnoId: null, rol: "opcional" as const })),
    ...familias.map((f) => ({ ...f, rol: "requerido" as const })),
  ];

  let reunion;
  try {
    reunion = await ctx.db.$transaction(async (tx) => {
      const { reservar, clasesForzadas } = await revalidarEnTransaccion(tx as never, ctx, participantes, { inicio, fin, fueraDeHorario: d.data.fueraDeHorario, forzarClase: d.data.forzarClase });
      const r = await tx.reunion.create({
        data: {
          tenantId: ctx.tenant.id, titulo: d.data.titulo, descripcion: d.data.descripcion ?? null, motivo: d.data.motivo ?? null, observaciones: d.data.observaciones ?? null,
          tipo, modalidad: d.data.modalidad, inicio, fin, lugar: d.data.lugar ?? null, enlace: d.data.enlace ?? null,
          alcance: alcance === "ninguno" ? "individual" : alcance, salonId, convocadaPorId: ctx.membership.id, organizadorId: ctx.membership.id,
        },
      });
      await tx.reunionInvitado.createMany({ data: filasInvitados.map((i) => ({ tenantId: ctx.tenant.id, reunionId: r.id, membershipId: i.membershipId, alumnoId: i.alumnoId, rol: i.rol, invitadoAt: ahora })) });
      await tx.reservaAgenda.createMany({ data: reservar.map((membershipId) => ({ tenantId: ctx.tenant.id, membershipId, reunionId: r.id, inicio, fin })) });
      await tx.reunionCambio.create({
        data: {
          tenantId: ctx.tenant.id, reunionId: r.id, tipo: "creada", actorId: ctx.membership.id,
          despues: { inicio: inicio.toISOString(), fin: fin.toISOString(), invitados: filasInvitados.length, ...(clasesForzadas ? { clasesForzadas } : {}) },
          motivo: clasesForzadas ? d.data.motivoForzar ?? null : null,
        },
      });
      return r;
    }, { maxWait: 10_000, timeout: 20_000 });
  } catch (e) {
    if (e instanceof ConflictoAgenda || esConflictoExclusion(e)) {
      const mensaje = e instanceof ConflictoAgenda ? e.message : MENSAJE_FRANJA_OCUPADA;
      return { ...fallo(mensaje), alternativas: await alternativasTrasConflicto(ctx, participantes, inicio, fin) };
    }
    throw e;
  }

  const aviso = await notificarReunion(ctx, { evento: "invitacion", reunion: { ...reunion, organizador: nombreDe(ctx.user) }, destinatarios: filasInvitados });
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "reunion", entidadId: reunion.id,
    detalle: { tipo, alcance, invitados: filasInvitados.length, personal: personal.length, conCanal: aviso.conCanal, ...(d.data.forzarClase ? { forzarClase: true } : {}) },
  });
  const nFamilias = new Set(familias.map((f) => f.membershipId)).size;
  const partes = [nFamilias ? `${nFamilias} ${nFamilias === 1 ? "familia" : "familias"}` : "", personal.length ? `${personal.length} ${personal.length === 1 ? "persona del colegio" : "personas del colegio"}` : ""].filter(Boolean);
  return { ...ok(`Reunión confirmada. Invitamos a ${partes.join(" y ")}.`), id: reunion.id };
}

/** Datos para el asistente: tipos permitidos, personal del colegio, salones y alumnos elegibles. */
export async function opcionesParaConvocar(ctx: TenantContext) {
  entrar(ctx);
  requireRol(ctx, [...ROLES_PERSONAL]);
  const veTodo = ctx.rol === "direccion" || ctx.rol === "administrativo";
  const ids = veTodo ? (await ctx.db.salon.findMany({ where: whereSalonActivo, select: { id: true } })).map((s) => s.id) : await salonIdsVisibles(ctx);
  const [salones, alumnos, personal] = await Promise.all([
    ctx.db.salon.findMany({ where: { id: { in: ids }, ...whereSalonActivo }, select: { id: true, nombre: true, tutorId: true }, orderBy: { nombre: "asc" } }),
    ctx.db.alumno.findMany({
      where: { salonId: { in: ids }, estado: "activo", apoderados: { some: {} } },
      select: { id: true, nombres: true, apellidos: true, salon: { select: { nombre: true } } },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    ctx.db.membership.findMany({
      where: { rol: { in: [...ROLES_PERSONAL] }, estado: "activa", id: { not: ctx.membership.id } },
      select: { id: true, rol: true, cargo: true, user: { select: { nombres: true, apellidos: true } } },
    }),
  ]);
  return {
    tipos: esPersonal(ctx.rol) ? [...TIPOS_POR_ROL[ctx.rol]] : [],
    salones: salones.map((s) => ({ id: s.id, nombre: s.nombre, soyTutor: s.tutorId === ctx.membership.id })),
    alumnos: alumnos.map((a) => ({ id: a.id, nombre: `${a.apellidos}, ${a.nombres}`, salon: a.salon.nombre })),
    personal: personal
      .map((p) => ({ id: p.id, nombre: nombreDe(p.user), rol: p.rol, cargo: p.cargo }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    puedeColegio: veTodo,
    puedeForzarClase: veTodo,
    horaInicioLaboral: ctx.tenant.horaInicioLaboral,
    horaFinLaboral: ctx.tenant.horaFinLaboral,
  };
}

// ───────────── Lectura ─────────────

export type ReunionVista = {
  id: string;
  titulo: string;
  descripcion: string | null;
  motivo: string | null;
  observaciones: string | null;
  inicio: Date;
  fin: Date;
  lugar: string | null;
  enlace: string | null;
  tipo: TipoReunion;
  modalidad: ModalidadReunion;
  alcance: "colegio" | "salon" | "individual";
  ambito: string;
  estado: EstadoReunion;
  convocadaPor: string;
  organizador: string;
  organizadorId: string;
  /** Puede gestionarla (organiza o es dirección). */
  gestiona: boolean;
  /** Es una solicitud que hizo esta familia. */
  solicitudPropia: boolean;
  reprogramadaAt: Date | null;
  motivoCancelacion: string | null;
  acta: string | null;
  actaPublicadaAt: Date | null;
  /** Invitación propia (personal o familia). */
  mia: { respuesta: RespuestaReunion; comentario: string | null; alumnos: string[]; asistio: boolean | null; rol: RolInvitadoReunion } | null;
  /** Solo para quien gestiona. */
  resumen: ConteoRespuestas | null;
};

const incluirLista = {
  salon: { select: { nombre: true } },
  convocadaPor: { select: { user: { select: { nombres: true, apellidos: true } } } },
  organizador: { select: { user: { select: { nombres: true, apellidos: true } } } },
  invitados: { include: { alumno: { select: { nombres: true } } } },
} satisfies Prisma.ReunionInclude;

type FilaReunion = Prisma.ReunionGetPayload<{ include: typeof incluirLista }>;

function aVista(ctx: TenantContext, r: FilaReunion): ReunionVista {
  const gestiona = esPersonal(ctx.rol) && (ctx.rol === "direccion" || r.organizadorId === ctx.membership.id);
  const propias = r.invitados.filter((i) => i.membershipId === ctx.membership.id);
  const mia = propias.length > 0
    ? {
        respuesta: propias[0].respuesta,
        comentario: propias.find((p) => p.comentario)?.comentario ?? null,
        alumnos: [...new Set(propias.flatMap((p) => (p.alumno ? [p.alumno.nombres.split(/\s+/)[0]] : [])))],
        asistio: propias[0].asistio,
        rol: propias[0].rol,
      }
    : null;
  const veActa = gestiona || r.actaPublicadaAt !== null;
  return {
    id: r.id, titulo: r.titulo, descripcion: r.descripcion, motivo: r.motivo, observaciones: r.observaciones, inicio: r.inicio, fin: r.fin,
    lugar: r.lugar, enlace: r.enlace, tipo: r.tipo, modalidad: r.modalidad, alcance: r.alcance,
    ambito: r.alcance === "colegio" ? "Todo el colegio" : r.salon ? (r.alcance === "individual" ? `Individual · ${r.salon.nombre}` : r.salon.nombre) : r.tipo === "coordinacion" ? "Personal del colegio" : "Individual",
    estado: r.estado,
    convocadaPor: nombreDe(r.convocadaPor.user),
    organizador: nombreDe(r.organizador.user),
    organizadorId: r.organizadorId,
    gestiona,
    solicitudPropia: ctx.rol === "apoderado" && r.convocadaPorId === ctx.membership.id,
    reprogramadaAt: r.reprogramadaAt,
    motivoCancelacion: r.motivoCancelacion,
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
  esFamilia: boolean;
  rol: RolInvitadoReunion;
  alumnos: string[];
  respuesta: RespuestaReunion;
  comentario: string | null;
  respondidaAt: Date | null;
  propuestaInicio: Date | null;
  asistio: boolean | null;
};

export type AcuerdoVista = { id: string; texto: string; responsable: string | null; responsableId: string | null; fechaCompromiso: string | null; estado: "pendiente" | "cumplido"; puedeMarcar: boolean };
export type CambioVista = { tipo: string; fecha: Date; actor: string | null; motivo: string | null };

export type DetalleReunion = ReunionVista & { personas: PersonaInvitada[] | null; acuerdos: AcuerdoVista[]; historial: CambioVista[] | null };

/** Detalle de una reunión visible; null si no existe o no se puede ver (nunca distingue una de otra). */
export async function detalleReunion(ctx: TenantContext, reunionId: string): Promise<DetalleReunion | null> {
  entrar(ctx);
  if (!z.uuid().safeParse(reunionId).success) return null;
  const r = await ctx.db.reunion.findFirst({ where: { id: reunionId, ...dondeVisible(ctx) }, include: incluirLista });
  if (!r) return null;
  const vista = aVista(ctx, r);
  const acuerdosFilas = await ctx.db.reunionAcuerdo.findMany({
    where: { reunionId: r.id }, orderBy: { createdAt: "asc" },
    select: { id: true, texto: true, responsableId: true, fechaCompromiso: true, estado: true, responsable: { select: { user: { select: { nombres: true, apellidos: true } } } } },
  });
  // Las familias ven acuerdos solo con el acta publicada.
  const veAcuerdos = vista.gestiona || esPersonal(ctx.rol) || r.actaPublicadaAt !== null;
  const acuerdos: AcuerdoVista[] = veAcuerdos ? acuerdosFilas.map((a) => ({
    id: a.id, texto: a.texto, responsableId: a.responsableId, responsable: a.responsable ? nombreDe(a.responsable.user) : null,
    fechaCompromiso: a.fechaCompromiso ? a.fechaCompromiso.toISOString().slice(0, 10) : null, estado: a.estado,
    puedeMarcar: vista.gestiona || a.responsableId === ctx.membership.id,
  })) : [];
  if (!vista.gestiona) return { ...vista, personas: null, acuerdos, historial: null };
  const usuarios = await ctx.db.membership.findMany({
    where: { id: { in: [...new Set(r.invitados.map((i) => i.membershipId))] } },
    select: { id: true, rol: true, user: { select: { nombres: true, apellidos: true } } },
  });
  const datos = new Map(usuarios.map((u) => [u.id, { nombre: nombreDe(u.user), familia: u.rol === "apoderado" }]));
  const porPersona = new Map<string, PersonaInvitada>();
  for (const i of r.invitados) {
    const u = datos.get(i.membershipId);
    const p = porPersona.get(i.membershipId) ?? {
      membershipId: i.membershipId, nombre: u?.nombre ?? "Familia", esFamilia: u?.familia ?? true, rol: i.rol, alumnos: [], respuesta: i.respuesta,
      comentario: null, respondidaAt: i.respondidaAt, propuestaInicio: i.propuestaInicio, asistio: i.asistio,
    };
    if (i.alumno) p.alumnos.push(i.alumno.nombres.split(/\s+/)[0]);
    if (i.comentario) p.comentario = i.comentario;
    porPersona.set(i.membershipId, p);
  }
  const personas = [...porPersona.values()].sort((a, b) => Number(a.esFamilia) - Number(b.esFamilia) || a.nombre.localeCompare(b.nombre, "es"));
  const cambios = await ctx.db.reunionCambio.findMany({
    where: { reunionId: r.id }, orderBy: { createdAt: "asc" },
    select: { tipo: true, createdAt: true, motivo: true, actor: { select: { user: { select: { nombres: true, apellidos: true } } } } },
  });
  return {
    ...vista, personas, acuerdos,
    historial: cambios.map((c) => ({ tipo: c.tipo, fecha: c.createdAt, actor: c.actor ? nombreDe(c.actor.user) : null, motivo: c.motivo })),
  };
}

// ───────────── Responder ─────────────

const esquemaRespuesta = z.object({
  respuesta: z.enum(["asistire", "no_asistire", "propone_otra"], "Elige aceptar, rechazar o proponer otra hora."),
  comentario: z.string().trim().max(300, "El comentario es muy largo (máximo 300 caracteres).").optional().or(z.literal("").transform(() => undefined)),
  fechaPropuesta: z.iso.date().optional().or(z.literal("").transform(() => undefined)),
  horaPropuesta: horaValida.optional().or(z.literal("").transform(() => undefined)),
});

const TEXTO_AVISO_RESPUESTA: Record<"asistire" | "no_asistire" | "propone_otra", string> = { asistire: "aceptó", no_asistire: "rechazó", propone_otra: "propone otra hora para" };

/** El invitado (personal o familia) acepta, rechaza o propone otra hora hasta el inicio. Aplica a todas sus filas. */
export async function responderInvitacion(ctx: TenantContext, reunionId: string, entrada: unknown, ahora = new Date()): Promise<Resultado> {
  entrar(ctx);
  if (!z.uuid().safeParse(reunionId).success) forbidden();
  const propias = await ctx.db.reunionInvitado.findMany({
    where: { reunionId, membershipId: ctx.membership.id },
    select: { id: true, reunion: { select: { id: true, estado: true, inicio: true, fin: true, titulo: true, organizadorId: true } } },
  });
  if (propias.length === 0) forbidden(); // no invitado (o de otro colegio): igual que no existir
  const d = esquemaRespuesta.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const r = propias[0].reunion;
  if (!puedeResponderReunion(r, ahora)) return fallo(r.estado === "cancelada" ? "Esta reunión se canceló." : "La reunión ya empezó: no se puede responder.");
  let propuestaInicio: Date | null = null;
  let propuestaFin: Date | null = null;
  if (d.data.respuesta === "propone_otra") {
    if (!d.data.fechaPropuesta || !d.data.horaPropuesta) return fallo("Indica la fecha y la hora que propones.");
    propuestaInicio = instanteEnZona(d.data.fechaPropuesta, d.data.horaPropuesta, ctx.tenant.zonaHoraria);
    if (propuestaInicio.getTime() <= ahora.getTime()) return fallo("Propón una fecha y hora futuras.");
    propuestaFin = new Date(propuestaInicio.getTime() + (r.fin.getTime() - r.inicio.getTime()));
  }
  await ctx.db.reunionInvitado.updateMany({
    where: { id: { in: propias.map((p) => p.id) } },
    data: { respuesta: d.data.respuesta, comentario: d.data.comentario ?? null, respondidaAt: ahora, propuestaInicio, propuestaFin },
  });
  await ctx.db.reunionCambio.create({
    data: { tenantId: ctx.tenant.id, reunionId: r.id, tipo: "respuesta", actorId: ctx.membership.id, despues: { respuesta: d.data.respuesta, ...(propuestaInicio ? { propuestaInicio: propuestaInicio.toISOString() } : {}) } },
  });
  await avisarSinCorreo(ctx, {
    membershipId: r.organizadorId, reunionId: r.id, titulo: `Respuesta: ${r.titulo}`,
    texto: `${nombreDe(ctx.user)} ${TEXTO_AVISO_RESPUESTA[d.data.respuesta]} la reunión${d.data.comentario ? `: «${d.data.comentario}»` : "."}`,
    clave: `reunion:${r.id}:respuesta:${ctx.membership.id}:${ahora.getTime()}`,
  });
  return ok(d.data.respuesta === "asistire" ? "Listo, confirmamos que asistirás." : d.data.respuesta === "no_asistire" ? "Listo, avisamos que no asistirás." : "Listo, enviamos tu propuesta de horario.");
}

// ───────────── Gestión de quien organiza ─────────────

async function reunionGestionable(ctx: TenantContext, reunionId: string) {
  entrar(ctx);
  requireRol(ctx, [...ROLES_PERSONAL]);
  if (!z.uuid().safeParse(reunionId).success) forbidden();
  const r = await ctx.db.reunion.findFirst({ where: { id: reunionId, ...dondeGestiona(ctx) } });
  if (!r) forbidden();
  return r;
}

async function nombreOrganizador(ctx: TenantContext, organizadorId: string): Promise<string> {
  const m = await ctx.db.membership.findFirst({ where: { id: organizadorId }, select: { user: { select: { nombres: true, apellidos: true } } } });
  return m ? nombreDe(m.user) : ctx.tenant.nombre;
}

/** Personal de una reunión (organizador + invitados del personal) para revalidar disponibilidad. */
async function personalDeLaReunion(ctx: TenantContext, r: { id: string; organizadorId: string }): Promise<ParticipantePersonal[]> {
  const filas = await ctx.db.reunionInvitado.findMany({
    where: { reunionId: r.id, membership: { rol: { in: [...ROLES_PERSONAL] } } },
    select: { membershipId: true, rol: true },
  });
  const ids = [r.organizadorId, ...filas.map((f) => f.membershipId)];
  const personal = await personalValido(ctx.db, ids);
  const nombre = new Map(personal.map((p) => [p.id, nombreDe(p.user)]));
  const opcional = new Set(filas.filter((f) => f.rol === "opcional").map((f) => f.membershipId));
  return [...new Set(ids)].filter((id) => nombre.has(id)).map((id) => ({ id, nombre: nombre.get(id)!, requerido: !opcional.has(id) }));
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
  if (r.estado === "cancelada" || r.estado === "por_confirmar") return fallo("La reunión no está confirmada.");
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
  if (r.estado !== "programada") return fallo("Solo se puede marcar como realizada una reunión confirmada.");
  if (r.inicio.getTime() > ahora.getTime()) return fallo("La reunión todavía no empieza.");
  await ctx.db.reunion.updateMany({ where: { id: r.id }, data: { estado: "realizada" } });
  await ctx.db.reunionCambio.create({ data: { tenantId: ctx.tenant.id, reunionId: r.id, tipo: "realizada", actorId: ctx.membership.id } });
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
  if (r.estado === "cancelada" || r.estado === "por_confirmar") return fallo("La reunión no está confirmada.");
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
  await ctx.db.reunionCambio.create({ data: { tenantId: ctx.tenant.id, reunionId: r.id, tipo: "acta", actorId: ctx.membership.id, despues: { publicada: d.data.publicar } } });
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

const esquemaCancelacion = z.object({ motivo: z.string().trim().min(3, "Escribe el motivo de la cancelación.").max(300) });

/** Cancela (o rechaza, si es una solicitud por confirmar) con motivo: libera las reservas y avisa a los invitados. */
export async function cancelarReunion(ctx: TenantContext, reunionId: string, entrada: unknown, ahora = new Date()): Promise<Resultado> {
  const r = await reunionGestionable(ctx, reunionId);
  if (r.estado !== "programada" && r.estado !== "por_confirmar") return fallo("Solo se puede cancelar una reunión confirmada o por confirmar.");
  const d = esquemaCancelacion.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const eraSolicitud = r.estado === "por_confirmar";
  await ctx.db.$transaction(async (tx) => {
    await tx.reunion.updateMany({
      where: { id: r.id },
      data: { estado: "cancelada", canceladaPorId: ctx.membership.id, canceladaAt: ahora, motivoCancelacion: d.data.motivo },
    });
    await tx.reservaAgenda.updateMany({ where: { reunionId: r.id, activa: true }, data: { activa: false } });
    await tx.reunionCambio.create({ data: { tenantId: ctx.tenant.id, reunionId: r.id, tipo: "cancelada", actorId: ctx.membership.id, motivo: d.data.motivo } });
  });
  const invitados = await ctx.db.reunionInvitado.findMany({ where: { reunionId: r.id }, select: { membershipId: true, alumnoId: true } });
  if (eraSolicitud) {
    await avisarSinCorreo(ctx, {
      membershipId: r.convocadaPorId, reunionId: r.id, titulo: `Solicitud de reunión no aceptada`,
      texto: `${nombreDe(ctx.user)} no pudo aceptar tu solicitud: ${d.data.motivo}`, clave: `reunion:${r.id}:rechazada`,
    });
  } else {
    await notificarReunion(ctx, { evento: "cancelada", reunion: { ...r, organizador: await nombreOrganizador(ctx, r.organizadorId) }, destinatarios: invitados });
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "reunion", entidadId: r.id, detalle: { cancelada: true, solicitud: eraSolicitud } });
  return ok(eraSolicitud ? "Solicitud rechazada. Avisamos a la familia." : "Reunión cancelada. Avisamos a los invitados.");
}

const esquemaReprogramacion = z.object({
  fecha: z.iso.date("Elige la fecha."),
  hora: horaValida,
  duracion: duracionValida,
  motivo: opcional(300),
  fueraDeHorario: casilla,
  forzarClase: casilla,
  motivoForzar: opcional(300),
});

/**
 * Reprograma una reunión confirmada (o confirma una solicitud de familia, con la misma u otra hora): revalida la
 * disponibilidad del personal en una transacción, desactiva las reservas viejas, crea las nuevas, registra el cambio y
 * deja las respuestas en «pendiente». Avisa por correo solo si cambió la hora de una reunión ya confirmada.
 */
export async function reprogramarReunion(ctx: TenantContext, reunionId: string, entrada: unknown, ahora = new Date()): Promise<ResultadoReserva> {
  const r = await reunionGestionable(ctx, reunionId);
  if (r.estado !== "programada" && r.estado !== "por_confirmar") return fallo("Solo se puede reprogramar una reunión confirmada o por confirmar.");
  const d = esquemaReprogramacion.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  if (d.data.forzarClase && !d.data.motivoForzar) return fallo("Escribe el motivo para programar sobre una clase.");
  const inicio = instanteEnZona(d.data.fecha, d.data.hora, ctx.tenant.zonaHoraria);
  const fin = new Date(inicio.getTime() + d.data.duracion * MINUTO);
  if (inicio.getTime() <= ahora.getTime()) return fallo("Elige una fecha y hora futuras.");
  const confirmando = r.estado === "por_confirmar";
  const cambioHora = inicio.getTime() !== r.inicio.getTime() || fin.getTime() !== r.fin.getTime();
  const personas = await personalDeLaReunion(ctx, r);
  try {
    await ctx.db.$transaction(async (tx) => {
      const { reservar, clasesForzadas } = await revalidarEnTransaccion(tx as never, ctx, personas, {
        inicio, fin, excluirReunionId: r.id, fueraDeHorario: d.data.fueraDeHorario, forzarClase: d.data.forzarClase,
      });
      await tx.reservaAgenda.updateMany({ where: { reunionId: r.id, activa: true }, data: { activa: false } });
      await tx.reservaAgenda.createMany({ data: reservar.map((membershipId) => ({ tenantId: ctx.tenant.id, membershipId, reunionId: r.id, inicio, fin })) });
      await tx.reunion.updateMany({
        where: { id: r.id },
        data: { inicio, fin, estado: "programada", ...(confirmando ? {} : { reprogramadaAt: ahora }) },
      });
      if (cambioHora) {
        await tx.reunionInvitado.updateMany({ where: { reunionId: r.id }, data: { respuesta: "pendiente", respondidaAt: null, propuestaInicio: null, propuestaFin: null } });
      }
      await tx.reunionCambio.create({
        data: {
          tenantId: ctx.tenant.id, reunionId: r.id, tipo: confirmando ? "creada" : "reprogramada", actorId: ctx.membership.id,
          antes: { inicio: r.inicio.toISOString(), fin: r.fin.toISOString(), estado: r.estado },
          despues: { inicio: inicio.toISOString(), fin: fin.toISOString(), ...(clasesForzadas ? { clasesForzadas } : {}) },
          motivo: d.data.motivoForzar ?? d.data.motivo ?? null,
        },
      });
    }, { maxWait: 10_000, timeout: 20_000 });
  } catch (e) {
    if (e instanceof ConflictoAgenda || esConflictoExclusion(e)) {
      const mensaje = e instanceof ConflictoAgenda ? e.message : MENSAJE_FRANJA_OCUPADA;
      return { ...fallo(mensaje), alternativas: await alternativasTrasConflicto(ctx, personas, inicio, fin, r.id) };
    }
    throw e;
  }
  const invitados = await ctx.db.reunionInvitado.findMany({ where: { reunionId: r.id }, select: { membershipId: true, alumnoId: true } });
  const reunion = { ...r, inicio, fin, organizador: await nombreOrganizador(ctx, r.organizadorId) };
  if (confirmando) {
    await notificarReunion(ctx, { evento: "invitacion", reunion, destinatarios: invitados });
  } else if (cambioHora) {
    await notificarReunion(ctx, { evento: "reprogramada", reunion, destinatarios: invitados, version: String(ahora.getTime()) });
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "reunion", entidadId: r.id, detalle: { reprogramada: !confirmando, confirmada: confirmando } });
  return { ...ok(confirmando ? "Solicitud confirmada. Avisamos a la familia." : "Reunión reprogramada. Avisamos a los invitados."), id: r.id };
}

// ───────────── Acuerdos del acta ─────────────

const esquemaAcuerdo = z.object({
  texto: z.string().trim().min(3, "Escribe el acuerdo.").max(500),
  responsableId: uuidOpcional,
  fechaCompromiso: z.iso.date().optional().or(z.literal("").transform(() => undefined)),
});

/** Agrega un acuerdo con responsable (organizador o invitado) y fecha de compromiso; avisa al responsable (bandeja y push). */
export async function agregarAcuerdo(ctx: TenantContext, reunionId: string, entrada: unknown): Promise<Resultado> {
  const r = await reunionGestionable(ctx, reunionId);
  if (r.estado === "cancelada" || r.estado === "por_confirmar") return fallo("La reunión no está confirmada.");
  const d = esquemaAcuerdo.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  if (d.data.responsableId && d.data.responsableId !== r.organizadorId) {
    const invitado = await ctx.db.reunionInvitado.count({ where: { reunionId: r.id, membershipId: d.data.responsableId } });
    if (invitado === 0) return fallo("El responsable debe ser un participante de la reunión.");
  }
  const acuerdo = await ctx.db.reunionAcuerdo.create({
    data: {
      tenantId: ctx.tenant.id, reunionId: r.id, texto: d.data.texto, responsableId: d.data.responsableId ?? null,
      fechaCompromiso: d.data.fechaCompromiso ? fechaDb(d.data.fechaCompromiso) : null,
    },
  });
  if (acuerdo.responsableId) {
    await avisarSinCorreo(ctx, {
      membershipId: acuerdo.responsableId, reunionId: r.id, titulo: `Acuerdo: ${r.titulo}`, texto: `Quedaste a cargo de: ${acuerdo.texto}`, clave: `reunion-acuerdo:${acuerdo.id}`,
    });
  }
  return ok("Acuerdo agregado.");
}

/** Marca un acuerdo como cumplido (o lo reabre): quien gestiona la reunión o el responsable. */
export async function marcarAcuerdo(ctx: TenantContext, acuerdoId: string, cumplido: boolean, ahora = new Date()): Promise<Resultado> {
  entrar(ctx);
  if (!z.uuid().safeParse(acuerdoId).success) forbidden();
  const a = await ctx.db.reunionAcuerdo.findFirst({
    where: { id: acuerdoId, OR: [{ responsableId: ctx.membership.id }, { reunion: dondeGestiona(ctx) }] },
    select: { id: true, reunionId: true },
  });
  if (!a) forbidden();
  await ctx.db.reunionAcuerdo.updateMany({ where: { id: a.id }, data: { estado: cumplido ? "cumplido" : "pendiente", cumplidoAt: cumplido ? ahora : null } });
  return ok(cumplido ? "Acuerdo marcado como cumplido." : "Acuerdo reabierto.");
}

/** Acuerdos pendientes: dirección todos; el resto, los suyos (responsable) o de reuniones que organiza. */
export async function acuerdosPendientes(ctx: TenantContext) {
  entrar(ctx);
  const alcance: Prisma.ReunionAcuerdoWhereInput = ctx.rol === "direccion"
    ? {}
    : { OR: [{ responsableId: ctx.membership.id }, ...(esPersonal(ctx.rol) ? [{ reunion: { organizadorId: ctx.membership.id } }] : [])] };
  const filas = await ctx.db.reunionAcuerdo.findMany({
    where: { AND: [alcance, { estado: "pendiente", reunion: { estado: { not: "cancelada" } } }] },
    orderBy: [{ fechaCompromiso: "asc" }, { createdAt: "asc" }], take: 200,
    select: {
      id: true, texto: true, fechaCompromiso: true, responsableId: true, reunionId: true,
      reunion: { select: { titulo: true } }, responsable: { select: { user: { select: { nombres: true, apellidos: true } } } },
    },
  });
  return filas.map((f) => ({
    id: f.id, texto: f.texto, reunionId: f.reunionId, reunion: f.reunion.titulo, responsable: f.responsable ? nombreDe(f.responsable.user) : null,
    fechaCompromiso: f.fechaCompromiso ? f.fechaCompromiso.toISOString().slice(0, 10) : null,
  }));
}

// ───────────── Solicitudes de familias ─────────────

/** Hijos de la familia y, por cada uno, los docentes a quienes puede pedir reunión (tutor y profesores de cursos del salón). */
export async function opcionesSolicitud(ctx: TenantContext) {
  entrar(ctx);
  requireRol(ctx, ["apoderado"]);
  if (!ctx.tenant.familiasSolicitanReuniones) return { habilitado: false as const, hijos: [] };
  const ids = await alumnoIdsVisibles(ctx);
  const hijos = await ctx.db.alumno.findMany({
    where: { id: { in: ids }, estado: "activo", salon: whereSalonActivo },
    orderBy: { nombres: "asc" },
    select: {
      id: true, nombres: true, apellidos: true,
      salon: {
        select: {
          nombre: true, tutorId: true,
          tutor: { select: { id: true, estado: true, user: { select: { nombres: true, apellidos: true } } } },
          cursos: { select: { nombre: true, profesor: { select: { id: true, estado: true, user: { select: { nombres: true, apellidos: true } } } } } },
        },
      },
    },
  });
  return {
    habilitado: true as const,
    hijos: hijos.map((h) => {
      const docentes = new Map<string, { id: string; nombre: string; detalle: string[] }>();
      const t = h.salon.tutor;
      if (t && t.estado === "activa") docentes.set(t.id, { id: t.id, nombre: nombreDe(t.user), detalle: ["Tutor(a)"] });
      for (const c of h.salon.cursos) {
        const p = c.profesor;
        if (!p || p.estado !== "activa") continue;
        const x = docentes.get(p.id) ?? { id: p.id, nombre: nombreDe(p.user), detalle: [] };
        x.detalle.push(c.nombre);
        docentes.set(p.id, x);
      }
      return { id: h.id, nombre: `${h.nombres} ${h.apellidos}`.trim(), salon: h.salon.nombre, docentes: [...docentes.values()].map((x) => ({ id: x.id, nombre: x.nombre, detalle: x.detalle.join(", ") })) };
    }),
  };
}

async function docentePermitido(ctx: TenantContext, alumnoId: string, docenteId: string): Promise<{ alumno: { id: string; nombres: string; salonId: string }; docente: string } | null> {
  if (!z.uuid().safeParse(alumnoId).success || !z.uuid().safeParse(docenteId).success) return null;
  if (!(await alumnoIdsVisibles(ctx)).includes(alumnoId)) return null;
  const alumno = await ctx.db.alumno.findFirst({
    where: { id: alumnoId, estado: "activo", salon: { ...whereSalonActivo, OR: [{ tutorId: docenteId }, { cursos: { some: { profesorId: docenteId } } }] } },
    select: { id: true, nombres: true, salonId: true },
  });
  if (!alumno) return null;
  const d = await ctx.db.membership.findFirst({ where: { id: docenteId, rol: "profesor", estado: "activa" }, select: { user: { select: { nombres: true, apellidos: true } } } });
  return d ? { alumno, docente: nombreDe(d.user) } : null;
}

/** Franjas ofrecidas por el docente (horario de atención ∩ libre). Vacío = el docente no configuró horario de atención. */
export async function franjasParaSolicitud(ctx: TenantContext, alumnoId: string, docenteId: string, ahora = new Date()): Promise<FranjaVista[] | null> {
  entrar(ctx);
  requireRol(ctx, ["apoderado"]);
  if (!ctx.tenant.familiasSolicitanReuniones) return null;
  if (!(await docentePermitido(ctx, alumnoId, docenteId))) return null;
  return franjasDeAtencion(ctx.db, ctx.tenant, docenteId, momentoEnZona(ahora, ctx.tenant.zonaHoraria).isoFecha, 30, ahora);
}

const esquemaSolicitud = z.object({
  alumnoId: z.uuid("Elige a tu hijo o hija."),
  docenteId: z.uuid("Elige al docente."),
  fecha: z.iso.date("Elige la fecha."),
  hora: horaValida,
  motivo: z.string().trim().min(5, "Cuéntanos brevemente el motivo.").max(500),
});

/**
 * La familia pide una reunión al tutor o a un profesor del salón de su hijo. Queda «por confirmar» (sin reservas)
 * hasta que el docente la confirma. Antiabuso: 2 abiertas por docente y 5 por semana.
 */
export async function solicitarReunion(ctx: TenantContext, entrada: unknown, ahora = new Date()): Promise<Resultado & { id?: string }> {
  entrar(ctx);
  requireRol(ctx, ["apoderado"]);
  if (!ctx.tenant.familiasSolicitanReuniones) return fallo("Tu colegio no recibe solicitudes de reunión por Khipu.");
  const d = esquemaSolicitud.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const permitido = await docentePermitido(ctx, d.data.alumnoId, d.data.docenteId);
  if (!permitido) forbidden();
  const inicio = instanteEnZona(d.data.fecha, d.data.hora, ctx.tenant.zonaHoraria);
  if (inicio.getTime() <= ahora.getTime()) return fallo("Elige una fecha y hora futuras.");
  const ofrecidas = await franjasDeAtencion(ctx.db, ctx.tenant, d.data.docenteId, momentoEnZona(ahora, ctx.tenant.zonaHoraria).isoFecha, 30, ahora);
  const horario = await ctx.db.horarioAtencion.count({ where: { membershipId: d.data.docenteId } });
  if (horario > 0 && !ofrecidas.some((f) => new Date(f.inicio).getTime() === inicio.getTime())) return fallo("Elige una de las franjas que ofrece el docente.");
  const [abiertas, semana] = await Promise.all([
    ctx.db.reunion.count({ where: { convocadaPorId: ctx.membership.id, organizadorId: d.data.docenteId, estado: "por_confirmar" } }),
    ctx.db.reunion.count({ where: { convocadaPorId: ctx.membership.id, createdAt: { gt: new Date(ahora.getTime() - 7 * 86_400_000) } } }),
  ]);
  const abuso = motivoAntiabuso(abiertas, semana);
  if (abuso) return fallo(abuso);
  const fin = new Date(inicio.getTime() + 30 * MINUTO);
  const reunion = await ctx.db.$transaction(async (tx) => {
    const r = await tx.reunion.create({
      data: {
        tenantId: ctx.tenant.id, titulo: `Reunión sobre ${permitido.alumno.nombres}`, motivo: d.data.motivo, tipo: "docente_apoderado", modalidad: "presencial",
        inicio, fin, alcance: "individual", salonId: permitido.alumno.salonId, convocadaPorId: ctx.membership.id, organizadorId: d.data.docenteId, estado: "por_confirmar",
      },
    });
    await tx.reunionInvitado.create({
      data: { tenantId: ctx.tenant.id, reunionId: r.id, membershipId: ctx.membership.id, alumnoId: permitido.alumno.id, rol: "requerido", respuesta: "asistire", respondidaAt: ahora, invitadoAt: ahora },
    });
    await tx.reunionCambio.create({ data: { tenantId: ctx.tenant.id, reunionId: r.id, tipo: "creada", actorId: ctx.membership.id, despues: { solicitud: true, inicio: inicio.toISOString() } } });
    return r;
  });
  await notificarReunion(ctx, {
    evento: "solicitada", reunion: { ...reunion, organizador: permitido.docente }, destinatarios: [{ membershipId: d.data.docenteId, alumnoId: permitido.alumno.id }],
    solicitante: nombreDe(ctx.user),
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "reunion", entidadId: reunion.id, detalle: { solicitud: true, docenteId: d.data.docenteId } });
  return { ...ok("Enviamos tu solicitud. Te avisaremos cuando el docente la confirme."), id: reunion.id };
}

// ───────────── Para el calendario (specs/12 · lo consume la agenda) ─────────────

export type ReunionCalendario = {
  id: string; titulo: string; inicio: Date; fin: Date; estado: EstadoReunion; tipo: TipoReunion; modalidad: ModalidadReunion;
  lugar: string | null; enlace: string | null; rol: "organizador" | "invitado"; href: string;
};

/** Reuniones (no canceladas) donde el usuario organiza o está invitado, entre `desde` y `hasta`. Sin acta ni datos de otros. */
export async function reunionesParaCalendario(ctx: TenantContext, desde: Date, hasta: Date): Promise<ReunionCalendario[]> {
  entrar(ctx);
  const filas = await ctx.db.reunion.findMany({
    where: {
      estado: { not: "cancelada" }, inicio: { lt: hasta }, fin: { gt: desde },
      OR: [{ organizadorId: ctx.membership.id }, { invitados: { some: { membershipId: ctx.membership.id } } }],
    },
    orderBy: { inicio: "asc" }, take: 500,
    select: { id: true, titulo: true, inicio: true, fin: true, estado: true, tipo: true, modalidad: true, lugar: true, enlace: true, organizadorId: true },
  });
  return filas.map((r) => ({
    id: r.id, titulo: r.titulo, inicio: r.inicio, fin: r.fin, estado: r.estado, tipo: r.tipo, modalidad: r.modalidad, lugar: r.lugar, enlace: r.enlace,
    rol: r.organizadorId === ctx.membership.id ? "organizador" : "invitado", href: `/reuniones/${r.id}`,
  }));
}

/** Bloqueos y ausencias propios (con su motivo: son del propio usuario) entre `desde` y `hasta`. Solo personal. */
export async function ocupacionPropia(ctx: TenantContext, desde: Date, hasta: Date) {
  requireFeature(ctx, "reuniones");
  if (!esPersonal(ctx.rol)) return [];
  return ctx.db.bloqueoAgenda.findMany({
    where: { membershipId: ctx.membership.id, inicio: { lt: hasta }, fin: { gt: desde } },
    orderBy: { inicio: "asc" },
    select: { id: true, inicio: true, fin: true, tipo: true, motivo: true },
  });
}

// ───────────── Mi disponibilidad: horario de atención, bloqueos y ausencias ─────────────

export async function miDisponibilidad(ctx: TenantContext, ahora = new Date()) {
  entrar(ctx);
  requireRol(ctx, [...ROLES_PERSONAL]);
  const registraAusencias = ctx.rol === "direccion" || ctx.rol === "administrativo";
  const [horario, bloqueos, ausencias, personal] = await Promise.all([
    ctx.db.horarioAtencion.findMany({ where: { membershipId: ctx.membership.id }, orderBy: [{ dia: "asc" }, { horaDesde: "asc" }], select: { id: true, dia: true, horaDesde: true, horaHasta: true } }),
    ctx.db.bloqueoAgenda.findMany({ where: { membershipId: ctx.membership.id, fin: { gt: ahora } }, orderBy: { inicio: "asc" }, select: { id: true, inicio: true, fin: true, tipo: true, motivo: true } }),
    registraAusencias
      ? ctx.db.bloqueoAgenda.findMany({
          where: { tipo: "ausencia", fin: { gt: ahora } }, orderBy: { inicio: "asc" },
          select: { id: true, inicio: true, fin: true, motivo: true, membership: { select: { user: { select: { nombres: true, apellidos: true } } } } },
        })
      : [],
    registraAusencias
      ? ctx.db.membership.findMany({ where: { rol: { in: [...ROLES_PERSONAL] }, estado: "activa" }, select: { id: true, user: { select: { nombres: true, apellidos: true } } } })
      : [],
  ]);
  return {
    horario, bloqueos, registraAusencias,
    ausencias: ausencias.map((a) => ({ id: a.id, inicio: a.inicio, fin: a.fin, motivo: a.motivo, persona: nombreDe(a.membership.user) })),
    personal: personal.map((p) => ({ id: p.id, nombre: nombreDe(p.user) })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
  };
}

const esquemaFranjaAtencion = z.object({ dia: z.coerce.number().int().min(1).max(7), horaDesde: horaValida, horaHasta: horaValida })
  .refine((f) => f.horaDesde < f.horaHasta, { message: "La hora de inicio debe ser antes que la de fin." });

/** Reemplaza el horario de atención a familias del usuario. */
export async function guardarHorarioAtencion(ctx: TenantContext, franjas: unknown): Promise<Resultado> {
  entrar(ctx);
  requireRol(ctx, [...ROLES_PERSONAL]);
  const d = z.array(esquemaFranjaAtencion).max(30).safeParse(franjas);
  if (!d.success) return fallo(d.error.issues[0].message);
  await ctx.db.$transaction(async (tx) => {
    await tx.horarioAtencion.deleteMany({ where: { membershipId: ctx.membership.id } });
    if (d.data.length) await tx.horarioAtencion.createMany({ data: d.data.map((f) => ({ tenantId: ctx.tenant.id, membershipId: ctx.membership.id, ...f })) });
  });
  return ok(d.data.length ? "Horario de atención guardado." : "Quitaste tu horario de atención: las familias propondrán fecha y hora.");
}

const esquemaBloqueo = z.object({
  fecha: z.iso.date("Elige la fecha."),
  fechaFin: z.iso.date().optional().or(z.literal("").transform(() => undefined)),
  horaDesde: horaValida,
  horaHasta: horaValida,
  motivo: opcional(200),
  tipo: z.enum(["bloqueo", "ausencia"]).default("bloqueo"),
  membershipId: uuidOpcional,
});

/** El personal bloquea su tiempo; dirección y administrativo registran ausencias de cualquiera del personal. */
export async function crearBloqueo(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  entrar(ctx);
  requireRol(ctx, [...ROLES_PERSONAL]);
  const d = esquemaBloqueo.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  let membershipId = ctx.membership.id;
  if (d.data.tipo === "ausencia") {
    if (ctx.rol !== "direccion" && ctx.rol !== "administrativo") forbidden();
    if (!d.data.membershipId) return fallo("Elige a la persona ausente.");
    if ((await personalValido(ctx.db, [d.data.membershipId])).length === 0) return fallo("No encontramos a esa persona.");
    membershipId = d.data.membershipId;
  }
  const zona = ctx.tenant.zonaHoraria;
  const inicio = instanteEnZona(d.data.fecha, d.data.horaDesde, zona);
  const fin = instanteEnZona(d.data.fechaFin ?? d.data.fecha, d.data.horaHasta, zona);
  if (fin.getTime() <= inicio.getTime()) return fallo("El fin debe ser posterior al inicio.");
  if (fin.getTime() - inicio.getTime() > 31 * 86_400_000) return fallo("Registra periodos de hasta un mes.");
  await ctx.db.bloqueoAgenda.create({ data: { tenantId: ctx.tenant.id, membershipId, inicio, fin, tipo: d.data.tipo, motivo: d.data.motivo ?? null, registradoPorId: ctx.membership.id } });
  return ok(d.data.tipo === "ausencia" ? "Ausencia registrada." : "Bloqueo agregado a tu agenda.");
}

export async function quitarBloqueo(ctx: TenantContext, bloqueoId: string): Promise<Resultado> {
  entrar(ctx);
  requireRol(ctx, [...ROLES_PERSONAL]);
  if (!z.uuid().safeParse(bloqueoId).success) forbidden();
  const gestionaAusencias = ctx.rol === "direccion" || ctx.rol === "administrativo";
  const r = await ctx.db.bloqueoAgenda.deleteMany({
    where: { id: bloqueoId, OR: [{ membershipId: ctx.membership.id, tipo: "bloqueo" }, ...(gestionaAusencias ? [{ tipo: "ausencia" as const }] : [])] },
  });
  if (r.count === 0) forbidden();
  return ok("Listo, lo quitamos.");
}
