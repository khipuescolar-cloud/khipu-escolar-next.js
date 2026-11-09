import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import { hoyEnZona, periodoTerminado, faltantesDelPeriodo, type CeldaPeriodo, type Faltante } from "@/lib/calificacion-periodo";
import { requiereConclusion, type Literal, type Marca } from "@/lib/calificaciones";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { auditar } from "./auditoria";
import { ErrorDeNegocio } from "./contexto-accion";
import { urlColegio } from "@/lib/dominio";
import { entregarNotificaciones } from "./notificaciones/internas";
import { cerrarCursoPeriodo, cursoLectura, guardarCalificacionPeriodo, listarPeriodos, periodoEnCurso, reabrirCursoPeriodo } from "./notas";
import { requireFeature } from "./plan";
import { anioAcademicoVigente } from "./registro-notas";
import { requireRol, type TenantContext } from "./tenant";

// Calificación del periodo (specs/47 y 11). «Enviar» reutiliza el cierre del curso en el periodo (`CierreCurso`): quien
// cierra y cuándo ya quedan guardados, el curso pasa a solo lectura y solo dirección reabre. No hay promedios: el
// docente decide cada calificación; las notas del periodo se muestran solo como evidencias.

const num = (d: { toString(): string } | null | undefined): number | null => (d === null || d === undefined ? null : Number(d.toString()));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const nombreDe = (u: { nombres: string; apellidos: string }) => `${u.nombres} ${u.apellidos}`.trim();

const MENSAJE_NO_TERMINO = "La calificación del periodo se envía cuando el periodo termina.";
const MENSAJE_SOLO_DOCENTE = "Solo quien dicta el curso califica y envía el periodo; el tutor consulta el reporte del salón.";

async function cargarCursoYPeriodo(ctx: TenantContext, cursoId: string, periodoId: string) {
  const curso = await cursoLectura(ctx, cursoId);
  const [periodo, salon] = await Promise.all([
    ctx.db.periodo.findFirst({ where: { id: periodoId } }),
    ctx.db.salon.findFirst({ where: { id: curso.salonId }, select: { id: true, nombre: true, nivel: true, tutor: { select: { user: { select: { nombres: true, apellidos: true } } } } } }),
  ]);
  if (!periodo || !salon || !periodo.niveles.includes(salon.nivel)) return null;
  return { curso, periodo, salon };
}

export type EstadoCalificacionPeriodo = {
  salonId: string;
  periodoId: string;
  /** `no_disponible`: el periodo no terminó; `pendiente`: falta enviarla; `enviada`: ya se envió (curso cerrado). */
  estado: "no_disponible" | "pendiente" | "enviada";
  /** Último día del periodo (AAAA-MM-DD): desde ahí se puede enviar. */
  disponibleDesde: string;
  periodoCerrado: boolean;
  enviada: { por: string; en: string } | null;
  /** El usuario es quien dicta el curso. */
  esPropio: boolean;
  /** Puede calificar y enviar ahora. */
  puedeEnviar: boolean;
};

/**
 * Estado de la calificación del periodo para el botón del registro. `ahora` es inyectable (pruebas). Devuelve null si el
 * periodo no corresponde al nivel del curso.
 */
export async function estadoCalificacionPeriodo(ctx: TenantContext, cursoId: string, periodoId: string, ahora: Date = new Date()): Promise<EstadoCalificacionPeriodo | null> {
  const c = await cargarCursoYPeriodo(ctx, cursoId, periodoId);
  if (!c) return null;
  const { curso, periodo } = c;
  const cierre = await ctx.db.cierreCurso.findFirst({ where: { cursoId, periodoId }, select: { cerradoAt: true, cerradoPor: { select: { user: { select: { nombres: true, apellidos: true } } } } } });
  const terminado = periodoTerminado(iso(periodo.fin), hoyEnZona(ctx.tenant.zonaHoraria, ahora));
  const esPropio = ctx.rol === "profesor" && curso.profesorId === ctx.membership.id;
  const habilitado = terminado || periodo.cerrado;
  const estado = cierre ? "enviada" : habilitado ? "pendiente" : "no_disponible";
  return {
    salonId: curso.salonId,
    periodoId,
    estado,
    disponibleDesde: iso(periodo.fin),
    periodoCerrado: periodo.cerrado,
    enviada: cierre ? { por: nombreDe(cierre.cerradoPor.user), en: cierre.cerradoAt.toISOString() } : null,
    esPropio,
    puedeEnviar: esPropio && estado === "pendiente" && !periodo.cerrado,
  };
}

