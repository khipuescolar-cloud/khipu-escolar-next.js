import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { isoDeFechaDb, sumarDias } from "@/lib/fechas";
import type { Escala } from "@/lib/calificaciones";
import {
  ausentismoCronico, avanceRegistro, COMPETENCIAS_RIESGO, conteoVacio, CORTE_VIGESIMAL, distribucionVacia, inicioDiaEnZonaIso,
  rankingSalones, resolverPeriodo, sumarDistribuciones, tendenciaSemanal, umbralValido,
  type AlumnoAsistencia, type AvanceCurso, type Distribucion, type FilaCronica, type FilaSalonAsistencia, type Nivel,
  type PeriodoOpcion, type PeriodoTablero, type PuntoSemana,
} from "@/lib/tablero";
import type { EstadoRegistro } from "@/lib/reportes-asistencia";
import { hoyDelColegio } from "./asistencia";
import { auditar } from "./auditoria";
import { requireFeature } from "./plan";
import { diasHabiles, hastaEfectivoDe } from "./reportes-asistencia";
import { whereSalonActivo } from "./salones-activos";
import { requireRol, type TenantContext } from "./tenant";

// Tablero de dirección (specs/33-tablero-direccion.md). Solo lectura, sin tablas propias.
// Las sumas se hacen en SQL (una fila por día/estado, alumno/estado, curso/nivel), nunca trayendo todas las filas al servidor.
// El SQL crudo no pasa por el aislamiento automático de `ctx.db`: TODA consulta lleva `tenant_id = ctx.tenant.id` a mano.

export type FilaRendimiento = { id: string; nombre: string; distribucion: Distribucion; total: number; logroEsperado: number | null };
export type FilaRiesgo = { alumnoId: string; nombre: string; salonId: string; salon: string; competenciasEnRiesgo: number };
export type FilaAvanceCurso = { cursoId: string; curso: string; salon: string; profesor: string | null; cerrado: boolean } & AvanceCurso;
export type FilaAvanceProfesor = { profesor: string; cursos: number } & AvanceCurso;
export type FilaTareasCurso = { cursoId: string; curso: string; salon: string; tareas: number };

export type IndicadoresTablero = {
  colegio: string;
  periodo: PeriodoTablero;
  periodos: PeriodoOpcion[];
  /** Último día contado: nunca después de hoy. */
  hastaEfectivo: string;
  umbral: number;
  escala: Escala;
  asistencia: {
    diasHabiles: number;
    alumnos: number;
    porcentaje: number | null;
    registros: number;
    tardanzas: number;
    faltas: number;
    semanas: PuntoSemana[];
    salones: FilaSalonAsistencia[];
    cronicos: FilaCronica[];
    totalCronicos: number;
  };
  justificacionesPendientes: number;
  rendimiento: {
    /** De dónde salen las calificaciones: las del periodo (cierre) o, si aún no hay, las notas de las evaluaciones. */
    origen: "calificaciones" | "notas" | "sin_datos";
    total: Distribucion;
    logroEsperado: number | null;
    porSalon: FilaRendimiento[];
    porCurso: (FilaRendimiento & { salon: string })[];
    enRiesgo: FilaRiesgo[];
    totalEnRiesgo: number;
  };
  avance: { porCurso: FilaAvanceCurso[]; porProfesor: FilaAvanceProfesor[]; total: AvanceCurso };
  tareas: { total: number; porCurso: FilaTareasCurso[] };
  avisos: { enviados: number; abiertos: number; conError: number; pendientes: number };
  reuniones: { proximas: number; siguientes: { id: string; titulo: string; inicio: Date }[] };
};

const MAX_LISTA = 30;
const num = (v: unknown) => Number(v);

/** Solo dirección (specs/33). El administrativo no ve notas de alumnos, así que tampoco el tablero. */
export function requireTablero(ctx: TenantContext) {
  requireFeature(ctx, "tablero");
  requireRol(ctx, ["direccion"]);
}

export type ParametrosTablero = { p?: string | null; umbral?: string | null };

// ───────────── SQL ─────────────

