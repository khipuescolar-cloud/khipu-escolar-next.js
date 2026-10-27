import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import {
  interpretarValor, requiereConclusion, sugerirCalificacion,
  type Escala, type Literal, type ValorCalificacion,
} from "@/lib/calificaciones";
import { analizarNotasCsv, exportarNotasCsv, MAX_BYTES_CSV_NOTAS, type ResultadoNotasCsv } from "@/lib/notas-csv";
import { puedePublicarLibreta } from "@/lib/libreta-publicacion";
import { urlColegio } from "@/lib/dominio";
import { primerNombre } from "@/lib/nombres";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { auditar } from "./auditoria";
import { cursosDelDocente } from "./cursos";
import { destinatariosDeAlumno, encolarParaDestinatario, type Destinatario } from "./notificaciones/encolar";
import { requireFeature } from "./plan";
import { alumnoIdsVisibles, requireAlumnoVisible, requireCursoDelProfesor, requireRol, type TenantContext } from "./tenant";

export { cursosDelDocente };

const num = (d: { toString(): string } | null | undefined): number | null => (d === null || d === undefined ? null : Number(d.toString()));
const fechaDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const MENSAJE_CERRADO = "Este periodo está cerrado. Las notas ya no se pueden cambiar.";
const MENSAJE_CURSO_CERRADO = "Las notas de este curso ya están cerradas en este periodo. Dirección puede reabrirlas.";

function escalaDe(ctx: TenantContext): Escala {
  return ctx.tenant.escalaCalificacion;
}

// ───────────── Periodos ─────────────

export async function listarPeriodos(ctx: TenantContext) {
  requireFeature(ctx, "notas");
  return ctx.db.periodo.findMany({ orderBy: [{ anio: "desc" }, { numero: "asc" }] });
}

/** Periodo en curso: el abierto más reciente; si todos están cerrados, el último. */
export function periodoEnCurso<P extends { cerrado: boolean; anio: number; numero: number }>(periodos: P[]): P | undefined {
  const orden = [...periodos].sort((a, b) => b.anio - a.anio || b.numero - a.numero);
  return orden.find((p) => !p.cerrado) ?? orden[0];
}

/** Periodo sugerido para la libreta: el último cerrado; si no hay, el que está en curso. */
export function periodoParaLibreta<P extends { cerrado: boolean; anio: number; numero: number }>(periodos: P[]): P | undefined {
  const orden = [...periodos].sort((a, b) => b.anio - a.anio || b.numero - a.numero);
  return orden.find((p) => p.cerrado) ?? orden[0];
}

const esquemaPeriodo = z
  .object({
    anio: z.coerce.number().int().min(2000).max(2100),
    tipo: z.enum(["bimestre", "trimestre", "semestre"]),
    numero: z.coerce.number().int().min(1).max(6),
    nombre: z.string().trim().min(2, "Escribe el nombre del periodo.").max(60),
    inicio: z.iso.date("Elige la fecha de inicio."),
    fin: z.iso.date("Elige la fecha de fin."),
  })
  .refine((d) => d.fin >= d.inicio, { message: "La fecha de fin debe ser posterior al inicio.", path: ["fin"] });

export async function crearPeriodo(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["direccion"]);
  const d = esquemaPeriodo.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const existe = await ctx.db.periodo.findFirst({ where: { anio: d.data.anio, tipo: d.data.tipo, numero: d.data.numero } });
  if (existe) return fallo("Ya existe un periodo con ese año, tipo y número.");
  const p = await ctx.db.periodo.create({
    data: { tenantId: ctx.tenant.id, ...d.data, inicio: fechaDate(d.data.inicio), fin: fechaDate(d.data.fin) },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "periodo", entidadId: p.id });
  return ok("Periodo creado.");
}

export async function cambiarEstadoPeriodo(ctx: TenantContext, periodoId: string, cerrado: boolean): Promise<Resultado> {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["direccion"]);
  const r = await ctx.db.periodo.updateMany({ where: { id: periodoId }, data: { cerrado } });
  if (r.count === 0) return fallo("No encontramos ese periodo.");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "periodo", entidadId: periodoId, detalle: { cerrado } });
  return ok(cerrado ? "Periodo cerrado." : "Periodo abierto.");
}

// ───────────── Acceso a cursos y periodos ─────────────

