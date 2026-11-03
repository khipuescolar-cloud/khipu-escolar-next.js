import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { urlColegio } from "@/lib/dominio";
import { primerNombre } from "@/lib/nombres";
import { db, dbTenant, type DbTenant } from "./db";
import { renderizarPlantilla } from "./email/plantillas";

// Notificaciones académicas por eventos (specs/38). Reemplaza al resumen académico diario.
//
// Outbox transaccional: publicar (o corregir) resultados crea una fila en `eventos_academicos` DENTRO de la misma
// transacción que cambia las notas. Así la publicación nunca depende del servicio de notificaciones: si el worker o el
// push fallan, la nota ya está publicada y el evento espera. El worker (after() de la acción y el cron) reserva eventos
// con FOR UPDATE SKIP LOCKED, crea por lotes las notificaciones internas (una por evento, apoderado y alumno) y encola
// el push en la cola `avisos` (una fila por dispositivo, única por notificación y endpoint). Nunca se envía correo por
// una calificación nueva: el correo queda para comunicaciones importantes (correcciones, libreta, asistencia…).

export const MAX_INTENTOS_EVENTO = 5;
const RESERVA_MAX_MINUTOS = 10;
const LOTE_FILAS = 500;

/** Cliente del colegio o su transacción interactiva (`ctx.db.$transaction(async (tx) => …)`). */
type Tx = Pick<DbTenant, "eventoAcademico">;

/** Registra la publicación de una actividad (llamar dentro de la transacción que la publica). Idempotente por grupo. */
export async function registrarEventoPublicacion(tx: Tx, d: { tenantId: string; grupoId: string; creadoPorId: string | null }) {
  const previo = await tx.eventoAcademico.findFirst({ where: { tenantId: d.tenantId, grupoId: d.grupoId, tipo: "resultados_publicados" }, select: { id: true } });
  if (previo) return previo.id;
  const e = await tx.eventoAcademico.create({ data: { tenantId: d.tenantId, tipo: "resultados_publicados", grupoId: d.grupoId, creadoPorId: d.creadoPorId } });
  return e.id;
}

/** Registra la corrección de una calificación publicada de un alumno (dentro de la transacción del cambio). */
export async function registrarEventoCorreccion(tx: Tx, d: { tenantId: string; grupoId: string; alumnoId: string; creadoPorId: string | null }) {
  const e = await tx.eventoAcademico.create({ data: { tenantId: d.tenantId, tipo: "nota_corregida", grupoId: d.grupoId, alumnoId: d.alumnoId, creadoPorId: d.creadoPorId } });
  return e.id;
}

export type ResumenEventos = { procesados: number; errores: number; recuperados: number; notificaciones: number; push: number };

const trozos = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/**
 * Worker del outbox. Recupera eventos atascados en `procesando`, reserva pendientes (SKIP LOCKED: dos workers nunca
 * toman el mismo) y los procesa. Un error deja el evento `pendiente` con su error para reintentar; tras
 * MAX_INTENTOS_EVENTO pasa a `error`. Lo ya creado (notificaciones y push) no se duplica al reintentar.
 */
export async function procesarEventosAcademicos(opciones: { tenantId?: string; ahora?: Date; maxEventos?: number } = {}): Promise<ResumenEventos> {
  const ahora = opciones.ahora ?? new Date();
  const resumen: ResumenEventos = { procesados: 0, errores: 0, recuperados: 0, notificaciones: 0, push: 0 };
  const limiteReserva = new Date(ahora.getTime() - RESERVA_MAX_MINUTOS * 60_000);
  const recuperados = await db.eventoAcademico.updateMany({
    where: { estado: "procesando", reservadoAt: { lt: limiteReserva }, ...(opciones.tenantId ? { tenantId: opciones.tenantId } : {}) },
    data: { estado: "pendiente" },
  });
  resumen.recuperados = recuperados.count;
  const maximo = opciones.maxEventos ?? 50;
  const reservados = opciones.tenantId
    ? await db.$queryRaw<{ id: string; tenant_id: string }[]>`
        UPDATE eventos_academicos SET estado = 'procesando', reservado_at = ${ahora}, intentos = intentos + 1
        WHERE id IN (SELECT id FROM eventos_academicos WHERE estado = 'pendiente' AND tenant_id = ${opciones.tenantId}::uuid
                     ORDER BY created_at LIMIT ${maximo} FOR UPDATE SKIP LOCKED)
        RETURNING id, tenant_id`
    : await db.$queryRaw<{ id: string; tenant_id: string }[]>`
        UPDATE eventos_academicos SET estado = 'procesando', reservado_at = ${ahora}, intentos = intentos + 1
        WHERE id IN (SELECT id FROM eventos_academicos WHERE estado = 'pendiente'
                     ORDER BY created_at LIMIT ${maximo} FOR UPDATE SKIP LOCKED)
        RETURNING id, tenant_id`;
  for (const r of reservados) {
    const tdb = dbTenant(r.tenant_id);
    try {
      const c = await procesarEvento(tdb, r.id);
      await tdb.eventoAcademico.updateMany({
        where: { id: r.id }, data: { estado: "procesado", procesadoAt: new Date(), error: null, alumnos: c.alumnos, notificaciones: c.notificaciones, push: c.push },
      });
      resumen.procesados += 1;
      resumen.notificaciones += c.notificaciones;
      resumen.push += c.push;
    } catch (error) {
      const e = await tdb.eventoAcademico.findFirst({ where: { id: r.id }, select: { intentos: true } });
      await tdb.eventoAcademico.updateMany({
        where: { id: r.id },
        data: { estado: (e?.intentos ?? MAX_INTENTOS_EVENTO) >= MAX_INTENTOS_EVENTO ? "error" : "pendiente", error: String(error instanceof Error ? error.message : error).slice(0, 500) },
      });
      resumen.errores += 1;
      console.error("[eventos-academicos] error al procesar", r.id, error);
    }
  }
  return resumen;
}

