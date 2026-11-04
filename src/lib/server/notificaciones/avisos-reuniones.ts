import "server-only";
import { urlColegio } from "@/lib/dominio";
import type { ModalidadReunion } from "@/generated/prisma/enums";
import { fechaLima, formatoHora, momentoEnZona } from "@/lib/fechas";
import { primerNombre } from "@/lib/nombres";
import { TEXTO_MODALIDAD } from "@/lib/reuniones";
import type { NombrePlantilla, PayloadDe } from "../email/plantillas";
import type { TenantContext } from "../tenant";
import { encolarParaDestinatario, tieneCanalAviso, type Destinatario } from "./encolar";
import { conEnvio } from "./envios";
import { entregarNotificaciones, unirNombres as unir, type Entrega, type ResumenEntrega } from "./internas";

// Avisos de reuniones (specs/32): convocatoria, recordatorio, cancelación y acta publicada.
// Una fila por familia y canal, aunque la familia tenga varias filas de invitado (una por hijo).
// Solo familias con consentimiento vigente y según sus preferencias (igual que el resto de avisos a familias).

export type PlantillaReunion = "reunion_convocada" | "reunion_recordatorio" | "reunion_cancelada" | "reunion_acta";

const QUE_REUNION: Record<PlantillaReunion, string> = {
  reunion_convocada: "convocatoria",
  reunion_recordatorio: "recordatorio",
  reunion_cancelada: "cancelada",
  reunion_acta: "acta",
};

type ReunionParaAviso = { id: string; titulo: string; inicio: Date; lugar: string | null; enlace: string | null };