/** Un registro por alumno y día, con la misma regla que los reportes (specs/27): prevalece el ingreso al colegio (`ambito = 'dia'`); si no, el primero por hora. */
function registrosDelDia(tenantId: string, dias: string[]) {
  return Prisma.sql`
    reg AS (
      SELECT DISTINCT ON (a.alumno_id, a.fecha) a.alumno_id, a.fecha, a.estado::text AS estado
      FROM asistencias a
      JOIN alumnos al ON al.id = a.alumno_id AND al.tenant_id = a.tenant_id AND al.estado = 'activo'
      JOIN salones s ON s.id = al.salon_id AND s.archivado_at IS NULL
      WHERE a.tenant_id = ${tenantId}::uuid AND a.fecha = ANY(${dias}::date[])
      ORDER BY a.alumno_id, a.fecha, (a.ambito = 'dia') DESC, a.hora ASC
    )`;
}

/** Calificaciones del periodo (una por alumno y competencia) o, si aún no hay, las notas de sus evaluaciones. */
function valoresDelPeriodo(tenantId: string, periodoId: string, origen: "calificaciones" | "notas") {
  const base = origen === "calificaciones"
    ? Prisma.sql`
        SELECT cp.alumno_id, c.id AS curso_id, c.salon_id, cp.competencia_id AS unidad_id, cp.valor_literal::text AS literal, cp.valor_numerico::float8 AS numerico
        FROM calificaciones_periodo cp
        JOIN competencias co ON co.id = cp.competencia_id
        JOIN cursos c ON c.id = co.curso_id
        WHERE cp.tenant_id = ${tenantId}::uuid AND cp.periodo_id = ${periodoId}::uuid`
    : Prisma.sql`
        SELECT n.alumno_id, c.id AS curso_id, c.salon_id, COALESCE(e.competencia_id, e.id) AS unidad_id, n.valor_literal::text AS literal, n.valor_numerico::float8 AS numerico
        FROM notas n
        JOIN evaluaciones e ON e.id = n.evaluacion_id
        JOIN cursos c ON c.id = e.curso_id
        WHERE n.tenant_id = ${tenantId}::uuid AND e.periodo_id = ${periodoId}::uuid`;
  return Prisma.sql`
    val AS (
      SELECT v.alumno_id, v.curso_id, v.salon_id, v.unidad_id,
        CASE WHEN v.literal IS NOT NULL THEN v.literal
             WHEN v.numerico >= ${CORTE_VIGESIMAL.AD} THEN 'AD'
             WHEN v.numerico >= ${CORTE_VIGESIMAL.A} THEN 'A'
             WHEN v.numerico >= ${CORTE_VIGESIMAL.B} THEN 'B'
             WHEN v.numerico IS NOT NULL THEN 'C' END AS nivel
      FROM (${base}) v
      JOIN alumnos al ON al.id = v.alumno_id AND al.estado = 'activo'
      JOIN salones s ON s.id = v.salon_id AND s.archivado_at IS NULL
    )`;
}

// ───────────── Indicadores ─────────────

export async function opcionesDePeriodo(ctx: TenantContext): Promise<PeriodoOpcion[]> {
  const periodos = await ctx.db.periodo.findMany({
    where: { anio: Number(hoyDelColegio(ctx).isoFecha.slice(0, 4)) },
    orderBy: { inicio: "asc" },
    select: { id: true, nombre: true, inicio: true, fin: true },
  });
  return periodos.map((p) => ({ id: p.id, nombre: p.nombre, inicio: isoDeFechaDb(p.inicio), fin: isoDeFechaDb(p.fin) }));
}

