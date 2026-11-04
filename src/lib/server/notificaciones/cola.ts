import "server-only";
import type { Aviso } from "@/generated/prisma/client";
import type { CanalAviso } from "@/generated/prisma/enums";
import { urlColegio, urlRaiz } from "@/lib/dominio";
import { db } from "../db";
import { PlantillaInvalidaError, renderizarPlantilla } from "../email/plantillas";
import { urlLogoColegioCorreo } from "../logo";
import { tokenDerivado } from "../tokens";
import { EmailChannel } from "./email";
import { cupoDiario, esperaReintentoMs, leerLimites, MAX_INTENTOS, pausaEntreCorreosMs } from "./limites";
import { PushChannel } from "./push";
import { EnvioPermanenteError, type NotificationChannel } from "./tipos";

// Worker de la cola `avisos` (specs/06). Lo llama /api/cron/avisos (cron) y after() tras guardar asistencia.
// - Respeta EMAIL_DAILY_LIMIT en una ventana móvil de 24 h (global) y EMAIL_RATE_PER_SECOND.
// - Cada fila se reserva pasándola de `pendiente` a `enviando` con un UPDATE condicionado (atómico en Postgres):
//   si dos workers corren a la vez, solo uno la obtiene. Las filas que quedan en `enviando` más de
//   ENVIANDO_MAX_MINUTOS (worker caído a la mitad) vuelven a `pendiente` y cuentan como un intento.
// - Canales: solo correo y push (WhatsApp y SMS se retiraron el 2026-10-31). Un canal sin configurar deja la fila en `omitido`.
// - 1 intento + 3 reintentos con espera creciente; después, `error`.
// - Vacía la cola por lotes (no solo 100 filas): sigue mientras haya pendientes, cupo y presupuesto de tiempo.
//   Con tenantId, un solo worker por colegio a la vez (los demás se retiran si ven filas `enviando` recientes).
//   El ritmo real es EMAIL_RATE_PER_SECOND por colegio: configúralo con la cuota real del proveedor (SES: 14/s).

export const ENVIANDO_MAX_MINUTOS = 10;
/** Tiempo máximo que un llamado sigue vaciando la cola (after() y el cron corren dentro de la función: 300 s en Vercel con Fluid). */
export const PRESUPUESTO_MS = 240_000;
/** Duración objetivo de un lote al ritmo configurado (lote = LOTE_SEGUNDOS × EMAIL_RATE_PER_SECOND, máx. maxAvisos). */
const LOTE_SEGUNDOS = 60;
/** Filas `enviando` más recientes que esto indican un worker vivo en el colegio (lote ≈ 60 s + margen). */
const ACTIVO_SEGUNDOS = 120;
/** Plantillas dirigidas a familias: llevan enlace para ajustar avisos (solo si la fila es de un apoderado). */
const PLANTILLAS_FAMILIA = new Set([
  "asistencia_llego", "asistencia_no_llega", "asistencia_tarde", "asistencia_falta", "asistencia_problema",
  "mensaje_nuevo", "comunicado", "justificacion_revisada", "tarea_nueva", "tarea_actualizada", "libreta_publicada", "informe_progreso", "evaluacion_programada", "documento_nuevo",
  "nota_corregida", "recuperacion_registrada",
  "reunion_convocada", "reunion_recordatorio", "reunion_cancelada", "reunion_acta",
]);

export type ResumenCola = {
  enviados: number; reintentos: number; errores: number; omitidos: number; diferidos: number;
  /** Filas recuperadas de `enviando` (worker caído). */
  recuperados: number;
};

export type OpcionesCola = {
  ahora?: Date;
  /** Limita el procesamiento a un colegio (tests y after() del guardado). */
  tenantId?: string;
  /** Tamaño máximo de cada lote (por defecto 100; además cada lote dura ~60 s al ritmo configurado). */
  maxAvisos?: number;
  /** Tiempo máximo del llamado en ms (por defecto PRESUPUESTO_MS). */
  presupuestoMs?: number;
  canales?: Partial<Record<CanalAviso, NotificationChannel>>;
  esperar?: (ms: number) => Promise<void>;
  limites?: { limiteDiario: number; porSegundo: number };
};

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type DatosColegio = { nombre: string; slug: string; logoUrl: string | null };

