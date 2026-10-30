import "server-only";
import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import { esFechaIso, fechaDb, fechaLima, isoDeFechaDb, sumarDias } from "@/lib/fechas";
import { estadoParaFamilia, MESES_MAXIMOS, mesDe, type EstadoFamilia } from "@/lib/nudito-plus";
import { auditar } from "../auditoria";
import { ErrorDeNegocio } from "../contexto-accion";
import { db } from "../db";
import { requireFeature } from "../plan";
import { requireAlumnoVisible, requireRol, type TenantContext } from "../tenant";
import { consentimientoActual, consentimientoVigente, datosYape, licenciaVigente, limitesNudito, marcarLicenciasVencidas, precioNudito } from "./licencias";

// Nudito+ para la familia (specs/28): estado de la licencia de cada hijo, reporte de pago con Yape,
// consentimiento de IA y reportes (uso, resúmenes, alertas). Nunca las conversaciones.

/** Solo apoderados de colegios Khipu Pro con el módulo activo. Aunque el panel agregue el módulo a un colegio Base, no se vende. */
export function requireNuditoPlus(ctx: TenantContext): void {
  requireRol(ctx, ["apoderado"]);
  requireFeature(ctx, "nuditoPlus");
  if (ctx.tenant.plan !== "pro") forbidden();
}

async function requireHijo(ctx: TenantContext, alumnoId: string) {
  requireNuditoPlus(ctx);
  if (!z.uuid().safeParse(alumnoId).success) notFound();
  await requireAlumnoVisible(ctx, alumnoId);
  const alumno = await ctx.db.alumno.findFirst({ where: { id: alumnoId }, select: { id: true, nombres: true, apellidos: true, estado: true, salon: { select: { nombre: true } } } });
  if (!alumno) notFound();
  return alumno;
}

export type ResumenHijo = {
  id: string;
  nombres: string;
  apellidos: string;
  salon: string;
  activo: boolean;
  estado: EstadoFamilia;
  consentimiento: { vigente: boolean; mio: boolean };
};

async function estadoDeAlumnos(ctx: TenantContext, alumnoIds: string[], hoy: string) {
  const [licencias, pendientes] = await Promise.all([
    ctx.db.licenciaNudito.findMany({ where: { alumnoId: { in: alumnoIds } }, select: { alumnoId: true, estado: true, desde: true, hasta: true } }),
    ctx.db.pagoNudito.findMany({ where: { alumnoId: { in: alumnoIds }, estado: "pendiente" }, select: { alumnoId: true } }),
  ]);
  const conPendiente = new Set(pendientes.map((p) => p.alumnoId));
  return new Map(
    alumnoIds.map((id) => [
      id,
      estadoParaFamilia(
        licencias.filter((l) => l.alumnoId === id).map((l) => ({ estado: l.estado, desde: isoDeFechaDb(l.desde), hasta: isoDeFechaDb(l.hasta) })),
        conPendiente.has(id),
        hoy,
      ),
    ]),
  );
}

/** Hijos del apoderado con su estado de Nudito+. Marca vencidas de forma perezosa. */
export async function hijosConNudito(ctx: TenantContext, hoy: string = fechaLima(new Date())): Promise<ResumenHijo[]> {
  requireNuditoPlus(ctx);
  await marcarLicenciasVencidas(hoy, ctx.tenant.id);
  const vinculos = await ctx.db.apoderadoAlumno.findMany({
    where: { apoderadoId: ctx.membership.id },
    select: { alumno: { select: { id: true, nombres: true, apellidos: true, estado: true, salon: { select: { nombre: true } } } } },
    orderBy: { alumno: { nombres: "asc" } },
  });
  const ids = vinculos.map((v) => v.alumno.id);
  const estados = await estadoDeAlumnos(ctx, ids, hoy);
  return Promise.all(
    vinculos.map(async ({ alumno: a }) => {
      const c = await consentimientoVigente(ctx.db, ctx.tenant.id, a.id);
      return {
        id: a.id, nombres: a.nombres, apellidos: a.apellidos, salon: a.salon.nombre, activo: a.estado === "activo",
        estado: estados.get(a.id) ?? { tipo: "sin" as const },
        consentimiento: { vigente: !!c, mio: c?.apoderadoId === ctx.membership.id },
      };
    }),
  );
}

