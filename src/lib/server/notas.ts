import "server-only";
import { randomUUID } from "node:crypto";
import { forbidden } from "next/navigation";
import { z } from "zod";
import {
  INSTRUMENTOS, interpretarEntradaNota, interpretarValor, requiereConclusion, sugerirCalificacion, textoValor,
  type Escala, type Instrumento, type Literal, type Marca, type ValorCalificacion, type ValorNota,
} from "@/lib/calificaciones";
import { analizarNotasCsv, exportarNotasCsv, MAX_BYTES_CSV_NOTAS, type ResultadoNotasCsv } from "@/lib/notas-csv";
import { puedePublicarLibreta } from "@/lib/libreta-publicacion";
import { urlColegio } from "@/lib/dominio";
import { fechaDb } from "@/lib/fechas";
import { expiracionJustificacion, ultimoDiaJustificacion } from "@/lib/plazo-justificacion";
import { primerNombre } from "@/lib/nombres";
import { CANTIDAD_PERIODOS, NOMBRE_TIPO, TIPOS_PERIODO, TODOS_LOS_NIVELES, nivelesConOtroTipo, periodosSugeridos } from "@/lib/periodos-academicos";
import type { Nivel } from "@/generated/prisma/enums";
import { evaluacionEliminable, MENSAJE_EVALUACION_NO_ELIMINABLE, MENSAJE_MOTIVO_CORTO, motivoSuficiente } from "@/lib/integridad-notas";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { auditar } from "./auditoria";
import { guardarDesempenosEvaluacion, validarDesempenosEvaluacion } from "./cneb";
import { cursosDelDocente } from "./cursos";
import { destinatariosDeAlumno, encolarParaDestinatario, tieneCanalAviso, type Destinatario } from "./notificaciones/encolar";
import { conEnvio } from "./notificaciones/envios";
import { registrarEventoCorreccion, registrarEventoPublicacion } from "./eventos-academicos";
import { avisarCambioNota, datosHistorial, sincronizarNsp, textoDeNota } from "./nsp";
import { emitirLibretas } from "./libreta-emision";
import { requireFeature } from "./plan";
import { alumnoIdsVisibles, requireAlumnoVisible, requireCursoDelProfesor, requireRol, type TenantContext } from "./tenant";

export { cursosDelDocente };

const num = (d: { toString(): string } | null | undefined): number | null => (d === null || d === undefined ? null : Number(d.toString()));
const fechaDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const MENSAJE_CERRADO = "Este periodo está cerrado. Las notas ya no se pueden cambiar.";
const MENSAJE_SOLO_PROFESOR_RECUPERACION = "La recuperación la decide y la registra el profesor del curso, no el tutor del salón.";
const MENSAJE_CURSO_CERRADO = "Las notas de este curso ya están cerradas en este periodo. Dirección puede reabrirlas.";

function escalaDe(ctx: TenantContext): Escala {
  return ctx.tenant.escalaCalificacion;
}

// ───────────── Periodos ─────────────

/** Periodos del colegio; con `nivel`, solo los de ese nivel (cada nivel tiene su propia organización del año). */
export async function listarPeriodos(ctx: TenantContext, nivel?: Nivel) {
  requireFeature(ctx, "notas");
  return ctx.db.periodo.findMany({ where: nivel ? { niveles: { has: nivel } } : {}, orderBy: [{ anio: "desc" }, { tipo: "asc" }, { numero: "asc" }] });
}

const MENSAJE_OTRO_NIVEL = "Este periodo no es del nivel de este curso.";

/** Nivel del salón de un curso. */
async function nivelDelCurso(ctx: TenantContext, cursoId: string): Promise<Nivel | null> {
  const c = await ctx.db.curso.findFirst({ where: { id: cursoId }, select: { salon: { select: { nivel: true } } } });
  return c?.salon.nivel ?? null;
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
    tipo: z.enum(TIPOS_PERIODO),
    niveles: z.array(z.enum(TODOS_LOS_NIVELES as [Nivel, ...Nivel[]])).min(1, "Elige al menos un nivel.").default(TODOS_LOS_NIVELES),
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
  const delAnio = await ctx.db.periodo.findMany({ where: { anio: d.data.anio }, select: { tipo: true, niveles: true } });
  const choque = nivelesConOtroTipo(delAnio, d.data.tipo, d.data.niveles);
  if (choque.length) return fallo(`${nombresNiveles(choque)} ya ${choque.length === 1 ? "trabaja" : "trabajan"} con otro tipo de periodo en ${d.data.anio}. Cámbialo en «Organización del año».`);
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

const NOMBRE_NIVEL_PERIODO: Record<Nivel, string> = { inicial: "Inicial", primaria: "Primaria", secundaria: "Secundaria", academia: "Academia" };
const nombresNiveles = (ns: readonly Nivel[]) => ns.map((n) => NOMBRE_NIVEL_PERIODO[n]).join(", ").replace(/, ([^,]*)$/, " y $1");

/** ¿Hay notas, calificaciones o cierres de cursos del nivel en esos periodos? (no se cambia la organización con notas puestas) */
async function hayNotasDelNivel(ctx: TenantContext, periodoIds: string[], nivel: Nivel): Promise<boolean> {
  if (periodoIds.length === 0) return false;
  const delNivel = { curso: { salon: { nivel } } };
  const [evaluaciones, califs, cierres, emitidas] = await Promise.all([
    ctx.db.evaluacion.count({ where: { periodoId: { in: periodoIds }, ...delNivel } }),
    ctx.db.calificacionPeriodo.count({ where: { periodoId: { in: periodoIds }, alumno: { salon: { nivel } } } }),
    ctx.db.cierreCurso.count({ where: { periodoId: { in: periodoIds }, ...delNivel } }),
    // Las libretas emitidas no se borran (FK RESTRICT, specs/37): un periodo con libretas emitidas se conserva.
    ctx.db.libretaEmitida.count({ where: { periodoId: { in: periodoIds }, alumno: { salon: { nivel } } } }),
  ]);
  return evaluaciones + califs + cierres + emitidas > 0;
}

const esquemaOrganizacion = z.object({
  anio: z.coerce.number().int().min(2000).max(2100),
  nivel: z.enum(TODOS_LOS_NIVELES as [Nivel, ...Nivel[]], "Elige el nivel."),
  tipo: z.enum(TIPOS_PERIODO, "Elige bimestres, trimestres o semestres."),
});

/**
 * Organización del año de un nivel (specs/11): pasa el nivel a bimestres, trimestres o semestres. Si otro nivel ya usa
 * ese tipo, el nivel se suma a sus periodos (mismas fechas); si no, se crean con las fechas sugeridas. Deja los periodos
 * del tipo anterior (y borra los que quedan sin niveles), salvo que el nivel ya tenga notas en ellos.
 */
export async function organizarNivel(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["direccion"]);
  const d = esquemaOrganizacion.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const { anio, nivel, tipo } = d.data;
  const delAnio = await ctx.db.periodo.findMany({ where: { anio }, select: { id: true, tipo: true, numero: true, niveles: true } });
  const anteriores = delAnio.filter((p) => p.niveles.includes(nivel) && p.tipo !== tipo);
  if (delAnio.some((p) => p.niveles.includes(nivel) && p.tipo === tipo) && anteriores.length === 0) {
    return fallo(`${NOMBRE_NIVEL_PERIODO[nivel]} ya trabaja por ${NOMBRE_TIPO[tipo].plural.toLowerCase()} en ${anio}.`);
  }
  if (await hayNotasDelNivel(ctx, anteriores.map((p) => p.id), nivel)) {
    return fallo(`${NOMBRE_NIVEL_PERIODO[nivel]} ya tiene notas registradas en sus periodos de ${anio}. No se puede cambiar su organización.`);
  }

  const operaciones = [];
  for (const p of anteriores) {
    const quedan = p.niveles.filter((n) => n !== nivel);
    operaciones.push(quedan.length ? ctx.db.periodo.updateMany({ where: { id: p.id }, data: { niveles: quedan } }) : ctx.db.periodo.deleteMany({ where: { id: p.id } }));
  }
  for (const s of periodosSugeridos(anio, tipo)) {
    const existente = delAnio.find((p) => p.tipo === tipo && p.numero === s.numero);
    if (existente) {
      if (!existente.niveles.includes(nivel)) operaciones.push(ctx.db.periodo.updateMany({ where: { id: existente.id }, data: { niveles: [...existente.niveles, nivel] } }));
    } else {
      operaciones.push(ctx.db.periodo.create({ data: { tenantId: ctx.tenant.id, anio, tipo, numero: s.numero, nombre: s.nombre, inicio: fechaDate(s.inicio), fin: fechaDate(s.fin), niveles: [nivel] } }));
    }
  }
  await ctx.db.$transaction(operaciones);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "periodo", detalle: { anio, nivel, tipo } });
  const compartidos = delAnio.some((p) => p.tipo === tipo && !p.niveles.includes(nivel));
  return ok(
    `${NOMBRE_NIVEL_PERIODO[nivel]} trabajará por ${NOMBRE_TIPO[tipo].plural.toLowerCase()} en ${anio} (${CANTIDAD_PERIODOS[tipo]} periodos). ` +
      (compartidos ? "Usa las mismas fechas que los otros niveles con ese tipo." : "Revisa las fechas sugeridas y ajústalas si hace falta."),
  );
}

