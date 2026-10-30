import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { CanalAviso, EstadoAsistencia, TipoAviso } from "@/generated/prisma/enums";
import { isoDeFechaDb, sumarDias } from "@/lib/fechas";
import { expiracionJustificacion } from "@/lib/plazo-justificacion";
import type { DbTenant } from "../db";
import { feriadosAplicables } from "../plataforma-configuracion";
import { renderizarPlantilla, type NombrePlantilla, type PayloadDe } from "../email/plantillas";
import { hashToken, tokenDerivado } from "../tokens";

// Encolado de avisos (specs/06). Solo se encola para apoderados con `recibeAvisos`,
// consentimiento vigente (no revocado) y según `preferencias_aviso` (correo y/o push).

// El enlace «Justificar falta» vence al fin del día (hora del colegio) del n-ésimo día hábil posterior a la falta,
// con n = `Tenant.plazoJustificacionDiasHabiles` (15 por defecto; specs/07). Se cuenta desde la falta, no desde el envío.

export type Destinatario = {
  apoderadoId: string;
  email: string;
  correo: boolean;
  pushEndpoints: string[];
};

/** true si el destinatario eligió algún canal (correo o push). */
export function tieneCanalAviso(d: Pick<Destinatario, "correo" | "pushEndpoints">): boolean {
  return d.correo || d.pushEndpoints.length > 0;
}

/** Familias que pueden recibir avisos de un alumno. */
export async function destinatariosDeAlumno(tdb: DbTenant, alumnoId: string): Promise<Destinatario[]> {
  return (await destinatariosPorAlumno(tdb, [alumnoId])).get(alumnoId) ?? [];
}

/** Familias que pueden recibir avisos de cada alumno, en una sola consulta (pasar lista de un salón entero). */
export async function destinatariosPorAlumno(tdb: DbTenant, alumnoIds: string[]): Promise<Map<string, Destinatario[]>> {
  const mapa = new Map<string, Destinatario[]>();
  if (alumnoIds.length === 0) return mapa;
  const vinculos = await tdb.apoderadoAlumno.findMany({
    where: {
      alumnoId: { in: alumnoIds },
      recibeAvisos: true,
      apoderado: { estado: "activa", consentimientos: { some: { revocadoAt: null } } },
    },
    select: {
      alumnoId: true,
      apoderadoId: true,
      apoderado: {
        select: {
          preferenciaAviso: { select: { correo: true, push: true } },
          user: { select: { email: true, pushSuscripciones: { select: { endpoint: true } } } },
        },
      },
    },
  });
  for (const v of vinculos) {
    const pref = v.apoderado.preferenciaAviso ?? { correo: true, push: true };
    const lista = mapa.get(v.alumnoId) ?? [];
    lista.push({
      apoderadoId: v.apoderadoId,
      email: v.apoderado.user.email,
      correo: pref.correo,
      pushEndpoints: pref.push ? v.apoderado.user.pushSuscripciones.map((s) => s.endpoint) : [],
    });
    mapa.set(v.alumnoId, lista);
  }
  return mapa;
}

/** Cuántas familias con algún canal de aviso tiene cada alumno (para el resumen previo de pasar lista). */
export async function familiasConAvisoPorAlumno(tdb: DbTenant, alumnoIds: string[]): Promise<Map<string, number>> {
  const vinculos = await tdb.apoderadoAlumno.findMany({
    where: {
      alumnoId: { in: alumnoIds },
      recibeAvisos: true,
      apoderado: { estado: "activa", consentimientos: { some: { revocadoAt: null } } },
    },
    select: {
      alumnoId: true,
      apoderado: {
        select: {
          preferenciaAviso: { select: { correo: true, push: true } },
          user: { select: { _count: { select: { pushSuscripciones: true } } } },
        },
      },
    },
  });
  const conteo = new Map<string, number>();
  for (const v of vinculos) {
    const pref = v.apoderado.preferenciaAviso ?? { correo: true, push: true };
    const ok = tieneCanalAviso({
      correo: pref.correo,
      pushEndpoints: pref.push && v.apoderado.user._count.pushSuscripciones > 0 ? ["x"] : [],
    });
    if (ok) conteo.set(v.alumnoId, (conteo.get(v.alumnoId) ?? 0) + 1);
  }
  return conteo;
}

/**
 * Inserta una fila `pendiente` en `avisos`. Valida el payload contra la plantilla para que el worker
 * no reciba filas imposibles de renderizar. Devuelve el id del aviso.
 */
export async function encolarAviso<N extends NombrePlantilla>(
  tdb: DbTenant,
  datos: {
    tenantId: string;
    tipo: TipoAviso;
    canal: CanalAviso;
    destinatario: string;
    plantilla: N;
    payload: PayloadDe<N>;
    apoderadoId?: string | null;
    asistenciaId?: string | null;
    /** Conversación, tarea, apoderado… (para agrupar y limitar avisos). */
    referenciaId?: string | null;
    programadoPara?: Date;
  },
): Promise<string> {
  const { asunto } = renderizarPlantilla(datos.plantilla, datos.payload);
  const aviso = await tdb.aviso.create({
    data: {
      tenantId: datos.tenantId,
      tipo: datos.tipo,
      canal: datos.canal,
      destinatario: datos.destinatario,
      plantilla: datos.plantilla,
      asunto,
      payload: datos.payload as Prisma.InputJsonValue,
      apoderadoId: datos.apoderadoId ?? null,
      asistenciaId: datos.asistenciaId ?? null,
      referenciaId: datos.referenciaId ?? null,
      programadoPara: datos.programadoPara ?? new Date(),
    },
    select: { id: true },
  });
  return aviso.id;
}