/** Completa el payload con lo que no se guarda en la BD (enlace de justificar) y el enlace de preferencias. */
function prepararPayload(aviso: Aviso, colegio: DatosColegio): Record<string, unknown> {
  const payload = { ...((aviso.payload ?? {}) as Record<string, unknown>) };
  if (!payload.colegio) payload.colegio = colegio.nombre;
  if (colegio.logoUrl && !payload.logoColegioUrl) payload.logoColegioUrl = colegio.logoUrl;
  if (aviso.plantilla === "asistencia_falta" && typeof payload.justificacionTokenId === "string" && !payload.urlJustificar) {
    payload.urlJustificar = urlRaiz(`/justificar/${tokenDerivado("justificar", payload.justificacionTokenId)}`);
  }
  if (PLANTILLAS_FAMILIA.has(aviso.plantilla) && aviso.apoderadoId && !payload.urlPreferencias) {
    payload.urlPreferencias = urlColegio(colegio.slug, "/asistencia#avisos");
  }
  return payload;
}

/**
 * Procesa la cola por lotes hasta vaciarla, agotar el cupo diario o el presupuesto de tiempo.
 * Un solo worker por colegio a la vez: si otro worker del mismo colegio tiene filas en `enviando` reservadas hace poco,
 * este se retira y el otro, que vuelve a buscar pendientes tras cada lote, sigue con lo que quede. Así el ritmo
 * EMAIL_RATE_PER_SECOND se respeta aunque 40 profesores guarden su lista a la vez (antes eran 40 workers × ritmo)
 * y ningún aviso queda huérfano porque su worker perdió la carrera por el lote (docs/pruebas-de-estres.md).
 * Lo que no alcance a salir dentro del presupuesto de tiempo lo sigue el próximo llamado (otro after() o el cron).
 * Devuelve cuántos avisos envió, reintentó, falló o difirió por el tope diario.
 */