const esquemaFechas = z
  .object({
    nombre: z.string().trim().min(2, "Escribe el nombre del periodo.").max(60),
    inicio: z.iso.date("Elige la fecha de inicio."),
    fin: z.iso.date("Elige la fecha de fin."),
  })
  .refine((d) => d.fin >= d.inicio, { message: "La fecha de fin debe ser posterior al inicio.", path: ["fin"] });

/** Cambia el nombre y las fechas de un periodo (vale para todos los niveles que lo usan). */
export async function actualizarPeriodo(ctx: TenantContext, periodoId: string, entrada: unknown): Promise<Resultado> {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["direccion"]);
  const d = esquemaFechas.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const r = await ctx.db.periodo.updateMany({ where: { id: periodoId }, data: { nombre: d.data.nombre, inicio: fechaDate(d.data.inicio), fin: fechaDate(d.data.fin) } });
  if (r.count === 0) return fallo("No encontramos ese periodo.");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "periodo", entidadId: periodoId, detalle: d.data });
  return ok("Guardamos las fechas del periodo.");
}

// ───────────── Acceso a cursos y periodos ─────────────

/** Curso gestionable por el profesor (escritura). Dirección solo lee. */
export async function cursoEscritura(ctx: TenantContext, cursoId: string) {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["profesor"]);
  await requireCursoDelProfesor(ctx, cursoId);
  const curso = await ctx.db.curso.findFirst({ where: { id: cursoId } });
  if (!curso) forbidden();
  return curso;
}

export async function cursoLectura(ctx: TenantContext, cursoId: string) {
  requireFeature(ctx, "notas");
  requireRol(ctx, ["profesor", "direccion"]);
  await requireCursoDelProfesor(ctx, cursoId);
  const curso = await ctx.db.curso.findFirst({ where: { id: cursoId } });
  if (!curso) forbidden();
  return curso;
}

/** Periodo abierto y, si se indica el curso, curso sin cierre en ese periodo. Lo valida el servidor en toda escritura. */
export async function periodoAbierto(ctx: TenantContext, periodoId: string, cursoId?: string) {
  const periodo = await ctx.db.periodo.findFirst({ where: { id: periodoId } });
  if (!periodo) return { error: "No encontramos ese periodo." as const };
  if (cursoId) {
    const nivel = await nivelDelCurso(ctx, cursoId);
    if (!nivel || !periodo.niveles.includes(nivel)) return { error: MENSAJE_OTRO_NIVEL };
  }
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
  const nivel = await nivelDelCurso(ctx, cursoId);
  if (!nivel || !periodo.niveles.includes(nivel)) return fallo(MENSAJE_OTRO_NIVEL);
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
  const periodo = await ctx.db.periodo.findFirst({ where: { id: periodoId } });
  if (!periodo) forbidden();
  // Solo cuentan los cursos de los niveles que trabajan con este periodo.
  const [cursos, cierres] = await Promise.all([
    ctx.db.curso.findMany({ where: { salon: { archivadoAt: null, nivel: { in: periodo.niveles } } }, select: { id: true } }),
    ctx.db.cierreCurso.findMany({ where: { periodoId }, select: { cursoId: true } }),
  ]);
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
  // Emisión (specs/37): versión 1 congelada de la libreta de cada alumno, ANTES de marcar el periodo como publicado.
  // Idempotente (solo emite a los alumnos que aún no la tienen): si falla a medias, el periodo sigue sin publicar y el
  // siguiente intento completa las que faltan. Un reenvío también completa las faltantes.
  try {
    await emitirLibretas(ctx, periodoId);
  } catch (error) {
    console.error("[libreta] emisión incompleta del periodo", periodoId, error);
    return fallo("No pudimos emitir todas las libretas. Vuelve a intentarlo: las que ya se emitieron se conservan y completaremos las que faltan.");
  }
  if (!estado.publicadaAt) {
    // Reclama la publicación de forma atómica: si dos personas hacen clic a la vez, solo una encola.
    const r = await ctx.db.periodo.updateMany({ where: { id: periodoId, libretaPublicadaAt: null }, data: { libretaPublicadaAt: new Date() } });
    if (r.count === 0 && !opciones.reenviar) return fallo("La libreta de este periodo ya se publicó.");
  }

  const alumnos = await ctx.db.alumno.findMany({
    where: { estado: "activo", salon: { archivadoAt: null, nivel: { in: periodo.niveles }, cursos: { some: {} } } },
    select: { id: true, nombres: true },
    orderBy: { nombres: "asc" },
  });
  const porFamilia = new Map<string, { destinatario: Destinatario; hijos: string[] }>();
  for (const a of alumnos) {
    for (const d of await destinatariosDeAlumno(ctx.db, a.id)) {
      if (!tieneCanalAviso(d)) continue;
      const actual = porFamilia.get(d.apoderadoId) ?? { destinatario: d, hijos: [] };
      actual.hijos.push(primerNombre(a.nombres));
      porFamilia.set(d.apoderadoId, actual);
    }
  }
  const tituloEnvio = `Libreta: ${periodo.nombre} ${periodo.anio}`;
  await conEnvio(ctx.db, { tenantId: ctx.tenant.id, tipo: "libreta", titulo: tituloEnvio, creadoPorId: ctx.membership.id }, async () => {
    for (const { destinatario, hijos } of porFamilia.values()) {
      await encolarParaDestinatario(ctx.db, destinatario, {
        tenantId: ctx.tenant.id,
        tipo: "libreta",
        plantilla: "libreta_publicada",
        referenciaId: periodoId,
        payload: { colegio: ctx.tenant.nombre, alumno: unirNombres(hijos), periodo: `${periodo.nombre} ${periodo.anio}`, url: urlColegio(ctx.tenant.slug, "/libreta") },
      });
    }
  });
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
  instrumento: z.enum(INSTRUMENTOS, "Ese instrumento no existe.").optional().or(z.literal("").transform(() => undefined)),
  descripcion: z.string().trim().max(500, "La descripción es muy larga (máximo 500 caracteres).").optional(),
  /** Desempeños del CNEB que mide (specs/30): de la competencia elegida y del grado del salón. */
  desempenoIds: z.array(z.uuid("Algún desempeño no es válido.")).max(30, "Marca como máximo 30 desempeños por evaluación.").optional(),
});

const esquemaNuevaEvaluacion = esquemaEvaluacion.extend({
  /** Una prueba puede medir varias competencias: se crea una columna (evaluación) por competencia con el mismo título. */
  competenciaIds: z.array(z.uuid("Alguna competencia no es válida.")).max(12, "Elige como máximo 12 competencias.").optional(),
  /** Avisar a las familias del salón que la evaluación está programada (aviso `evaluacion_programada`). */
  avisar: z.boolean().optional(),
});