/** Curso gestionable por el profesor (escritura). Dirección solo lee. */
async function cursoEscritura(ctx: TenantContext, cursoId: string) {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["profesor"]);
  await requireCursoDelProfesor(ctx, cursoId);
  const curso = await ctx.db.curso.findFirst({ where: { id: cursoId } });
  if (!curso) forbidden();
  return curso;
}

async function cursoLectura(ctx: TenantContext, cursoId: string) {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["profesor", "direccion"]);
  await requireCursoDelProfesor(ctx, cursoId);
  const curso = await ctx.db.curso.findFirst({ where: { id: cursoId } });
  if (!curso) forbidden();
  return curso;
}

/** Periodo abierto y, si se indica el curso, curso sin cierre en ese periodo. Lo valida el servidor en toda escritura. */
async function periodoAbierto(ctx: TenantContext, periodoId: string, cursoId?: string) {
  const periodo = await ctx.db.periodo.findFirst({ where: { id: periodoId } });
  if (!periodo) return { error: "No encontramos ese periodo." as const };
  if (periodo.cerrado) return { error: MENSAJE_CERRADO };
  if (cursoId && (await ctx.db.cierreCurso.count({ where: { periodoId, cursoId } })) > 0) return { error: MENSAJE_CURSO_CERRADO };
  return { periodo };
}

// ───────────── Cierre por curso ─────────────

/** El profesor del curso (o dirección) cierra las notas del curso en un periodo abierto. */
export async function cerrarCursoPeriodo(ctx: TenantContext, cursoId: string, periodoId: string): Promise<Resultado> {
  await cursoLectura(ctx, cursoId); // profesor del curso o dirección
  const periodo = await ctx.db.periodo.findFirst({ where: { id: periodoId } });
  if (!periodo) return fallo("No encontramos ese periodo.");
  if (periodo.cerrado) return fallo(MENSAJE_CERRADO);
  if ((await ctx.db.cierreCurso.count({ where: { periodoId, cursoId } })) > 0) return fallo("Las notas de este curso ya estaban cerradas.");
  try {
    await ctx.db.cierreCurso.create({ data: { tenantId: ctx.tenant.id, periodoId, cursoId, cerradoPorId: ctx.membership.id } });
  } catch {
    return fallo("Las notas de este curso ya estaban cerradas.");
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "cierre_curso", entidadId: cursoId, detalle: { periodoId, cerrado: true } });
  return ok("Notas del curso cerradas.");
}

/** Solo dirección reabre las notas de un curso. */
export async function reabrirCursoPeriodo(ctx: TenantContext, cursoId: string, periodoId: string): Promise<Resultado> {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["direccion"]);
  const r = await ctx.db.cierreCurso.deleteMany({ where: { periodoId, cursoId } });
  if (r.count === 0) return fallo("Las notas de este curso no estaban cerradas.");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "cierre_curso", entidadId: cursoId, detalle: { periodoId, cerrado: false } });
  return ok("Notas del curso abiertas de nuevo.");
}

/** Cierre del curso en el periodo (null si está abierto). */
export async function cierreDeCurso(ctx: TenantContext, cursoId: string, periodoId: string) {
  requireFeature(ctx, "notas");
  const c = await ctx.db.cierreCurso.findFirst({
    where: { cursoId, periodoId },
    include: { cerradoPor: { select: { user: { select: { nombres: true, apellidos: true } } } } },
  });
  return c ? { cerradoAt: c.cerradoAt, por: `${c.cerradoPor.user.nombres} ${c.cerradoPor.user.apellidos}`.trim() } : null;
}

// ───────────── Publicar la libreta y avisar a las familias ─────────────

/** Cursos de salones no archivados con su estado de cierre en el periodo (dirección). */
export async function estadoPublicacionLibreta(ctx: TenantContext, periodoId: string) {
  requireFeature(ctx, "libreta");
  requireRol(ctx, ["direccion"]);
  const [periodo, cursos, cierres] = await Promise.all([
    ctx.db.periodo.findFirst({ where: { id: periodoId } }),
    ctx.db.curso.findMany({ where: { salon: { archivadoAt: null } }, select: { id: true } }),
    ctx.db.cierreCurso.findMany({ where: { periodoId }, select: { cursoId: true } }),
  ]);
  if (!periodo) forbidden();
  const ids = new Set(cursos.map((c) => c.id));
  const cerrados = cierres.filter((c) => ids.has(c.cursoId)).length;
  return {
    totalCursos: ids.size,
    cursosCerrados: cerrados,
    publicadaAt: periodo.libretaPublicadaAt,
    puedePublicar: puedePublicarLibreta(periodo.cerrado, ids.size, cerrados),
  };
}