/** Datos de la pantalla de calificación del periodo: alumnos, competencias activas, evidencias y lo ya guardado. */
export async function datosCalificacionPeriodo(ctx: TenantContext, cursoId: string, periodoId: string, ahora: Date = new Date()) {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["profesor", "direccion"]);
  const estado = await estadoCalificacionPeriodo(ctx, cursoId, periodoId, ahora);
  if (!estado) forbidden();
  // El tutor que no dicta el curso no ve borradores: consulta el reporte del salón, que solo trae los cursos enviados.
  if (ctx.rol === "profesor" && !estado.esPropio) forbidden();
  const cargado = await cargarCursoYPeriodo(ctx, cursoId, periodoId);
  if (!cargado) forbidden();
  const { curso, periodo, salon } = cargado;
  const [alumnos, competencias, guardadas, notas, emitidas, rectificaciones] = await Promise.all([
    ctx.db.alumno.findMany({ where: { salonId: curso.salonId, estado: "activo" }, select: { id: true, nombres: true, apellidos: true }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }] }),
    ctx.db.competencia.findMany({ where: { cursoId, desactivadaAt: null }, select: { id: true, nombre: true }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
    ctx.db.calificacionPeriodo.findMany({ where: { periodoId, competencia: { cursoId, desactivadaAt: null } } }),
    ctx.db.nota.findMany({
      where: { evaluacion: { cursoId, periodoId, competenciaId: { not: null } } },
      select: { alumnoId: true, valorLiteral: true, valorNumerico: true, marca: true, evaluacion: { select: { competenciaId: true, titulo: true, fecha: true } } },
      orderBy: [{ evaluacion: { fecha: "asc" } }],
    }),
    ctx.db.libretaEmitida.findMany({ where: { periodoId, alumno: { salonId: curso.salonId } }, select: { alumnoId: true }, distinct: ["alumnoId"] }),
    ctx.db.rectificacionLibreta.findMany({ where: { periodoId, competencia: { cursoId } }, select: { id: true, alumnoId: true, competenciaId: true, estado: true, valorAnterior: true, valorLiteral: true, valorNumerico: true, motivo: true, evidencia: true, solicitadaAt: true }, orderBy: { solicitadaAt: "desc" } }),
  ]);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "calificacion_periodo", entidadId: cursoId, detalle: { periodoId } });
  return {
    estado,
    escala: ctx.tenant.escalaCalificacion,
    curso: { id: curso.id, nombre: curso.nombre },
    salon: { id: salon.id, nombre: salon.nombre, tutor: salon.tutor ? nombreDe(salon.tutor.user) : null },
    periodo: { id: periodo.id, nombre: `${periodo.nombre} ${periodo.anio}`, fin: iso(periodo.fin) },
    alumnos: alumnos.map((a) => ({ id: a.id, nombre: `${a.apellidos}, ${a.nombres}` })),
    competencias,
    emitidas: emitidas.map((e) => e.alumnoId),
    rectificaciones: rectificaciones.map((r) => ({ ...r, valorNumerico: num(r.valorNumerico), solicitadaAt: r.solicitadaAt.toISOString() })),
    guardadas: guardadas.map((g) => ({ alumnoId: g.alumnoId, competenciaId: g.competenciaId, valorLiteral: g.valorLiteral as Literal | null, valorNumerico: num(g.valorNumerico), conclusion: g.conclusion })),
    evidencias: notas
      .filter((n) => n.valorLiteral !== null || n.valorNumerico !== null || n.marca !== null)
      .map((n) => ({
        alumnoId: n.alumnoId, competenciaId: n.evaluacion.competenciaId as string, titulo: n.evaluacion.titulo, fecha: iso(n.evaluacion.fecha),
        valorLiteral: n.valorLiteral as Literal | null, valorNumerico: num(n.valorNumerico), marca: n.marca as Marca | null,
      })),
    /** Solo el docente del curso, con el periodo terminado y el curso sin enviar, puede escribir. */
    editable: estado.puedeEnviar,
  };
}
export type DatosCalificacionPeriodo = Awaited<ReturnType<typeof datosCalificacionPeriodo>>;

