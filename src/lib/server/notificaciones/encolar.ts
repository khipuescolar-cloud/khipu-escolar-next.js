import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { CanalAviso, EstadoAsistencia, TipoAviso } from "@/generated/prisma/enums";
import type { DbTenant } from "../db";
import { renderizarPlantilla, type NombrePlantilla, type PayloadDe } from "../email/plantillas";
import { hashToken, tokenDerivado } from "../tokens";

// Encolado de avisos (specs/06). Solo se encola para apoderados con `recibeAvisos`,
// consentimiento vigente (no revocado) y según `preferencias_aviso` (correo y/o push).

/** Vigencia del enlace «Justificar falta». */
export const DIAS_TOKEN_JUSTIFICAR = 7;

export type Destinatario = {
  apoderadoId: string;
  email: string;
  correo: boolean;
  pushEndpoints: string[];
};

/** Familias que pueden recibir avisos de un alumno. */
export async function destinatariosDeAlumno(tdb: DbTenant, alumnoId: string): Promise<Destinatario[]> {
  const vinculos = await tdb.apoderadoAlumno.findMany({
    where: {
      alumnoId,
      recibeAvisos: true,
      apoderado: { estado: "activa", consentimientos: { some: { revocadoAt: null } } },
    },
    select: {
      apoderadoId: true,
      apoderado: {
        select: {
          preferenciaAviso: { select: { correo: true, push: true } },
          user: { select: { email: true, pushSuscripciones: { select: { endpoint: true } } } },
        },
      },
    },
  });
  return vinculos.map((v) => {
    const pref = v.apoderado.preferenciaAviso ?? { correo: true, push: true };
    return {
      apoderadoId: v.apoderadoId,
      email: v.apoderado.user.email,
      correo: pref.correo,
      pushEndpoints: pref.push ? v.apoderado.user.pushSuscripciones.map((s) => s.endpoint) : [],
    };
  });
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
  datos: { tenantId: string; asistenciaId: string; apoderadoId: string; ahora?: Date },
): Promise<{ id: string; token: string }> {
  const id = randomUUID();
  const token = tokenDerivado("justificar", id);
  const ahora = datos.ahora ?? new Date();
  await tdb.justificacionToken.create({
    data: {
      id,
      tenantId: datos.tenantId,
      asistenciaId: datos.asistenciaId,
      apoderadoId: datos.apoderadoId,
      tokenHash: hashToken(token),
      expiraAt: new Date(ahora.getTime() + DIAS_TOKEN_JUSTIFICAR * 86_400_000),
    },
  });
  return { id, token };
}

export type AsistenciaParaAviso = {
  id: string;
  alumnoId: string;
  estado: EstadoAsistencia;
  hora: string;
  nota: string | null;
};

/**
 * Encola los avisos de un registro de asistencia. Con `modoAvisos = solo_excepciones` las llegadas
 * no se avisan aquí (van en el resumen de llegadas). Devuelve cuántas familias recibirán aviso.
 */
export async function encolarAvisosAsistencia(
  tdb: DbTenant,
  datos: {
    tenant: { id: string; nombre: string; modoAvisos: "todos" | "solo_excepciones" };
    asistencia: AsistenciaParaAviso;
    alumnoNombre: string;
    /** «a la 1.ª hora» o «a Matemática» (texto del aviso de falta). */
    momento: string;
    urlMensajes?: string;
  },
): Promise<number> {
  const { tenant, asistencia, alumnoNombre } = datos;
  if (asistencia.estado === "llego" && tenant.modoAvisos === "solo_excepciones") return 0;

  const destinatarios = await destinatariosDeAlumno(tdb, asistencia.alumnoId);
  let familias = 0;
  for (const d of destinatarios) {
    if (!d.correo && d.pushEndpoints.length === 0) continue;
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
        const { id } = await crearTokenJustificacion(tdb, { tenantId: tenant.id, asistenciaId: asistencia.id, apoderadoId: d.apoderadoId });
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