const unirNombres = (n: string[]) => (n.length <= 1 ? (n[0] ?? "") : `${n.slice(0, -1).join(", ")} y ${n.at(-1)}`);

/**
 * Dirección publica la libreta del periodo y avisa a las familias (aviso `libreta`, correo y push según sus preferencias).
 * Requiere el periodo cerrado o todos sus cursos cerrados. Idempotente: si ya se publicó no reenvía,
 * salvo `reenviar: true` («Reenviar aviso»). Una fila por familia y canal aunque tenga varios hijos.
 */
export async function publicarLibreta(ctx: TenantContext, periodoId: string, opciones: { reenviar?: boolean } = {}): Promise<Resultado> {
  requireFeature(ctx, "libreta");
  requireRol(ctx, ["direccion"]);
  const estado = await estadoPublicacionLibreta(ctx, periodoId);
  const periodo = await ctx.db.periodo.findFirst({ where: { id: periodoId } });
  if (!periodo) return fallo("No encontramos ese periodo.");
  if (estado.publicadaAt && !opciones.reenviar) return fallo("La libreta de este periodo ya se publicó. Usa «Reenviar aviso» si quieres avisar otra vez.");
  if (!estado.puedePublicar) return fallo("Para publicar, cierra el periodo o cierra las notas de todos los cursos.");
  if (!estado.publicadaAt) {
    // Reclama la publicación de forma atómica: si dos personas hacen clic a la vez, solo una encola.
    const r = await ctx.db.periodo.updateMany({ where: { id: periodoId, libretaPublicadaAt: null }, data: { libretaPublicadaAt: new Date() } });
    if (r.count === 0 && !opciones.reenviar) return fallo("La libreta de este periodo ya se publicó.");
  }

  const alumnos = await ctx.db.alumno.findMany({
    where: { estado: "activo", salon: { archivadoAt: null, cursos: { some: {} } } },
    select: { id: true, nombres: true },
    orderBy: { nombres: "asc" },
  });
  const porFamilia = new Map<string, { destinatario: Destinatario; hijos: string[] }>();
  for (const a of alumnos) {
    for (const d of await destinatariosDeAlumno(ctx.db, a.id)) {
      if (!d.correo && d.pushEndpoints.length === 0) continue;
      const actual = porFamilia.get(d.apoderadoId) ?? { destinatario: d, hijos: [] };
      actual.hijos.push(primerNombre(a.nombres));
      porFamilia.set(d.apoderadoId, actual);
    }
  }
  for (const { destinatario, hijos } of porFamilia.values()) {
    await encolarParaDestinatario(ctx.db, destinatario, {
      tenantId: ctx.tenant.id,
      tipo: "libreta",
      plantilla: "libreta_publicada",
      referenciaId: periodoId,
      payload: { colegio: ctx.tenant.nombre, alumno: unirNombres(hijos), periodo: `${periodo.nombre} ${periodo.anio}`, url: urlColegio(ctx.tenant.slug, "/libreta") },
    });
  }
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "enviar", entidad: "libreta_publicada", entidadId: periodoId,
    detalle: { familias: porFamilia.size, reenvio: Boolean(opciones.reenviar && estado.publicadaAt) },
  });
  return ok(porFamilia.size === 0 ? "Libreta publicada. Ninguna familia tiene avisos activos." : `Libreta publicada. Avisamos a ${porFamilia.size} ${porFamilia.size === 1 ? "familia" : "familias"}.`);
}

// ───────────── Competencias ─────────────

export async function listarCompetencias(ctx: TenantContext, cursoId: string) {
  await cursoLectura(ctx, cursoId);
  return ctx.db.competencia.findMany({ where: { cursoId }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] });
}

const esquemaCompetencia = z.object({
  cursoId: z.uuid(),
  nombre: z.string().trim().min(3, "Escribe el nombre de la competencia.").max(200),
  descripcion: z.string().trim().max(500).optional(),
});