const esquemaBorrador = z.object({
  cursoId: z.uuid(),
  periodoId: z.uuid(),
  celdas: z.array(z.object({ alumnoId: z.uuid(), competenciaId: z.uuid(), valor: z.string().max(10), conclusion: z.string().max(1000) })).max(600),
});

/** Verifica que el usuario puede escribir la calificación del periodo del curso; devuelve el error o el curso. */
async function accesoEscritura(ctx: TenantContext, cursoId: string, periodoId: string, ahora: Date) {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["profesor"]);
  const estado = await estadoCalificacionPeriodo(ctx, cursoId, periodoId, ahora);
  if (!estado) return { error: "Este periodo no es del nivel de este curso." };
  if (!estado.esPropio) return { error: MENSAJE_SOLO_DOCENTE };
  if (estado.estado === "enviada") return { error: "La calificación de este periodo ya se envió. Dirección puede reabrirla." };
  if (estado.estado === "no_disponible") return { error: MENSAJE_NO_TERMINO };
  if (estado.periodoCerrado) return { error: "Este periodo está cerrado. Las notas ya no se pueden cambiar." };
  return { estado };
}

/**
 * Guarda como borrador las celdas indicadas (en bloque). No envía nada. Una celda B o C sin conclusión no se guarda
 * (la conclusión es obligatoria en B y C) y se cuenta en `omitidas`; las demás se guardan.
 */
export async function guardarBorradorPeriodo(ctx: TenantContext, entrada: unknown, ahora: Date = new Date()): Promise<Resultado & { guardadas?: number; omitidas?: number }> {
  const d = esquemaBorrador.safeParse(entrada);
  if (!d.success) return fallo("No pudimos leer las calificaciones. Recarga la página e inténtalo de nuevo.");
  const acceso = await accesoEscritura(ctx, d.data.cursoId, d.data.periodoId, ahora);
  if (acceso.error) return fallo(acceso.error);
  const competencias = new Set((await ctx.db.competencia.findMany({ where: { cursoId: d.data.cursoId, desactivadaAt: null }, select: { id: true } })).map((c) => c.id));
  let guardadas = 0;
  let omitidas = 0;
  for (const celda of d.data.celdas) {
    if (!competencias.has(celda.competenciaId)) return fallo("Hay una competencia que no es de este curso.");
    const literal = celda.valor.trim().toUpperCase() as Literal;
    if (ctx.tenant.escalaCalificacion === "literal" && requiereConclusion(literal) && celda.conclusion.trim() === "") { omitidas++; continue; }
    const r = await guardarCalificacionPeriodo(ctx, { ...celda, periodoId: d.data.periodoId });
    if (!r.ok) return fallo(r.error);
    guardadas++;
  }
  return { ...ok(omitidas > 0 ? `Guardamos ${guardadas}. ${omitidas} ${omitidas === 1 ? "espera" : "esperan"} su conclusión.` : "Borrador guardado."), guardadas, omitidas };
}

/**
 * Envía la calificación del periodo al tutor: exige calificación en todas las competencias activas de todos los
 * alumnos y conclusión en B y C, y cierra el curso en el periodo (`cerrarCursoPeriodo`, con quién y cuándo). Queda
 * auditado. El docente ya no puede cambiarla; dirección reabre con `reabrirCursoPeriodo`.
 */