/** Encola el mismo aviso por cada canal activo del destinatario. Devuelve cuántas filas creó. */
export async function encolarParaDestinatario<N extends NombrePlantilla>(
  tdb: DbTenant,
  destinatario: Destinatario,
  datos: { tenantId: string; tipo: TipoAviso; plantilla: N; payload: PayloadDe<N>; asistenciaId?: string | null; referenciaId?: string | null },
): Promise<number> {
  let filas = 0;
  if (destinatario.correo) {
    await encolarAviso(tdb, { ...datos, canal: "correo", destinatario: destinatario.email, apoderadoId: destinatario.apoderadoId });
    filas++;
  }
  for (const endpoint of destinatario.pushEndpoints) {
    await encolarAviso(tdb, { ...datos, canal: "push", destinatario: endpoint, apoderadoId: destinatario.apoderadoId });
    filas++;
  }
  return filas;
}

/** Crea el token de un solo uso para justificar la falta. Solo se guarda su hash. */
export async function crearTokenJustificacion(
  tdb: DbTenant,
  datos: {
    tenantId: string; asistenciaId: string; apoderadoId: string;
    /** Día de la falta (AAAA-MM-DD, hora del colegio). */
    fechaFalta: string;
    plazoDias?: number | null;
    zonaHoraria?: string;
  },
): Promise<{ id: string; token: string }> {
  const id = randomUUID();
  const token = tokenDerivado("justificar", id);
  const feriados = await feriadosAplicables(datos.tenantId, datos.fechaFalta, sumarDias(datos.fechaFalta, 90));
  await tdb.justificacionToken.create({
    data: {
      id,
      tenantId: datos.tenantId,
      asistenciaId: datos.asistenciaId,
      apoderadoId: datos.apoderadoId,
      tokenHash: hashToken(token),
      expiraAt: expiracionJustificacion(datos.fechaFalta, datos.plazoDias, datos.zonaHoraria, feriados),
    },
  });
  return { id, token };
}

export type AsistenciaParaAviso = {
  id: string;
  /** Columna `@db.Date` de la asistencia (día de la falta para el plazo de justificación). */
  fecha: Date;
  alumnoId: string;
  estado: EstadoAsistencia;
  hora: string;
  nota: string | null;
};

/**
 * Encola los avisos de un registro de asistencia: llegada, tardanza, falta o problema, a cada familia
 * con consentimiento y según sus preferencias. Todas las llegadas se avisan (el modo «solo excepciones»
 * se eliminó); quien llama evita repetir la llegada del mismo alumno el mismo día. Devuelve cuántas familias recibirán aviso.
 */
export async function encolarAvisosAsistencia(
  tdb: DbTenant,
  datos: {
    tenant: { id: string; nombre: string; plazoJustificacionDiasHabiles?: number; zonaHoraria?: string };
    asistencia: AsistenciaParaAviso;
    alumnoNombre: string;
    /** «a la 1.ª hora» o «a Matemática» (texto del aviso de falta). */
    momento: string;
    urlMensajes?: string;
    /** Destinatarios ya cargados (p. ej. con `destinatariosPorAlumno` para toda la lista); si no, se consultan. */
    destinatarios?: Destinatario[];
  },
): Promise<number> {
  const { tenant, asistencia, alumnoNombre } = datos;
  const destinatarios = datos.destinatarios ?? (await destinatariosDeAlumno(tdb, asistencia.alumnoId));
  let familias = 0;
  for (const d of destinatarios) {
    if (!tieneCanalAviso(d)) continue;
    const base = { tenantId: tenant.id, tipo: "asistencia" as const, asistenciaId: asistencia.id };
    const colegio = tenant.nombre;
    let filas = 0;
    switch (asistencia.estado) {
      case "llego":
        filas = await encolarParaDestinatario(tdb, d, {
          ...base, plantilla: "asistencia_llego", payload: { colegio, alumno: alumnoNombre, hora: asistencia.hora },
        });
        break;
      case "tarde":
        filas = await encolarParaDestinatario(tdb, d, {
          ...base, plantilla: "asistencia_tarde", payload: { colegio, alumno: alumnoNombre, hora: asistencia.hora },
        });
        break;
      case "falta": {
        const { id } = await crearTokenJustificacion(tdb, {
          tenantId: tenant.id, asistenciaId: asistencia.id, apoderadoId: d.apoderadoId,
          fechaFalta: isoDeFechaDb(asistencia.fecha), plazoDias: tenant.plazoJustificacionDiasHabiles, zonaHoraria: tenant.zonaHoraria,
        });
        filas = await encolarParaDestinatario(tdb, d, {
          ...base,
          plantilla: "asistencia_falta",
          payload: { colegio, alumno: alumnoNombre, momento: datos.momento, justificacionTokenId: id },
        });
        break;
      }
      case "problema":
        filas = await encolarParaDestinatario(tdb, d, {
          ...base,
          plantilla: "asistencia_problema",
          payload: {
            colegio, alumno: alumnoNombre, hora: asistencia.hora,
            ...(asistencia.nota ? { nota: asistencia.nota } : {}),
            ...(datos.urlMensajes ? { urlMensajes: datos.urlMensajes } : {}),
          },
        });
        break;
    }
    if (filas > 0) familias++;
  }
  return familias;
}