export async function crearCompetencia(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  const d = esquemaCompetencia.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  await cursoEscritura(ctx, d.data.cursoId);
  const ultimo = await ctx.db.competencia.aggregate({ where: { cursoId: d.data.cursoId }, _max: { orden: true } });
  await ctx.db.competencia.create({
    data: {
      tenantId: ctx.tenant.id, cursoId: d.data.cursoId, nombre: d.data.nombre,
      descripcion: d.data.descripcion || null, orden: (ultimo._max.orden ?? -1) + 1,
    },
  });
  return ok("Competencia agregada.");
}

export async function eliminarCompetencia(ctx: TenantContext, competenciaId: string): Promise<Resultado> {
  requireFeature(ctx, "notas");
  const comp = await ctx.db.competencia.findFirst({ where: { id: competenciaId } });
  if (!comp) return fallo("No encontramos esa competencia.");
  await cursoEscritura(ctx, comp.cursoId);
  const usos = await ctx.db.calificacionPeriodo.count({ where: { competenciaId } });
  if (usos > 0) return fallo("Esta competencia ya tiene calificaciones en la libreta y no se puede eliminar.");
  await ctx.db.competencia.deleteMany({ where: { id: competenciaId } });
  return ok("Competencia eliminada.");
}

// ───────────── Evaluaciones ─────────────

const esquemaEvaluacion = z.object({
  cursoId: z.uuid(),
  periodoId: z.uuid(),
  competenciaId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  titulo: z.string().trim().min(2, "Escribe el título de la evaluación.").max(120),
  fecha: z.iso.date("Elige la fecha."),
  peso: z.coerce.number("El peso debe ser un número.").min(0.01, "El peso debe ser mayor que 0.").max(100, "El peso es demasiado alto."),
});

export async function crearEvaluacion(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  const d = esquemaEvaluacion.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  await cursoEscritura(ctx, d.data.cursoId);
  const p = await periodoAbierto(ctx, d.data.periodoId, d.data.cursoId);
  if (p.error) return fallo(p.error);
  if (d.data.competenciaId) {
    const c = await ctx.db.competencia.findFirst({ where: { id: d.data.competenciaId, cursoId: d.data.cursoId } });
    if (!c) return fallo("Esa competencia no es de este curso.");
  }
  const e = await ctx.db.evaluacion.create({
    data: {
      tenantId: ctx.tenant.id, cursoId: d.data.cursoId, periodoId: d.data.periodoId,
      competenciaId: d.data.competenciaId ?? null, titulo: d.data.titulo, fecha: fechaDate(d.data.fecha), peso: d.data.peso,
    },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "evaluacion", entidadId: e.id });
  return ok("Evaluación creada.");
}

export async function editarEvaluacion(ctx: TenantContext, evaluacionId: string, entrada: unknown): Promise<Resultado> {
  requireFeature(ctx, "notas");
  const actual = await ctx.db.evaluacion.findFirst({ where: { id: evaluacionId } });
  if (!actual) return fallo("No encontramos esa evaluación.");
  const d = esquemaEvaluacion.safeParse({ ...(entrada as object), cursoId: actual.cursoId, periodoId: actual.periodoId });
  if (!d.success) return fallo(d.error.issues[0].message);
  await cursoEscritura(ctx, actual.cursoId);
  const p = await periodoAbierto(ctx, actual.periodoId, actual.cursoId);
  if (p.error) return fallo(p.error);
  if (d.data.competenciaId) {
    const c = await ctx.db.competencia.findFirst({ where: { id: d.data.competenciaId, cursoId: actual.cursoId } });
    if (!c) return fallo("Esa competencia no es de este curso.");
  }
  await ctx.db.evaluacion.updateMany({
    where: { id: evaluacionId },
    data: { competenciaId: d.data.competenciaId ?? null, titulo: d.data.titulo, fecha: fechaDate(d.data.fecha), peso: d.data.peso },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "evaluacion", entidadId: evaluacionId });
  return ok("Evaluación actualizada.");
}

export async function eliminarEvaluacion(ctx: TenantContext, evaluacionId: string): Promise<Resultado> {
  requireFeature(ctx, "notas");
  const actual = await ctx.db.evaluacion.findFirst({ where: { id: evaluacionId } });
  if (!actual) return fallo("No encontramos esa evaluación.");
  await cursoEscritura(ctx, actual.cursoId);
  const p = await periodoAbierto(ctx, actual.periodoId, actual.cursoId);
  if (p.error) return fallo(p.error);
  await ctx.db.evaluacion.deleteMany({ where: { id: evaluacionId } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "evaluacion", entidadId: evaluacionId });
  return ok("Evaluación eliminada.");
}

