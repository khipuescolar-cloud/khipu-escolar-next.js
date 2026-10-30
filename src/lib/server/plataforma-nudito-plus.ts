import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { EstadoLicenciaNudito, OrigenLicenciaNudito } from "@/generated/prisma/enums";
import { esFechaIso, fechaCorta, fechaDb, fechaLima, isoDeFechaDb, sumarDias } from "@/lib/fechas";
import {
  calcularActivacion, CLAVES_NUDITO_PLUS, extenderHasta, formatoMonto, leerLimites, MESES_MAXIMOS, normalizarDominio, textoMeses,
} from "@/lib/nudito-plus";
import { ErrorDeNegocio } from "./contexto-accion";
import { db } from "./db";
import { avisarFamiliaNudito, consentimientoActual, datosYape, limitesNudito, marcarLicenciasVencidas, precioNudito } from "./nudito-plus/licencias";
import type { AdminContext } from "./plataforma";
import { registrarPlataforma } from "./plataforma-registro";
import { validarEntrada } from "./plataforma-responsables";

// Nudito+ en el panel de plataforma (specs/28): el equipo Khipu verifica pagos de Yape y administra licencias,
// configuración y la lista blanca de sitios. Usa el cliente `db` global con `tenantId` explícito.
// NUNCA lee conversaciones (`NuditoConversacion`/`NuditoMensaje`). Todo queda en `auditoria_plataforma`.

const uuid = (v: string) => {
  if (!z.uuid().safeParse(v).success) notFound();
  return v;
};
const motivo = z.string().trim().min(5, "Escribe el motivo (mínimo 5 letras).").max(300, "El motivo es demasiado largo.");
const nombreDe = (p: { nombres: string; apellidos: string }) => `${p.nombres} ${p.apellidos}`.trim();
const agregarNota = (previa: string | null, linea: string) => (previa ? `${previa}\n${linea}` : linea);

// ───────────── Resumen y cola de pagos ─────────────

export type PagoPendiente = {
  id: string;
  colegio: { id: string; nombre: string; plan: string };
  alumno: { id: string; nombre: string; salon: string };
  apoderado: { nombre: string; email: string } | null;
  monto: number;
  esperado: number;
  meses: number;
  referencia: string | null;
  fechaPago: string;
  reportadoAt: Date;
};

export async function pagosPendientes(admin: AdminContext): Promise<PagoPendiente[]> {
  void admin;
  const [pagos, precio] = await Promise.all([
    db.pagoNudito.findMany({
      where: { estado: "pendiente" },
      orderBy: { createdAt: "asc" },
      include: {
        tenant: { select: { id: true, nombre: true, plan: true } },
        alumno: { select: { id: true, nombres: true, apellidos: true, salon: { select: { nombre: true } } } },
        apoderado: { select: { user: { select: { nombres: true, apellidos: true, email: true } } } },
      },
    }),
    precioNudito(),
  ]);
  return pagos.map((p) => ({
    id: p.id,
    colegio: p.tenant,
    alumno: { id: p.alumno.id, nombre: nombreDe(p.alumno), salon: p.alumno.salon.nombre },
    apoderado: p.apoderado ? { nombre: nombreDe(p.apoderado.user), email: p.apoderado.user.email } : null,
    monto: Number(p.monto.toString()),
    esperado: Math.round(precio.montoMensual * p.meses * 100) / 100,
    meses: p.meses,
    referencia: p.referencia,
    fechaPago: isoDeFechaDb(p.fechaPago),
    reportadoAt: p.createdAt,
  }));
}

export type ResumenColegioNudito = { tenantId: string; nombre: string; plan: string; vigentes: number; pendientes: number; vencidas: number; ingresos: number };