export async function crearEvaluacion(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  const d = esquemaNuevaEvaluacion.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  await cursoEscritura(ctx, d.data.cursoId);
  const p = await periodoAbierto(ctx, d.data.periodoId, d.data.cursoId);
  if (p.error) return fallo(p.error);
  const competenciaIds = [...new Set(d.data.competenciaIds ?? (d.data.competenciaId ? [d.data.competenciaId] : []))];
  if (competenciaIds.length > 0) {
    const n = await ctx.db.competencia.count({ where: { id: { in: competenciaIds }, cursoId: d.data.cursoId } });
    if (n !== competenciaIds.length) return fallo("Esa competencia no es de este curso.");
  }
  // Cada desempeño va a la evaluación de su competencia.
  const desempenoIds = d.data.desempenoIds ?? [];
  const deDesempeno = new Map(
    (await ctx.db.desempeno.findMany({ where: { id: { in: desempenoIds } }, select: { id: true, competenciaId: true } })).map((x) => [x.id, x.competenciaId]),
  );
  if (desempenoIds.length > 0 && competenciaIds.length === 0) return fallo("Elige la competencia antes de marcar desempeños.");
  if (desempenoIds.some((id) => !competenciaIds.includes(deDesempeno.get(id) ?? ""))) return fallo("Algún desempeño no es de esta competencia o del grado del salón.");
  const porCompetencia = (c: string | null) => desempenoIds.filter((id) => deDesempeno.get(id) === c);
  for (const c of competenciaIds) {
    const error = await validarDesempenosEvaluacion(ctx, d.data.cursoId, c, porCompetencia(c));
    if (error) return fallo(error);
  }
  // Una evaluación nueva nace «programada»: sus notas son borrador hasta que el profesor publica los resultados.
  const grupoId = randomUUID();
  const base = {
    tenantId: ctx.tenant.id, cursoId: d.data.cursoId, periodoId: d.data.periodoId, titulo: d.data.titulo, grupoId,
    fecha: fechaDate(d.data.fecha), peso: d.data.peso, instrumento: d.data.instrumento ?? null,
    descripcion: d.data.descripcion || null, estado: "programada" as const,
  };
  const destinos = competenciaIds.length > 0 ? competenciaIds : [null];
  const creadas: string[] = [];
  for (const competenciaId of destinos) {
    const e = await ctx.db.evaluacion.create({ data: { ...base, competenciaId } });
    creadas.push(e.id);
    const marcados = porCompetencia(competenciaId);
    if (marcados.length) await guardarDesempenosEvaluacion(ctx.db, ctx.tenant.id, e.id, marcados);
    await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "evaluacion", entidadId: e.id, detalle: { grupoId } });
  }
  // NSP automático (specs/37): quien faltó a la clase ese día queda con «No se presentó».
  const nsp = await sincronizarNsp(ctx.db, ctx.tenant, { evaluacionIds: creadas });
  const columnas = destinos.length > 1 ? `: una columna por cada una de sus ${destinos.length} competencias` : "";
  const conNsp = nsp.alumnosConNsp.length;
  const textoNsp = conNsp > 0 ? ` ${conNsp === 1 ? "1 alumno quedó" : `${conNsp} alumnos quedaron`} con NSP por inasistencia.` : "";
  if (!d.data.avisar) return ok(`Evaluación creada${columnas}.${textoNsp}`);
  const familias = await avisarFamilias(ctx, {
    cursoId: d.data.cursoId, grupoId, plantilla: "evaluacion_programada", titulo: `Evaluación programada: ${d.data.titulo}`,
    payload: { titulo: d.data.titulo, fecha: d.data.fecha, descripcion: d.data.descripcion || undefined },
  });
  return ok(`Evaluación creada${columnas}. ${textoFamilias(familias)}${textoNsp}`);
}

const textoFamilias = (n: number) => (n === 0 ? "Ninguna familia tiene avisos activos." : `Avisamos a ${n} ${n === 1 ? "familia" : "familias"}.`);

/**
 * Aviso académico de una evaluación a las familias: una fila por familia y canal con los nombres de sus hijos juntos
 * (`referenciaId = grupoId`). Con `alumnoIds`, solo a las familias de esos alumnos; si no, a las de los alumnos activos
 * del salón del curso. Devuelve cuántas familias tienen un canal activo.
 */
async function avisarFamilias(
  ctx: TenantContext,
  a: {
    cursoId: string; grupoId: string; plantilla: "evaluacion_programada"; titulo: string; alumnoIds?: string[];
    payload: { titulo: string; fecha: string; descripcion?: string };
  },
): Promise<number> {
  const curso = await ctx.db.curso.findFirst({ where: { id: a.cursoId }, select: { nombre: true, salonId: true } });
  if (!curso) return 0;
  const alumnos = await ctx.db.alumno.findMany({
    where: { salonId: curso.salonId, estado: "activo", ...(a.alumnoIds ? { id: { in: a.alumnoIds } } : {}) },
    select: { id: true, nombres: true },
    orderBy: { nombres: "asc" },
  });
  const porFamilia = new Map<string, { destinatario: Destinatario; hijos: string[] }>();
  for (const al of alumnos) {
    for (const dest of await destinatariosDeAlumno(ctx.db, al.id)) {
      if (!tieneCanalAviso(dest)) continue;
      const actual = porFamilia.get(dest.apoderadoId) ?? { destinatario: dest, hijos: [] };
      actual.hijos.push(primerNombre(al.nombres));
      porFamilia.set(dest.apoderadoId, actual);
    }
  }
  await conEnvio(ctx.db, { tenantId: ctx.tenant.id, tipo: "libreta", titulo: a.titulo, creadoPorId: ctx.membership.id }, async () => {
    for (const { destinatario, hijos } of porFamilia.values()) {
      await encolarParaDestinatario(ctx.db, destinatario, {
        tenantId: ctx.tenant.id,
        tipo: "libreta",
        plantilla: a.plantilla,
        referenciaId: a.grupoId,
        payload: { colegio: ctx.tenant.nombre, alumno: unirNombres(hijos), curso: curso.nombre, ...a.payload, url: urlColegio(ctx.tenant.slug, "/notas") },
      });
    }
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "enviar", entidad: a.plantilla, entidadId: a.grupoId, detalle: { familias: porFamilia.size } });
  return porFamilia.size;
}

/**
 * El profesor del curso publica los resultados de una evaluación (todas sus columnas): desde ahí la familia ve las notas.
 * No se avisa al instante: lo publicado entra en el resumen académico diario de cada alumno, a la hora que configuró el
 * colegio (specs/37). Publicar dos veces se rechaza. Se puede publicar con el curso o el periodo cerrados.
 */
export async function publicarEvaluacion(ctx: TenantContext, grupoId: string): Promise<Resultado> {
  requireFeature(ctx, "notas");
  const filas = await ctx.db.evaluacion.findMany({ where: { grupoId }, select: { id: true, cursoId: true, periodoId: true, titulo: true, estado: true } });
  if (filas.length === 0) return fallo("No encontramos esa evaluación.");
  const { cursoId } = filas[0];
  await cursoEscritura(ctx, cursoId);
  const nivel = await nivelDelCurso(ctx, cursoId);
  const periodo = await ctx.db.periodo.findFirst({ where: { id: filas[0].periodoId }, select: { niveles: true } });
  if (!nivel || !periodo?.niveles.includes(nivel)) return fallo(MENSAJE_OTRO_NIVEL);
  const conNota = await ctx.db.nota.count({ where: { evaluacionId: { in: filas.map((f) => f.id) } } });
  if (conNota === 0) return fallo("Pon al menos una nota antes de publicar los resultados.");
  const mensajeYa = "Los resultados ya se publicaron.";
  if (filas.every((f) => f.estado === "publicada")) return fallo(mensajeYa);
  // Reclamo atómico + outbox (specs/38): publicar y registrar el evento van en la MISMA transacción. Si dos clics llegan
  // a la vez, solo uno publica; las notificaciones las crea un worker aparte y la publicación no depende de él.
  const publicada = await ctx.db.$transaction(async (tx) => {
    const r = await tx.evaluacion.updateMany({ where: { grupoId, estado: "programada" }, data: { estado: "publicada", publicadaAt: new Date() } });
    if (r.count === 0) return false;
    await registrarEventoPublicacion(tx, { tenantId: ctx.tenant.id, grupoId, creadoPorId: ctx.membership.id });
    return true;
  });
  if (!publicada) return fallo(mensajeYa);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "evaluacion_publicada", entidadId: grupoId });
  return ok("Resultados publicados. Las familias ya pueden verlos y reciben una notificación en Khipu.");
}

