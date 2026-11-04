import "server-only";
import type { Tenant } from "@/generated/prisma/client";
import type { CalificacionLiteral, MarcaNota, TipoCambioNota } from "@/generated/prisma/enums";
import { textoValor, type Escala, type ValorCalificacion } from "@/lib/calificaciones";
import { urlColegio } from "@/lib/dominio";
import { isoDeFechaDb } from "@/lib/fechas";
import { primerNombre } from "@/lib/nombres";
import { cubreDiaCompleto, cubreHora } from "@/lib/permisos-asistencia";
import { expiracionJustificacion, normalizarPlazoDias } from "@/lib/plazo-justificacion";
import { auditar } from "./auditoria";
import { db, dbTenant, type DbTenant } from "./db";
import { registrarEventoCorreccion } from "./eventos-academicos";
import { destinatariosDeAlumno, encolarAviso, encolarParaDestinatario, tieneCanalAviso } from "./notificaciones/encolar";

// NSP, plazo de justificación, consecuencia por vencimiento y recuperación académica (specs/37).
//
// - NSP («No se presentó») es un ESTADO, no una nota: `notas.marca = nsp` sin valor. Nunca se guarda como 0 ni entra en
//   cálculos. Lo pone Khipu cuando el alumno faltó a la clase del día de una actividad (falta a clase, falta del día sin
//   registro de la clase, o falta a clase creada por una incidencia).
// - Si la asistencia cambia después, el NSP se agrega o se quita (con historial). Una calificación ya puesta nunca se
//   pisa: queda como conflicto visible para el profesor.
// - Al vencer el plazo (días calendario) sin justificación pendiente ni aprobada, Khipu aplica la consecuencia que
//   configuró el colegio; si no hay, no inventa un valor y lo cuenta como pendiente de configuración.

export type TenantNsp = Pick<
  Tenant,
  "id" | "nombre" | "slug" | "zonaHoraria" | "plazoJustificacionDias" | "escalaCalificacion" | "consecuenciaVencimientoLiteral" | "consecuenciaVencimientoNumerica"
>;

export type MotivoAusencia = "falta_clase" | "falta_dia" | "incidencia";

export const TEXTO_AUSENCIA: Record<MotivoAusencia, string> = {
  falta_clase: "faltó a la clase",
  falta_dia: "no asistió al colegio",
  incidencia: "no estuvo en la clase por una incidencia",
};

const num = (d: { toString(): string } | null | undefined): number | null => (d === null || d === undefined ? null : Number(d.toString()));

/** Texto del valor de una nota para el historial («A», «14,5», «NSP», «NE»; null = sin nota). */
export function textoDeNota(n: { valorLiteral: string | null; valorNumerico: { toString(): string } | number | null; marca?: MarcaNota | null } | null): string | null {
  if (!n) return null;
  const valor = { valorLiteral: n.valorLiteral as ValorCalificacion["valorLiteral"], valorNumerico: typeof n.valorNumerico === "number" ? n.valorNumerico : num(n.valorNumerico) };
  if (valor.valorLiteral === null && valor.valorNumerico === null && !n.marca) return null;
  return textoValor({ ...valor, marca: n.marca ?? null });
}

/**
 * ¿Faltó cada alumno a la clase de `cursoId` el día `fecha`? Manda el registro de la clase (si el profesor pasó lista
 * del curso: «No llegó» = ausente, cualquier otro = presente); sin registro de la clase, la falta del día (no vino al
 * colegio). Entrar al colegio no prueba presencia en todas las clases: una incidencia crea faltas a clase.
 * Una falta cubierta por un permiso de asistencia vigente (specs/04) no cuenta: los permisos autorizados no se
 * convierten en NSP. El de día completo cubre la falta del día y las faltas a clase; uno por horas, solo las faltas a
 * clase registradas dentro de esas horas. Las faltas por incidencia no las cubre un permiso (retiro: pendiente, specs/37).
 */
export async function ausenciasEnCurso(tdb: DbTenant, cursoId: string, fecha: Date, alumnoIds: string[]): Promise<Map<string, MotivoAusencia>> {
  return (await ausenciasYPermisos(tdb, cursoId, fecha, alumnoIds)).ausencias;
}

