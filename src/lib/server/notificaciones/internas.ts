import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { TipoAviso, TipoNotificacion } from "@/generated/prisma/enums";
import { urlColegio } from "@/lib/dominio";
import type { DbTenant } from "../db";
import { renderizarPlantilla, type NombrePlantilla, type PayloadDe } from "../email/plantillas";
import { envioParaAviso } from "./envios";

// Notificaciones de la bandeja interna (specs/38) para todo lo que no es una calificación: tarea nueva, evaluación
// programada, mensaje recibido, comunicado, justificación aprobada e incidencia (al profesor).
//
// - Una fila por destinatario, creada en lote (`createMany skipDuplicates`). La clave de idempotencia
//   (`tarea:<id>`, `comunicado:<id>`…) es única por colegio y membresía: un reintento no duplica.
// - El push (y el correo, si corresponde) va a la cola `avisos` también en lote, ligado a la notificación
//   (`notificacion_id`): único con el destinatario, tampoco se duplica. El push abre `/notificaciones/<id>/abrir`.
// - La bandeja no depende de los canales: exige solo vínculo activo (familias) o membresía activa (personal).
//   Push y correo exigen consentimiento vigente (familias) y las preferencias de `preferencias_aviso`.

const LOTE = 500;

const trozos = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

export type FilaNotificacion = {
  membershipId: string;
  alumnoId?: string | null;
  titulo: string;
  cuerpo: string;
  /** Ruta dentro del colegio («/tareas», «/comunicados#comunicado-…»). */
  url: string;
};

/**
 * Crea las notificaciones en lote (una por membresía; las repetidas se ignoran) y devuelve el id de cada una por
 * membresía, incluidas las que ya existían de un intento anterior. Número fijo de consultas por cada 500 filas.
 */
export async function crearNotificaciones(
  tdb: Pick<DbTenant, "notificacion">,
  d: { tenantId: string; tipo: TipoNotificacion; clave: string; filas: FilaNotificacion[] },
): Promise<{ creadas: number; ids: Map<string, string> }> {
  const unicas = [...new Map(d.filas.map((f) => [f.membershipId, f])).values()];
  let creadas = 0;
  const ids = new Map<string, string>();
  for (const lote of trozos(unicas, LOTE)) {
    const r = await tdb.notificacion.createMany({
      data: lote.map((f) => ({
        tenantId: d.tenantId, membershipId: f.membershipId, alumnoId: f.alumnoId ?? null, tipo: d.tipo, clave: d.clave,
        titulo: f.titulo.slice(0, 200), cuerpo: f.cuerpo.slice(0, 500), url: f.url,
      })),
      skipDuplicates: true,
    });
    creadas += r.count;
    const filas = await tdb.notificacion.findMany({
      where: { clave: d.clave, membershipId: { in: lote.map((f) => f.membershipId) } },
      select: { id: true, membershipId: true },
    });
    for (const f of filas) ids.set(f.membershipId, f.id);
  }
  return { creadas, ids };
}

/** Destinatario de una notificación: bandeja siempre; correo y push según quien llama (consentimiento y preferencias). */
export type Entrega<N extends NombrePlantilla> = FilaNotificacion & {
  /** Correo del destinatario si este aviso va también por correo (null = sin correo). */
  email: string | null;
  /** Dispositivos a los que va el push (vacío = sin push). */
  endpoints: string[];
  /** Payload del aviso (el `url` absoluto es el del correo; el push abre la notificación). */
  payload: PayloadDe<N>;
  /** Membresía de la familia en `avisos.apoderado_id` (null para el personal: no lleva enlace de preferencias de familia). */
  apoderadoId: string | null;
  /** Familia avisada en el envío en curso (`conEnvio`); por defecto, el apoderado o el destinatario. */
  unidad?: string | null;
};

export type ResumenEntrega = {
  /** Notificaciones nuevas en la bandeja (0 si ya existían). */
  notificaciones: number;
  /** Filas nuevas en la cola `avisos` (push + correo). */
  avisos: number;
  /** Destinatarios con al menos un canal (push o correo). */
  conCanal: number;
};

/**
 * Bandeja + cola en lote: crea las notificaciones y luego, en un `createMany`, el push de cada dispositivo y el
 * correo si corresponde. Idempotente con la misma `clave`.
 */