/** Panel de un hijo: licencia, pagos, consentimiento, uso del mes, resúmenes y alertas. */
export async function panelHijo(ctx: TenantContext, alumnoId: string, hoy: string = fechaLima(new Date())) {
  const alumno = await requireHijo(ctx, alumnoId);
  await marcarLicenciasVencidas(hoy, ctx.tenant.id);
  const [estados, vigente, consentimiento, pagos, uso, limites, resumenes, alertas] = await Promise.all([
    estadoDeAlumnos(ctx, [alumnoId], hoy),
    licenciaVigente(ctx.db, ctx.tenant.id, alumnoId, hoy),
    consentimientoVigente(ctx.db, ctx.tenant.id, alumnoId),
    ctx.db.pagoNudito.findMany({ where: { alumnoId }, orderBy: { createdAt: "desc" }, take: 10 }),
    ctx.db.usoNudito.findFirst({ where: { alumnoId, mes: mesDe(hoy) } }),
    limitesNudito(),
    ctx.db.resumenNudito.findMany({ where: { alumnoId }, orderBy: { hasta: "desc" }, take: 10 }),
    ctx.db.alertaNudito.findMany({ where: { alumnoId }, orderBy: { creadaAt: "desc" }, take: 20 }),
  ]);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "nudito_plus", entidadId: alumnoId });
  return {
    alumno: { id: alumno.id, nombres: alumno.nombres, apellidos: alumno.apellidos, salon: alumno.salon.nombre, activo: alumno.estado === "activo" },
    estado: estados.get(alumnoId)!,
    vigente: vigente ? { desde: isoDeFechaDb(vigente.desde), hasta: isoDeFechaDb(vigente.hasta), origen: vigente.origen } : null,
    consentimiento: consentimiento ? { version: consentimiento.versionTexto, aceptadoAt: consentimiento.aceptadoAt, mio: consentimiento.apoderadoId === ctx.membership.id } : null,
    pagos: pagos.map((p) => ({
      id: p.id, monto: Number(p.monto.toString()), moneda: p.moneda, meses: p.meses, referencia: p.referencia, fechaPago: isoDeFechaDb(p.fechaPago),
      estado: p.estado, motivo: p.estado === "rechazado" ? p.notas : null, mio: p.apoderadoId === ctx.membership.id,
    })),
    uso: { mensajes: uso?.mensajes ?? 0, limite: limites.mensajesPorMes },
    resumenes: resumenes.map((r) => ({ id: r.id, desde: isoDeFechaDb(r.desde), hasta: isoDeFechaDb(r.hasta), texto: r.texto, temas: temasDe(r.temas) })),
    alertas: alertas.map((a) => ({ id: a.id, tipo: a.tipo, detalle: a.detalle, creadaAt: a.creadaAt, vista: !!a.vistaAt })),
    puedeUsar: !!vigente && !!consentimiento && alumno.estado === "activo",
  };
}

function temasDe(valor: unknown): { area: string; tema: string; mensajes: number }[] {
  const r = z.array(z.object({ area: z.string().default(""), tema: z.string(), mensajes: z.coerce.number().default(0) })).safeParse(valor);
  return r.success ? r.data : [];
}

/** Datos para la pantalla «Activar Nudito+». */
export async function datosParaActivar(ctx: TenantContext, alumnoId: string) {
  const alumno = await requireHijo(ctx, alumnoId);
  const [precio, yape] = await Promise.all([precioNudito(), datosYape()]);
  return { alumno: { id: alumno.id, nombres: alumno.nombres, activo: alumno.estado === "activo" }, precio, yape, hoy: fechaLima(new Date()) };
}

export const esquemaReportePago = z.object({
  referencia: z.string().trim().min(4, "Escribe el número de operación de Yape (mínimo 4 caracteres).").max(40, "El número de operación es demasiado largo."),
  monto: z.coerce.number("Escribe el monto que pagaste.").refine((n) => Number.isFinite(n) && n > 0 && n < 100_000, "Escribe el monto que pagaste.").transform((n) => Math.round(n * 100) / 100),
  fechaPago: z.string().refine((v) => esFechaIso(v), "Elige la fecha del pago."),
  meses: z.coerce.number("Elige cuántos meses.").int().min(1, "Elige entre 1 y 12 meses.").max(MESES_MAXIMOS, "Elige entre 1 y 12 meses."),
});
export type EntradaReportePago = z.input<typeof esquemaReportePago>;