/** Como `ausenciasEnCurso`, y además los alumnos cuya falta quedó cubierta por un permiso (para el texto del historial). */
async function ausenciasYPermisos(tdb: DbTenant, cursoId: string, fecha: Date, alumnoIds: string[]) {
  const ausencias = new Map<string, MotivoAusencia>();
  const conPermiso = new Set<string>();
  if (alumnoIds.length === 0) return { ausencias, conPermiso };
  const [registros, permisos] = await Promise.all([
    tdb.asistencia.findMany({
      where: { alumnoId: { in: alumnoIds }, fecha, ambito: { in: [cursoId, "dia"] } },
      select: { alumnoId: true, ambito: true, estado: true, origen: true, hora: true },
    }),
    tdb.permisoAsistencia.findMany({
      where: { alumnoId: { in: alumnoIds }, anuladoAt: null, desde: { lte: fecha }, hasta: { gte: fecha } },
      select: { alumnoId: true, todoElDia: true, horaDesde: true, horaHasta: true },
    }),
  ]);
  const iso = isoDeFechaDb(fecha);
  const cubre = (alumnoId: string, hora: string | null) =>
    permisos.some((p) => p.alumnoId === alumnoId && (hora === null ? cubreDiaCompleto({ ...p, desde: iso, hasta: iso }, iso) : cubreHora({ ...p, desde: iso, hasta: iso }, iso, hora)));
  for (const alumnoId of alumnoIds) {
    const propios = registros.filter((r) => r.alumnoId === alumnoId);
    const clase = propios.find((r) => r.ambito === cursoId);
    let motivo: MotivoAusencia | null = null;
    let hora: string | null = null;
    if (clase) {
      if (clase.estado === "falta") {
        motivo = clase.origen === "incidencia" ? "incidencia" : "falta_clase";
        hora = clase.hora;
      }
    } else if (propios.find((r) => r.ambito === "dia")?.estado === "falta") {
      motivo = "falta_dia";
    }
    if (!motivo) continue;
    if (motivo !== "incidencia" && cubre(alumnoId, hora)) {
      conPermiso.add(alumnoId);
      continue;
    }
    ausencias.set(alumnoId, motivo);
  }
  return { ausencias, conPermiso };
}

type CambioHistorial = {
  tenantId: string; evaluacionId: string; alumnoId: string; anterior: string | null; nuevo: string | null;
  tipo: TipoCambioNota; motivo?: string | null; cambiadoPorId: string | null; publicada: boolean; justificacionId?: string | null; campo?: string;
};

const datosHistorial = (c: CambioHistorial) => ({
  tenantId: c.tenantId, evaluacionId: c.evaluacionId, alumnoId: c.alumnoId, valorAnterior: c.anterior, valorNuevo: c.nuevo,
  tipo: c.tipo, motivo: c.motivo ?? null, cambiadoPorId: c.cambiadoPorId, publicada: c.publicada,
  justificacionId: c.justificacionId ?? null, campo: c.campo ?? "valor",
});

export type ResumenSincronizacion = { creados: number; quitados: number; notaIds: string[]; alumnosConNsp: string[] };

/**
 * Pone o quita los NSP de las actividades indicadas según la asistencia. Idempotente: correrlo dos veces no cambia nada.
 * Filtros: `evaluacionIds` (al crear o mover una actividad) o `fecha` + `alumnoIds` (al cambiar la asistencia).
 * - Ausente y sin nota → NSP (historial tipo `cambio_asistencia`, actor Khipu).
 * - Presente (o falta cubierta por un permiso, specs/04) y con un NSP sin valor → se quita (la asistencia se corrigió).
 * - Ausente con calificación, o NSP con consecuencia aplicada → no se toca (el profesor ve el conflicto).
 * Después aplica el vencimiento a los NSP nuevos cuyo plazo ya pasó (actividad registrada tarde).
 */