/** Cambios de las notas de una evaluación (todas sus columnas), del más reciente al más antiguo. Profesor o dirección. */
export async function historialEvaluacion(ctx: TenantContext, grupoId: string) {
  const filas = await ctx.db.evaluacion.findMany({ where: { grupoId }, select: { id: true, cursoId: true, competencia: { select: { nombre: true } } } });
  if (filas.length === 0) forbidden();
  await cursoLectura(ctx, filas[0].cursoId);
  const cambios = await ctx.db.historialNota.findMany({
    where: { evaluacionId: { in: filas.map((f) => f.id) } },
    orderBy: { cambiadoAt: "desc" },
    take: 200,
    include: {
      alumno: { select: { nombres: true, apellidos: true } },
      cambiadoPor: { select: { user: { select: { nombres: true, apellidos: true } } } },
    },
  });
  return cambios.map((c) => ({
    id: c.id, cambiadoAt: c.cambiadoAt, alumno: `${c.alumno.apellidos}, ${c.alumno.nombres}`,
    competencia: filas.length > 1 ? (filas.find((f) => f.id === c.evaluacionId)?.competencia?.nombre ?? null) : null,
    anterior: c.valorAnterior, nuevo: c.valorNuevo,
    /** «Khipu» cuando lo hizo el sistema (NSP por asistencia, consecuencia por vencimiento). */
    por: c.cambiadoPor ? `${c.cambiadoPor.user.nombres} ${c.cambiadoPor.user.apellidos}`.trim() : "Khipu",
    tipo: c.tipo, campo: c.campo, motivo: c.motivo, publicada: c.publicada, justificacionId: c.justificacionId,
  }));
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
  // Sin `desempenoIds` se conservan los vinculados, salvo los que ya no son de la competencia elegida.
  const competenciaId = d.data.competenciaId;
  const desempenoIds = d.data.desempenoIds ?? (competenciaId
    ? (await ctx.db.evaluacionDesempeno.findMany({ where: { evaluacionId, desempeno: { competenciaId } }, select: { desempenoId: true } })).map((x) => x.desempenoId)
    : []);
  const errorDesempenos = await validarDesempenosEvaluacion(ctx, actual.cursoId, d.data.competenciaId ?? null, desempenoIds);
  if (errorDesempenos) return fallo(errorDesempenos);
  // Título, fecha, instrumento y descripción son de toda la evaluación (todas sus columnas); competencia y peso, de la columna.
  await ctx.db.evaluacion.updateMany({
    where: { grupoId: actual.grupoId },
    data: {
      titulo: d.data.titulo, fecha: fechaDate(d.data.fecha), instrumento: d.data.instrumento ?? null,
      ...(d.data.descripcion !== undefined ? { descripcion: d.data.descripcion || null } : {}),
    },
  });
  await ctx.db.evaluacion.updateMany({ where: { id: evaluacionId }, data: { competenciaId: d.data.competenciaId ?? null, peso: d.data.peso } });
  await guardarDesempenosEvaluacion(ctx.db, ctx.tenant.id, evaluacionId, desempenoIds);
  if (d.data.fecha !== actual.fecha.toISOString().slice(0, 10)) {
    // Cambió la fecha: el NSP se recalcula con la asistencia del nuevo día (specs/37).
    const grupo = await ctx.db.evaluacion.findMany({ where: { grupoId: actual.grupoId }, select: { id: true } });
    await sincronizarNsp(ctx.db, ctx.tenant, { evaluacionIds: grupo.map((g) => g.id) });
  }
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
  // Integridad (specs/11, specs/37): una actividad publicada o con historial, NSP, consecuencia o recuperación no se borra.
  const [historial, marcadas] = await Promise.all([
    ctx.db.historialNota.count({ where: { evaluacionId } }),
    ctx.db.nota.findMany({ where: { evaluacionId }, select: { marca: true, vencidaAt: true, recuperacion: true } }),
  ]);
  if (!evaluacionEliminable({ estado: actual.estado, tieneHistorial: historial > 0, notas: marcadas })) return fallo(MENSAJE_EVALUACION_NO_ELIMINABLE);
  try {
    // Condicionada al borrador; la FK RESTRICT de historial_notas cubre el historial creado entre la verificación y el borrado.
    const r = await ctx.db.evaluacion.deleteMany({ where: { id: evaluacionId, estado: { not: "publicada" } } });
    if (r.count === 0) return fallo(MENSAJE_EVALUACION_NO_ELIMINABLE);
  } catch (error) {
    if ((error as { code?: string }).code === "P2003" || String(error).includes("historial_notas_evaluacion_id_fkey")) return fallo(MENSAJE_EVALUACION_NO_ELIMINABLE);
    throw error;
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "evaluacion", entidadId: evaluacionId });
  return ok("Evaluación eliminada.");
}

// ───────────── Grilla de notas (profesor y dirección) ─────────────

export type GrillaNotas = Awaited<ReturnType<typeof grillaNotas>>;