export async function enviarCalificacionPeriodo(ctx: TenantContext, entrada: { cursoId: string; periodoId: string }, ahora: Date = new Date()): Promise<Resultado & { faltantes?: Faltante[] }> {
  const id = z.object({ cursoId: z.uuid(), periodoId: z.uuid() }).safeParse(entrada);
  if (!id.success) return fallo("No encontramos ese curso o periodo.");
  const { cursoId, periodoId } = id.data;
  const acceso = await accesoEscritura(ctx, cursoId, periodoId, ahora);
  if (acceso.error) return fallo(acceso.error);
  const curso = await ctx.db.curso.findFirst({ where: { id: cursoId }, select: { nombre: true, salon: { select: { id: true, nombre: true, tutorId: true } } } });
  if (!curso) forbidden();
  const [alumnos, competencias, guardadas] = await Promise.all([
    ctx.db.alumno.findMany({ where: { salonId: curso.salon.id, estado: "activo" }, select: { id: true, nombres: true, apellidos: true }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }] }),
    ctx.db.competencia.findMany({ where: { cursoId, desactivadaAt: null }, select: { id: true, nombre: true }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
    ctx.db.calificacionPeriodo.findMany({ where: { periodoId, competencia: { cursoId, desactivadaAt: null } } }),
  ]);
  if (competencias.length === 0) return fallo("Este curso no tiene competencias activas. Agrégalas en «Competencias» antes de enviar.");
  if (alumnos.length === 0) return fallo("Este salón no tiene alumnos activos.");
  const celdas: Record<string, CeldaPeriodo> = {};
  for (const g of guardadas) celdas[`${g.alumnoId}:${g.competenciaId}`] = { valor: g.valorLiteral ?? (g.valorNumerico === null ? "" : String(num(g.valorNumerico))), conclusion: g.conclusion ?? "" };
  const faltantes = faltantesDelPeriodo(alumnos.map((a) => ({ id: a.id, nombre: `${a.apellidos}, ${a.nombres}` })), competencias, celdas, ctx.tenant.escalaCalificacion);
  if (faltantes.length > 0) return { ...fallo(`Faltan ${faltantes.length} ${faltantes.length === 1 ? "dato" : "datos"} por completar antes de enviar.`), faltantes };
  const cierre = await cerrarCursoPeriodo(ctx, cursoId, periodoId);
  if (!cierre.ok) return cierre;
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "enviar", entidad: "calificacion_periodo", entidadId: cursoId,
    detalle: { periodoId, salonId: curso.salon.id, tutorId: curso.salon.tutorId, alumnos: alumnos.length, competencias: competencias.length },
  });
  return ok(`Enviamos la calificación del periodo${curso.salon.tutorId ? " al tutor" : ""} de ${curso.salon.nombre}.`);
}

/** Dirección reabre la calificación enviada (misma regla que reabrir las notas del curso). */
export async function reabrirCalificacionPeriodo(ctx: TenantContext, cursoId: string, periodoId: string): Promise<Resultado> {
  const r = await reabrirCursoPeriodo(ctx, cursoId, periodoId);
  if (r.ok) await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "calificacion_periodo", entidadId: cursoId, detalle: { periodoId, reabierta: true } });
  return r;
}

// ───────────── Reporte del periodo para el tutor ─────────────

/** Salones que el usuario puede abrir en el reporte: el que tutora (profesor) o todos los del año (dirección). */
export async function salonesParaReporte(ctx: TenantContext) {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["profesor", "direccion"]);
  const anio = await anioAcademicoVigente(ctx);
  return ctx.db.salon.findMany({
    where: { archivadoAt: null, anio, ...(ctx.rol === "profesor" ? { tutorId: ctx.membership.id } : {}) },
    select: { id: true, nombre: true, nivel: true, grado: true },
    orderBy: [{ grado: "asc" }, { nombre: "asc" }],
  });
}

/**
 * Reporte del periodo de un salón: por curso y competencia, la calificación del periodo. Solo el tutor del salón y
 * dirección. Los cursos que su profesor aún no envió aparecen como pendientes y no muestran calificaciones.
 */