/** Indicadores y resumen por colegio (solo colegios con alguna licencia o pago, más los Pro). */
export async function resumenNuditoPlus(admin: AdminContext, hoy: string = fechaLima(new Date())) {
  void admin;
  await marcarLicenciasVencidas(hoy);
  const inicioMes = fechaDb(`${hoy.slice(0, 7)}-01`);
  const [tenants, vigentes, vencidas, pendientes, ingresos, porVencer, ingresosMes] = await Promise.all([
    db.tenant.findMany({ select: { id: true, nombre: true, plan: true }, orderBy: { nombre: "asc" } }),
    db.licenciaNudito.groupBy({ by: ["tenantId"], where: { estado: "activa", desde: { lte: fechaDb(hoy) }, hasta: { gte: fechaDb(hoy) } }, _count: { _all: true } }),
    db.licenciaNudito.groupBy({ by: ["tenantId"], where: { estado: "vencida" }, _count: { _all: true } }),
    db.pagoNudito.groupBy({ by: ["tenantId"], where: { estado: "pendiente" }, _count: { _all: true } }),
    db.pagoNudito.groupBy({ by: ["tenantId"], where: { estado: "verificado" }, _sum: { monto: true } }),
    db.licenciaNudito.count({ where: { estado: "activa", hasta: { gte: fechaDb(hoy), lte: fechaDb(sumarDias(hoy, 7)) } } }),
    db.pagoNudito.aggregate({ where: { estado: "verificado", verificadoAt: { gte: inicioMes } }, _sum: { monto: true } }),
  ]);
  const cuenta = (filas: { tenantId: string; _count: { _all: number } }[]) => new Map(filas.map((f) => [f.tenantId, f._count._all]));
  const [mV, mVe, mP] = [cuenta(vigentes), cuenta(vencidas), cuenta(pendientes)];
  const mI = new Map(ingresos.map((f) => [f.tenantId, Number(f._sum.monto?.toString() ?? 0)]));
  const colegios: ResumenColegioNudito[] = tenants
    .map((t) => ({ tenantId: t.id, nombre: t.nombre, plan: t.plan, vigentes: mV.get(t.id) ?? 0, pendientes: mP.get(t.id) ?? 0, vencidas: mVe.get(t.id) ?? 0, ingresos: mI.get(t.id) ?? 0 }))
    .filter((c) => c.plan === "pro" || c.vigentes + c.pendientes + c.vencidas > 0);
  return {
    colegios,
    totales: {
      vigentes: colegios.reduce((s, c) => s + c.vigentes, 0),
      pendientes: colegios.reduce((s, c) => s + c.pendientes, 0),
      porVencer,
      ingresosMes: Number(ingresosMes._sum.monto?.toString() ?? 0),
    },
  };
}

/**
 * Verifica un pago pendiente: crea la licencia (desde hoy, N meses) o extiende la activa N meses, enlaza el pago,
 * audita y avisa a la familia. Solo colegios Khipu Pro.
 */
export async function verificarPago(admin: AdminContext, pagoId: string, hoy: string = fechaLima(new Date())): Promise<{ licenciaId: string; hasta: string; extendida: boolean }> {
  uuid(pagoId);
  const pago = await db.pagoNudito.findUnique({ where: { id: pagoId }, include: { tenant: { select: { plan: true } }, alumno: { select: { estado: true } } } });
  if (!pago) notFound();
  if (pago.estado !== "pendiente") throw new ErrorDeNegocio("Este pago ya fue revisado.");
  if (pago.tenant.plan !== "pro") throw new ErrorDeNegocio("El colegio ya no tiene Khipu Pro: no se puede activar Nudito+.");
  await marcarLicenciasVencidas(hoy, pago.tenantId);

  const resultado = await db.$transaction(async (tx) => {
    // Reserva atómica: si otro miembro del equipo lo revisó a la vez, no se duplica la licencia.
    const reservado = await tx.pagoNudito.updateMany({
      where: { id: pago.id, estado: "pendiente" },
      data: { estado: "verificado", registradoPorId: admin.user.id, verificadoAt: new Date() },
    });
    if (reservado.count === 0) throw new ErrorDeNegocio("Este pago ya fue revisado.");
    const activa = await tx.licenciaNudito.findFirst({
      where: { tenantId: pago.tenantId, alumnoId: pago.alumnoId, estado: "activa", hasta: { gte: fechaDb(hoy) } },
      orderBy: { hasta: "desc" },
    });
    const calculo = calcularActivacion(activa ? { hasta: isoDeFechaDb(activa.hasta) } : null, hoy, pago.meses);
    const nota = `[${hoy}] Pago verificado: ${textoMeses(pago.meses)} (${pago.referencia ?? "sin n.° de operación"})`;
    const licencia =
      calculo.tipo === "extender" && activa
        ? await tx.licenciaNudito.update({ where: { id: activa.id }, data: { hasta: fechaDb(calculo.hasta), notas: agregarNota(activa.notas, nota) } })
        : await tx.licenciaNudito.create({
            data: {
              tenantId: pago.tenantId, alumnoId: pago.alumnoId, estado: "activa", origen: "pago",
              desde: fechaDb(hoy), hasta: fechaDb(calculo.hasta), registradaPorId: admin.user.id, notas: nota,
            },
          });
    await tx.pagoNudito.update({ where: { id: pago.id }, data: { licenciaId: licencia.id } });
    return { licenciaId: licencia.id, hasta: calculo.hasta, extendida: calculo.tipo === "extender" };
  });

  await registrarPlataforma(admin.user.id, "nudito_pago_verificar", pago.tenantId, {
    pagoId: pago.id, alumnoId: pago.alumnoId, licenciaId: resultado.licenciaId, meses: pago.meses, monto: Number(pago.monto.toString()),
    hasta: resultado.hasta, extendida: resultado.extendida,
  });
  await avisarFamiliaNudito(pago.tenantId, pago.alumnoId, {
    titulo: (alumno) => `Nudito+ está activo para ${alumno}`,
    parrafos: [
      `Confirmamos tu pago. Puede usar Nudito+ hasta el ${fechaCorta(resultado.hasta)}.`,
      "Si aún no lo hiciste, entra a Nudito+ y acepta la autorización para que pueda empezar.",
    ],
    referenciaId: `nudito-pago:${pago.id}`,
  });
  return resultado;
}

