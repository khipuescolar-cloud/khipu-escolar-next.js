import "server-only";
import type { Aviso } from "@/generated/prisma/client";
import type { CanalAviso } from "@/generated/prisma/enums";
import { urlColegio, urlRaiz } from "@/lib/dominio";
import { fechaDb, momentoEnZona } from "@/lib/fechas";
import { primerNombre } from "@/lib/nombres";
import { db, dbTenant } from "../db";
import { PlantillaInvalidaError, renderizarPlantilla } from "../email/plantillas";
import { tokenDerivado } from "../tokens";
import { EmailChannel } from "./email";
import { destinatariosDeAlumno, encolarParaDestinatario } from "./encolar";
import { cupoDiario, esperaReintentoMs, leerLimites, MAX_INTENTOS, pausaEntreCorreosMs, tocaResumen } from "./limites";
import { PushChannel } from "./push";
import { EnvioPermanenteError, type NotificationChannel } from "./tipos";

// Worker de la cola `avisos` (specs/06). Lo llama /api/cron/avisos (cron) y after() tras guardar asistencia.
// - Respeta EMAIL_DAILY_LIMIT en una ventana móvil de 24 h (global) y EMAIL_RATE_PER_SECOND.
// - Cada fila se reserva pasándola de `pendiente` a `enviando` con un UPDATE condicionado (atómico en Postgres):
//   si dos workers corren a la vez, solo uno la obtiene. Las filas que quedan en `enviando` más de
//   ENVIANDO_MAX_MINUTOS (worker caído a la mitad) vuelven a `pendiente` y cuentan como un intento.
// - 1 intento + 3 reintentos con espera creciente; después, `error`.

export const ENVIANDO_MAX_MINUTOS = 10;
/** Plantillas dirigidas a familias: llevan enlace para ajustar avisos (solo si la fila es de un apoderado). */
const PLANTILLAS_FAMILIA = new Set([
  "asistencia_llego", "asistencia_tarde", "asistencia_falta", "asistencia_problema",
  "resumen_llegadas", "mensaje_nuevo", "comunicado", "justificacion_revisada", "tarea_nueva", "libreta_publicada",
]);

export type ResumenCola = {
  enviados: number; reintentos: number; errores: number; omitidos: number; diferidos: number; resumenes: number;
  /** Filas recuperadas de `enviando` (worker caído). */
  recuperados: number;
};

export type OpcionesCola = {
  ahora?: Date;
  /** Limita el procesamiento a un colegio (tests y after() del guardado). */
  tenantId?: string;
  maxAvisos?: number;
  canales?: Partial<Record<CanalAviso, NotificationChannel>>;
  esperar?: (ms: number) => Promise<void>;
  limites?: { limiteDiario: number; porSegundo: number };
};

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type DatosColegio = { nombre: string; slug: string };

/** Completa el payload con lo que no se guarda en la BD (enlace de justificar) y el enlace de preferencias. */
function prepararPayload(aviso: Aviso, colegio: DatosColegio): Record<string, unknown> {
  const payload = { ...((aviso.payload ?? {}) as Record<string, unknown>) };
  if (!payload.colegio) payload.colegio = colegio.nombre;
  if (aviso.plantilla === "asistencia_falta" && typeof payload.justificacionTokenId === "string" && !payload.urlJustificar) {
    payload.urlJustificar = urlRaiz(`/justificar/${tokenDerivado("justificar", payload.justificacionTokenId)}`);
  }
  if (PLANTILLAS_FAMILIA.has(aviso.plantilla) && aviso.apoderadoId && !payload.urlPreferencias) {
    payload.urlPreferencias = urlColegio(colegio.slug, "/asistencia#avisos");
  }
  return payload;
}

