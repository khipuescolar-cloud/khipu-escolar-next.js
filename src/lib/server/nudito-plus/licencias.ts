import "server-only";
import type { ConsentimientoIa, LicenciaNudito, PrismaClient } from "@/generated/prisma/client";
import { urlColegio } from "@/lib/dominio";
import { fechaCorta, fechaDb, fechaLima, isoDeFechaDb, sumarDias } from "@/lib/fechas";
import {
  CLAVES_NUDITO_PLUS, DIAS_RECORDATORIO, leerConsentimiento, leerLimites, leerPrecio, leerYape,
  type ConsentimientoNudito, type LimitesNudito, type PrecioNudito, type YapeNudito,
} from "@/lib/nudito-plus";
import { primerNombre } from "@/lib/nombres";
import { db as dbGlobal, dbTenant, type DbTenant } from "../db";
import { destinatariosDeAlumno, encolarParaDestinatario, tieneCanalAviso } from "../notificaciones/encolar";

// Licencias de Nudito+ (specs/28). CONTRATO con el motor del tutor (specs/29): `licenciaVigente`,
// `consentimientoVigente`, `limitesNudito` y `sitiosPermitidos` mantienen exactamente estas firmas.

/** Cliente global o del colegio: las consultas siempre filtran por `tenantId` explícito. */
type Cliente = PrismaClient | DbTenant;
const comoGlobal = (c: Cliente) => c as unknown as PrismaClient;

/** Licencia vigente del alumno (activa y hoy entre `desde` y `hasta`, hora de Lima), o null. No mira el plan del colegio. */
export async function licenciaVigente(db: Cliente, tenantId: string, alumnoId: string, hoy: string = fechaLima(new Date())): Promise<LicenciaNudito | null> {
  const d = fechaDb(hoy);
  return comoGlobal(db).licenciaNudito.findFirst({
    where: { tenantId, alumnoId, estado: "activa", desde: { lte: d }, hasta: { gte: d } },
    orderBy: { hasta: "desc" },
  });
}

/**
 * Consentimiento de IA vigente para el alumno: no revocado, de la versión de texto actual y dado por un apoderado
 * activo que sigue vinculado al alumno. Si el equipo Khipu publica una versión nueva, la familia vuelve a aceptar.
 */
export async function consentimientoVigente(db: Cliente, tenantId: string, alumnoId: string): Promise<ConsentimientoIa | null> {
  const { version } = await consentimientoActual();
  return comoGlobal(db).consentimientoIa.findFirst({
    where: {
      tenantId, alumnoId, revocadoAt: null, versionTexto: version,
      apoderado: { estado: "activa", hijos: { some: { alumnoId } } },
    },
    orderBy: { aceptadoAt: "desc" },
  });
}

/** Topes por alumno y mes («nudito_plus:limites»; por defecto 300 mensajes, 300 000 tokens y 1,5 USD). */
export async function limitesNudito(): Promise<LimitesNudito> {
  return leerLimites(await leerClave(CLAVES_NUDITO_PLUS.limites));
}

/** Dominios activos de la lista blanca (sin esquema ni «www.»; incluyen sus subdominios). */
export async function sitiosPermitidos(): Promise<string[]> {
  const filas = await dbGlobal.sitioPermitido.findMany({ where: { activo: true }, select: { dominio: true }, orderBy: { dominio: "asc" } });
  return filas.map((f) => f.dominio);
}

// ───────────── Configuración ─────────────

async function leerClave(clave: string): Promise<unknown> {
  return (await dbGlobal.configPlataforma.findUnique({ where: { clave } }))?.valor ?? null;
}

export async function precioNudito(): Promise<PrecioNudito> {
  return leerPrecio(await leerClave(CLAVES_NUDITO_PLUS.precio));
}

/** Número y titular de Yape que ve la familia; null si el equipo aún no los configuró. */
export async function datosYape(): Promise<YapeNudito | null> {
  return leerYape(await leerClave(CLAVES_NUDITO_PLUS.yape));
}

export async function consentimientoActual(): Promise<ConsentimientoNudito> {
  return leerConsentimiento(await leerClave(CLAVES_NUDITO_PLUS.consentimiento));
}

// ───────────── Avisos a la familia ─────────────

/**
 * Encola un aviso `nudito_plus` (TipoAviso.nudito) a las familias del alumno con canal y consentimiento de avisos.
 * `soloApoderadoId` limita el aviso a quien reportó el pago. Devuelve cuántas familias lo recibirán.
 */