/**
 * Convierte un evento en notificaciones internas y push con un número fijo de consultas (no una por alumno):
 * evaluaciones del grupo → notas publicadas → alumnos → vínculos con apoderados (preferencias, consentimiento y
 * dispositivos) → createMany de notificaciones → createMany de push. Idempotente: las únicas evitan duplicados.
 */
async function procesarEvento(tdb: DbTenant, eventoId: string): Promise<{ alumnos: number; notificaciones: number; push: number }> {
  const evento = await tdb.eventoAcademico.findFirstOrThrow({ where: { id: eventoId }, include: { tenant: { select: { nombre: true, slug: true } } } });
  const evaluaciones = await tdb.evaluacion.findMany({
    where: { grupoId: evento.grupoId, estado: "publicada" },
    select: { id: true, titulo: true, periodoId: true, curso: { select: { nombre: true } } },
  });
  if (evaluaciones.length === 0) return { alumnos: 0, notificaciones: 0, push: 0 }; // se despublicó o se eliminó
  const { titulo, periodoId, curso } = evaluaciones[0];
  const notas = await tdb.nota.findMany({
    where: { evaluacionId: { in: evaluaciones.map((e) => e.id) }, ...(evento.alumnoId ? { alumnoId: evento.alumnoId } : {}) },
    select: { alumnoId: true },
    distinct: ["alumnoId"],
  });
  const alumnos = await tdb.alumno.findMany({ where: { id: { in: notas.map((n) => n.alumnoId) }, estado: "activo" }, select: { id: true, nombres: true } });
  if (alumnos.length === 0) return { alumnos: 0, notificaciones: 0, push: 0 };
  const nombres = new Map(alumnos.map((a) => [a.id, primerNombre(a.nombres)]));
  // Apoderados autorizados: vínculo con avisos activos y membresía activa. El push además exige consentimiento vigente
  // y las preferencias de push y push académico.
  const vinculos = await tdb.apoderadoAlumno.findMany({
    where: { alumnoId: { in: alumnos.map((a) => a.id) }, recibeAvisos: true, apoderado: { estado: "activa" } },
    select: {
      alumnoId: true, apoderadoId: true,
      apoderado: {
        select: {
          preferenciaAviso: { select: { push: true, pushAcademico: true } },
          consentimientos: { where: { revocadoAt: null }, select: { id: true }, take: 1 },
          user: { select: { pushSuscripciones: { select: { endpoint: true } } } },
        },
      },
    },
  });
  const correccion = evento.tipo === "nota_corregida";
  const texto = (alumnoId: string) => ({
    titulo: correccion ? "Calificación actualizada" : "Nuevo resultado publicado",
    cuerpo: correccion
      ? `Se actualizó un resultado de ${nombres.get(alumnoId)} en ${curso.nombre}.`
      : `Hay un resultado nuevo de ${nombres.get(alumnoId)} en ${curso.nombre}: «${titulo}».`,
    url: `/notas?alumno=${alumnoId}&periodo=${periodoId}#ev-${evento.grupoId}`,
  });
  const filas = vinculos.map((v) => ({ tenantId: evento.tenantId, membershipId: v.apoderadoId, alumnoId: v.alumnoId, eventoId: evento.id, ...texto(v.alumnoId) }));
  for (const lote of trozos(filas, LOTE_FILAS)) await tdb.notificacion.createMany({ data: lote, skipDuplicates: true });
  const creadas = await tdb.notificacion.findMany({ where: { eventoId: evento.id }, select: { id: true, membershipId: true, alumnoId: true, titulo: true, cuerpo: true, url: true } });

  const porVinculo = new Map(vinculos.map((v) => [`${v.apoderadoId}:${v.alumnoId}`, v]));
  const avisos: Prisma.AvisoCreateManyInput[] = [];
  for (const n of creadas) {
    const v = porVinculo.get(`${n.membershipId}:${n.alumnoId}`);
    if (!v) continue;
    const pref = v.apoderado.preferenciaAviso ?? { push: true, pushAcademico: true };
    if (!pref.push || !pref.pushAcademico || v.apoderado.consentimientos.length === 0) continue;
    // El push abre la notificación (la marca leída) y de ahí la actividad.
    const payload = { colegio: evento.tenant.nombre, titulo: n.titulo, cuerpo: n.cuerpo, url: urlColegio(evento.tenant.slug, `/notificaciones/${n.id}/abrir`), tag: `notas-${n.alumnoId}` };
    const { asunto } = renderizarPlantilla("notificacion_academica", payload);
    for (const s of v.apoderado.user.pushSuscripciones) {
      avisos.push({
        tenantId: evento.tenantId, tipo: "libreta", canal: "push", destinatario: s.endpoint, plantilla: "notificacion_academica", asunto,
        payload, apoderadoId: n.membershipId, referenciaId: evento.grupoId, notificacionId: n.id,
      });
    }
  }
  let push = 0;
  for (const lote of trozos(avisos, LOTE_FILAS)) push += (await tdb.aviso.createMany({ data: lote, skipDuplicates: true })).count;
  return { alumnos: alumnos.length, notificaciones: creadas.length, push };
}

/** Procesa los eventos y luego envía el push del colegio (para usar en after() sin bloquear al profesor). */
export async function procesarEventosYPush(tenantId: string) {
  const { procesarCola } = await import("./notificaciones/cola");
  await procesarEventosAcademicos({ tenantId });
  await procesarCola({ tenantId });
}
