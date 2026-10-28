import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { fechaLima, inicioDiaLima, restarDias } from "@/lib/fechas";
import { db } from "./db";
import { auditar } from "./auditoria";
import { ErrorDeNegocio } from "./contexto-accion";
import { ENVIANDO_MAX_MINUTOS, procesarCola } from "./notificaciones/cola";
import { CANALES_DE_PAGO, leerLimites, limiteCanalDePago } from "./notificaciones/limites";
import type { AdminContext } from "./plataforma";
import { registrarAuditoriaPlataforma } from "./plataforma-auditoria";

// Salud del sistema para el super administrador (specs/21-operacion-de-plataforma.md §Monitoreo).
// Solo conteos y metadatos de avisos: nunca el contenido ni los destinatarios.

// ───────────── Última ejecución de cada cron ─────────────

export const NOMBRES_CRON = ["avisos", "exportaciones"] as const;
export type NombreCron = (typeof NOMBRES_CRON)[number];
export const MINUTOS_CRON_ATRASADO = 10;

export type EjecucionCron = { ultimaEjecucion: string; resultado: "ok" | "error"; duracionMs: number };

/** Guarda la última ejecución en `ConfigPlataforma` (`cron:<nombre>`). Nunca interrumpe al cron. */
export async function registrarEjecucionCron(nombre: NombreCron, resultado: "ok" | "error", duracionMs: number, ahora = new Date()): Promise<void> {
  try {
    const valor: EjecucionCron = { ultimaEjecucion: ahora.toISOString(), resultado, duracionMs: Math.round(duracionMs) };
    await db.configPlataforma.upsert({ where: { clave: `cron:${nombre}` }, create: { clave: `cron:${nombre}`, valor }, update: { valor } });
  } catch (error) {
    console.error("[monitoreo] no se pudo registrar la ejecución del cron", error);
  }
}

export type EstadoCron = "al_dia" | "atrasado" | "nunca";

/** «Al día» si corrió hace menos de 10 minutos; «atrasado» si no; «nunca» sin registro. Puro. */
export function estadoCron(ejecucion: EjecucionCron | null, ahora = new Date()): { estado: EstadoCron; minutos: number | null } {
  if (!ejecucion) return { estado: "nunca", minutos: null };
  const minutos = Math.max(0, Math.floor((ahora.getTime() - new Date(ejecucion.ultimaEjecucion).getTime()) / 60_000));
  return { estado: minutos > MINUTOS_CRON_ATRASADO ? "atrasado" : "al_dia", minutos };
}

function comoEjecucion(valor: Prisma.JsonValue | undefined): EjecucionCron | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const v = valor as Record<string, unknown>;
  if (typeof v.ultimaEjecucion !== "string" || Number.isNaN(Date.parse(v.ultimaEjecucion))) return null;
  return { ultimaEjecucion: v.ultimaEjecucion, resultado: v.resultado === "error" ? "error" : "ok", duracionMs: Number(v.duracionMs) || 0 };
}

// ───────────── Panel ─────────────

export type UsoCanal = { canal: "correo" | "push" | "whatsapp" | "sms"; enviados: number; tope: number | null };