export async function sincronizarNsp(
  tdb: DbTenant, tenant: TenantNsp,
  filtro: { evaluacionIds: string[] } | { fecha: Date; alumnoIds: string[] },
  ahora = new Date(),
): Promise<ResumenSincronizacion> {
  const porEvaluacion = "evaluacionIds" in filtro;
  if (porEvaluacion ? filtro.evaluacionIds.length === 0 : filtro.alumnoIds.length === 0) return { creados: 0, quitados: 0, notaIds: [], alumnosConNsp: [] };
  const salonesDeAlumnos = porEvaluacion
    ? null
    : await tdb.alumno.findMany({ where: { id: { in: filtro.alumnoIds } }, select: { id: true, salonId: true } });
  const evaluaciones = await tdb.evaluacion.findMany({
    where: porEvaluacion
      ? { id: { in: filtro.evaluacionIds } }
      : { fecha: filtro.fecha, curso: { salonId: { in: [...new Set(salonesDeAlumnos!.map((a) => a.salonId))] } } },
    select: { id: true, cursoId: true, fecha: true, estado: true, curso: { select: { salonId: true } } },
  });
  const resumen: ResumenSincronizacion = { creados: 0, quitados: 0, notaIds: [], alumnosConNsp: [] };
  for (const e of evaluaciones) {
    const alumnoIds = porEvaluacion
      ? (await tdb.alumno.findMany({ where: { salonId: e.curso.salonId, estado: "activo" }, select: { id: true } })).map((a) => a.id)
      : salonesDeAlumnos!.filter((a) => a.salonId === e.curso.salonId).map((a) => a.id);
    if (alumnoIds.length === 0) continue;
    const [{ ausencias, conPermiso }, notas] = await Promise.all([
      ausenciasYPermisos(tdb, e.cursoId, e.fecha, alumnoIds),
      tdb.nota.findMany({ where: { evaluacionId: e.id, alumnoId: { in: alumnoIds } } }),
    ]);
    const publicada = e.estado === "publicada";
    for (const alumnoId of alumnoIds) {
      const nota = notas.find((n) => n.alumnoId === alumnoId);
      const motivo = ausencias.get(alumnoId);
      if (motivo && !nota) {
        const creada = await tdb.$transaction(async (tx) => {
          const n = await tx.nota.create({ data: { tenantId: tenant.id, evaluacionId: e.id, alumnoId, marca: "nsp", registradoPorId: null } });
          await tx.historialNota.create({
            data: datosHistorial({
              tenantId: tenant.id, evaluacionId: e.id, alumnoId, anterior: null, nuevo: "NSP", tipo: "cambio_asistencia",
              motivo: `Inasistencia registrada: ${TEXTO_AUSENCIA[motivo]}.`, cambiadoPorId: null, publicada,
            }),
          });
          return n;
        }).catch((error: unknown) => {
          // Otra sincronización simultánea ya lo creó (única por evaluación + alumno).
          if ((error as { code?: string }).code === "P2002") return null;
          throw error;
        });
        if (creada) {
          resumen.creados += 1;
          resumen.notaIds.push(creada.id);
          if (!resumen.alumnosConNsp.includes(alumnoId)) resumen.alumnosConNsp.push(alumnoId);
        }
      } else if (!motivo && nota?.marca === "nsp" && nota.valorLiteral === null && nota.valorNumerico === null && !nota.vencidaAt) {
        const quitado = await tdb.$transaction(async (tx) => {
          const r = await tx.nota.deleteMany({ where: { id: nota.id, marca: "nsp", valorLiteral: null, valorNumerico: null, vencidaAt: null } });
          if (r.count === 1) {
            await tx.historialNota.create({
              data: datosHistorial({
                tenantId: tenant.id, evaluacionId: e.id, alumnoId, anterior: "NSP", nuevo: null, tipo: "cambio_asistencia",
                motivo: conPermiso.has(alumnoId)
                  ? "La falta está cubierta por un permiso de asistencia autorizado."
                  : "Se corrigió la asistencia: el alumno estuvo en la clase.",
                cambiadoPorId: null, publicada,
                justificacionId: nota.justificacionId,
              }),
            });
          }
          return r.count;
        });
        resumen.quitados += quitado;
      }
    }
  }
  if (resumen.creados + resumen.quitados > 0) {
    await auditar({ tenantId: tenant.id, actorId: null, accion: "editar", entidad: "nsp", detalle: { creados: resumen.creados, quitados: resumen.quitados } });
  }
  if (resumen.notaIds.length > 0) {
    // Actividad registrada tarde (su fecha ya superó el plazo): vincula la justificación aprobada o aplica la consecuencia.
    await aplicarVencimientos(tdb, tenant, { notaIds: resumen.notaIds }, ahora);
  }
  return resumen;
}