export async function avisarFamiliaNudito(
  tenantId: string,
  alumnoId: string,
  aviso: { titulo: (alumno: string) => string; parrafos: string[]; referenciaId: string; soloApoderadoId?: string | null },
): Promise<number> {
  const tdb = dbTenant(tenantId);
  const [tenant, alumno] = await Promise.all([
    dbGlobal.tenant.findUnique({ where: { id: tenantId }, select: { nombre: true, slug: true } }),
    tdb.alumno.findFirst({ where: { id: alumnoId }, select: { nombres: true } }),
  ]);
  if (!tenant || !alumno) return 0;
  const nombre = primerNombre(alumno.nombres);
  let familias = 0;
  for (const d of await destinatariosDeAlumno(tdb, alumnoId)) {
    if (aviso.soloApoderadoId && d.apoderadoId !== aviso.soloApoderadoId) continue;
    if (!tieneCanalAviso(d)) continue;
    await encolarParaDestinatario(tdb, d, {
      tenantId,
      tipo: "nudito",
      plantilla: "nudito_plus",
      referenciaId: aviso.referenciaId,
      payload: { colegio: tenant.nombre, alumno: nombre, titulo: aviso.titulo(nombre), parrafos: aviso.parrafos, url: urlColegio(tenant.slug, `/nudito-plus/${alumnoId}`) },
    });
    familias++;
  }
  return familias;
}

// ───────────── Vencimientos (cron diario y lectura perezosa) ─────────────

/** Pasa a `vencida` las licencias activas cuyo `hasta` ya pasó (hora de Lima). Opcionalmente solo de un colegio. */
export async function marcarLicenciasVencidas(hoy: string = fechaLima(new Date()), tenantId?: string): Promise<number> {
  const r = await dbGlobal.licenciaNudito.updateMany({
    where: { estado: "activa", hasta: { lt: fechaDb(hoy) }, ...(tenantId ? { tenantId } : {}) },
    data: { estado: "vencida" },
  });
  return r.count;
}

/** Referencia del recordatorio: una por licencia y fecha de fin (si se extiende, habrá otro recordatorio). */
export const referenciaRecordatorio = (licenciaId: string, hasta: string) => `nudito-vence:${licenciaId}:${hasta}`;

/**
 * Recuerda a la familia, una sola vez por licencia y `hasta`, que Nudito+ vence en `DIAS_RECORDATORIO` días o menos.
 * Solo licencias de pago y sin otra licencia que la continúe. Devuelve cuántas licencias recordó.
 */
export async function recordarVencimientos(hoy: string = fechaLima(new Date()), tenantId?: string): Promise<number> {
  const porVencer = await dbGlobal.licenciaNudito.findMany({
    where: { ...(tenantId ? { tenantId } : {}), estado: "activa", origen: "pago", hasta: { gte: fechaDb(hoy), lte: fechaDb(sumarDias(hoy, DIAS_RECORDATORIO)) }, tenant: { plan: "pro" } },
    select: { id: true, tenantId: true, alumnoId: true, hasta: true },
  });
  let n = 0;
  for (const l of porVencer) {
    const hasta = isoDeFechaDb(l.hasta);
    const ref = referenciaRecordatorio(l.id, hasta);
    if ((await dbGlobal.aviso.count({ where: { tenantId: l.tenantId, plantilla: "nudito_plus", referenciaId: ref } })) > 0) continue;
    const familias = await avisarFamiliaNudito(l.tenantId, l.alumnoId, {
      titulo: (alumno) => `Nudito+ de ${alumno} vence el ${fechaCorta(hasta)}`,
      parrafos: ["Si quieres que siga usándolo, puedes renovarlo con Yape desde la sección Nudito+.", "Si no renuevas, solo se pausa: no se pierde nada."],
      referenciaId: ref,
    });
    if (familias > 0) n++;
  }
  return n;
}

/** Cron diario (`/api/cron/avisos`): marca vencidas y encola recordatorios. */
export async function procesarVencimientosNudito(hoy: string = fechaLima(new Date())): Promise<{ vencidas: number; recordatorios: number }> {
  const vencidas = await marcarLicenciasVencidas(hoy);
  const recordatorios = await recordarVencimientos(hoy);
  return { vencidas, recordatorios };
}