// ───────────── Grilla de notas (profesor y dirección) ─────────────

export type GrillaNotas = Awaited<ReturnType<typeof grillaNotas>>;

export async function grillaNotas(ctx: TenantContext, cursoId: string, periodoId: string) {
  const curso = await cursoLectura(ctx, cursoId);
  const periodo = await ctx.db.periodo.findFirst({ where: { id: periodoId } });
  if (!periodo) forbidden();
  const [salon, alumnos, competencias, evaluaciones] = await Promise.all([
    ctx.db.salon.findFirst({ where: { id: curso.salonId } }),
    ctx.db.alumno.findMany({
      where: { salonId: curso.salonId, estado: "activo" },
      select: { id: true, nombres: true, apellidos: true },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    ctx.db.competencia.findMany({ where: { cursoId }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
    ctx.db.evaluacion.findMany({ where: { cursoId, periodoId }, orderBy: [{ fecha: "asc" }, { titulo: "asc" }] }),
  ]);
  const [notas, cierre] = await Promise.all([
    ctx.db.nota.findMany({ where: { evaluacionId: { in: evaluaciones.map((e) => e.id) } } }),
    ctx.db.cierreCurso.findFirst({ where: { cursoId, periodoId }, select: { id: true } }),
  ]);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "notas_curso", entidadId: cursoId, detalle: { periodoId } });
  return {
    curso, salon, periodo, alumnos, competencias,
    evaluaciones: evaluaciones.map((e) => ({
      id: e.id, titulo: e.titulo, fecha: e.fecha.toISOString().slice(0, 10), peso: Number(e.peso), competenciaId: e.competenciaId,
    })),
    notas: notas.map((n) => ({
      evaluacionId: n.evaluacionId, alumnoId: n.alumnoId, valorLiteral: n.valorLiteral as Literal | null, valorNumerico: num(n.valorNumerico), comentario: n.comentario,
    })),
    cursoCerrado: cierre !== null,
    editable: ctx.rol === "profesor" && !periodo.cerrado && cierre === null,
    escala: escalaDe(ctx),
  };
}

/** Guarda (o borra, si `valor` viene vacío) la nota de un alumno en una evaluación. */
export async function guardarNota(ctx: TenantContext, entrada: { evaluacionId: string; alumnoId: string; valor: string }): Promise<Resultado> {
  requireFeature(ctx, "notas");
  const d = z.object({ evaluacionId: z.uuid(), alumnoId: z.uuid(), valor: z.string().max(10) }).safeParse(entrada);
  if (!d.success) return fallo("Los datos no son válidos.");
  const evaluacion = await ctx.db.evaluacion.findFirst({ where: { id: d.data.evaluacionId } });
  if (!evaluacion) return fallo("No encontramos esa evaluación.");
  const curso = await cursoEscritura(ctx, evaluacion.cursoId);
  const p = await periodoAbierto(ctx, evaluacion.periodoId, evaluacion.cursoId);
  if (p.error) return fallo(p.error);
  const alumno = await ctx.db.alumno.findFirst({ where: { id: d.data.alumnoId, salonId: curso.salonId } });
  if (!alumno) return fallo("Ese alumno no está en este curso.");

  const v = interpretarValor(escalaDe(ctx), d.data.valor);
  if (!v.ok) return fallo(v.error);
  const clave = { evaluacionId_alumnoId: { evaluacionId: evaluacion.id, alumnoId: alumno.id } };
  if (v.valor === null) {
    await ctx.db.nota.deleteMany({ where: { evaluacionId: evaluacion.id, alumnoId: alumno.id } });
  } else {
    await ctx.db.nota.upsert({
      where: clave,
      create: { tenantId: ctx.tenant.id, evaluacionId: evaluacion.id, alumnoId: alumno.id, ...v.valor, registradoPorId: ctx.membership.id },
      update: { ...v.valor, registradoPorId: ctx.membership.id },
    });
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "nota", entidadId: evaluacion.id, detalle: { alumnoId: alumno.id } });
  return ok();
}

/** Observación de una nota (máx. 500 caracteres). La nota debe existir; vacío borra el comentario. */
export async function guardarComentarioNota(ctx: TenantContext, entrada: { evaluacionId: string; alumnoId: string; comentario: string }): Promise<Resultado> {
  requireFeature(ctx, "notas");
  const d = z
    .object({ evaluacionId: z.uuid(), alumnoId: z.uuid(), comentario: z.string().trim().max(500, "La observación es muy larga (máximo 500 caracteres).") })
    .safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const evaluacion = await ctx.db.evaluacion.findFirst({ where: { id: d.data.evaluacionId } });
  if (!evaluacion) return fallo("No encontramos esa evaluación.");
  await cursoEscritura(ctx, evaluacion.cursoId);
  const p = await periodoAbierto(ctx, evaluacion.periodoId, evaluacion.cursoId);
  if (p.error) return fallo(p.error);
  const r = await ctx.db.nota.updateMany({
    where: { evaluacionId: evaluacion.id, alumnoId: d.data.alumnoId },
    data: { comentario: d.data.comentario || null, registradoPorId: ctx.membership.id },
  });
  if (r.count === 0) return fallo("Primero pon la nota; después puedes agregar una observación.");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "nota", entidadId: evaluacion.id, detalle: { alumnoId: d.data.alumnoId, comentario: true } });
  return ok(d.data.comentario ? "Observación guardada." : "Observación borrada.");
}