/** Rechaza un pago pendiente con un motivo que verá la familia que lo reportó. */
export async function rechazarPago(admin: AdminContext, pagoId: string, motivoTexto: string): Promise<void> {
  uuid(pagoId);
  const m = validarEntrada(motivo, motivoTexto);
  const pago = await db.pagoNudito.findUnique({ where: { id: pagoId } });
  if (!pago) notFound();
  const r = await db.pagoNudito.updateMany({
    where: { id: pago.id, estado: "pendiente" },
    data: { estado: "rechazado", registradoPorId: admin.user.id, verificadoAt: new Date(), notas: m },
  });
  if (r.count === 0) throw new ErrorDeNegocio("Este pago ya fue revisado.");
  await registrarPlataforma(admin.user.id, "nudito_pago_rechazar", pago.tenantId, { pagoId: pago.id, alumnoId: pago.alumnoId, motivo: m });
  await avisarFamiliaNudito(pago.tenantId, pago.alumnoId, {
    titulo: () => "No pudimos confirmar tu pago de Nudito+",
    parrafos: [`Motivo: ${m}`, "Revisa los datos de tu Yape y vuelve a reportarlo desde la sección Nudito+."],
    referenciaId: `nudito-pago:${pago.id}`,
    soloApoderadoId: pago.apoderadoId,
  });
}

// ───────────── Licencias ─────────────

export const esquemaFiltroLicencias = z.object({
  colegio: z.uuid().optional().catch(undefined),
  estado: z.enum(["activa", "vencida", "cancelada"]).optional().catch(undefined),
  vence: z.literal("7").optional().catch(undefined),
});
export type FiltroLicencias = z.infer<typeof esquemaFiltroLicencias>;

export type FilaLicencia = {
  id: string;
  colegio: { id: string; nombre: string };
  alumno: { nombre: string; salon: string };
  estado: EstadoLicenciaNudito;
  origen: OrigenLicenciaNudito;
  desde: string;
  hasta: string;
  notas: string | null;
  pagos: number;
};

export async function listarLicencias(admin: AdminContext, filtro: FiltroLicencias = {}, hoy: string = fechaLima(new Date())): Promise<FilaLicencia[]> {
  void admin;
  await marcarLicenciasVencidas(hoy);
  const filas = await db.licenciaNudito.findMany({
    where: {
      ...(filtro.colegio ? { tenantId: filtro.colegio } : {}),
      ...(filtro.estado ? { estado: filtro.estado } : {}),
      ...(filtro.vence ? { estado: "activa" as const, hasta: { gte: fechaDb(hoy), lte: fechaDb(sumarDias(hoy, 7)) } } : {}),
    },
    orderBy: [{ hasta: "asc" }],
    take: 500,
    include: {
      tenant: { select: { id: true, nombre: true } },
      alumno: { select: { nombres: true, apellidos: true, salon: { select: { nombre: true } } } },
      _count: { select: { pagos: true } },
    },
  });
  return filas.map((l) => ({
    id: l.id, colegio: l.tenant, alumno: { nombre: nombreDe(l.alumno), salon: l.alumno.salon.nombre }, estado: l.estado, origen: l.origen,
    desde: isoDeFechaDb(l.desde), hasta: isoDeFechaDb(l.hasta), notas: l.notas, pagos: l._count.pagos,
  }));
}