export async function entregarNotificaciones<N extends NombrePlantilla>(
  tdb: Pick<DbTenant, "notificacion" | "aviso">,
  d: {
    tenant: { id: string; slug: string };
    tipo: TipoNotificacion;
    clave: string;
    tipoAviso: TipoAviso;
    plantilla: N;
    referenciaId?: string | null;
    entregas: Entrega<N>[];
  },
): Promise<ResumenEntrega> {
  if (d.entregas.length === 0) return { notificaciones: 0, avisos: 0, conCanal: 0 };
  const { creadas, ids } = await crearNotificaciones(tdb, { tenantId: d.tenant.id, tipo: d.tipo, clave: d.clave, filas: d.entregas });
  const avisos: Prisma.AvisoCreateManyInput[] = [];
  let conCanal = 0;
  for (const e of d.entregas) {
    const notificacionId = ids.get(e.membershipId);
    if (!notificacionId) continue;
    if (!e.email && e.endpoints.length === 0) continue;
    conCanal++;
    const base = { tenantId: d.tenant.id, tipo: d.tipoAviso, plantilla: d.plantilla, apoderadoId: e.apoderadoId, referenciaId: d.referenciaId ?? null, notificacionId };
    const envioId = await envioParaAviso(e.unidad ?? e.apoderadoId ?? e.membershipId);
    if (e.email) {
      const { asunto } = renderizarPlantilla(d.plantilla, e.payload);
      avisos.push({ ...base, canal: "correo", destinatario: e.email, asunto, payload: e.payload as Prisma.InputJsonValue, envioId });
    }
    if (e.endpoints.length > 0) {
      const payload = { ...(e.payload as Record<string, unknown>), url: urlColegio(d.tenant.slug, `/notificaciones/${notificacionId}/abrir`) };
      const { asunto } = renderizarPlantilla(d.plantilla, payload);
      for (const endpoint of e.endpoints) {
        avisos.push({ ...base, canal: "push", destinatario: endpoint, asunto, payload: payload as Prisma.InputJsonValue, envioId });
      }
    }
  }
  let filas = 0;
  for (const lote of trozos(avisos, LOTE)) filas += (await tdb.aviso.createMany({ data: lote, skipDuplicates: true })).count;
  return { notificaciones: creadas, avisos: filas, conCanal };
}

/** Vínculo apoderado ↔ alumno para notificar, con lo que deciden los canales (consentimiento, preferencias, dispositivos). */
export type VinculoFamilia = {
  apoderadoId: string;
  alumnoId: string;
  email: string;
  /** Consentimiento vigente: sin él la familia ve la notificación en Khipu, sin push ni correo. */
  consentimiento: boolean;
  correo: boolean;
  /** Dispositivos si aceptó push (vacío si lo apagó). */
  endpoints: string[];
};

/**
 * Familias de los alumnos en UNA consulta: vínculos con `recibe_avisos` y apoderado activo, con consentimiento,
 * preferencias y suscripciones push (no una consulta por alumno ni por familia).
 */
export async function vinculosFamilias(tdb: Pick<DbTenant, "apoderadoAlumno">, alumnoIds: string[]): Promise<VinculoFamilia[]> {
  if (alumnoIds.length === 0) return [];
  const vinculos = await tdb.apoderadoAlumno.findMany({
    where: { alumnoId: { in: alumnoIds }, recibeAvisos: true, apoderado: { estado: "activa" } },
    select: {
      alumnoId: true, apoderadoId: true,
      apoderado: {
        select: {
          preferenciaAviso: { select: { correo: true, push: true } },
          consentimientos: { where: { revocadoAt: null }, select: { id: true }, take: 1 },
          user: { select: { email: true, pushSuscripciones: { select: { endpoint: true } } } },
        },
      },
    },
  });
  return vinculos.map((v) => {
    const pref = v.apoderado.preferenciaAviso ?? { correo: true, push: true };
    const consentimiento = v.apoderado.consentimientos.length > 0;
    return {
      apoderadoId: v.apoderadoId, alumnoId: v.alumnoId, email: v.apoderado.user.email, consentimiento,
      correo: consentimiento && pref.correo,
      endpoints: consentimiento && pref.push ? v.apoderado.user.pushSuscripciones.map((s) => s.endpoint) : [],
    };
  });
}

/** Agrupa los vínculos por familia (un apoderado con varios hijos recibe una sola notificación), en el orden de `alumnoIds`. */
export function porFamilia(vinculos: VinculoFamilia[], alumnoIds: string[]): Map<string, { vinculo: VinculoFamilia; alumnoIds: string[] }> {
  const orden = new Map(alumnoIds.map((id, i) => [id, i]));
  const mapa = new Map<string, { vinculo: VinculoFamilia; alumnoIds: string[] }>();
  for (const v of [...vinculos].sort((a, b) => (orden.get(a.alumnoId) ?? 0) - (orden.get(b.alumnoId) ?? 0))) {
    const actual = mapa.get(v.apoderadoId) ?? { vinculo: v, alumnoIds: [] };
    actual.alumnoIds.push(v.alumnoId);
    mapa.set(v.apoderadoId, actual);
  }
  return mapa;
}

/** Cuentas propias activas de los alumnos (rol `alumno`): ven la notificación en su bandeja, sin push ni correo. */
export async function cuentasDeAlumnos(tdb: Pick<DbTenant, "alumno">, alumnoIds: string[]): Promise<{ alumnoId: string; membershipId: string }[]> {
  if (alumnoIds.length === 0) return [];
  const filas = await tdb.alumno.findMany({
    where: { id: { in: alumnoIds }, estado: "activo", cuentaId: { not: null }, cuenta: { estado: "activa", rol: "alumno" } },
    select: { id: true, cuentaId: true },
  });
  return filas.map((f) => ({ alumnoId: f.id, membershipId: f.cuentaId! }));
}

/** Une nombres: «Mateo», «Mateo y Ana», «Mateo, Ana y Luis». */
export function unirNombres(nombres: string[]): string {
  return nombres.length <= 1 ? (nombres[0] ?? "") : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}