export async function grillaNotas(ctx: TenantContext, cursoId: string, periodoId: string) {
  const curso = await cursoLectura(ctx, cursoId);
  const periodo = await ctx.db.periodo.findFirst({ where: { id: periodoId } });
  if (!periodo) forbidden();
  const nivelCurso = await nivelDelCurso(ctx, cursoId);
  if (!nivelCurso || !periodo.niveles.includes(nivelCurso)) forbidden();
  const [salon, alumnos, competencias, evaluaciones] = await Promise.all([
    ctx.db.salon.findFirst({ where: { id: curso.salonId } }),
    ctx.db.alumno.findMany({
      where: { salonId: curso.salonId, estado: "activo" },
      select: { id: true, nombres: true, apellidos: true },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    ctx.db.competencia.findMany({ where: { cursoId }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
    ctx.db.evaluacion.findMany({
      where: { cursoId, periodoId }, orderBy: [{ fecha: "asc" }, { titulo: "asc" }], include: { desempenos: { select: { desempenoId: true } } },
    }),
  ]);
  const [notas, cierre, conHistorial] = await Promise.all([
    ctx.db.nota.findMany({ where: { evaluacionId: { in: evaluaciones.map((e) => e.id) } } }),
    ctx.db.cierreCurso.findFirst({ where: { cursoId, periodoId }, select: { id: true } }),
    ctx.db.historialNota.groupBy({ by: ["evaluacionId"], where: { evaluacionId: { in: evaluaciones.map((e) => e.id) } } }),
  ]);
  const idsConHistorial = new Set(conHistorial.map((h) => h.evaluacionId));
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "notas_curso", entidadId: cursoId, detalle: { periodoId } });
  return {
    curso, salon, periodo, alumnos, competencias,
    evaluaciones: evaluaciones.map((e) => ({
      id: e.id, titulo: e.titulo, fecha: e.fecha.toISOString().slice(0, 10), peso: Number(e.peso), competenciaId: e.competenciaId,
      instrumento: e.instrumento as Instrumento | null,
      grupoId: e.grupoId, descripcion: e.descripcion, estado: e.estado, publicadaAt: e.publicadaAt,
      columna: nombreColumna(e, evaluaciones, competencias),
      desempenoIds: e.desempenos.map((x) => x.desempenoId),
      /** Se puede eliminar: borrador sin historial, NSP, consecuencia ni recuperación. */
      eliminable: evaluacionEliminable({ estado: e.estado, tieneHistorial: idsConHistorial.has(e.id), notas: notas.filter((n) => n.evaluacionId === e.id) }),
    })),
    notas: notas.map((n) => ({
      evaluacionId: n.evaluacionId, alumnoId: n.alumnoId, valorLiteral: n.valorLiteral as Literal | null, valorNumerico: num(n.valorNumerico), comentario: n.comentario,
      comentarioPrivado: n.comentarioPrivado, marca: n.marca as Marca | null,
    })),
    /** Estado de cada NSP y conflictos con la asistencia (specs/37), por `evaluacionId:alumnoId`. */
    estadosNsp: await estadosNspDeGrilla(ctx, evaluaciones, notas, alumnos.map((a) => a.id)),
    cursoCerrado: cierre !== null,
    editable: ctx.rol === "profesor" && !periodo.cerrado && cierre === null,
    escala: escalaDe(ctx),
    calculo: ctx.tenant.sugerenciaPeriodo,
  };
}

/**
 * Nombre único de la columna (CSV y rejilla): el título; si otra evaluación del periodo se llama igual (una prueba que
 * mide varias competencias), «título · competencia».
 */
function nombreColumna(
  e: { id: string; titulo: string; competenciaId: string | null },
  todas: { id: string; titulo: string }[],
  competencias: { id: string; nombre: string }[],
): string {
  const repetido = todas.some((x) => x.id !== e.id && x.titulo.trim().toLowerCase() === e.titulo.trim().toLowerCase());
  if (!repetido) return e.titulo;
  return `${e.titulo} · ${competencias.find((c) => c.id === e.competenciaId)?.nombre ?? "Sin competencia"}`;
}

const TIPOS_CORRECCION = ["correccion_digitacion", "cambio_asistencia", "otra"] as const;
export type TipoCorreccion = (typeof TIPOS_CORRECCION)[number];
export const NOMBRE_TIPO_CORRECCION: Record<TipoCorreccion, string> = {
  correccion_digitacion: "Corrección por error de digitación",
  cambio_asistencia: "Cambio asociado a asistencia",
  otra: "Otra modificación autorizada",
};

const esquemaNota = z.object({
  evaluacionId: z.uuid(),
  alumnoId: z.uuid(),
  valor: z.string().max(10),
  /** Obligatorio para cambiar una nota publicada, un NSP o una consecuencia por vencimiento (specs/37). */
  motivo: z.string().trim().max(300, "El motivo es muy largo (máximo 300 caracteres).").optional(),
  tipo: z.enum(TIPOS_CORRECCION).optional(),
  /** Recuperación: día en que el alumno rindió la actividad (por defecto, hoy). */
  fechaRecuperacion: z.iso.date().optional(),
});

/**
 * Guarda (o borra, si `valor` viene vacío) la nota de un alumno en una evaluación. «NE» = No entregó. Reglas (specs/37):
 * - En borrador se corrige libremente (historial tipo `registro`).
 * - Publicada: exige motivo y tipo; la familia recibe un aviso específico.
 * - NSP: solo se reemplaza si el profesor autorizó la recuperación (tipo `recuperacion`, guarda la fecha de recuperación
 *   y la justificación) o, si la asistencia estaba mal, con motivo. Borrar un NSP no se permite: lo quita la asistencia.
 * - Consecuencia por vencimiento: se cambia solo con motivo.
 * La nota y su historial se guardan en una sola transacción.
 */
export async function guardarNota(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  requireFeature(ctx, "notas");
  const d = esquemaNota.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const evaluacion = await ctx.db.evaluacion.findFirst({ where: { id: d.data.evaluacionId }, include: { curso: { select: { nombre: true } } } });
  if (!evaluacion) return fallo("No encontramos esa evaluación.");
  const curso = await cursoEscritura(ctx, evaluacion.cursoId);
  const p = await periodoAbierto(ctx, evaluacion.periodoId, evaluacion.cursoId);
  if (p.error) return fallo(p.error);
  const alumno = await ctx.db.alumno.findFirst({ where: { id: d.data.alumnoId, salonId: curso.salonId } });
  if (!alumno) return fallo("Ese alumno no está en este curso.");

  const v = interpretarEntradaNota(escalaDe(ctx), d.data.valor);
  if (!v.ok) return fallo(v.error);
  const antes = await ctx.db.nota.findFirst({ where: { evaluacionId: evaluacion.id, alumnoId: alumno.id } });
  const anterior = textoDeNota(antes);
  const nuevo = v.valor ? textoValor(v.valor) : v.marca ? textoValor({ valorLiteral: null, valorNumerico: null, marca: v.marca }) : null;
  if (anterior === nuevo) return ok();

  const publicada = evaluacion.estado === "publicada";
  const esNsp = antes?.marca === "nsp" && antes.valorLiteral === null && antes.valorNumerico === null;
  const esVencida = antes?.vencidaAt != null;
  const recuperacion = esNsp && antes?.recuperacion === "autorizada" && v.valor !== null;
  const motivo = d.data.motivo || null;
  let tipo: "registro" | "recuperacion" | TipoCorreccion = "registro";
  if (recuperacion) {
    // La recuperación la registra solo el profesor del curso, no el tutor del salón (specs/37).
    if (curso.profesorId !== ctx.membership.id) return fallo(MENSAJE_SOLO_PROFESOR_RECUPERACION);
    tipo = "recuperacion";
  } else if (esNsp || esVencida || publicada) {
    if (esNsp && v.valor === null && v.marca === null) return fallo("El NSP lo quita la asistencia: si el alumno sí estuvo, corrige la asistencia de ese día.");
    if (esNsp && antes?.recuperacion === "denegada" && !motivo) return fallo("No autorizaste la recuperación de este alumno. Para cambiar el NSP, escribe el motivo.");
    if (!motivo || !d.data.tipo) {
      return fallo(
        esNsp
          ? "Este alumno tiene NSP porque faltó. Para poner una nota, el tutor debe aprobar su justificación y tú autorizar la recuperación; si la asistencia estaba mal, indica el tipo y el motivo del cambio."
          : esVencida
            ? "Esta nota la puso Khipu porque venció el plazo para justificar. Para cambiarla, indica el tipo y el motivo."
            : "Estos resultados ya se publicaron: indica el tipo y el motivo del cambio.",
      );
    }
    // Corrección auditada: el motivo debe explicar algo (specs/37).
    if (!motivoSuficiente(motivo)) return fallo(MENSAJE_MOTIVO_CORTO);
    tipo = d.data.tipo;
  }
  const hoy = momentoHoy(ctx);
  const fechaRecuperacion = recuperacion ? (d.data.fechaRecuperacion ?? hoy) : null;
  if (fechaRecuperacion && fechaRecuperacion > hoy) return fallo("La fecha de recuperación no puede ser futura.");
  const motivoFinal = recuperacion ? (motivo ?? "Recuperación autorizada tras justificación aprobada.") : motivo;

  const datosValor = {
    valorLiteral: (v.valor?.valorLiteral ?? null) as Literal | null,
    valorNumerico: v.valor?.valorNumerico ?? null,
    marca: v.marca,
    vencidaAt: null,
    ...(fechaRecuperacion ? { fechaRecuperacion: fechaDb(fechaRecuperacion) } : {}),
    registradoPorId: ctx.membership.id,
  };
  await ctx.db.$transaction(async (tx) => {
    if (v.valor === null && v.marca === null) {
      await tx.nota.deleteMany({ where: { evaluacionId: evaluacion.id, alumnoId: alumno.id } });
    } else {
      await tx.nota.upsert({
        where: { evaluacionId_alumnoId: { evaluacionId: evaluacion.id, alumnoId: alumno.id } },
        create: { tenantId: ctx.tenant.id, evaluacionId: evaluacion.id, alumnoId: alumno.id, ...datosValor },
        update: datosValor,
      });
    }
    await tx.historialNota.create({
      data: datosHistorial({
        tenantId: ctx.tenant.id, evaluacionId: evaluacion.id, alumnoId: alumno.id, anterior, nuevo, tipo, motivo: motivoFinal,
        cambiadoPorId: ctx.membership.id, publicada, justificacionId: antes?.justificacionId ?? null,
      }),
    });
    // Publicada: evento de corrección en la misma transacción (bandeja + push; el correo sale aparte, specs/38).
    if (publicada) await registrarEventoCorreccion(tx, { tenantId: ctx.tenant.id, grupoId: evaluacion.grupoId, alumnoId: alumno.id, creadoPorId: ctx.membership.id });
  });
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "nota", entidadId: evaluacion.id,
    detalle: { alumnoId: alumno.id, tipo, ...(motivoFinal ? { motivo: motivoFinal } : {}) },
  });
  if (publicada) {
    await avisarCambioNota(ctx.db, ctx.tenant, {
      alumnoId: alumno.id, alumno: primerNombre(alumno.nombres), curso: evaluacion.curso.nombre, titulo: evaluacion.titulo,
      evaluacionId: evaluacion.id, motivo: tipo === "registro" ? "otra" : tipo,
    });
  }
  return ok();
}

/** Fecha de hoy en el colegio (AAAA-MM-DD). */
function momentoHoy(ctx: TenantContext): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ctx.tenant.zonaHoraria, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/**
 * El profesor del curso decide si autoriza la recuperación de una actividad con NSP justificado (specs/37). Solo una vez;
 * se registra en el historial. Autorizar habilita poner la nota en la actividad original; no autorizar deja el NSP.
 */
export async function decidirRecuperacion(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  requireFeature(ctx, "notas");
  const d = z.object({
    evaluacionId: z.uuid(), alumnoId: z.uuid(), decision: z.enum(["autorizada", "denegada"]),
    motivo: z.string().trim().max(300, "El motivo es muy largo (máximo 300 caracteres).").optional(),
  }).safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const evaluacion = await ctx.db.evaluacion.findFirst({ where: { id: d.data.evaluacionId } });
  if (!evaluacion) return fallo("No encontramos esa evaluación.");
  const curso = await cursoEscritura(ctx, evaluacion.cursoId);
  // Solo el profesor del curso decide: el tutor del salón no decide recuperaciones de cursos de otros docentes (specs/37).
  if (curso.profesorId !== ctx.membership.id) return fallo(MENSAJE_SOLO_PROFESOR_RECUPERACION);
  const p = await periodoAbierto(ctx, evaluacion.periodoId, evaluacion.cursoId);
  if (p.error) return fallo(p.error);
  const nota = await ctx.db.nota.findFirst({ where: { evaluacionId: evaluacion.id, alumnoId: d.data.alumnoId } });
  if (!nota || nota.marca !== "nsp" || nota.valorLiteral !== null || nota.valorNumerico !== null) return fallo("Esta actividad no tiene un NSP pendiente.");
  if (!nota.justificacionId) return fallo("La recuperación se decide cuando el tutor aprueba la justificación de la falta.");
  if (nota.recuperacion) return fallo("Ya registraste tu decisión sobre esta recuperación.");
  const texto = d.data.decision === "autorizada" ? "Autorizada" : "No autorizada";
  const hecho = await ctx.db.$transaction(async (tx) => {
    const r = await tx.nota.updateMany({
      where: { id: nota.id, recuperacion: null },
      data: { recuperacion: d.data.decision, recuperacionPorId: ctx.membership.id, recuperacionAt: new Date() },
    });
    if (r.count !== 1) return false;
    await tx.historialNota.create({
      data: datosHistorial({
        tenantId: ctx.tenant.id, evaluacionId: evaluacion.id, alumnoId: nota.alumnoId, anterior: null, nuevo: texto, campo: "recuperacion",
        tipo: "decision_recuperacion", motivo: d.data.motivo || null, cambiadoPorId: ctx.membership.id,
        publicada: evaluacion.estado === "publicada", justificacionId: nota.justificacionId,
      }),
    });
    return true;
  });
  if (!hecho) return fallo("Ya registraste tu decisión sobre esta recuperación.");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "recuperacion", entidadId: evaluacion.id, detalle: { alumnoId: nota.alumnoId, decision: d.data.decision } });
  return ok(d.data.decision === "autorizada" ? "Recuperación autorizada. Ya puedes poner la nota en esta actividad." : "Decisión registrada: el NSP se mantiene.");
}