/** Colegios Khipu Pro (selector de licencias de cortesía o prueba). */
export async function colegiosPro(admin: AdminContext) {
  void admin;
  return db.tenant.findMany({ where: { plan: "pro" }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } });
}

export async function colegiosConLicencias(admin: AdminContext) {
  void admin;
  return db.tenant.findMany({ where: { OR: [{ plan: "pro" }, { licenciasNudito: { some: {} } }] }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } });
}

/** Alumnos activos de un colegio Pro para elegir a quién dar la licencia manual. */
export async function alumnosDelColegio(admin: AdminContext, tenantId: string) {
  void admin;
  uuid(tenantId);
  return db.alumno.findMany({
    where: { tenantId, estado: "activo", tenant: { plan: "pro" } },
    select: { id: true, nombres: true, apellidos: true, salon: { select: { nombre: true } } },
    orderBy: [{ salon: { nombre: "asc" } }, { apellidos: "asc" }],
  });
}

const esquemaLicenciaManual = z.object({
  tenantId: z.uuid("Elige el colegio."),
  alumnoId: z.uuid("Elige el alumno."),
  origen: z.enum(["cortesia", "prueba"], "Elige el tipo de licencia."),
  hasta: z.string().refine((v) => esFechaIso(v), "Elige hasta qué día."),
  motivo,
});
export type EntradaLicenciaManual = z.input<typeof esquemaLicenciaManual>;

/** Licencia de cortesía o prueba (sin pago), desde hoy hasta la fecha elegida (máximo un año). */
export async function crearLicenciaManual(admin: AdminContext, entrada: EntradaLicenciaManual, hoy: string = fechaLima(new Date())): Promise<string> {
  const d = validarEntrada(esquemaLicenciaManual, entrada);
  if (d.hasta < hoy) throw new ErrorDeNegocio("La fecha final no puede ser anterior a hoy.");
  if (d.hasta > sumarDias(hoy, 366)) throw new ErrorDeNegocio("Máximo un año desde hoy.");
  const alumno = await db.alumno.findFirst({ where: { id: d.alumnoId, tenantId: d.tenantId, estado: "activo" }, select: { id: true, tenant: { select: { plan: true } } } });
  if (!alumno) throw new ErrorDeNegocio("Ese alumno no está activo en el colegio elegido.");
  if (alumno.tenant.plan !== "pro") throw new ErrorDeNegocio("Nudito+ solo está disponible en colegios con Khipu Pro.");
  await marcarLicenciasVencidas(hoy, d.tenantId);
  const activa = await db.licenciaNudito.count({ where: { tenantId: d.tenantId, alumnoId: d.alumnoId, estado: "activa" } });
  if (activa > 0) throw new ErrorDeNegocio("El alumno ya tiene una licencia activa. Extiéndela desde la lista.");
  const l = await db.licenciaNudito.create({
    data: {
      tenantId: d.tenantId, alumnoId: d.alumnoId, estado: "activa", origen: d.origen, desde: fechaDb(hoy), hasta: fechaDb(d.hasta),
      registradaPorId: admin.user.id, notas: `[${hoy}] ${d.origen === "cortesia" ? "Cortesía" : "Prueba"}: ${d.motivo}`,
    },
  });
  await registrarPlataforma(admin.user.id, "nudito_licencia_crear", d.tenantId, { licenciaId: l.id, alumnoId: d.alumnoId, origen: d.origen, hasta: d.hasta, motivo: d.motivo });
  return l.id;
}

export async function cancelarLicencia(admin: AdminContext, licenciaId: string, motivoTexto: string, hoy: string = fechaLima(new Date())): Promise<void> {
  uuid(licenciaId);
  const m = validarEntrada(motivo, motivoTexto);
  const l = await db.licenciaNudito.findUnique({ where: { id: licenciaId } });
  if (!l) notFound();
  if (l.estado === "cancelada") throw new ErrorDeNegocio("La licencia ya estaba cancelada.");
  await db.licenciaNudito.update({ where: { id: l.id }, data: { estado: "cancelada", notas: agregarNota(l.notas, `[${hoy}] Cancelada: ${m}`) } });
  await registrarPlataforma(admin.user.id, "nudito_licencia_cancelar", l.tenantId, { licenciaId: l.id, alumnoId: l.alumnoId, estadoAnterior: l.estado, motivo: m });
}

