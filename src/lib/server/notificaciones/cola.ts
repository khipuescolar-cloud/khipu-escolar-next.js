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
// - Cada fila se «reserva» moviendo programadoPara (lease), así dos workers no envían la misma.
// - 1 intento + 3 reintentos con espera creciente; después, `error`.

const LEASE_MS = 10 * 60_000;
/** Plantillas dirigidas a familias: llevan enlace para ajustar avisos. */
const PLANTILLAS_FAMILIA = new Set([
  "asistencia_llego", "asistencia_tarde", "asistencia_falta", "asistencia_problema",
  "resumen_llegadas", "mensaje_nuevo", "comunicado", "justificacion_revisada",
]);

export type ResumenCola = { enviados: number; reintentos: number; errores: number; omitidos: number; diferidos: number; resumenes: number };

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
  if (PLANTILLAS_FAMILIA.has(aviso.plantilla) && !payload.urlPreferencias) {
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
  const resumen: ResumenCola = { enviados: 0, reintentos: 0, errores: 0, omitidos: 0, diferidos: 0, resumenes: 0 };

  resumen.resumenes = await generarResumenesLlegadas({ ahora, tenantId: opciones.tenantId });

  const pendientes = await db.aviso.findMany({
    where: { estado: "pendiente", programadoPara: { lte: ahora }, ...(opciones.tenantId ? { tenantId: opciones.tenantId } : {}) },
    orderBy: { programadoPara: "asc" },
    take: opciones.maxAvisos ?? 100,
  });
  if (pendientes.length === 0) return resumen;

  // Tope global: correos enviados en las últimas 24 h, de todos los colegios.
  const enviados24h = await db.aviso.count({
    where: { canal: "correo", enviadoAt: { gte: new Date(ahora.getTime() - 86_400_000) } },
  });
  let cupo = cupoDiario(enviados24h, limiteDiario);
  const colegios = new Map<string, DatosColegio>();
  let correosEnviados = 0;

  for (const aviso of pendientes) {
    if (aviso.canal === "correo" && cupo <= 0) {
      resumen.diferidos++; // queda pendiente para cuando se libere la ventana de 24 h
      continue;
    }
    // Reserva (lease): si otro worker la tomó, count = 0.
    const reservado = await db.aviso.updateMany({
      where: { id: aviso.id, estado: "pendiente", programadoPara: { lte: ahora } },
      data: { programadoPara: new Date(Date.now() + LEASE_MS) },
    });
    if (reservado.count === 0) continue;

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
      if (aviso.canal === "correo") {
        cupo--;
        correosEnviados++;
      }
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