export async function reporteSalonPeriodo(ctx: TenantContext, salonId: string, periodoId?: string, ahora: Date = new Date()) {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["profesor", "direccion"]);
  const salon = await ctx.db.salon.findFirst({ where: { id: salonId }, select: { id: true, nombre: true, nivel: true, tutorId: true, tutor: { select: { user: { select: { nombres: true, apellidos: true } } } } } });
  if (!salon) forbidden();
  if (ctx.rol === "profesor" && salon.tutorId !== ctx.membership.id) forbidden();
  const periodos = await listarPeriodos(ctx, salon.nivel);
  const hoy = hoyEnZona(ctx.tenant.zonaHoraria, ahora);
  const orden = [...periodos].sort((a, b) => b.anio - a.anio || b.numero - a.numero);
  const periodo = periodos.find((p) => p.id === periodoId) ?? orden.find((p) => periodoTerminado(iso(p.fin), hoy)) ?? periodoEnCurso(periodos);
  const [cursos, alumnos] = await Promise.all([
    ctx.db.curso.findMany({
      where: { salonId },
      select: { id: true, nombre: true, profesor: { select: { user: { select: { nombres: true, apellidos: true } } } }, competencias: { where: { desactivadaAt: null }, select: { id: true, nombre: true }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] } },
      orderBy: { nombre: "asc" },
    }),
    ctx.db.alumno.findMany({ where: { salonId, estado: "activo" }, select: { id: true, nombres: true, apellidos: true }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }] }),
  ]);
  const cierres = periodo ? await ctx.db.cierreCurso.findMany({ where: { periodoId: periodo.id, cursoId: { in: cursos.map((c) => c.id) } }, select: { cursoId: true, cerradoAt: true, cerradoPor: { select: { user: { select: { nombres: true, apellidos: true } } } } } }) : [];
  const enviados = new Set(cierres.map((c) => c.cursoId));
  // Solo se leen las calificaciones de los cursos ya enviados.
  const calificaciones = periodo && enviados.size > 0
    ? await ctx.db.calificacionPeriodo.findMany({ where: { periodoId: periodo.id, competencia: { cursoId: { in: [...enviados] }, desactivadaAt: null } } })
    : [];
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "reporte_periodo_salon", entidadId: salonId, detalle: { periodoId: periodo?.id ?? null } });
  return {
    salon: { id: salon.id, nombre: salon.nombre, tutor: salon.tutor ? nombreDe(salon.tutor.user) : null },
    escala: ctx.tenant.escalaCalificacion,
    periodos: periodos.map((p) => ({ id: p.id, nombre: `${p.nombre} ${p.anio}` })),
    periodo: periodo ? { id: periodo.id, nombre: `${periodo.nombre} ${periodo.anio}`, fin: iso(periodo.fin) } : null,
    cursos: cursos.map((c) => {
      const cierre = cierres.find((x) => x.cursoId === c.id);
      return {
        id: c.id, nombre: c.nombre, profesor: c.profesor ? nombreDe(c.profesor.user) : null, competencias: c.competencias,
        enviado: cierre ? { por: nombreDe(cierre.cerradoPor.user), en: cierre.cerradoAt.toISOString() } : null,
      };
    }),
    alumnos: alumnos.map((a) => ({ id: a.id, nombre: `${a.apellidos}, ${a.nombres}` })),
    calificaciones: calificaciones.map((g) => ({ alumnoId: g.alumnoId, competenciaId: g.competenciaId, valorLiteral: g.valorLiteral as Literal | null, valorNumerico: num(g.valorNumerico), conclusion: g.conclusion })),
    hoy,
  };
}
export type ReporteSalonPeriodo = Awaited<ReturnType<typeof reporteSalonPeriodo>>;

const esquemaSolicitudReportes = z.object({
  salonId: z.uuid(), periodoId: z.uuid(),
  titulo: z.string().trim().min(1, "Escribe un título.").max(150),
  descripcion: z.string().trim().max(1000).optional(),
});