export async function panelMonitoreo(_admin: AdminContext, ahora = new Date()) {
  const hace24h = new Date(ahora.getTime() - 86_400_000);
  const hace7d = new Date(ahora.getTime() - 7 * 86_400_000);
  const limiteAtasco = new Date(ahora.getTime() - ENVIANDO_MAX_MINUTOS * 60_000);
  const hoy = fechaLima(ahora);
  const desde14 = inicioDiaLima(restarDias(hoy, 13));

  const [porCanal, cola, rebotes, exportaciones, accesos, errores, serie, crons, erroresPorTenant] = await Promise.all([
    db.aviso.groupBy({ by: ["canal"], where: { enviadoAt: { gte: hace24h } }, _count: { _all: true } }),
    db.aviso.groupBy({ by: ["estado"], where: { estado: { in: ["pendiente", "enviando", "error"] } }, _count: { _all: true } }),
    db.aviso.groupBy({ by: ["tenantId", "estado"], where: { estado: { in: ["rebotado", "queja"] }, createdAt: { gte: hace7d } }, _count: { _all: true } }),
    db.exportacionColegio.groupBy({ by: ["estado"], where: { estado: { in: ["pendiente", "procesando", "error"] } }, _count: { _all: true } }),
    db.accesoSoporte.count({ where: { cerradoAt: null, expiraAt: { gt: ahora } } }),
    db.aviso.findMany({
      where: { estado: "error" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, tipo: true, canal: true, error: true, createdAt: true, tenant: { select: { id: true, nombre: true } } },
    }),
    db.$queryRaw<{ dia: string; enviados: bigint }[]>`
      SELECT to_char(enviado_at AT TIME ZONE 'America/Lima', 'YYYY-MM-DD') AS dia, count(*) AS enviados
      FROM avisos
      WHERE enviado_at >= ${desde14}
      GROUP BY 1`,
    db.configPlataforma.findMany({ where: { clave: { in: NOMBRES_CRON.map((n) => `cron:${n}`) } } }),
    db.aviso.groupBy({ by: ["tenantId"], where: { estado: "error" }, _count: { _all: true } }),
  ]);

  const enviados = (c: string) => porCanal.find((x) => x.canal === c)?._count._all ?? 0;
  const limites = leerLimites();
  const usoCanales: UsoCanal[] = [
    { canal: "correo", enviados: enviados("correo"), tope: limites.limiteDiario },
    { canal: "push", enviados: enviados("push"), tope: null },
    ...CANALES_DE_PAGO.map((c) => ({ canal: c, enviados: enviados(c), tope: limiteCanalDePago(c) })),
  ];

  const idsColegio = [...new Set([...rebotes.map((r) => r.tenantId), ...erroresPorTenant.map((r) => r.tenantId)])];
  const nColegio = idsColegio.length ? await db.tenant.findMany({ where: { id: { in: idsColegio } }, select: { id: true, nombre: true } }) : [];
  const porColegio = new Map<string, { tenantId: string; colegio: string; rebotes: number; quejas: number }>();
  for (const r of rebotes) {
    const f = porColegio.get(r.tenantId) ?? { tenantId: r.tenantId, colegio: nColegio.find((t) => t.id === r.tenantId)?.nombre ?? "Colegio", rebotes: 0, quejas: 0 };
    if (r.estado === "rebotado") f.rebotes += r._count._all;
    else f.quejas += r._count._all;
    porColegio.set(r.tenantId, f);
  }

  const n = (estado: string) => cola.find((c) => c.estado === estado)?._count._all ?? 0;
  const atascados = await db.aviso.count({ where: { estado: "enviando", programadoPara: { lt: limiteAtasco } } });
  const ne = (estado: string) => exportaciones.find((c) => c.estado === estado)?._count._all ?? 0;

  return {
    usoCanales,
    cola: { pendientes: n("pendiente"), enviando: n("enviando"), errores: n("error"), atascados },
    erroresPorColegio: erroresPorTenant
      .map((e) => ({ tenantId: e.tenantId, colegio: nColegio.find((t) => t.id === e.tenantId)?.nombre ?? "Colegio", avisos: e._count._all }))
      .sort((a, b) => b.avisos - a.avisos),
    rebotesPorColegio: [...porColegio.values()].sort((a, b) => b.rebotes + b.quejas - (a.rebotes + a.quejas)),
    exportaciones: { pendientes: ne("pendiente") + ne("procesando"), errores: ne("error") },
    accesosSoporte: accesos,
    errores: errores.map((e) => ({
      id: e.id, tipo: e.tipo, canal: e.canal, fecha: e.createdAt, colegioId: e.tenant.id, colegio: e.tenant.nombre,
      error: (e.error ?? "Sin detalle").slice(0, 200),
    })),
    serie: Array.from({ length: 14 }, (_, i) => {
      const fecha = restarDias(hoy, 13 - i);
      return { fecha, enviados: Number(serie.find((s) => s.dia === fecha)?.enviados ?? 0) };
    }),
    crons: NOMBRES_CRON.map((nombre) => {
      const ejecucion = comoEjecucion(crons.find((c) => c.clave === `cron:${nombre}`)?.valor);
      return { nombre, ejecucion, ...estadoCron(ejecucion, ahora) };
    }),
  };
}

// ───────────── Acciones ─────────────

/** Vuelve a `pendiente` los avisos con error de un colegio. Los rebotes y quejas son otro estado y no se tocan. */
export async function reintentarAvisosConError(admin: AdminContext, tenantId: string, ahora = new Date()): Promise<number> {
  const colegio = await db.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!colegio) throw new ErrorDeNegocio("No se encontró el colegio.");
  const { count } = await db.aviso.updateMany({
    where: { tenantId, estado: "error" },
    data: { estado: "pendiente", intentos: 0, error: null, programadoPara: ahora },
  });
  await registrarAuditoriaPlataforma(admin, "avisos_reintentar", tenantId, { avisos: count });
  await auditar({ tenantId, actorId: admin.user.id, accion: "enviar", entidad: "aviso", detalle: { reintento: count, origen: "plataforma" } });
  return count;
}

/** Procesa la cola ahora (como el cron). */
export async function procesarColaAhora(admin: AdminContext) {
  const resumen = await procesarCola();
  await registrarAuditoriaPlataforma(admin, "cola_procesar", null, { ...resumen });
  return resumen;
}