// ───────────── Importar y exportar notas (CSV) ─────────────

async function datosParaCsv(ctx: TenantContext, cursoId: string, periodoId: string) {
  const g = await grillaNotas(ctx, cursoId, periodoId);
  const alumnosCompleto = await ctx.db.alumno.findMany({
    where: { id: { in: g.alumnos.map((a) => a.id) } },
    select: { id: true, nombres: true, apellidos: true, codigo: true },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
  });
  return { g, alumnos: alumnosCompleto };
}

/** CSV (UTF-8 con BOM, separador «;») de la rejilla del curso en el periodo. Profesor del curso o dirección. */
export async function exportarNotasCurso(ctx: TenantContext, cursoId: string, periodoId: string): Promise<{ nombre: string; csv: string }> {
  const { g, alumnos } = await datosParaCsv(ctx, cursoId, periodoId);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "exportar", entidad: "notas_curso", entidadId: cursoId, detalle: { periodoId } });
  return {
    nombre: `notas-${g.curso.nombre}-${g.periodo.nombre}`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase(),
    csv: exportarNotasCsv({ alumnos, evaluaciones: g.evaluaciones, notas: g.notas }),
  };
}

export type VistaPreviaImportacion = ResultadoNotasCsv & { editable: boolean; motivoBloqueo: string | null };

/** Vista previa de la importación: valida el CSV sin guardar nada. */
export async function previsualizarImportacionNotas(ctx: TenantContext, cursoId: string, periodoId: string, texto: string): Promise<VistaPreviaImportacion> {
  const { g, alumnos } = await datosParaCsv(ctx, cursoId, periodoId);
  const vacio: ResultadoNotasCsv = { cambios: [], errores: [], columnasIgnoradas: [], vacias: 0 };
  const motivoBloqueo =
    ctx.rol !== "profesor" ? "Solo el profesor del curso puede importar notas."
    : g.periodo.cerrado ? MENSAJE_CERRADO
    : g.cursoCerrado ? MENSAJE_CURSO_CERRADO
    : null;
  if (texto.length > MAX_BYTES_CSV_NOTAS) return { ...vacio, errores: [{ linea: 1, mensaje: "El archivo es demasiado grande (máximo 500 KB)." }], editable: false, motivoBloqueo };
  const r = analizarNotasCsv(texto, { escala: escalaDe(ctx), alumnos, evaluaciones: g.evaluaciones });
  return { ...r, editable: motivoBloqueo === null, motivoBloqueo };
}