export async function destinatariosReportesPeriodo(ctx: TenantContext, salonId: string, periodoId: string) {
  requireFeature(ctx, "notas");
  const salon = await ctx.db.salon.findFirst({ where: { id: salonId }, select: { id: true, nombre: true, nivel: true, anio: true, tutorId: true } });
  if (!salon || (ctx.rol !== "direccion" && salon.tutorId !== ctx.membership.id)) forbidden();
  const periodo = await ctx.db.periodo.findFirst({ where: { id: periodoId }, select: { id: true, nombre: true, anio: true, niveles: true } });
  if (!periodo || periodo.anio !== salon.anio || !periodo.niveles.includes(salon.nivel)) forbidden();
  const cursos = await ctx.db.curso.findMany({
    where: { salonId }, orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, profesor: { select: { id: true, estado: true, rol: true, preferenciaAviso: { select: { correo: true, push: true } }, user: { select: { nombres: true, apellidos: true, email: true, pushSuscripciones: { select: { endpoint: true } } } } } } },
  });
  const cierres = await ctx.db.cierreCurso.findMany({ where: { periodoId, cursoId: { in: cursos.map(c => c.id) } }, select: { cursoId: true } });
  const enviados = new Set(cierres.map(c => c.cursoId));
  const destinatarios = new Map<string, { miembro: NonNullable<(typeof cursos)[number]["profesor"]>; cursos: { id: string; nombre: string }[] }>();
  for (const curso of cursos) {
    const profesor = curso.profesor;
    if (enviados.has(curso.id) || !profesor || profesor.estado !== "activa" || profesor.rol !== "profesor" || profesor.id === ctx.membership.id) continue;
    const destino = destinatarios.get(profesor.id) ?? { miembro: profesor, cursos: [] };
    destino.cursos.push({ id: curso.id, nombre: curso.nombre });
    destinatarios.set(profesor.id, destino);
  }
  return { salon, periodo, destinatarios: [...destinatarios.values()] };
}

export async function solicitarReportesPeriodo(ctx: TenantContext, entrada: unknown, ahora: Date = new Date()): Promise<{ enviados: number }> {
  const validacion = esquemaSolicitudReportes.safeParse(entrada);
  if (!validacion.success) throw new ErrorDeNegocio(validacion.error.issues[0]?.message ?? "Revisa la solicitud.");
  const { salonId, periodoId, titulo, descripcion } = validacion.data;
  const { salon, periodo, destinatarios } = await destinatariosReportesPeriodo(ctx, salonId, periodoId);
  if (destinatarios.length === 0) throw new ErrorDeNegocio("No hay profesores con reportes pendientes para solicitar.");
  const clave = ["reporte-periodo", salonId, periodoId, hoyEnZona(ctx.tenant.zonaHoraria, ahora)].join(":");
  if (await ctx.db.notificacion.findFirst({ where: { clave }, select: { id: true } })) throw new ErrorDeNegocio("Ya enviaste esta solicitud hoy");
  const nombrePeriodo = periodo.nombre + " " + periodo.anio;
  const solicitante = nombreDe(ctx.user);
  const resultado = await entregarNotificaciones(ctx.db, {
    tenant: ctx.tenant, tipo: "reporte_periodo", tipoAviso: "libreta", plantilla: "reporte_periodo_solicitud", clave,
    entregas: destinatarios.map(({ miembro, cursos }) => {
      const url = "/notas/" + cursos[0].id;
      const nombres = cursos.map(c => c.nombre);
      return { membershipId: miembro.id, titulo,
        cuerpo: descripcion || ("Solicita el reporte de " + salon.nombre + " para " + nombrePeriodo + ". Cursos pendientes: " + nombres.join(", ") + "."),
        url, email: miembro.preferenciaAviso?.correo === false ? null : miembro.user.email,
        endpoints: miembro.preferenciaAviso?.push === false ? [] : miembro.user.pushSuscripciones.map(p => p.endpoint),
        apoderadoId: null, payload: { colegio: ctx.tenant.nombre, titulo, solicitante, salon: salon.nombre, periodo: nombrePeriodo, cursos: nombres, descripcion: descripcion || undefined, url: urlColegio(ctx.tenant.slug, url) },
      };
    }),
  });
  if (resultado.notificaciones === 0) throw new ErrorDeNegocio("Ya enviaste esta solicitud hoy");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "enviar", entidad: "reporte_periodo_salon", entidadId: salonId, detalle: { periodoId, destinatarios: destinatarios.length } });
  return { enviados: destinatarios.length };
}