const esquemaExtender = z.object({ meses: z.coerce.number("Elige cuántos meses.").int().min(1).max(MESES_MAXIMOS, "Máximo 12 meses."), motivo });

/** Extiende N meses una licencia activa (o reactiva una vencida desde hoy). */
export async function extenderLicencia(admin: AdminContext, licenciaId: string, entrada: z.input<typeof esquemaExtender>, hoy: string = fechaLima(new Date())): Promise<string> {
  uuid(licenciaId);
  const d = validarEntrada(esquemaExtender, entrada);
  const l = await db.licenciaNudito.findUnique({ where: { id: licenciaId }, include: { tenant: { select: { plan: true } } } });
  if (!l) notFound();
  if (l.estado === "cancelada") throw new ErrorDeNegocio("No se puede extender una licencia cancelada.");
  if (l.tenant.plan !== "pro") throw new ErrorDeNegocio("Nudito+ solo está disponible en colegios con Khipu Pro.");
  const hastaActual = isoDeFechaDb(l.hasta);
  // Vencida: el nuevo periodo empieza hoy (no se cobran los días sin uso).
  const vigente = hastaActual >= hoy;
  if (!vigente) {
    const otra = await db.licenciaNudito.count({ where: { tenantId: l.tenantId, alumnoId: l.alumnoId, estado: "activa", hasta: { gte: fechaDb(hoy) }, id: { not: l.id } } });
    if (otra > 0) throw new ErrorDeNegocio("El alumno ya tiene otra licencia activa: extiende esa.");
  }
  const hasta = vigente ? extenderHasta(hastaActual, d.meses) : calcularActivacion(null, hoy, d.meses).hasta;
  await db.licenciaNudito.update({
    where: { id: l.id },
    data: { estado: "activa", hasta: fechaDb(hasta), ...(vigente ? {} : { desde: fechaDb(hoy) }), notas: agregarNota(l.notas, `[${hoy}] Extendida ${textoMeses(d.meses)}: ${d.motivo}`) },
  });
  await registrarPlataforma(admin.user.id, "nudito_licencia_extender", l.tenantId, { licenciaId: l.id, alumnoId: l.alumnoId, meses: d.meses, hastaAnterior: hastaActual, hasta, motivo: d.motivo });
  return hasta;
}

// ───────────── Configuración ─────────────

export async function configNuditoPlus(admin: AdminContext) {
  void admin;
  const [precio, yape, consentimiento, limites] = await Promise.all([precioNudito(), datosYape(), consentimientoActual(), limitesNudito()]);
  return { precio, yape, consentimiento, limites };
}

async function guardarClave(clave: string, valor: object) {
  await db.configPlataforma.upsert({ where: { clave }, update: { valor }, create: { clave, valor } });
}

const esquemaPrecioYape = z.object({
  montoMensual: z.coerce.number("Escribe el precio mensual.").refine((n) => Number.isFinite(n) && n > 0 && n <= 1000, "El precio debe ser mayor que 0 y hasta S/ 1000.").transform((n) => Math.round(n * 100) / 100),
  numero: z.string().trim().regex(/^[0-9 ]{9,15}$/, "Escribe el número de Yape (9 dígitos)."),
  titular: z.string().trim().min(3, "Escribe el titular de la cuenta.").max(80),
});

export async function guardarPrecioYape(admin: AdminContext, entrada: z.input<typeof esquemaPrecioYape>): Promise<void> {
  const d = validarEntrada(esquemaPrecioYape, entrada);
  const antes = await precioNudito();
  await guardarClave(CLAVES_NUDITO_PLUS.precio, { montoMensual: d.montoMensual, moneda: "PEN" });
  await guardarClave(CLAVES_NUDITO_PLUS.yape, { numero: d.numero, titular: d.titular });
  await registrarPlataforma(admin.user.id, "nudito_config_precio_yape", null, { precioAnterior: formatoMonto(antes.montoMensual), precio: formatoMonto(d.montoMensual), numero: d.numero, titular: d.titular });
}

const esquemaConsentimiento = z.object({
  version: z.string().trim().min(1, "Escribe la versión del texto.").max(40),
  texto: z.string().trim().min(50, "El texto es demasiado corto.").max(8000),
});