function unirNombres(nombres: string[]): string {
  return nombres.length <= 1 ? (nombres[0] ?? "") : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

/**
 * Encola el aviso `plantilla` para las familias de los invitados indicados. `filas` = invitados (puede haber
 * varios por apoderado). Devuelve cuántas familias recibirán aviso.
 */
export async function avisarReunion(
  ctx: TenantContext,
  plantilla: PlantillaReunion,
  reunion: ReunionParaAviso,
  filas: { membershipId: string; alumnoId: string | null }[],
): Promise<number> {
  if (filas.length === 0) return 0;
  const membershipIds = [...new Set(filas.map((f) => f.membershipId))];
  const alumnoIds = [...new Set(filas.flatMap((f) => (f.alumnoId ? [f.alumnoId] : [])))];
  const [apoderados, alumnos] = await Promise.all([
    ctx.db.membership.findMany({
      where: { id: { in: membershipIds }, rol: "apoderado", estado: "activa", consentimientos: { some: { revocadoAt: null } } },
      select: {
        id: true,
        preferenciaAviso: { select: { correo: true, push: true } },
        user: { select: { email: true, pushSuscripciones: { select: { endpoint: true } } } },
      },
    }),
    ctx.db.alumno.findMany({ where: { id: { in: alumnoIds } }, select: { id: true, nombres: true } }),
  ]);
  const nombreAlumno = new Map(alumnos.map((a) => [a.id, primerNombre(a.nombres)]));
  const hijosIds = (membershipId: string) =>
    [...new Set(filas.filter((f) => f.membershipId === membershipId && f.alumnoId).map((f) => f.alumnoId!))].sort().join(",");
  const base = {
    colegio: ctx.tenant.nombre,
    titulo: reunion.titulo,
    fecha: fechaLima(reunion.inicio),
    hora: formatoHora(reunion.inicio),
    ...(reunion.lugar ? { lugar: reunion.lugar } : {}),
    ...(reunion.enlace ? { enlace: reunion.enlace } : {}),
    url: urlColegio(ctx.tenant.slug, `/reuniones/${reunion.id}`),
  };
  let familias = 0;
  const titulo = `Reunión: ${reunion.titulo} (${QUE_REUNION[plantilla]})`;
  await conEnvio(ctx.db, { tenantId: ctx.tenant.id, tipo: "reunion", titulo, creadoPorId: ctx.membership?.id ?? null }, async () => {
    for (const a of apoderados) {
      const pref = a.preferenciaAviso ?? { correo: true, push: true };
      const destinatario: Destinatario = {
        apoderadoId: a.id,
        email: a.user.email,
        correo: pref.correo,
        pushEndpoints: pref.push ? a.user.pushSuscripciones.map((s) => s.endpoint) : [],
      };
      if (!tieneCanalAviso(destinatario)) continue;
      const hijos = filas
        .filter((f) => f.membershipId === a.id && f.alumnoId)
        .map((f) => nombreAlumno.get(f.alumnoId!))
        .filter((n): n is string => !!n);
      const nombres = unirNombres([...new Set(hijos)]);
      await encolarParaDestinatario(ctx.db, destinatario, {
        tenantId: ctx.tenant.id,
        tipo: "reunion",
        plantilla,
        referenciaId: reunion.id,
        // Una familia = sus hijos invitados: papá y mamá de Juan son una sola familia (reunión individual).
        unidad: hijosIds(a.id) || a.id,
        payload: { ...base, ...(nombres ? { alumno: nombres } : {}) },
      });
      familias++;
    }
  });
  return familias;
}

// ───────────── specs/40: invitaciones a personal y familias por la bandeja (entregarNotificaciones) ─────────────

export type EventoReunion = "invitacion" | "reprogramada" | "cancelada" | "solicitada";

const PLANTILLA_EVENTO = {
  invitacion: "reunion_convocada",
  reprogramada: "reunion_reprogramada",
  cancelada: "reunion_cancelada",
  solicitada: "reunion_solicitada",
} as const satisfies Record<EventoReunion, NombrePlantilla>;

const TITULO_EVENTO: Record<EventoReunion, string> = {
  invitacion: "Invitación a reunión",
  reprogramada: "Reunión reprogramada",
  cancelada: "Reunión cancelada",
  solicitada: "Solicitud de reunión",
};

export type ReunionParaNotificar = {
  id: string; titulo: string; inicio: Date; fin: Date; lugar: string | null; enlace: string | null; modalidad: ModalidadReunion; organizador: string;
};

/**
 * Bandeja + push + CORREO a los participantes (personal y familias) en los tres momentos que lo merecen: invitación,
 * reprogramación y cancelación (y la solicitud de una familia al docente). Familias: canales solo con consentimiento
 * vigente y según preferencias; personal: según sus preferencias. Nunca a quien hace la acción. Idempotente con
 * `reunion:<id>:<evento>[:<version>]`.
 */
export async function notificarReunion(
  ctx: TenantContext,
  d: { evento: EventoReunion; reunion: ReunionParaNotificar; destinatarios: { membershipId: string; alumnoId: string | null }[]; version?: string; solicitante?: string },
): Promise<ResumenEntrega> {
  const filas = d.destinatarios.filter((f) => f.membershipId !== ctx.membership.id);
  const ids = [...new Set(filas.map((f) => f.membershipId))];
  if (ids.length === 0) return { notificaciones: 0, avisos: 0, conCanal: 0 };
  const zona = ctx.tenant.zonaHoraria;
  const [miembros, alumnos] = await Promise.all([
    ctx.db.membership.findMany({
      where: { id: { in: ids }, estado: "activa" },
      select: {
        id: true, rol: true,
        preferenciaAviso: { select: { correo: true, push: true } },
        consentimientos: { where: { revocadoAt: null }, select: { id: true }, take: 1 },
        user: { select: { email: true, pushSuscripciones: { select: { endpoint: true } } } },
      },
    }),
    ctx.db.alumno.findMany({ where: { id: { in: [...new Set(filas.flatMap((f) => (f.alumnoId ? [f.alumnoId] : [])))] } }, select: { id: true, nombres: true } }),
  ]);
  const nombreAlumno = new Map(alumnos.map((a) => [a.id, primerNombre(a.nombres)]));
  const r = d.reunion;
  const local = momentoEnZona(r.inicio, zona);
  const ruta = `/reuniones/${r.id}`;
  const plantilla = PLANTILLA_EVENTO[d.evento];
  const entregas: Entrega<typeof plantilla>[] = miembros.map((m) => {
    const familia = m.rol === "apoderado";
    const pref = m.preferenciaAviso ?? { correo: true, push: true };
    const permitido = !familia || m.consentimientos.length > 0;
    const hijos = [...new Set(filas.filter((f) => f.membershipId === m.id && f.alumnoId).map((f) => nombreAlumno.get(f.alumnoId!)).filter((n): n is string => !!n))];
    const alumno = unir(hijos);
    const cuando = `${local.isoFecha} ${local.hora}`;
    return {
      membershipId: m.id, alumnoId: null, titulo: `${TITULO_EVENTO[d.evento]}: ${r.titulo}`,
      cuerpo: d.evento === "cancelada" ? `Se canceló la reunión del ${cuando}.` : `${cuando} · ${r.organizador}`, url: ruta,
      email: permitido && pref.correo ? m.user.email : null,
      endpoints: permitido && pref.push ? m.user.pushSuscripciones.map((s) => s.endpoint) : [],
      apoderadoId: familia ? m.id : null,
      unidad: familia ? (hijos.length ? filas.filter((f) => f.membershipId === m.id && f.alumnoId).map((f) => f.alumnoId).sort().join(",") : m.id) : m.id,
      payload: {
        colegio: ctx.tenant.nombre, titulo: r.titulo, fecha: local.isoFecha, hora: local.hora,
        duracion: Math.round((r.fin.getTime() - r.inicio.getTime()) / 60_000), organizador: r.organizador, modalidad: TEXTO_MODALIDAD[r.modalidad],
        ...(r.lugar ? { lugar: r.lugar } : {}), ...(r.enlace ? { enlace: r.enlace } : {}), ...(alumno ? { alumno } : {}),
        ...(d.evento === "solicitada" ? { solicitante: d.solicitante ?? "Una familia" } : {}),
        url: urlColegio(ctx.tenant.slug, ruta),
      } as PayloadDe<typeof plantilla>,
    };
  });
  return conEnvio(ctx.db, { tenantId: ctx.tenant.id, tipo: "reunion", titulo: `${TITULO_EVENTO[d.evento]}: ${r.titulo}`, creadoPorId: ctx.membership?.id ?? null }, () =>
    entregarNotificaciones(ctx.db, {
      tenant: ctx.tenant, tipo: "reunion", clave: `reunion:${r.id}:${d.evento}${d.version ? `:${d.version}` : ""}`, tipoAviso: "reunion", plantilla,
      referenciaId: r.id, entregas,
    }),
  );
}

/** Solo bandeja y push (sin correo) a una persona: respuesta a la invitación, solicitud resuelta o acuerdo asignado. */
export async function avisarSinCorreo(
  ctx: TenantContext,
  d: { membershipId: string; reunionId: string; titulo: string; texto: string; clave: string },
): Promise<ResumenEntrega> {
  if (d.membershipId === ctx.membership.id) return { notificaciones: 0, avisos: 0, conCanal: 0 };
  const m = await ctx.db.membership.findFirst({
    where: { id: d.membershipId, estado: "activa" },
    select: {
      rol: true, preferenciaAviso: { select: { push: true } }, consentimientos: { where: { revocadoAt: null }, select: { id: true }, take: 1 },
      user: { select: { pushSuscripciones: { select: { endpoint: true } } } },
    },
  });
  if (!m) return { notificaciones: 0, avisos: 0, conCanal: 0 };
  const familia = m.rol === "apoderado";
  const push = (!familia || m.consentimientos.length > 0) && (m.preferenciaAviso?.push ?? true);
  const ruta = `/reuniones/${d.reunionId}`;
  return entregarNotificaciones(ctx.db, {
    tenant: ctx.tenant, tipo: "reunion", clave: d.clave, tipoAviso: "reunion", plantilla: "reunion_respuesta", referenciaId: d.reunionId,
    entregas: [{
      membershipId: d.membershipId, titulo: d.titulo, cuerpo: d.texto, url: ruta, email: null,
      endpoints: push ? m.user.pushSuscripciones.map((s) => s.endpoint) : [], apoderadoId: familia ? d.membershipId : null,
      payload: { colegio: ctx.tenant.nombre, titulo: d.titulo, texto: d.texto, url: urlColegio(ctx.tenant.slug, ruta) },
    }],
  });
}
