import "server-only";
import type { Tenant } from "@/generated/prisma/client";
import { faseControlIngreso, saludoFamilia } from "@/lib/control-ingreso";
import { esDiaHabil } from "@/lib/dias-habiles";
import { fechaDb, hora12, momentoEnZona } from "@/lib/fechas";
import { primerNombre } from "@/lib/nombres";
import { AMBITO_DIA } from "./asistencia";
import { auditarVarios } from "./auditoria";
import { db, dbTenant, type DbTenant } from "./db";
import { modulosDelColegio } from "./modulos";
import { destinatariosPorAlumno, encolarAvisosAsistencia, encolarParaDestinatario, tieneCanalAviso } from "./notificaciones/encolar";
import { conEnvio } from "./notificaciones/envios";
import { feriadosAplicables } from "./plataforma-configuracion";
import { whereSalonActivo } from "./salones-activos";

// Control de ingreso automático (specs/05). Lo corre el cron de avisos cada pocos minutos, para los colegios que lo
// activaron en Configuración y tienen Portería:
// 1. Desde la hora de tardanza (08:00): a las familias de quienes aún no registran ingreso, «aún no llega».
// 2. Desde la hora límite de falta (09:00): falta del día (origen «automatico») y aviso con enlace para justificar.
// Cada paso corre UNA vez por colegio y día (`control_ingreso_dia`, reserva atómica). Si al llegar la hora nadie ha
// registrado ingreso en todo el colegio (portería no abrió, día sin clases), no se hace nada: sería avisar a todas las
// familias por error. Un alumno que llega después de la falta la corrige al escanear (pasa a «tarde» y se avisa).

type TenantControl = Pick<Tenant, "id" | "nombre" | "slug" | "plan" | "zonaHoraria" | "horaLimiteTardanza" | "horaLimiteFalta" | "plazoJustificacionDiasHabiles">;

export type ResumenControlIngreso = { colegios: number; avisosNoLlega: number; faltas: number };

export async function procesarControlIngreso(ahora = new Date()): Promise<ResumenControlIngreso> {
  const resumen: ResumenControlIngreso = { colegios: 0, avisosNoLlega: 0, faltas: 0 };
  const colegios = await db.tenant.findMany({
    where: { controlIngresoAutomatico: true, estado: { in: ["activo", "piloto"] } },
    select: { id: true, nombre: true, slug: true, plan: true, zonaHoraria: true, horaLimiteTardanza: true, horaLimiteFalta: true, plazoJustificacionDiasHabiles: true },
  });
  for (const tenant of colegios) {
    try {
      const r = await controlDelColegio(tenant, ahora);
      if (r) {
        resumen.colegios++;
        resumen.avisosNoLlega += r.avisosNoLlega;
        resumen.faltas += r.faltas;
      }
    } catch (error) {
      // Un colegio con problemas no frena a los demás; el siguiente llamado del cron lo reintenta.
      console.error("[control-ingreso]", tenant.slug, error);
    }
  }
  return resumen;
}

/** Corre el paso que toque en un colegio. Devuelve null si no tocaba nada. */
export async function controlDelColegio(tenant: TenantControl, ahora = new Date()): Promise<{ avisosNoLlega: number; faltas: number } | null> {
  const hoy = momentoEnZona(ahora, tenant.zonaHoraria);
  const fase = faseControlIngreso(hoy.hora, tenant.horaLimiteTardanza, tenant.horaLimiteFalta);
  if (fase === "antes") return null;
  if (!esDiaHabil(hoy.isoFecha, await feriadosAplicables(tenant.id, hoy.isoFecha, hoy.isoFecha))) return null;
  if (!(await modulosDelColegio(tenant)).activos.has("porteria")) return null;

  const tdb = dbTenant(tenant.id);
  const fecha = fechaDb(hoy.isoFecha);
  const ingresosHoy = await tdb.asistencia.count({ where: { fecha, ambito: AMBITO_DIA, estado: { in: ["llego", "tarde"] } } });
  if (ingresosHoy === 0) return null; // portería no abrió o no hay clases: no se avisa a todo el colegio

  const control = await tdb.controlIngresoDia.upsert({
    where: { tenantId_fecha: { tenantId: tenant.id, fecha } },
    create: { tenantId: tenant.id, fecha },
    update: {},
    select: { id: true },
  });
  // Reserva atómica del paso: solo un llamado lo ejecuta aunque corran dos workers a la vez.
  const campo = fase === "falta" ? "faltasAt" : "avisoNoLlegaAt";
  const reservado = await tdb.controlIngresoDia.updateMany({
    where: { id: control.id, [campo]: null, ...(fase === "no_llega" ? { faltasAt: null } : {}) },
    data: { [campo]: ahora },
  });
  if (reservado.count === 0) return null;

  const sinIngreso = await alumnosSinIngreso(tdb, fecha);
  if (fase === "no_llega") {
    const avisos = await avisarNoLlega(tdb, tenant, sinIngreso, hoy.hora);
    await tdb.controlIngresoDia.update({ where: { id: control.id }, data: { avisadosNoLlega: avisos } });
    return { avisosNoLlega: avisos, faltas: 0 };
  }
  const faltas = await ponerFaltas(tdb, tenant, sinIngreso, fecha, hoy.hora);
  await tdb.controlIngresoDia.update({ where: { id: control.id }, data: { faltas } });
  return { avisosNoLlega: 0, faltas };
}