/** Publica el texto de consentimiento. Si cambia la versión, todas las familias deben volver a aceptar. */
export async function guardarConsentimientoTexto(admin: AdminContext, entrada: z.input<typeof esquemaConsentimiento>): Promise<{ nuevaVersion: boolean }> {
  const d = validarEntrada(esquemaConsentimiento, entrada);
  const antes = await consentimientoActual();
  await guardarClave(CLAVES_NUDITO_PLUS.consentimiento, d);
  await registrarPlataforma(admin.user.id, "nudito_config_consentimiento", null, { versionAnterior: antes.version, version: d.version });
  return { nuevaVersion: antes.version !== d.version };
}

const esquemaLimites = z.object({
  mensajesPorMes: z.coerce.number("Escribe los mensajes por mes.").int("Usa un número entero.").min(1).max(100_000),
  tokensPorMes: z.coerce.number("Escribe los tokens por mes.").int("Usa un número entero.").min(1000).max(100_000_000),
  costoMaxUsdPorMes: z.coerce.number("Escribe el costo máximo.").min(0.01, "El costo máximo debe ser mayor que 0.").max(1000),
});

export async function guardarLimites(admin: AdminContext, entrada: z.input<typeof esquemaLimites>): Promise<void> {
  const d = validarEntrada(esquemaLimites, entrada);
  const antes = leerLimites((await db.configPlataforma.findUnique({ where: { clave: CLAVES_NUDITO_PLUS.limites } }))?.valor);
  await guardarClave(CLAVES_NUDITO_PLUS.limites, d);
  await registrarPlataforma(admin.user.id, "nudito_config_limites", null, { antes, despues: d });
}

// ───────────── Sitios permitidos ─────────────

export async function listarSitios(admin: AdminContext) {
  void admin;
  return db.sitioPermitido.findMany({ orderBy: [{ activo: "desc" }, { dominio: "asc" }] });
}

const esquemaSitio = z.object({
  dominio: z.string().trim().min(1, "Escribe el dominio.").transform((v, c) => {
    const d = normalizarDominio(v);
    if (!d) {
      c.addIssue({ code: "custom", message: "Ese dominio no es válido (p. ej. perueduca.pe)." });
      return z.NEVER;
    }
    return d;
  }),
  nombre: z.string().trim().min(2, "Escribe el nombre del sitio.").max(80),
  descripcion: z.string().trim().max(300).optional().nullable().transform((v) => v || null),
});

export async function agregarSitio(admin: AdminContext, entrada: z.input<typeof esquemaSitio>): Promise<string> {
  const d = validarEntrada(esquemaSitio, entrada);
  if (await db.sitioPermitido.findUnique({ where: { dominio: d.dominio } })) throw new ErrorDeNegocio(`«${d.dominio}» ya está en la lista.`);
  const s = await db.sitioPermitido.create({ data: { ...d, creadoPorId: admin.user.id } });
  await registrarPlataforma(admin.user.id, "nudito_sitio_agregar", null, { sitioId: s.id, dominio: s.dominio });
  return s.dominio;
}

export async function editarSitio(admin: AdminContext, id: string, entrada: z.input<typeof esquemaSitio>): Promise<void> {
  uuid(id);
  const d = validarEntrada(esquemaSitio, entrada);
  const s = await db.sitioPermitido.findUnique({ where: { id } });
  if (!s) notFound();
  const otro = await db.sitioPermitido.findUnique({ where: { dominio: d.dominio } });
  if (otro && otro.id !== id) throw new ErrorDeNegocio(`«${d.dominio}» ya está en la lista.`);
  await db.sitioPermitido.update({ where: { id }, data: d });
  await registrarPlataforma(admin.user.id, "nudito_sitio_editar", null, { sitioId: id, antes: s.dominio, dominio: d.dominio });
}

export async function cambiarActivoSitio(admin: AdminContext, id: string, activo: boolean): Promise<void> {
  uuid(id);
  const s = await db.sitioPermitido.findUnique({ where: { id } });
  if (!s) notFound();
  await db.sitioPermitido.update({ where: { id }, data: { activo } });
  await registrarPlataforma(admin.user.id, "nudito_sitio_activo", null, { sitioId: id, dominio: s.dominio, activo });
}

export async function quitarSitio(admin: AdminContext, id: string): Promise<void> {
  uuid(id);
  const s = await db.sitioPermitido.findUnique({ where: { id } });
  if (!s) notFound();
  await db.sitioPermitido.delete({ where: { id } });
  await registrarPlataforma(admin.user.id, "nudito_sitio_quitar", null, { sitioId: id, dominio: s.dominio });
}