/** Valor de la consecuencia configurada por el colegio para su escala, o null si no está configurada. */
export function consecuenciaDelColegio(t: Pick<TenantNsp, "escalaCalificacion" | "consecuenciaVencimientoLiteral" | "consecuenciaVencimientoNumerica">): ValorCalificacion | null {
  if (t.escalaCalificacion === "literal") {
    return t.consecuenciaVencimientoLiteral ? { valorLiteral: t.consecuenciaVencimientoLiteral, valorNumerico: null } : null;
  }
  const n = num(t.consecuenciaVencimientoNumerica);
  return n === null ? null : { valorLiteral: null, valorNumerico: n };
}

/** Estado de la justificación de la falta de un alumno en una fecha (cualquier registro de ese día; specs/37). */
export async function justificacionDelDia(tdb: DbTenant, alumnoId: string, fecha: Date) {
  const js = await tdb.justificacion.findMany({
    where: { asistencia: { alumnoId, fecha } },
    orderBy: { createdAt: "desc" },
    select: { id: true, estado: true, createdAt: true, revisadoAt: true },
  });
  return js.find((j) => j.estado === "aceptada") ?? js.find((j) => j.estado === "pendiente") ?? js[0] ?? null;
}

export type ResumenVencimientos = { aplicadas: number; sinConfigurar: number; vinculadas: number };

/**
 * Aplica la consecuencia por vencimiento a los NSP cuyo plazo (días calendario desde la actividad) ya pasó y que no
 * tienen justificación pendiente ni aprobada. Idempotente y seguro con ejecuciones simultáneas: el cambio es un
 * `updateMany` condicionado dentro de una transacción con su historial, así que solo una ejecución lo aplica.
 * Una justificación pendiente detiene la consecuencia aunque el tutor la revise después del plazo.
 */
export async function aplicarVencimientos(
  tdb: DbTenant, tenant: TenantNsp, filtro: { notaIds?: string[]; alumnoId?: string } = {}, ahora = new Date(),
): Promise<ResumenVencimientos> {
  const resumen: ResumenVencimientos = { aplicadas: 0, sinConfigurar: 0, vinculadas: 0 };
  const candidatas = await tdb.nota.findMany({
    where: {
      marca: "nsp", valorLiteral: null, valorNumerico: null, vencidaAt: null, justificacionId: null,
      ...(filtro.notaIds ? { id: { in: filtro.notaIds } } : {}),
      ...(filtro.alumnoId ? { alumnoId: filtro.alumnoId } : {}),
    },
    select: {
      id: true, alumnoId: true, evaluacionId: true,
      alumno: { select: { nombres: true } },
      evaluacion: { select: { fecha: true, estado: true, titulo: true, grupoId: true, curso: { select: { nombre: true } } } },
    },
    take: 2000,
  });
  const plazo = normalizarPlazoDias(tenant.plazoJustificacionDias);
  const consecuencia = consecuenciaDelColegio(tenant);
  for (const n of candidatas) {
    const fecha = isoDeFechaDb(n.evaluacion.fecha);
    if (expiracionJustificacion(fecha, plazo, tenant.zonaHoraria) >= ahora) continue;
    const j = await justificacionDelDia(tdb, n.alumnoId, n.evaluacion.fecha);
    if (j?.estado === "pendiente") continue;
    if (j?.estado === "aceptada") {
      // Aprobada antes de que existiera el NSP (actividad registrada tarde): se vincula, no hay consecuencia.
      const r = await tdb.nota.updateMany({ where: { id: n.id, justificacionId: null }, data: { justificacionId: j.id } });
      resumen.vinculadas += r.count;
      continue;
    }
    if (!consecuencia) {
      resumen.sinConfigurar += 1;
      continue;
    }
    const publicada = n.evaluacion.estado === "publicada";
    const nuevo = textoValor(consecuencia);
    const aplicada = await tdb.$transaction(async (tx) => {
      const r = await tx.nota.updateMany({
        where: { id: n.id, marca: "nsp", valorLiteral: null, valorNumerico: null, vencidaAt: null, justificacionId: null },
        data: { valorLiteral: consecuencia.valorLiteral as CalificacionLiteral | null, valorNumerico: consecuencia.valorNumerico, vencidaAt: ahora },
      });
      if (r.count !== 1) return false;
      await tx.historialNota.create({
        data: datosHistorial({
          tenantId: tenant.id, evaluacionId: n.evaluacionId, alumnoId: n.alumnoId, anterior: "NSP", nuevo, tipo: "consecuencia_vencimiento",
          motivo: `Venció el plazo de ${plazo} días calendario sin justificación${j?.estado === "rechazada" ? " aprobada (la presentada fue rechazada)" : ""}. Política del colegio: ${nuevo}.`,
          cambiadoPorId: null, publicada, justificacionId: j?.id ?? null,
        }),
      });
      if (publicada) await registrarEventoCorreccion(tx, { tenantId: tenant.id, grupoId: n.evaluacion.grupoId, alumnoId: n.alumnoId, creadoPorId: null });
      return true;
    });
    if (!aplicada) continue;
    resumen.aplicadas += 1;
    await auditar({
      tenantId: tenant.id, actorId: null, accion: "editar", entidad: "nota", entidadId: n.evaluacionId,
      detalle: { alumnoId: n.alumnoId, consecuenciaVencimiento: nuevo, plazoDias: plazo },
    });
    if (publicada) {
      await avisarCambioNota(tdb, tenant, {
        alumnoId: n.alumnoId, alumno: primerNombre(n.alumno.nombres), curso: n.evaluacion.curso.nombre, titulo: n.evaluacion.titulo,
        evaluacionId: n.evaluacionId, motivo: "consecuencia_vencimiento",
      });
    }
  }
  return resumen;
}