/** Alumnos activos de salones activos sin ningún registro de asistencia del día (ni llegada, ni falta, ni problema). */
async function alumnosSinIngreso(tdb: DbTenant, fecha: Date) {
  return tdb.alumno.findMany({
    where: { estado: "activo", salon: whereSalonActivo, asistencias: { none: { fecha, ambito: AMBITO_DIA } } },
    select: { id: true, nombres: true },
  });
}

/** «Aún no llega» a cada familia con canal de aviso. Devuelve a cuántas familias se avisó. */
async function avisarNoLlega(tdb: DbTenant, tenant: TenantControl, alumnos: { id: string; nombres: string }[], hora: string): Promise<number> {
  const destinatarios = await destinatariosPorAlumno(tdb, alumnos.map((a) => a.id));
  let familias = 0;
  const envio = { tenantId: tenant.id, tipo: "asistencia" as const, titulo: `Aún no llega (${hora12(tenant.horaLimiteTardanza)})` };
  await conEnvio(tdb, envio, async () => {
    for (const a of alumnos) {
      for (const d of destinatarios.get(a.id) ?? []) {
        if (!tieneCanalAviso(d)) continue;
        const filas = await encolarParaDestinatario(tdb, d, {
          tenantId: tenant.id,
          tipo: "asistencia",
          plantilla: "asistencia_no_llega",
          referenciaId: a.id,
          unidad: a.id,
          payload: {
            colegio: tenant.nombre, saludo: saludoFamilia(d.nombre, hora), alumno: primerNombre(a.nombres),
            horaTardanza: tenant.horaLimiteTardanza, horaFalta: tenant.horaLimiteFalta,
          },
        });
        if (filas > 0) familias++;
      }
    }
  });
  return familias;
}

/** Falta del día para cada alumno sin ingreso, con aviso y enlace para justificar. Devuelve cuántas faltas puso. */
async function ponerFaltas(tdb: DbTenant, tenant: TenantControl, alumnos: { id: string; nombres: string }[], fecha: Date, hora: string): Promise<number> {
  if (alumnos.length === 0) return 0;
  // skipDuplicates: si portería registró la llegada entre la consulta y este insert, se respeta la llegada.
  await tdb.asistencia.createMany({
    data: alumnos.map((a) => ({
      tenantId: tenant.id, alumnoId: a.id, cursoId: null, ambito: AMBITO_DIA, fecha, hora: tenant.horaLimiteFalta,
      estado: "falta" as const, origen: "automatico" as const, registradoPorId: null,
    })),
    skipDuplicates: true,
  });
  const creadas = await tdb.asistencia.findMany({
    where: { alumnoId: { in: alumnos.map((a) => a.id) }, fecha, ambito: AMBITO_DIA, origen: "automatico", estado: "falta" },
    select: { id: true, alumnoId: true, fecha: true, estado: true, hora: true, nota: true },
  });
  await auditarVarios(creadas.map((c) => ({
    tenantId: tenant.id, actorId: null, accion: "crear" as const, entidad: "asistencia", entidadId: c.id,
    detalle: { alumnoId: c.alumnoId, ambito: AMBITO_DIA, origen: "automatico", ahora: "falta" },
  })));
  const nombres = new Map(alumnos.map((a) => [a.id, primerNombre(a.nombres)]));
  const destinatarios = await destinatariosPorAlumno(tdb, creadas.map((c) => c.alumnoId));
  const envio = { tenantId: tenant.id, tipo: "asistencia" as const, titulo: `Faltas del día (${hora12(tenant.horaLimiteFalta)})` };
  await conEnvio(tdb, envio, async () => {
    for (const asistencia of creadas) {
      await encolarAvisosAsistencia(tdb, {
        tenant,
        asistencia,
        alumnoNombre: nombres.get(asistencia.alumnoId)!,
        momento: "hoy",
        horaLimiteFalta: tenant.horaLimiteFalta,
        horaAhora: hora,
        destinatarios: destinatarios.get(asistencia.alumnoId) ?? [],
      });
    }
  });
  return creadas.length;
}