export async function indicadoresTablero(ctx: TenantContext, parametros: ParametrosTablero = {}): Promise<IndicadoresTablero> {
  requireTablero(ctx);
  const hoy = hoyDelColegio(ctx).isoFecha;
  const periodos = await opcionesDePeriodo(ctx);
  const periodo = resolverPeriodo(parametros.p, hoy, periodos);
  const umbral = umbralValido(parametros.umbral);
  const hastaEfectivo = hastaEfectivoDe(ctx, periodo.hasta);
  const tid = ctx.tenant.id;
  const ahora = new Date();
  const zona = ctx.tenant.zonaHoraria;
  const rangoCreacion = { gte: inicioDiaEnZonaIso(periodo.desde, zona), lt: inicioDiaEnZonaIso(sumarDias(hastaEfectivo, 1), zona) };
  const sinSoporte = { not: "soporte" as const };
  const ref = periodo.referencia;

  const [dias, salones, alumnos] = await Promise.all([
    diasHabiles(ctx, periodo.desde, hastaEfectivo),
    ctx.db.salon.findMany({
      where: whereSalonActivo,
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, cursos: { select: { id: true, nombre: true, profesor: { select: { user: { select: { nombres: true, apellidos: true } } } } } } },
    }),
    ctx.db.alumno.findMany({
      where: { estado: "activo", salon: whereSalonActivo },
      select: { id: true, nombres: true, apellidos: true, salonId: true },
    }),
  ]);

  const salonPorId = new Map(salones.map((s) => [s.id, s]));
  const alumnoPorId = new Map(alumnos.map((a) => [a.id, a]));
  const alumnosPorSalon = new Map<string, number>();
  for (const a of alumnos) alumnosPorSalon.set(a.salonId, (alumnosPorSalon.get(a.salonId) ?? 0) + 1);
  const cursos = salones.flatMap((s) => s.cursos.map((c) => ({ ...c, salonId: s.id, salon: s.nombre })));
  const cursoPorId = new Map(cursos.map((c) => [c.id, c]));
  const nombreAlumno = (a: { apellidos: string; nombres: string }) => `${a.apellidos}, ${a.nombres}`;

  // Origen de las notas: calificaciones del periodo si hay; si no, notas de las evaluaciones.
  let origen: IndicadoresTablero["rendimiento"]["origen"] = "sin_datos";
  if (ref) {
    if ((await ctx.db.calificacionPeriodo.count({ where: { periodoId: ref.id } })) > 0) origen = "calificaciones";
    else if ((await ctx.db.nota.count({ where: { evaluacion: { periodoId: ref.id } } })) > 0) origen = "notas";
  }
  const valores = ref && origen !== "sin_datos" ? valoresDelPeriodo(tid, ref.id, origen) : null;

  const [porDia, porAlumno, rendCurso, riesgo, evaluacionesPorCurso, notasPorCurso, cierres, tareasPorCurso, pendientes, enviados, abiertos, conError, pendAvisos, proximas, siguientes] = await Promise.all([
    dias.length === 0
      ? Promise.resolve([] as { fecha: string; estado: string; n: number }[])
      : ctx.db.$queryRaw<{ fecha: string; estado: string; n: number }[]>`WITH ${registrosDelDia(tid, dias)} SELECT fecha::text AS fecha, estado, count(*)::int AS n FROM reg GROUP BY 1, 2`,
    dias.length === 0
      ? Promise.resolve([] as { alumno_id: string; estado: string; n: number }[])
      : ctx.db.$queryRaw<{ alumno_id: string; estado: string; n: number }[]>`WITH ${registrosDelDia(tid, dias)} SELECT alumno_id::text AS alumno_id, estado, count(*)::int AS n FROM reg GROUP BY 1, 2`,
    valores
      ? ctx.db.$queryRaw<{ curso_id: string; salon_id: string; nivel: Nivel; n: number }[]>`WITH ${valores} SELECT curso_id::text AS curso_id, salon_id::text AS salon_id, nivel, count(*)::int AS n FROM val WHERE nivel IS NOT NULL GROUP BY 1, 2, 3`
      : Promise.resolve([]),
    valores
      ? ctx.db.$queryRaw<{ alumno_id: string; n: number }[]>`WITH ${valores} SELECT alumno_id::text AS alumno_id, count(DISTINCT unidad_id)::int AS n FROM val WHERE nivel = 'C' GROUP BY 1 HAVING count(DISTINCT unidad_id) >= ${COMPETENCIAS_RIESGO} ORDER BY n DESC`
      : Promise.resolve([]),
    ref ? ctx.db.evaluacion.groupBy({ by: ["cursoId"], where: { periodoId: ref.id }, _count: { _all: true } }) : Promise.resolve([]),
    ref
      ? ctx.db.$queryRaw<{ curso_id: string; n: number }[]>`SELECT e.curso_id::text AS curso_id, count(n.id)::int AS n FROM evaluaciones e JOIN notas n ON n.evaluacion_id = e.id WHERE e.tenant_id = ${tid}::uuid AND e.periodo_id = ${ref.id}::uuid AND (n.valor_literal IS NOT NULL OR n.valor_numerico IS NOT NULL) GROUP BY 1`
      : Promise.resolve([]),
    ref ? ctx.db.cierreCurso.findMany({ where: { periodoId: ref.id }, select: { cursoId: true } }) : Promise.resolve([]),
    ctx.db.tarea.groupBy({ by: ["cursoId"], where: { createdAt: rangoCreacion }, _count: { _all: true } }),
    ctx.db.justificacion.count({ where: { estado: "pendiente" } }),
    ctx.db.aviso.count({ where: { createdAt: rangoCreacion, tipo: sinSoporte, enviadoAt: { not: null } } }),
    ctx.db.aviso.count({ where: { createdAt: rangoCreacion, tipo: sinSoporte, abiertoAt: { not: null } } }),
    ctx.db.aviso.count({ where: { createdAt: rangoCreacion, tipo: sinSoporte, estado: { in: ["error", "rebotado", "queja"] } } }),
    ctx.db.aviso.count({ where: { createdAt: rangoCreacion, tipo: sinSoporte, estado: { in: ["pendiente", "enviando"] } } }),
    ctx.db.reunion.count({ where: { estado: "programada", inicio: { gte: ahora } } }),
    ctx.db.reunion.findMany({ where: { estado: "programada", inicio: { gte: ahora } }, orderBy: { inicio: "asc" }, take: 3, select: { id: true, titulo: true, inicio: true } }),
  ]);

  // Asistencia
  const conteoPorAlumno = new Map<string, ReturnType<typeof conteoVacio>>();
  for (const f of porAlumno) {
    const c = conteoPorAlumno.get(f.alumno_id) ?? conteoVacio();
    c[f.estado as EstadoRegistro] += num(f.n);
    conteoPorAlumno.set(f.alumno_id, c);
  }
  const asistenciaAlumnos: AlumnoAsistencia[] = alumnos.map((a) => ({
    alumnoId: a.id, nombre: nombreAlumno(a), salonId: a.salonId, salon: salonPorId.get(a.salonId)?.nombre ?? "", conteo: conteoPorAlumno.get(a.id) ?? conteoVacio(),
  }));
  const semanas = tendenciaSemanal(porDia.map((f) => ({ fecha: f.fecha, estado: f.estado as EstadoRegistro, n: num(f.n) })));
  const totalConteo = asistenciaAlumnos.reduce((t, a) => { for (const e of Object.keys(t) as EstadoRegistro[]) t[e] += a.conteo[e]; return t; }, conteoVacio());
  const registros = totalConteo.llego + totalConteo.tarde + totalConteo.falta + totalConteo.problema;
  const cronicos = ausentismoCronico(asistenciaAlumnos, umbral);

  // Rendimiento
  const distPorSalon = new Map<string, Distribucion>();
  const distPorCurso = new Map<string, Distribucion>();
  for (const f of rendCurso) {
    for (const [mapa, id] of [[distPorSalon, f.salon_id], [distPorCurso, f.curso_id]] as const) {
      const d = mapa.get(id) ?? distribucionVacia();
      d[f.nivel] += num(f.n);
      mapa.set(id, d);
    }
  }
  const fila = (id: string, nombre: string, d: Distribucion): FilaRendimiento => {
    const total = d.AD + d.A + d.B + d.C;
    return { id, nombre, distribucion: d, total, logroEsperado: total === 0 ? null : Math.round(((d.AD + d.A) / total) * 1000) / 10 };
  };
  const totalDist = sumarDistribuciones([...distPorSalon.values()]);
  const enRiesgo = riesgo.flatMap<FilaRiesgo>((r) => {
    const a = alumnoPorId.get(r.alumno_id);
    return a ? [{ alumnoId: a.id, nombre: nombreAlumno(a), salonId: a.salonId, salon: salonPorId.get(a.salonId)?.nombre ?? "", competenciasEnRiesgo: num(r.n) }] : [];
  });

  // Avance de registro
  const evaluaciones = new Map(evaluacionesPorCurso.map((e) => [e.cursoId, e._count._all]));
  const notas = new Map(notasPorCurso.map((n) => [n.curso_id, num(n.n)]));
  const cerrados = new Set(cierres.map((c) => c.cursoId));
  const avanceCursos: FilaAvanceCurso[] = cursos
    .map((c) => ({
      cursoId: c.id, curso: c.nombre, salon: c.salon, cerrado: cerrados.has(c.id),
      profesor: c.profesor ? `${c.profesor.user.nombres} ${c.profesor.user.apellidos}` : null,
      ...avanceRegistro(evaluaciones.get(c.id) ?? 0, alumnosPorSalon.get(c.salonId) ?? 0, notas.get(c.id) ?? 0),
    }))
    .sort((a, b) => (a.porcentaje ?? -1) - (b.porcentaje ?? -1) || a.salon.localeCompare(b.salon, "es") || a.curso.localeCompare(b.curso, "es"));
  const profesores = new Map<string, FilaAvanceCurso[]>();
  for (const c of avanceCursos) profesores.set(c.profesor ?? "Sin profesor asignado", [...(profesores.get(c.profesor ?? "Sin profesor asignado") ?? []), c]);
  const sumaAvance = (lista: FilaAvanceCurso[]): AvanceCurso => {
    const e = lista.reduce((s, c) => s + c.esperadas, 0);
    const r = lista.reduce((s, c) => s + c.registradas, 0);
    return { evaluaciones: lista.reduce((s, c) => s + c.evaluaciones, 0), alumnos: 0, registradas: r, esperadas: e, porcentaje: e === 0 ? null : Math.min(100, Math.round((r / e) * 1000) / 10) };
  };
  const porProfesor = [...profesores.entries()]
    .map(([profesor, lista]) => ({ profesor, cursos: lista.length, ...sumaAvance(lista) }))
    .sort((a, b) => (a.porcentaje ?? -1) - (b.porcentaje ?? -1) || a.profesor.localeCompare(b.profesor, "es"));

  // Tareas
  const tareas = tareasPorCurso
    .flatMap<FilaTareasCurso>((t) => {
      const c = cursoPorId.get(t.cursoId);
      return c ? [{ cursoId: c.id, curso: c.nombre, salon: c.salon, tareas: t._count._all }] : [];
    })
    .sort((a, b) => b.tareas - a.tareas || a.salon.localeCompare(b.salon, "es"));

  await auditar({ tenantId: tid, actorId: ctx.user.id, accion: "ver", entidad: "tablero", entidadId: tid, detalle: { periodo: periodo.clave, desde: periodo.desde, hasta: hastaEfectivo } });

  return {
    colegio: ctx.tenant.nombre,
    periodo, periodos, hastaEfectivo, umbral,
    escala: ctx.tenant.escalaCalificacion as Escala,
    asistencia: {
      diasHabiles: dias.length,
      alumnos: alumnos.length,
      porcentaje: registros === 0 ? null : Math.round(((totalConteo.llego + totalConteo.tarde) / registros) * 1000) / 10,
      registros, tardanzas: totalConteo.tarde, faltas: totalConteo.falta,
      semanas,
      salones: rankingSalones(salones.map((s) => ({ salonId: s.id, salon: s.nombre })), asistenciaAlumnos),
      cronicos: cronicos.slice(0, MAX_LISTA),
      totalCronicos: cronicos.length,
    },
    justificacionesPendientes: pendientes,
    rendimiento: {
      origen, total: totalDist,
      logroEsperado: fila("", "", totalDist).logroEsperado,
      porSalon: salones.flatMap((s) => (distPorSalon.has(s.id) ? [fila(s.id, s.nombre, distPorSalon.get(s.id)!)] : [])),
      porCurso: cursos.flatMap((c) => (distPorCurso.has(c.id) ? [{ ...fila(c.id, c.nombre, distPorCurso.get(c.id)!), salon: c.salon }] : [])),
      enRiesgo: enRiesgo.slice(0, MAX_LISTA),
      totalEnRiesgo: enRiesgo.length,
    },
    avance: { porCurso: avanceCursos, porProfesor, total: sumaAvance(avanceCursos) },
    tareas: { total: tareas.reduce((s, t) => s + t.tareas, 0), porCurso: tareas },
    avisos: { enviados, abiertos, conError, pendientes: pendAvisos },
    reuniones: { proximas, siguientes },
  };
}