/** Procesa la cola. Devuelve cuántos avisos envió, reintentó, falló o difirió por el tope diario. */
export async function procesarCola(opciones: OpcionesCola = {}): Promise<ResumenCola> {
  const ahora = opciones.ahora ?? new Date();
  const esperar = opciones.esperar ?? dormir;
  const { limiteDiario, porSegundo } = opciones.limites ?? leerLimites();
  const canales: Partial<Record<CanalAviso, NotificationChannel>> = opciones.canales ?? {
    correo: new EmailChannel(),
    push: new PushChannel(),
  };
  const resumen: ResumenCola = { enviados: 0, reintentos: 0, errores: 0, omitidos: 0, diferidos: 0, resumenes: 0, recuperados: 0 };

  resumen.resumenes = await generarResumenesLlegadas({ ahora, tenantId: opciones.tenantId });
  resumen.recuperados = await recuperarAtascados(ahora, opciones.tenantId);

  const candidatos = await db.aviso.findMany({
    where: { estado: "pendiente", programadoPara: { lte: ahora }, ...(opciones.tenantId ? { tenantId: opciones.tenantId } : {}) },
    orderBy: { programadoPara: "asc" },
    take: opciones.maxAvisos ?? 100,
    select: { id: true, canal: true },
  });
  if (candidatos.length === 0) return resumen;

  // Tope global: correos enviados en las últimas 24 h, de todos los colegios.
  const enviados24h = await db.aviso.count({
    where: { canal: "correo", enviadoAt: { gte: new Date(ahora.getTime() - 86_400_000) } },
  });
  let cupo = cupoDiario(enviados24h, limiteDiario);
  const elegidos: string[] = [];
  for (const c of candidatos) {
    if (c.canal === "correo") {
      if (cupo <= 0) {
        resumen.diferidos++; // queda pendiente para cuando se libere la ventana de 24 h
        continue;
      }
      cupo--;
    }
    elegidos.push(c.id);
  }
  const reservados = await reservar(elegidos);

  const colegios = new Map<string, DatosColegio>();
  let correosEnviados = 0;

  for (const aviso of reservados) {
    let colegio = colegios.get(aviso.tenantId);
    if (!colegio) {
      colegio = await db.tenant.findUniqueOrThrow({ where: { id: aviso.tenantId }, select: { nombre: true, slug: true } });
      colegios.set(aviso.tenantId, colegio);
    }

    const canal = canales[aviso.canal];
    try {
      if (!canal) throw new EnvioPermanenteError(`Canal no disponible: ${aviso.canal}`);
      if (aviso.canal === "correo" && correosEnviados > 0) await esperar(pausaEntreCorreosMs(porSegundo));
      const payload = prepararPayload(aviso, colegio);
      const mensaje = renderizarPlantilla(aviso.plantilla, payload);
      const { providerMessageId } = await canal.enviar({
        avisoId: aviso.id,
        destinatario: aviso.destinatario,
        remitente: colegio.nombre,
        mensaje,
        urlPreferencias: typeof payload.urlPreferencias === "string" ? payload.urlPreferencias : undefined,
      });
      await db.aviso.update({
        where: { id: aviso.id },
        data: {
          estado: "enviado",
          enviadoAt: new Date(),
          intentos: { increment: 1 },
          error: null,
          providerMessageId: providerMessageId ?? null,
          asunto: mensaje.asunto,
        },
      });
      resumen.enviados++;
      if (aviso.canal === "correo") correosEnviados++;
    } catch (error) {
      const texto = error instanceof Error ? error.message : String(error);
      const permanente = error instanceof PlantillaInvalidaError || error instanceof EnvioPermanenteError;
      const intentos = aviso.intentos + 1;
      if (permanente) {
        await db.aviso.update({
          where: { id: aviso.id },
          data: { estado: error instanceof PlantillaInvalidaError ? "error" : "omitido", intentos, error: texto.slice(0, 500) },
        });
        if (error instanceof PlantillaInvalidaError) resumen.errores++;
        else resumen.omitidos++;
      } else if (intentos >= MAX_INTENTOS) {
        await db.aviso.update({ where: { id: aviso.id }, data: { estado: "error", intentos, error: texto.slice(0, 500) } });
        resumen.errores++;
      } else {
        await db.aviso.update({
          where: { id: aviso.id },
          data: { estado: "pendiente", intentos, error: texto.slice(0, 500), programadoPara: new Date(Date.now() + esperaReintentoMs(intentos)) },
        });
        resumen.reintentos++;
      }
    }
  }
  return resumen;
}

/**
 * Reserva las filas pasándolas de `pendiente` a `enviando` en una sola sentencia. Postgres bloquea cada fila
 * y vuelve a evaluar `estado = 'pendiente'` si otro worker la cambió: cada fila la obtiene un solo worker.
 * Devuelve solo las filas reservadas por esta llamada, en orden de programación.
 */