export async function procesarCola(opciones: OpcionesCola = {}): Promise<ResumenCola> {
  const ahora = opciones.ahora ?? new Date();
  const esperar = opciones.esperar ?? dormir;
  const { limiteDiario, porSegundo } = opciones.limites ?? leerLimites();
  const canales: Partial<Record<CanalAviso, NotificationChannel>> = opciones.canales ?? {
    correo: new EmailChannel(),
    push: new PushChannel(),
  };
  const resumen: ResumenCola = { enviados: 0, reintentos: 0, errores: 0, omitidos: 0, diferidos: 0, recuperados: 0 };
  // Lotes de ~1 minuto de envío: un worker vivo siempre tiene filas `enviando` recientes (ver otroWorkerActivo).
  const tamLote = Math.max(1, Math.min(opciones.maxAvisos ?? 100, Math.ceil(LOTE_SEGUNDOS * porSegundo)));
  const vence = Date.now() + (opciones.presupuestoMs ?? PRESUPUESTO_MS);
  /** Filas que este llamado devolvió a `pendiente` para reintentar: no se reintentan en el mismo llamado. */
  const reintentadas: string[] = [];
  const colegios = new Map<string, DatosColegio>();

  resumen.recuperados = await recuperarAtascados(ahora, opciones.tenantId);
  /** Inicio del último envío de correo: la pausa descuenta lo que ya tardó (envío + BD), para acercarse al ritmo pedido. */
  let ultimoCorreo: number | null = null;

  for (let vuelta = 0; vuelta === 0 || Date.now() < vence; vuelta++) {
    if (opciones.tenantId && (await otroWorkerActivo(opciones.tenantId))) break;
    const candidatos = await db.aviso.findMany({
      where: {
        estado: "pendiente",
        // Sin `ahora` explícito se usa la hora de cada lote: así entran los avisos encolados mientras este worker
        // enviaba (sus propios after() se retiraron al verlo activo).
        programadoPara: { lte: opciones.ahora ?? new Date() },
        ...(opciones.tenantId ? { tenantId: opciones.tenantId } : {}),
        ...(reintentadas.length ? { id: { notIn: reintentadas } } : {}),
      },
      orderBy: { programadoPara: "asc" },
      take: tamLote,
      select: { id: true, canal: true },
    });
    if (candidatos.length === 0) break;

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
    const reservados = await reservar(elegidos, opciones.tenantId);
    // Nada que enviar (sin cupo) u otro worker se llevó el lote: termina; ese worker sigue con el resto.
    if (reservados.length === 0) break;

    for (const aviso of reservados) {
      let colegio = colegios.get(aviso.tenantId);
      if (!colegio) {
        const t = await db.tenant.findUniqueOrThrow({ where: { id: aviso.tenantId }, select: { id: true, nombre: true, slug: true, logoArchivoId: true } });
        colegio = { nombre: t.nombre, slug: t.slug, logoUrl: await urlLogoColegioCorreo(t) };
        colegios.set(aviso.tenantId, colegio);
      }

      const canal = canales[aviso.canal];
      try {
        if (!canal) throw new EnvioPermanenteError(`Canal no disponible: ${aviso.canal}`);
        if (aviso.canal === "correo") {
          if (ultimoCorreo !== null) {
            const falta = pausaEntreCorreosMs(porSegundo) - (Date.now() - ultimoCorreo);
            if (falta > 0) await esperar(falta);
          }
          ultimoCorreo = Date.now();
        }
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
          reintentadas.push(aviso.id);
          resumen.reintentos++;
        }
      }
    }
  }
  return resumen;
}

/**
 * true si otro worker procesa ahora este colegio: hay filas `enviando` reservadas hace menos de ACTIVO_SEGUNDOS
 * (al reservar, `programadoPara` guarda la hora de la reserva). Las de un worker caído dejan de contar pronto
 * y `recuperarAtascados` las devuelve a la cola a los ENVIANDO_MAX_MINUTOS.
 */
async function otroWorkerActivo(tenantId: string): Promise<boolean> {
  const n = await db.aviso.count({
    where: { tenantId, estado: "enviando", programadoPara: { gt: new Date(Date.now() - ACTIVO_SEGUNDOS * 1000) } },
  });
  return n > 0;
}

/**
 * Reserva las filas pasándolas de `pendiente` a `enviando` en una sola sentencia. Postgres bloquea cada fila
 * y vuelve a evaluar `estado = 'pendiente'` si otro worker la cambió: cada fila la obtiene un solo worker.
 * Con `tenantId`, la misma sentencia comprueba que ningún otro worker del colegio esté enviando (ver otroWorkerActivo):
 * dos workers que pasaron la comprobación previa a la vez no se reparten el lote salvo que reserven en el mismo instante.
 * Devuelve solo las filas reservadas por esta llamada, en orden de programación.
 */
async function reservar(ids: string[], tenantId?: string): Promise<Aviso[]> {
  if (ids.length === 0) return [];
  const filas = tenantId
    ? await db.$queryRaw<{ id: string }[]>`
      UPDATE avisos SET estado = 'enviando'::"EstadoAviso", programado_para = now()
      WHERE id = ANY(${ids}::uuid[]) AND estado = 'pendiente'::"EstadoAviso"
        AND NOT EXISTS (
          SELECT 1 FROM avisos o WHERE o.tenant_id = ${tenantId}::uuid AND o.estado = 'enviando'::"EstadoAviso"
            AND o.programado_para > now() - make_interval(secs => ${ACTIVO_SEGUNDOS}))
      RETURNING id`
    : await db.$queryRaw<{ id: string }[]>`
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