export type EstadoNspCelda = {
  /** Estado de la justificación de la falta de ese día. */
  justificacion: "sin_solicitud" | "pendiente" | "aceptada" | "rechazada";
  /** Último día para justificar (AAAA-MM-DD). */
  venceEl: string;
  plazoVencido: boolean;
  recuperacion: "autorizada" | "denegada" | null;
  fechaRecuperacion: string | null;
  /** La falta viene de una incidencia o retiro anticipado. */
  incidencia: boolean;
  vencida: boolean;
};

/** Estado de cada NSP de la rejilla y conflictos (alumno con calificación pero ausente según la asistencia). */
async function estadosNspDeGrilla(
  ctx: TenantContext,
  evaluaciones: { id: string; cursoId: string; fecha: Date }[],
  notas: { evaluacionId: string; alumnoId: string; marca: string | null; vencidaAt: Date | null; recuperacion: string | null; fechaRecuperacion: Date | null; justificacionId: string | null; valorLiteral: string | null; valorNumerico: unknown }[],
  alumnoIds: string[],
): Promise<{ nsp: Record<string, EstadoNspCelda>; conflictos: string[] }> {
  const fechas = [...new Set(evaluaciones.map((e) => e.fecha.getTime()))].map((t) => new Date(t));
  if (fechas.length === 0 || alumnoIds.length === 0) return { nsp: {}, conflictos: [] };
  const asistencias = await ctx.db.asistencia.findMany({
    where: { alumnoId: { in: alumnoIds }, fecha: { in: fechas } },
    select: {
      alumnoId: true, fecha: true, ambito: true, estado: true, origen: true,
      justificaciones: { select: { estado: true }, orderBy: { createdAt: "desc" } },
    },
  });
  const ahora = new Date();
  const nsp: Record<string, EstadoNspCelda> = {};
  const conflictos: string[] = [];
  for (const e of evaluaciones) {
    const delDia = asistencias.filter((a) => a.fecha.getTime() === e.fecha.getTime());
    for (const alumnoId of alumnoIds) {
      const propias = delDia.filter((a) => a.alumnoId === alumnoId);
      const clase = propias.find((a) => a.ambito === e.cursoId);
      const ausente = clase ? clase.estado === "falta" : propias.find((a) => a.ambito === "dia")?.estado === "falta";
      const n = notas.find((x) => x.evaluacionId === e.id && x.alumnoId === alumnoId);
      const clave = `${e.id}:${alumnoId}`;
      if (n?.marca === "nsp") {
        const estados = propias.flatMap((a) => a.justificaciones.map((j) => j.estado));
        const justificacion = estados.includes("aceptada") ? "aceptada" : estados.includes("pendiente") ? "pendiente" : estados.includes("rechazada") ? "rechazada" : "sin_solicitud";
        const fecha = e.fecha.toISOString().slice(0, 10);
        nsp[clave] = {
          justificacion, venceEl: ultimoDiaJustificacion(fecha, ctx.tenant.plazoJustificacionDias),
          plazoVencido: expiracionJustificacion(fecha, ctx.tenant.plazoJustificacionDias, ctx.tenant.zonaHoraria) < ahora,
          recuperacion: n.recuperacion as EstadoNspCelda["recuperacion"],
          fechaRecuperacion: n.fechaRecuperacion ? n.fechaRecuperacion.toISOString().slice(0, 10) : null,
          incidencia: clase?.origen === "incidencia", vencida: n.vencidaAt !== null,
        };
      } else if (ausente && n && (n.valorLiteral !== null || n.valorNumerico !== null)) {
        conflictos.push(clave);
      }
    }
  }
  return { nsp, conflictos };
}

/** Observación de una nota (máx. 500 caracteres). La nota debe existir; vacío borra el comentario. */
export async function guardarComentarioNota(ctx: TenantContext, entrada: { evaluacionId: string; alumnoId: string; comentario: string; privado?: boolean }): Promise<Resultado> {
  requireFeature(ctx, "notas");
  const d = z
    .object({
      evaluacionId: z.uuid(), alumnoId: z.uuid(), comentario: z.string().trim().max(500, "La observación es muy larga (máximo 500 caracteres)."),
      /** Observación interna del profesor: la familia no la ve (specs/38). */
      privado: z.boolean().optional(),
    })
    .safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const evaluacion = await ctx.db.evaluacion.findFirst({ where: { id: d.data.evaluacionId } });
  if (!evaluacion) return fallo("No encontramos esa evaluación.");
  await cursoEscritura(ctx, evaluacion.cursoId);
  const p = await periodoAbierto(ctx, evaluacion.periodoId, evaluacion.cursoId);
  if (p.error) return fallo(p.error);
  const r = await ctx.db.nota.updateMany({
    where: { evaluacionId: evaluacion.id, alumnoId: d.data.alumnoId },
    data: { comentario: d.data.comentario || null, comentarioPrivado: d.data.privado ?? false, registradoPorId: ctx.membership.id },
  });
  if (r.count === 0) return fallo("Primero pon la nota; después puedes agregar una observación.");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "nota", entidadId: evaluacion.id, detalle: { alumnoId: d.data.alumnoId, comentario: true } });
  return ok(!d.data.comentario ? "Observación borrada." : d.data.privado ? "Observación guardada (solo para ti)." : "Observación guardada.");
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
    csv: exportarNotasCsv({ alumnos, evaluaciones: g.evaluaciones.map((e) => ({ id: e.id, titulo: e.columna })), notas: g.notas }),
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
  const r = analizarNotasCsv(texto, { escala: escalaDe(ctx), alumnos, evaluaciones: g.evaluaciones.map((e) => ({ id: e.id, titulo: e.columna })) });
  return { ...r, editable: motivoBloqueo === null, motivoBloqueo };
}

/** Guarda las notas válidas del CSV (las filas con error se omiten). No pisa cursos ni periodos cerrados. */
export async function importarNotas(ctx: TenantContext, cursoId: string, periodoId: string, texto: string): Promise<Resultado> {
  const curso = await cursoEscritura(ctx, cursoId);
  const p = await periodoAbierto(ctx, periodoId, cursoId);
  if (p.error) return fallo(p.error);
  const vista = await previsualizarImportacionNotas(ctx, cursoId, periodoId, texto);
  if (vista.cambios.length === 0) return fallo(vista.errores[0]?.mensaje ?? "No hay notas para importar.");
  // Las notas publicadas, los NSP y las consecuencias por vencimiento no se importan: se corrigen una por una, con motivo
  // (specs/37).
  const publicadas = new Set((await ctx.db.evaluacion.findMany({ where: { cursoId, periodoId, estado: "publicada" }, select: { id: true } })).map((e) => e.id));
  let protegidas = 0;
  let importadas = 0;
  for (const c of vista.cambios) {
    const antes = await ctx.db.nota.findFirst({ where: { evaluacionId: c.evaluacionId, alumnoId: c.alumnoId } });
    if (publicadas.has(c.evaluacionId) || antes?.marca || antes?.vencidaAt) {
      if (textoDeNota(antes) !== textoValor(c.valor)) protegidas += 1;
      continue;
    }
    const anterior = textoDeNota(antes);
    if (anterior === textoValor(c.valor)) continue;
    await ctx.db.$transaction(async (tx) => {
      await tx.nota.upsert({
        where: { evaluacionId_alumnoId: { evaluacionId: c.evaluacionId, alumnoId: c.alumnoId } },
        create: { tenantId: ctx.tenant.id, evaluacionId: c.evaluacionId, alumnoId: c.alumnoId, ...c.valor, registradoPorId: ctx.membership.id },
        update: { ...c.valor, registradoPorId: ctx.membership.id },
      });
      await tx.historialNota.create({
        data: datosHistorial({
          tenantId: ctx.tenant.id, evaluacionId: c.evaluacionId, alumnoId: c.alumnoId, anterior, nuevo: textoValor(c.valor),
          tipo: "registro", motivo: "Importación de notas", cambiadoPorId: ctx.membership.id, publicada: false,
        }),
      });
    });
    importadas += 1;
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "notas_curso", entidadId: curso.id, detalle: { periodoId, importadas, protegidas, errores: vista.errores.length } });
  const omitidas = vista.errores.length > 0 ? ` ${vista.errores.length} ${vista.errores.length === 1 ? "celda no se importó" : "celdas no se importaron"}.` : "";
  const textoProtegidas = protegidas > 0 ? ` ${protegidas} ${protegidas === 1 ? "nota no se cambió porque está publicada o tiene NSP" : "notas no se cambiaron porque están publicadas o tienen NSP"}: corrígelas una por una con su motivo.` : "";
  return ok(`Se importaron ${importadas} ${importadas === 1 ? "nota" : "notas"}.${omitidas}${textoProtegidas}`);
}