async function reservar(ids: string[]): Promise<Aviso[]> {
  if (ids.length === 0) return [];
  const filas = await db.$queryRaw<{ id: string }[]>`
    UPDATE avisos SET estado = 'enviando'::"EstadoAviso", programado_para = now()
    WHERE id = ANY(${ids}::uuid[]) AND estado = 'pendiente'::"EstadoAviso"
    RETURNING id`;
  if (filas.length === 0) return [];
  const avisos = await db.aviso.findMany({ where: { id: { in: filas.map((f) => f.id) } } });
  const orden = new Map(ids.map((id, i) => [id, i]));
  return avisos.sort((a, b) => (orden.get(a.id) ?? 0) - (orden.get(b.id) ?? 0));
}

/**
 * Filas en `enviando` hace más de ENVIANDO_MAX_MINUTOS (el worker se cayó): vuelven a `pendiente` contando
 * el intento, o pasan a `error` si ya no quedan reintentos. Al reservar, `programadoPara` guarda la hora de reserva.
 */
async function recuperarAtascados(ahora: Date, tenantId?: string): Promise<number> {
  const limite = new Date(Date.now() - ENVIANDO_MAX_MINUTOS * 60_000);
  const where = { estado: "enviando" as const, programadoPara: { lt: limite }, ...(tenantId ? { tenantId } : {}) };
  const error = "Quedó en «enviando» sin respuesta del worker";
  const agotados = await db.aviso.updateMany({
    where: { ...where, intentos: { gte: MAX_INTENTOS - 1 } },
    data: { estado: "error", intentos: { increment: 1 }, error },
  });
  const devueltos = await db.aviso.updateMany({
    where,
    data: { estado: "pendiente", intentos: { increment: 1 }, error, programadoPara: ahora },
  });
  return agotados.count + devueltos.count;
}

/**
 * Colegios con `modoAvisos = solo_excepciones`: a partir de `horaEnvioAvisos` encola un correo
 * `resumen_llegadas` por familia con las llegadas del día (una vez al día por familia).
 */
export async function generarResumenesLlegadas({ ahora, tenantId }: { ahora: Date; tenantId?: string }): Promise<number> {
  const colegios = await db.tenant.findMany({
    where: { modoAvisos: "solo_excepciones", estado: { not: "suspendido" }, ...(tenantId ? { id: tenantId } : {}) },
    select: { id: true, nombre: true, zonaHoraria: true, horaEnvioAvisos: true },
  });
  let creados = 0;
  for (const colegio of colegios) {
    const { isoFecha, hora } = momentoEnZona(ahora, colegio.zonaHoraria);
    if (!tocaResumen(hora, colegio.horaEnvioAvisos)) continue;
    const tdb = dbTenant(colegio.id);

    const llegadas = await tdb.asistencia.findMany({
      where: { fecha: fechaDb(isoFecha), estado: "llego" },
      orderBy: { hora: "asc" },
      select: { alumnoId: true, hora: true, alumno: { select: { nombres: true } } },
    });
    if (llegadas.length === 0) continue;
    // Primera llegada de cada alumno.
    const porAlumno = new Map<string, { alumno: string; hora: string }>();
    for (const l of llegadas) if (!porAlumno.has(l.alumnoId)) porAlumno.set(l.alumnoId, { alumno: primerNombre(l.alumno.nombres), hora: l.hora });

    // Familias que ya recibieron el resumen hoy.
    const yaEnviados = await tdb.aviso.findMany({
      where: { plantilla: "resumen_llegadas", payload: { path: ["fecha"], equals: isoFecha } },
      select: { apoderadoId: true },
    });
    const omitir = new Set(yaEnviados.map((a) => a.apoderadoId));

    const porFamilia = new Map<string, { destinatario: Awaited<ReturnType<typeof destinatariosDeAlumno>>[number]; llegadas: { alumno: string; hora: string }[] }>();
    for (const [alumnoId, llegada] of porAlumno) {
      for (const d of await destinatariosDeAlumno(tdb, alumnoId)) {
        if (omitir.has(d.apoderadoId)) continue;
        const actual = porFamilia.get(d.apoderadoId) ?? { destinatario: d, llegadas: [] };
        actual.llegadas.push(llegada);
        porFamilia.set(d.apoderadoId, actual);
      }
    }
    for (const { destinatario, llegadas: lista } of porFamilia.values()) {
      const filas = await encolarParaDestinatario(tdb, destinatario, {
        tenantId: colegio.id,
        tipo: "resumen_llegadas",
        plantilla: "resumen_llegadas",
        payload: { colegio: colegio.nombre, llegadas: lista, fecha: isoFecha },
      });
      creados += filas;
    }
  }
  return creados;
}