/**
 * Cron (specs/37): aplica los vencimientos de todos los colegios activos. Devuelve el total aplicado y cuántos NSP
 * vencidos esperan que el colegio configure su consecuencia.
 */
export async function procesarVencimientosNsp(ahora = new Date()): Promise<ResumenVencimientos> {
  const tenants = await db.tenant.findMany({
    where: { estado: { not: "suspendido" }, notas: { some: { marca: "nsp", vencidaAt: null, justificacionId: null, valorLiteral: null, valorNumerico: null } } },
    select: {
      id: true, nombre: true, slug: true, zonaHoraria: true, plazoJustificacionDias: true, escalaCalificacion: true,
      consecuenciaVencimientoLiteral: true, consecuenciaVencimientoNumerica: true,
    },
  });
  const total: ResumenVencimientos = { aplicadas: 0, sinConfigurar: 0, vinculadas: 0 };
  for (const t of tenants) {
    try {
      const r = await aplicarVencimientos(dbTenant(t.id), t, {}, ahora);
      total.aplicadas += r.aplicadas;
      total.sinConfigurar += r.sinConfigurar;
      total.vinculadas += r.vinculadas;
    } catch (error) {
      // Un colegio con error no detiene a los demás; el próximo cron reintenta (todo es idempotente).
      console.error("[nsp] vencimientos de", t.slug, error);
    }
  }
  return total;
}

/** NSP con plazo vencido que esperan la configuración de la consecuencia (alerta de dirección). */
export async function nspVencidosSinConsecuencia(tdb: DbTenant, tenant: TenantNsp, ahora = new Date()): Promise<number> {
  if (consecuenciaDelColegio(tenant)) return 0;
  const notas = await tdb.nota.findMany({
    where: { marca: "nsp", valorLiteral: null, valorNumerico: null, vencidaAt: null, justificacionId: null },
    select: { alumnoId: true, evaluacion: { select: { fecha: true } } },
    take: 2000,
  });
  let n = 0;
  for (const x of notas) {
    if (expiracionJustificacion(isoDeFechaDb(x.evaluacion.fecha), tenant.plazoJustificacionDias, tenant.zonaHoraria) >= ahora) continue;
    const j = await justificacionDelDia(tdb, x.alumnoId, x.evaluacion.fecha);
    if (j?.estado !== "pendiente" && j?.estado !== "aceptada") n += 1;
  }
  return n;
}

/**
 * Justificación aprobada (specs/37): vincula los NSP de esa fecha (todas las actividades y cursos del día) y avisa solo
 * a los profesores de esas actividades. No cambia ninguna nota ni autoriza la recuperación: eso lo decide el profesor.
 */