/** Guarda las notas válidas del CSV (las filas con error se omiten). No pisa cursos ni periodos cerrados. */
export async function importarNotas(ctx: TenantContext, cursoId: string, periodoId: string, texto: string): Promise<Resultado> {
  const curso = await cursoEscritura(ctx, cursoId);
  const p = await periodoAbierto(ctx, periodoId, cursoId);
  if (p.error) return fallo(p.error);
  const vista = await previsualizarImportacionNotas(ctx, cursoId, periodoId, texto);
  if (vista.cambios.length === 0) return fallo(vista.errores[0]?.mensaje ?? "No hay notas para importar.");
  for (const c of vista.cambios) {
    await ctx.db.nota.upsert({
      where: { evaluacionId_alumnoId: { evaluacionId: c.evaluacionId, alumnoId: c.alumnoId } },
      create: { tenantId: ctx.tenant.id, evaluacionId: c.evaluacionId, alumnoId: c.alumnoId, ...c.valor, registradoPorId: ctx.membership.id },
      update: { ...c.valor, registradoPorId: ctx.membership.id },
    });
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "notas_curso", entidadId: curso.id, detalle: { periodoId, importadas: vista.cambios.length, errores: vista.errores.length } });
  const omitidas = vista.errores.length > 0 ? ` ${vista.errores.length} ${vista.errores.length === 1 ? "celda no se importó" : "celdas no se importaron"}.` : "";
  return ok(`Se importaron ${vista.cambios.length} ${vista.cambios.length === 1 ? "nota" : "notas"}.${omitidas}`);
}

// ───────────── Calificaciones del periodo (lo que va a la libreta) ─────────────