/** La familia reporta un pago hecho por Yape: queda `pendiente` hasta que el equipo Khipu lo verifique. */
export async function reportarPago(ctx: TenantContext, alumnoId: string, entrada: EntradaReportePago, hoy: string = fechaLima(new Date())): Promise<string> {
  const alumno = await requireHijo(ctx, alumnoId);
  if (alumno.estado !== "activo") throw new ErrorDeNegocio("Este alumno ya no está activo en el colegio.");
  const r = esquemaReportePago.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio(r.error.issues[0]?.message ?? "Revisa los datos del pago.");
  const d = r.data;
  if (d.fechaPago > hoy) throw new ErrorDeNegocio("La fecha del pago no puede ser futura.");
  if (d.fechaPago < sumarDias(hoy, -60)) throw new ErrorDeNegocio("Ese pago es de hace más de 60 días. Escríbenos desde el colegio para revisarlo.");
  // El número de operación es único entre los pagos no rechazados (de cualquier colegio): evita reportar dos veces el mismo Yape.
  const repetido = await db.pagoNudito.count({ where: { referencia: d.referencia, estado: { not: "rechazado" } } });
  if (repetido > 0) throw new ErrorDeNegocio("Ese número de operación ya fue reportado.");
  const pendientes = await ctx.db.pagoNudito.count({ where: { alumnoId, estado: "pendiente" } });
  if (pendientes >= 3) throw new ErrorDeNegocio("Ya tienes pagos en revisión para este alumno. Espera a que los revisemos.");
  const pago = await ctx.db.pagoNudito.create({
    data: {
      tenantId: ctx.tenant.id, alumnoId, apoderadoId: ctx.membership.id, monto: d.monto, moneda: "PEN", meses: d.meses,
      metodo: "yape", referencia: d.referencia, fechaPago: fechaDb(d.fechaPago), estado: "pendiente",
    },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "pago_nudito", entidadId: pago.id, detalle: { alumnoId, meses: d.meses, monto: d.monto } });
  return pago.id;
}

/** Texto y versión vigentes del consentimiento, y si este alumno ya lo tiene. */
export async function datosConsentimiento(ctx: TenantContext, alumnoId: string) {
  const alumno = await requireHijo(ctx, alumnoId);
  const [texto, vigente] = await Promise.all([consentimientoActual(), consentimientoVigente(ctx.db, ctx.tenant.id, alumnoId)]);
  return { alumno: { id: alumno.id, nombres: alumno.nombres }, texto, vigente };
}

/** Acepta el consentimiento de IA (versión vigente) para un hijo. Guarda la IP. Idempotente. */
export async function aceptarConsentimientoIa(ctx: TenantContext, alumnoId: string, ip: string | null): Promise<void> {
  await requireHijo(ctx, alumnoId);
  const { version } = await consentimientoActual();
  const ya = await ctx.db.consentimientoIa.findFirst({ where: { alumnoId, apoderadoId: ctx.membership.id, versionTexto: version, revocadoAt: null } });
  if (ya) return;
  const c = await ctx.db.consentimientoIa.create({
    data: { tenantId: ctx.tenant.id, alumnoId, apoderadoId: ctx.membership.id, versionTexto: version, ip: ip?.slice(0, 64) ?? null },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "consentimiento_ia", entidadId: c.id, detalle: { alumnoId, version } });
}

/**
 * Retira la autorización: revoca TODOS los consentimientos vigentes del alumno (también los de otro apoderado),
 * porque cualquier apoderado puede detener el uso de IA de su hijo. Nudito+ deja de funcionar al instante.
 */
export async function revocarConsentimientoIa(ctx: TenantContext, alumnoId: string): Promise<number> {
  await requireHijo(ctx, alumnoId);
  const r = await ctx.db.consentimientoIa.updateMany({ where: { alumnoId, revocadoAt: null }, data: { revocadoAt: new Date() } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "consentimiento_ia", entidadId: alumnoId, detalle: { revocados: r.count } });
  return r.count;
}

/** Marca una alerta como vista (solo de un hijo propio). */
export async function marcarAlertaVista(ctx: TenantContext, alertaId: string): Promise<void> {
  requireNuditoPlus(ctx);
  if (!z.uuid().safeParse(alertaId).success) notFound();
  const alerta = await ctx.db.alertaNudito.findFirst({ where: { id: alertaId }, select: { id: true, alumnoId: true, vistaAt: true } });
  if (!alerta) notFound();
  await requireAlumnoVisible(ctx, alerta.alumnoId);
  if (!alerta.vistaAt) await ctx.db.alertaNudito.update({ where: { id: alerta.id }, data: { vistaAt: new Date() } });
}