export async function alAprobarJustificacion(tdb: DbTenant, tenant: TenantNsp, justificacionId: string): Promise<{ actividades: number; docentes: number }> {
  const j = await tdb.justificacion.findFirst({
    where: { id: justificacionId, estado: "aceptada" },
    select: { id: true, asistencia: { select: { alumnoId: true, fecha: true, alumno: { select: { nombres: true, apellidos: true } } } } },
  });
  if (!j) return { actividades: 0, docentes: 0 };
  const { alumnoId, fecha } = j.asistencia;
  await tdb.nota.updateMany({
    where: { alumnoId, marca: "nsp", valorLiteral: null, valorNumerico: null, vencidaAt: null, justificacionId: null, evaluacion: { fecha } },
    data: { justificacionId: j.id },
  });
  const afectadas = await tdb.nota.findMany({
    where: { alumnoId, justificacionId: j.id },
    select: {
      evaluacion: {
        select: {
          titulo: true, grupoId: true, cursoId: true, periodoId: true,
          curso: { select: { nombre: true, profesor: { select: { estado: true, user: { select: { email: true } } } } } },
        },
      },
    },
  });
  // Un aviso por profesor (aunque tenga varios cursos o actividades afectadas ese día).
  const porDocente = new Map<string, { cursos: Set<string>; actividades: Set<string>; cursoId: string; periodoId: string }>();
  for (const { evaluacion: e } of afectadas) {
    const p = e.curso.profesor;
    if (!p || p.estado !== "activa") continue;
    const actual = porDocente.get(p.user.email) ?? { cursos: new Set<string>(), actividades: new Set<string>(), cursoId: e.cursoId, periodoId: e.periodoId };
    actual.cursos.add(e.curso.nombre);
    actual.actividades.add(`${e.curso.nombre}: ${e.titulo}`);
    porDocente.set(p.user.email, actual);
  }
  const unir = (n: string[]) => (n.length <= 1 ? (n[0] ?? "") : `${n.slice(0, -1).join(", ")} y ${n.at(-1)}`);
  for (const [email, d] of porDocente) {
    await encolarAviso(tdb, {
      tenantId: tenant.id, tipo: "justificacion", canal: "correo", destinatario: email, plantilla: "justificacion_aprobada_docente",
      referenciaId: j.id,
      payload: {
        colegio: tenant.nombre, alumno: `${j.asistencia.alumno.nombres} ${j.asistencia.alumno.apellidos}`.trim(), fecha: isoDeFechaDb(fecha),
        curso: unir([...d.cursos]), actividades: [...d.actividades].slice(0, 20),
        url: urlColegio(tenant.slug, `/notas?curso=${d.cursoId}&periodo=${d.periodoId}`),
      },
    });
  }
  const docentes = porDocente.size;
  await auditar({ tenantId: tenant.id, actorId: null, accion: "enviar", entidad: "justificacion_docentes", entidadId: j.id, detalle: { actividades: afectadas.length, docentes } });
  return { actividades: afectadas.length, docentes };
}

/**
 * Aviso específico a las familias de un alumno cuya calificación PUBLICADA cambió (specs/37): corrección, recuperación
 * o consecuencia por vencimiento. Sin valores en el correo; el detalle está en Khipu. Una fila por familia y canal.
 */
export async function avisarCambioNota(
  tdb: DbTenant, tenant: Pick<TenantNsp, "id" | "nombre" | "slug">,
  d: { alumnoId: string; alumno: string; curso: string; titulo: string; evaluacionId: string; motivo: "correccion_digitacion" | "cambio_asistencia" | "consecuencia_vencimiento" | "otra" | "recuperacion" },
): Promise<number> {
  let familias = 0;
  for (const dest of await destinatariosDeAlumno(tdb, d.alumnoId)) {
    if (!tieneCanalAviso(dest)) continue;
    const comun = { colegio: tenant.nombre, alumno: d.alumno, curso: d.curso, titulo: d.titulo, url: urlColegio(tenant.slug, "/notas") };
    if (d.motivo === "recuperacion") {
      await encolarParaDestinatario(tdb, dest, { tenantId: tenant.id, tipo: "libreta", plantilla: "recuperacion_registrada", referenciaId: d.evaluacionId, payload: comun });
    } else {
      await encolarParaDestinatario(tdb, dest, { tenantId: tenant.id, tipo: "libreta", plantilla: "nota_corregida", referenciaId: d.evaluacionId, payload: { ...comun, motivo: d.motivo } });
    }
    familias += 1;
  }
  return familias;
}

export { datosHistorial };
export type { CambioHistorial, Escala };