// ───────────── Calificaciones del periodo (lo que va a la libreta) ─────────────

export async function calificacionesPeriodo(ctx: TenantContext, cursoId: string, periodoId: string) {
  const curso = await cursoLectura(ctx, cursoId);
  const periodo = await ctx.db.periodo.findFirst({ where: { id: periodoId } });
  if (!periodo) forbidden();
  const nivelCurso = await nivelDelCurso(ctx, cursoId);
  if (!nivelCurso || !periodo.niveles.includes(nivelCurso)) forbidden();
  const escala = escalaDe(ctx);
  const [alumnos, competencias, guardadas, notas, cierre, vinculos] = await Promise.all([
    ctx.db.alumno.findMany({
      where: { salonId: curso.salonId, estado: "activo" },
      select: { id: true, nombres: true, apellidos: true },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    ctx.db.competencia.findMany({ where: { cursoId }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
    ctx.db.calificacionPeriodo.findMany({ where: { periodoId, competencia: { cursoId } } }),
    ctx.db.nota.findMany({
      where: { evaluacion: { cursoId, periodoId, competenciaId: { not: null } } },
      include: { evaluacion: { select: { competenciaId: true, peso: true, fecha: true, titulo: true } } },
      orderBy: [{ evaluacion: { fecha: "asc" } }],
    }),
    ctx.db.cierreCurso.findFirst({ where: { cursoId, periodoId }, select: { id: true } }),
    ctx.db.evaluacionDesempeno.findMany({
      where: { evaluacion: { cursoId, periodoId } },
      select: { evaluacionId: true, desempeno: { select: { id: true, descripcion: true, codigo: true, orden: true, competenciaId: true } } },
    }),
  ]);
  // Desempeños (specs/30) por evaluación: un alumno «fue evaluado» en un desempeño si tiene nota en una evaluación que lo mide.
  const desempenosPorEvaluacion = new Map<string, (typeof vinculos)[number]["desempeno"][]>();
  for (const v of vinculos) desempenosPorEvaluacion.set(v.evaluacionId, [...(desempenosPorEvaluacion.get(v.evaluacionId) ?? []), v.desempeno]);
  const filas = competencias.map((c) => ({
    competencia: c,
    alumnos: alumnos.map((a) => {
      const g = guardadas.find((x) => x.alumnoId === a.id && x.competenciaId === c.id);
      const delAlumno = notas.filter((n) => n.alumnoId === a.id && n.evaluacion.competenciaId === c.id);
      const evaluados = new Map<string, { id: string; descripcion: string; codigo: string | null; orden: number }>();
      for (const n of delAlumno.filter((x) => x.valorLiteral !== null || x.valorNumerico !== null)) {
        for (const d of desempenosPorEvaluacion.get(n.evaluacionId) ?? []) if (d.competenciaId === c.id) evaluados.set(d.id, d);
      }
      const sugerido = sugerirCalificacion(
        escala,
        // NSP y «No entregó» sin valor no son números: no entran en ningún cálculo (specs/37).
        delAlumno.filter((n) => n.valorLiteral !== null || n.valorNumerico !== null).map((n) => ({
          valorLiteral: n.valorLiteral as Literal | null, valorNumerico: num(n.valorNumerico), peso: Number(n.evaluacion.peso), fecha: n.evaluacion.fecha,
        })),
        ctx.tenant.sugerenciaPeriodo,
      );
      return {
        alumno: a,
        guardado: g ? { valorLiteral: g.valorLiteral as Literal | null, valorNumerico: num(g.valorNumerico), conclusion: g.conclusion } : null,
        sugerido,
        cantidadNotas: delAlumno.length,
        /** Las notas del periodo en esta competencia, para que el profesor decida la calificación. */
        notas: delAlumno.map((n) => ({
          titulo: n.evaluacion.titulo, fecha: n.evaluacion.fecha.toISOString().slice(0, 10),
          valor: { valorLiteral: n.valorLiteral as Literal | null, valorNumerico: num(n.valorNumerico), marca: n.marca as Marca | null } as ValorNota,
        })),
        desempenos: [...evaluados.values()].sort((x, y) => x.orden - y.orden).map(({ id, descripcion, codigo }) => ({ id, descripcion, codigo })),
      };
    }),
  }));
  return { curso, periodo, filas, escala, calculo: ctx.tenant.sugerenciaPeriodo, editable: ctx.rol === "profesor" && !periodo.cerrado && cierre === null };
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

  const emitida = await ctx.db.libretaEmitida.count({ where: { alumnoId: alumno.id, periodoId: d.data.periodoId } });
  if (emitida > 0) return fallo("La libreta de este periodo ya se emitió. Para corregirla, pide una rectificación desde la libreta del alumno.");
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

// ───────────── Informe de progreso (mitad del periodo) ─────────────

const MAX_INFORME = 600;
const textoInforme = z.string().trim().max(MAX_INFORME, `Cada parte del informe admite como máximo ${MAX_INFORME} caracteres.`);
const esquemaInforme = z.object({
  alumnoId: z.uuid(),
  competenciaId: z.uuid(),
  periodoId: z.uuid(),
  logros: textoInforme,
  mejorar: textoInforme,
  recomendaciones: textoInforme,
});

/**
 * Informe de progreso del curso en el periodo, por competencia y alumno: qué logró, qué necesita mejorar y qué se
 * recomienda reforzar. Incluye la calificación sugerida hasta hoy como referencia y si ya se compartió con las familias.
 */
export async function informesProgreso(ctx: TenantContext, cursoId: string, periodoId: string) {
  const c = await calificacionesPeriodo(ctx, cursoId, periodoId);
  const [informes, envio] = await Promise.all([
    ctx.db.informeProgreso.findMany({ where: { periodoId, competencia: { cursoId } } }),
    ctx.db.envioInformeProgreso.findFirst({
      where: { cursoId, periodoId },
      include: { enviadoPor: { select: { user: { select: { nombres: true, apellidos: true } } } } },
    }),
  ]);
  return {
    escala: c.escala,
    editable: c.editable,
    filas: c.filas.map((f) => ({
      competencia: f.competencia,
      alumnos: f.alumnos.map((a) => {
        const i = informes.find((x) => x.alumnoId === a.alumno.id && x.competenciaId === f.competencia.id);
        return {
          alumno: a.alumno, sugerido: a.sugerido, cantidadNotas: a.cantidadNotas, notas: a.notas,
          informe: i ? { logros: i.logros ?? "", mejorar: i.mejorar ?? "", recomendaciones: i.recomendaciones ?? "" } : null,
        };
      }),
    })),
    escritos: informes.length,
    envio: envio ? { enviadoAt: envio.enviadoAt, por: `${envio.enviadoPor.user.nombres} ${envio.enviadoPor.user.apellidos}`.trim() } : null,
  };
}

/** Guarda el informe de un alumno en una competencia; las tres partes vacías lo borran. Profesor del curso. */
export async function guardarInformeProgreso(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  requireFeature(ctx, "notas");
  const d = esquemaInforme.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const comp = await ctx.db.competencia.findFirst({ where: { id: d.data.competenciaId } });
  if (!comp) return fallo("No encontramos esa competencia.");
  const curso = await cursoEscritura(ctx, comp.cursoId);
  const p = await periodoAbierto(ctx, d.data.periodoId, comp.cursoId);
  if (p.error) return fallo(p.error);
  const alumno = await ctx.db.alumno.findFirst({ where: { id: d.data.alumnoId, salonId: curso.salonId, estado: "activo" } });
  if (!alumno) return fallo("Ese alumno no está en este curso.");
  const clave = { alumnoId: alumno.id, competenciaId: comp.id, periodoId: d.data.periodoId };
  const { logros, mejorar, recomendaciones } = d.data;
  if (!logros && !mejorar && !recomendaciones) {
    await ctx.db.informeProgreso.deleteMany({ where: clave });
    return ok("Informe borrado.");
  }
  const datos = { logros: logros || null, mejorar: mejorar || null, recomendaciones: recomendaciones || null, registradoPorId: ctx.membership.id };
  await ctx.db.informeProgreso.upsert({
    where: { alumnoId_competenciaId_periodoId: clave },
    create: { tenantId: ctx.tenant.id, ...clave, ...datos },
    update: datos,
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "informe_progreso", entidadId: comp.id, detalle: { alumnoId: alumno.id, periodoId: d.data.periodoId } });
  return ok("Informe guardado.");
}

/**
 * El profesor comparte el informe de progreso del curso con las familias: desde ahí lo ven en «Notas» y les llega un aviso
 * (solo a las familias de alumnos con informe). Se puede reenviar; los cambios posteriores se ven al momento.
 */
export async function compartirInformeProgreso(ctx: TenantContext, cursoId: string, periodoId: string, opciones: { reenviar?: boolean } = {}): Promise<Resultado> {
  const curso = await cursoEscritura(ctx, cursoId);
  const p = await periodoAbierto(ctx, periodoId, cursoId);
  if (!p.periodo) return fallo(p.error ?? MENSAJE_CERRADO);
  const alumnoIds = [...new Set((await ctx.db.informeProgreso.findMany({
    where: { periodoId, competencia: { cursoId }, alumno: { estado: "activo", salonId: curso.salonId } },
    select: { alumnoId: true },
  })).map((i) => i.alumnoId))];
  if (alumnoIds.length === 0) return fallo("Escribe al menos un informe antes de compartirlo con las familias.");
  const previo = await ctx.db.envioInformeProgreso.findFirst({ where: { cursoId, periodoId } });
  if (previo && !opciones.reenviar) return fallo("Este informe ya se compartió. Usa «Reenviar aviso» si quieres avisar otra vez.");
  if (!previo) {
    try {
      await ctx.db.envioInformeProgreso.create({ data: { tenantId: ctx.tenant.id, cursoId, periodoId, enviadoPorId: ctx.membership.id } });
    } catch {
      return fallo("Este informe ya se compartió.");
    }
  }
  const alumnos = await ctx.db.alumno.findMany({ where: { id: { in: alumnoIds } }, select: { id: true, nombres: true }, orderBy: { nombres: "asc" } });
  const porFamilia = new Map<string, { destinatario: Destinatario; hijos: string[] }>();
  for (const a of alumnos) {
    for (const dest of await destinatariosDeAlumno(ctx.db, a.id)) {
      if (!tieneCanalAviso(dest)) continue;
      const actual = porFamilia.get(dest.apoderadoId) ?? { destinatario: dest, hijos: [] };
      actual.hijos.push(primerNombre(a.nombres));
      porFamilia.set(dest.apoderadoId, actual);
    }
  }
  const periodo = `${p.periodo.nombre} ${p.periodo.anio}`;
  await conEnvio(ctx.db, { tenantId: ctx.tenant.id, tipo: "libreta", titulo: `Informe de progreso: ${curso.nombre} · ${periodo}`, creadoPorId: ctx.membership.id }, async () => {
    for (const { destinatario, hijos } of porFamilia.values()) {
      await encolarParaDestinatario(ctx.db, destinatario, {
        tenantId: ctx.tenant.id,
        tipo: "libreta",
        plantilla: "informe_progreso",
        referenciaId: cursoId,
        payload: { colegio: ctx.tenant.nombre, alumno: unirNombres(hijos), curso: curso.nombre, periodo, url: urlColegio(ctx.tenant.slug, "/notas") },
      });
    }
  });
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "enviar", entidad: "informe_progreso", entidadId: cursoId,
    detalle: { periodoId, familias: porFamilia.size, reenvio: Boolean(previo) },
  });
  const avisadas = porFamilia.size === 0 ? "Ninguna familia tiene avisos activos." : `Avisamos a ${porFamilia.size} ${porFamilia.size === 1 ? "familia" : "familias"}.`;
  return ok(`${previo ? "Aviso reenviado." : "Informe compartido."} ${avisadas}`);
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
  const alumno = await ctx.db.alumno.findFirst({ where: { id: alumnoId }, include: { salon: { select: { nombre: true, nivel: true } } } });
  const periodo = await ctx.db.periodo.findFirst({ where: { id: periodoId } });
  if (!alumno || !periodo || !periodo.niveles.includes(alumno.salon.nivel)) forbidden();
  const cursos = await ctx.db.curso.findMany({
    where: { salonId: alumno.salonId }, orderBy: { nombre: "asc" },
    include: { profesor: { select: { user: { select: { nombres: true, apellidos: true } } } } },
  });
  const cursoIds = cursos.map((c) => c.id);
  const [competencias, evaluaciones, califs, informes] = await Promise.all([
    ctx.db.competencia.findMany({ where: { cursoId: { in: cursoIds } }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
    ctx.db.evaluacion.findMany({
      // La familia y el alumno solo ven los resultados publicados; las notas de evaluaciones programadas son borrador.
      where: { cursoId: { in: cursoIds }, periodoId, estado: "publicada", notas: { some: { alumnoId } } },
      include: { notas: { where: { alumnoId } } },
      orderBy: { fecha: "asc" },
    }),
    ctx.db.calificacionPeriodo.findMany({ where: { alumnoId, periodoId } }),
    // Solo los informes de progreso que el profesor ya compartió con las familias.
    ctx.db.informeProgreso.findMany({
      where: { alumnoId, periodoId, competencia: { curso: { enviosInformeProgreso: { some: { periodoId } } } } },
    }),
  ]);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "notas_alumno", entidadId: alumnoId, detalle: { periodoId } });
  return {
    alumno: { id: alumno.id, nombres: alumno.nombres, apellidos: alumno.apellidos, salon: alumno.salon.nombre },
    periodo,
    escala: escalaDe(ctx),
    cursos: cursos.map((curso) => ({
      id: curso.id,
      nombre: curso.nombre,
      /** Profesor del curso (registro auxiliar publicado, specs/38). */
      profesor: curso.profesor ? `${curso.profesor.user.nombres} ${curso.profesor.user.apellidos}`.trim() : null,
      competencias: competencias
        .filter((c) => c.cursoId === curso.id)
        .map((c) => {
          const g = califs.find((x) => x.competenciaId === c.id);
          const i = informes.find((x) => x.competenciaId === c.id);
          return {
            id: c.id, nombre: c.nombre,
            calificacion: g ? { valorLiteral: g.valorLiteral as Literal | null, valorNumerico: num(g.valorNumerico) } as ValorCalificacion : null,
            conclusion: g?.conclusion ?? null,
            informe: i ? { logros: i.logros, mejorar: i.mejorar, recomendaciones: i.recomendaciones } : null,
          };
        }),
      evaluaciones: evaluaciones
        .filter((e) => e.cursoId === curso.id)
        .map((e) => ({
          id: e.id, grupoId: e.grupoId, titulo: e.titulo, fecha: e.fecha.toISOString().slice(0, 10), competencia: competencias.find((c) => c.id === e.competenciaId)?.nombre ?? null,
          instrumento: e.instrumento as Instrumento | null,
          valor: { valorLiteral: e.notas[0].valorLiteral as Literal | null, valorNumerico: num(e.notas[0].valorNumerico), marca: e.notas[0].marca as Marca | null } as ValorNota,
          // Las observaciones privadas del profesor nunca salen del servidor hacia la familia (specs/38).
          comentario: e.notas[0].comentarioPrivado ? null : e.notas[0].comentario,
          /** Consecuencia por vencimiento del plazo de justificación o recuperación registrada (specs/37). */
          vencida: e.notas[0].vencidaAt !== null,
          fechaRecuperacion: e.notas[0].fechaRecuperacion ? e.notas[0].fechaRecuperacion.toISOString().slice(0, 10) : null,
        })),
    })),
  };
}

/** Hijos o alumnos visibles para el usuario (selector de familia y de libreta). */
export async function alumnosVisibles(ctx: TenantContext) {
  const ids = await alumnoIdsVisibles(ctx);
  return ctx.db.alumno.findMany({
    where: { id: { in: ids }, estado: "activo" },
    select: { id: true, nombres: true, apellidos: true, salon: { select: { nombre: true, nivel: true } } },
    orderBy: [{ salon: { nombre: "asc" } }, { apellidos: "asc" }, { nombres: "asc" }],
  });
}