export async function calificacionesPeriodo(ctx: TenantContext, cursoId: string, periodoId: string) {
  const curso = await cursoLectura(ctx, cursoId);
  const periodo = await ctx.db.periodo.findFirst({ where: { id: periodoId } });
  if (!periodo) forbidden();
  const escala = escalaDe(ctx);
  const [alumnos, competencias, guardadas, notas, cierre] = await Promise.all([
    ctx.db.alumno.findMany({
      where: { salonId: curso.salonId, estado: "activo" },
      select: { id: true, nombres: true, apellidos: true },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    ctx.db.competencia.findMany({ where: { cursoId }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
    ctx.db.calificacionPeriodo.findMany({ where: { periodoId, competencia: { cursoId } } }),
    ctx.db.nota.findMany({
      where: { evaluacion: { cursoId, periodoId, competenciaId: { not: null } } },
      include: { evaluacion: { select: { competenciaId: true, peso: true, fecha: true } } },
    }),
    ctx.db.cierreCurso.findFirst({ where: { cursoId, periodoId }, select: { id: true } }),
  ]);
  const filas = competencias.map((c) => ({
    competencia: c,
    alumnos: alumnos.map((a) => {
      const g = guardadas.find((x) => x.alumnoId === a.id && x.competenciaId === c.id);
      const delAlumno = notas.filter((n) => n.alumnoId === a.id && n.evaluacion.competenciaId === c.id);
      const sugerido = sugerirCalificacion(
        escala,
        delAlumno.map((n) => ({
          valorLiteral: n.valorLiteral as Literal | null, valorNumerico: num(n.valorNumerico), peso: Number(n.evaluacion.peso), fecha: n.evaluacion.fecha,
        })),
      );
      return {
        alumno: a,
        guardado: g ? { valorLiteral: g.valorLiteral as Literal | null, valorNumerico: num(g.valorNumerico), conclusion: g.conclusion } : null,
        sugerido,
        cantidadNotas: delAlumno.length,
      };
    }),
  }));
  return { curso, periodo, filas, escala, editable: ctx.rol === "profesor" && !periodo.cerrado && cierre === null };
}

const esquemaCalificacion = z.object({
  alumnoId: z.uuid(),
  competenciaId: z.uuid(),
  periodoId: z.uuid(),
  valor: z.string().max(10),
  conclusion: z.string().trim().max(1000, "La conclusión es muy larga (máximo 1000 caracteres)."),
});

export async function guardarCalificacionPeriodo(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  requireFeature(ctx, "notas");
  const d = esquemaCalificacion.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const comp = await ctx.db.competencia.findFirst({ where: { id: d.data.competenciaId } });
  if (!comp) return fallo("No encontramos esa competencia.");
  const curso = await cursoEscritura(ctx, comp.cursoId);
  const p = await periodoAbierto(ctx, d.data.periodoId, comp.cursoId);
  if (p.error) return fallo(p.error);
  const alumno = await ctx.db.alumno.findFirst({ where: { id: d.data.alumnoId, salonId: curso.salonId } });
  if (!alumno) return fallo("Ese alumno no está en este curso.");

  const v = interpretarValor(escalaDe(ctx), d.data.valor);
  if (!v.ok) return fallo(v.error);
  if (v.valor === null) {
    await ctx.db.calificacionPeriodo.deleteMany({ where: { alumnoId: alumno.id, competenciaId: comp.id, periodoId: d.data.periodoId } });
    return ok("Calificación borrada.");
  }
  if (requiereConclusion(v.valor.valorLiteral) && d.data.conclusion === "") {
    return fallo("Escribe la conclusión descriptiva: es obligatoria para B y C.");
  }
  await ctx.db.calificacionPeriodo.upsert({
    where: { alumnoId_competenciaId_periodoId: { alumnoId: alumno.id, competenciaId: comp.id, periodoId: d.data.periodoId } },
    create: { tenantId: ctx.tenant.id, alumnoId: alumno.id, competenciaId: comp.id, periodoId: d.data.periodoId, ...v.valor, conclusion: d.data.conclusion || null },
    update: { ...v.valor, conclusion: d.data.conclusion || null },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "calificacion_periodo", entidadId: comp.id, detalle: { alumnoId: alumno.id, periodoId: d.data.periodoId } });
  return ok("Calificación guardada.");
}

// ───────────── Vista de familia: notas de un alumno ─────────────

export type NotasDeAlumno = Awaited<ReturnType<typeof notasDeAlumno>>;

/**
 * Notas de un alumno por curso y competencia. Solo datos del propio alumno:
 * nunca promedios del salón, rankings ni comparaciones con otros alumnos.
 */
export async function notasDeAlumno(ctx: TenantContext, alumnoId: string, periodoId: string) {
  requireFeature(ctx, "notas");
  await requireAlumnoVisible(ctx, alumnoId);
  const alumno = await ctx.db.alumno.findFirst({ where: { id: alumnoId }, include: { salon: { select: { nombre: true } } } });
  const periodo = await ctx.db.periodo.findFirst({ where: { id: periodoId } });
  if (!alumno || !periodo) forbidden();
  const cursos = await ctx.db.curso.findMany({ where: { salonId: alumno.salonId }, orderBy: { nombre: "asc" } });
  const cursoIds = cursos.map((c) => c.id);
  const [competencias, evaluaciones, califs] = await Promise.all([
    ctx.db.competencia.findMany({ where: { cursoId: { in: cursoIds } }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
    ctx.db.evaluacion.findMany({
      where: { cursoId: { in: cursoIds }, periodoId, notas: { some: { alumnoId } } },
      include: { notas: { where: { alumnoId } } },
      orderBy: { fecha: "asc" },
    }),
    ctx.db.calificacionPeriodo.findMany({ where: { alumnoId, periodoId } }),
  ]);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "notas_alumno", entidadId: alumnoId, detalle: { periodoId } });
  return {
    alumno: { id: alumno.id, nombres: alumno.nombres, apellidos: alumno.apellidos, salon: alumno.salon.nombre },
    periodo,
    escala: escalaDe(ctx),
    cursos: cursos.map((curso) => ({
      id: curso.id,
      nombre: curso.nombre,
      competencias: competencias
        .filter((c) => c.cursoId === curso.id)
        .map((c) => {
          const g = califs.find((x) => x.competenciaId === c.id);
          return {
            id: c.id, nombre: c.nombre,
            calificacion: g ? { valorLiteral: g.valorLiteral as Literal | null, valorNumerico: num(g.valorNumerico) } as ValorCalificacion : null,
            conclusion: g?.conclusion ?? null,
          };
        }),
      evaluaciones: evaluaciones
        .filter((e) => e.cursoId === curso.id)
        .map((e) => ({
          id: e.id, titulo: e.titulo, fecha: e.fecha.toISOString().slice(0, 10), competencia: competencias.find((c) => c.id === e.competenciaId)?.nombre ?? null,
          valor: { valorLiteral: e.notas[0].valorLiteral as Literal | null, valorNumerico: num(e.notas[0].valorNumerico) } as ValorCalificacion,
          comentario: e.notas[0].comentario,
        })),
    })),
  };
}

/** Hijos o alumnos visibles para el usuario (selector de familia y de libreta). */
export async function alumnosVisibles(ctx: TenantContext) {
  const ids = await alumnoIdsVisibles(ctx);
  return ctx.db.alumno.findMany({
    where: { id: { in: ids }, estado: "activo" },
    select: { id: true, nombres: true, apellidos: true, salon: { select: { nombre: true } } },
    orderBy: [{ salon: { nombre: "asc" } }, { apellidos: "asc" }, { nombres: "asc" }],
  });
}
