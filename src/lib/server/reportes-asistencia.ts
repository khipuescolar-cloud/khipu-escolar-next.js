import "server-only";
import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { EstadoJustificacion } from "@/generated/prisma/enums";
import { asistenciaPorCursoActiva } from "@/lib/asistencia-por-curso";
import { fechaDb, isoDeFechaDb, restarDias, sumarDias } from "@/lib/fechas";
import {
  agregarPorDia, claveGrado, diasHabilesDelRango, gradoSchema, MIS_CURSOS, nombreGrado, rangoSchema, resumirAlumno, sumarResumenes,
  type DetalleDia, type DiaAgregado, type FiltrosReporte, type GradoReporte, type RegistroDia, type ResumenAlumno,
} from "@/lib/reportes-asistencia";
import { resumirCurso, type ConteoClase, type FilaCurso, type ResumenCurso } from "@/lib/reportes-curso";
import { esVistaFamilia } from "@/lib/roles";
import { AMBITO_DIA, hoyDelColegio } from "./asistencia";
import { auditar } from "./auditoria";
import { feriadosAplicables } from "./plataforma-configuracion";
import { requireFeature } from "./plan";
import { whereSalonActivo } from "./salones-activos";
import { requireAlumnoVisible, type TenantContext } from "./tenant";

// Reportes de asistencia por alumno, salón y rango de fechas (specs/27-reportes-asistencia.md).
// Asistencia al colegio (solo `ambito = "dia"`): porcentaje = (llegó + tarde) / días hábiles con registro.
// Asistencia por curso: faltas y tardanzas a clase por salón y curso, aparte. Las reglas puras viven en src/lib/reportes-asistencia.ts.

export type AccionReporte = { accion: "ver" } | { accion: "exportar"; formato: "excel" | "pdf" | "csv" };

const entradaSalon = z.object({ salonId: z.uuid() }).and(rangoSchema);
const entradaAlumno = z.object({ alumnoId: z.uuid() }).and(rangoSchema);

export type ReporteAlumno = {
  tipo: "alumno";
  colegio: string;
  alumno: { id: string; nombres: string; apellidos: string; codigo: string | null; salonId: string; salon: string };
  desde: string;
  hasta: string;
  /** Último día contado: nunca después de hoy en la zona del colegio. */
  hastaEfectivo: string;
  resumen: ResumenAlumno;
  detalle: DetalleDia[];
};

export type FilaAlumnoReporte = { alumnoId: string; nombres: string; apellidos: string; codigo: string | null; resumen: ResumenAlumno };

export type ReporteSalon = {
  tipo: "salon";
  colegio: string;
  salon: { id: string; nombre: string };
  desde: string;
  hasta: string;
  hastaEfectivo: string;
  filas: FilaAlumnoReporte[];
  total: ResumenAlumno;
  /** Conteo por día hábil del salón (vista calendario). */
  porDia: DiaAgregado[];
};

export type FilaSalonReporte = { salonId: string; salon: string; alumnos: number; resumen: ResumenAlumno };

/** Asistencia por curso en el rango: una fila por curso con registros (alumnos activos). */
export type FilaCursoReporte = {
  salonId: string;
  salon: string;
  cursoId: string;
  curso: string;
  /** Registros de esa lista en el rango (alumno-clase). */
  registros: number;
  faltas: number;
  /** Faltas a clase de alumnos que ese día sí ingresaron al colegio (llegó o tarde en la asistencia del día). */
  faltasConIngreso: number;
  tardanzas: number;
};

export type ReporteColegio = {
  tipo: "colegio";
  colegio: string;
  /** Reporte por grado (todas sus secciones); null = todo el colegio (o los salones del profesor). */
  grado?: (GradoReporte & { nombre: string }) | null;
  desde: string;
  hasta: string;
  hastaEfectivo: string;
  filas: FilaSalonReporte[];
  total: ResumenAlumno;
  /** Conteo por día hábil de todo el alcance (vista calendario). */
  porDia: DiaAgregado[];
  /** Asistencia por curso; null si ningún nivel del colegio la tiene activa (Configuración). */
  cursos: FilaCursoReporte[] | null;
};

export type ReporteAsistencia = ReporteAlumno | ReporteSalon | ReporteColegio;

const veTodo = (ctx: TenantContext) => ctx.rol === "direccion" || ctx.rol === "administrativo";

/** Salones activos de los que el profesor es tutor. */
async function tutoriasDe(ctx: TenantContext): Promise<string[]> {
  const salones = await ctx.db.salon.findMany({ where: { ...whereSalonActivo, tutorId: ctx.membership.id }, select: { id: true } });
  return salones.map((s) => s.id);
}

/**
 * Salones cuya asistencia al colegio puede ver el rol: null = todos. El profesor, solo su tutoría: en los salones donde
 * solo dicta ve sus cursos (`reporteCursos`). Familias y portería no ven reportes de salón (403).
 */
async function alcanceDeSalones(ctx: TenantContext): Promise<string[] | null> {
  if (veTodo(ctx)) return null;
  if (ctx.rol === "profesor") return tutoriasDe(ctx);
  forbidden();
}

async function requireSalonDelReporte(ctx: TenantContext, salonId: string) {
  const alcance = await alcanceDeSalones(ctx);
  if (alcance && !alcance.includes(salonId)) forbidden();
  const salon = await ctx.db.salon.findFirst({ where: { id: salonId }, select: { id: true, nombre: true } });
  if (!salon) notFound();
  return salon;
}

/** Último día que cuenta: hoy en la zona del colegio si el rango llega al futuro. */
export function hastaEfectivoDe(ctx: TenantContext, hasta: string): string {
  const hoy = hoyDelColegio(ctx).isoFecha;
  return hasta > hoy ? hoy : hasta;
}

/** Días hábiles del rango (con los feriados nacionales y los extra del colegio), sin pasar de hoy. */
export async function diasHabiles(ctx: TenantContext, desde: string, hastaEfectivo: string): Promise<string[]> {
  if (desde > hastaEfectivo) return [];
  const feriados = await feriadosAplicables(ctx.tenant.id, desde, hastaEfectivo);
  return diasHabilesDelRango(desde, hastaEfectivo, feriados);
}

/** Registros de asistencia por alumno en el rango, con el estado de su justificación más reciente. */
async function registrosPorAlumno(ctx: TenantContext, alumnoIds: string[], desde: string, hasta: string): Promise<Map<string, RegistroDia[]>> {
  const mapa = new Map<string, RegistroDia[]>();
  if (alumnoIds.length === 0) return mapa;
  // Solo la asistencia al colegio: los registros de curso no cuentan en el porcentaje (specs/27).
  const enRango = { alumnoId: { in: alumnoIds }, fecha: { gte: fechaDb(desde), lte: fechaDb(hasta) }, ambito: AMBITO_DIA };
  // Las justificaciones van en una consulta aparte filtrada por relación: incluirlas con `include` hacía que Prisma
  // pasara cada id de asistencia como parámetro y el reporte del colegio (≈1 000 alumnos × 2 meses = 80 000 filas)
  // superaba el tope de 32 767 parámetros de Postgres (P2029). Ver docs/pruebas-de-estres.md.
  const [filas, justificaciones] = await Promise.all([
    ctx.db.asistencia.findMany({ where: enRango, select: { id: true, alumnoId: true, fecha: true, ambito: true, hora: true, horaSalida: true, estado: true } }),
    ctx.db.justificacion.findMany({ where: { asistencia: enRango }, orderBy: { createdAt: "asc" }, select: { asistenciaId: true, estado: true } }),
  ]);
  // Orden ascendente: la última escritura en el mapa es la justificación más reciente de cada registro.
  const justificacionDe = new Map(justificaciones.map((j) => [j.asistenciaId, j.estado]));
  for (const f of filas) {
    const lista = mapa.get(f.alumnoId) ?? [];
    lista.push({ fecha: isoDeFechaDb(f.fecha), ambito: f.ambito, hora: f.hora, horaSalida: f.horaSalida, estado: f.estado, justificacion: justificacionDe.get(f.id) ?? null });
    mapa.set(f.alumnoId, lista);
  }
  return mapa;
}

/**
 * Días con permiso de asistencia de día completo (vigente) por alumno en el rango (specs/04). Se consultan los permisos
 * del colegio que tocan el rango (pocos) y se filtran en memoria: sin pasar los ids de alumnos como parámetros.
 */
async function diasConPermisoPorAlumno(ctx: TenantContext, alumnoIds: string[], desde: string, hasta: string): Promise<Map<string, Set<string>>> {
  const mapa = new Map<string, Set<string>>();
  if (alumnoIds.length === 0 || desde > hasta) return mapa;
  const ids = new Set(alumnoIds);
  const permisos = await ctx.db.permisoAsistencia.findMany({
    where: { anuladoAt: null, todoElDia: true, desde: { lte: fechaDb(hasta) }, hasta: { gte: fechaDb(desde) } },
    select: { alumnoId: true, desde: true, hasta: true },
  });
  for (const p of permisos) {
    if (!ids.has(p.alumnoId)) continue;
    const dias = mapa.get(p.alumnoId) ?? new Set<string>();
    const inicio = isoDeFechaDb(p.desde) < desde ? desde : isoDeFechaDb(p.desde);
    const fin = isoDeFechaDb(p.hasta) > hasta ? hasta : isoDeFechaDb(p.hasta);
    for (let f = inicio; f <= fin; f = sumarDias(f, 1)) dias.add(f);
    mapa.set(p.alumnoId, dias);
  }
  return mapa;
}

function auditarReporte(ctx: TenantContext, entidadId: string, detalle: Record<string, string>, como: AccionReporte) {
  return auditar({
    tenantId: ctx.tenant.id,
    actorId: ctx.user.id,
    accion: como.accion,
    entidad: "reporte_asistencia",
    entidadId,
    detalle: como.accion === "exportar" ? { ...detalle, formato: como.formato } : detalle,
  });
}

/** Reporte de un salón: una fila por alumno activo y el total del salón. Profesor: solo sus salones. */
export async function reporteSalon(ctx: TenantContext, entrada: unknown, como: AccionReporte = { accion: "ver" }): Promise<ReporteSalon> {
  requireFeature(ctx, "asistencia");
  const { salonId, desde, hasta } = entradaSalon.parse(entrada);
  const salon = await requireSalonDelReporte(ctx, salonId);
  const hastaEfectivo = hastaEfectivoDe(ctx, hasta);
  const [alumnos, dias] = await Promise.all([
    ctx.db.alumno.findMany({
      where: { salonId, estado: "activo" },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      select: { id: true, nombres: true, apellidos: true, codigo: true },
    }),
    diasHabiles(ctx, desde, hastaEfectivo),
  ]);
  const [registros, permisos] = await Promise.all([
    registrosPorAlumno(ctx, alumnos.map((a) => a.id), desde, hastaEfectivo),
    diasConPermisoPorAlumno(ctx, alumnos.map((a) => a.id), desde, hastaEfectivo),
  ]);
  const resumidos = alumnos.map((a) => ({ a, ...resumirAlumno(dias, registros.get(a.id) ?? [], permisos.get(a.id)) }));
  const filas = resumidos.map<FilaAlumnoReporte>(({ a, resumen }) => ({ alumnoId: a.id, nombres: a.nombres, apellidos: a.apellidos, codigo: a.codigo, resumen }));
  await auditarReporte(ctx, salon.id, { tipo: "salon", desde, hasta }, como);
  return {
    tipo: "salon", colegio: ctx.tenant.nombre, salon, desde, hasta, hastaEfectivo, filas,
    total: sumarResumenes(filas.map((f) => f.resumen)), porDia: agregarPorDia(resumidos.map((r) => r.detalle)),
  };
}

/** Reporte de un alumno con el detalle día a día. Apoderado/alumno: solo los suyos. */
export async function reporteAlumno(ctx: TenantContext, entrada: unknown, como: AccionReporte = { accion: "ver" }): Promise<ReporteAlumno> {
  requireFeature(ctx, "asistencia");
  const { alumnoId, desde, hasta } = entradaAlumno.parse(entrada);
  if (ctx.rol === "porteria") forbidden();
  if (!veTodo(ctx)) await requireAlumnoVisible(ctx, alumnoId);
  const alumno = await ctx.db.alumno.findFirst({
    where: { id: alumnoId },
    select: { id: true, nombres: true, apellidos: true, codigo: true, salonId: true, salon: { select: { nombre: true, tutorId: true } } },
  });
  if (!alumno) notFound();
  // El profesor ve la asistencia al colegio solo de los alumnos de su tutoría (en otros salones, sus cursos).
  if (ctx.rol === "profesor" && alumno.salon.tutorId !== ctx.membership.id) forbidden();
  const hastaEfectivo = hastaEfectivoDe(ctx, hasta);
  const dias = await diasHabiles(ctx, desde, hastaEfectivo);
  const [registros, permisos] = await Promise.all([
    registrosPorAlumno(ctx, [alumnoId], desde, hastaEfectivo),
    diasConPermisoPorAlumno(ctx, [alumnoId], desde, hastaEfectivo),
  ]);
  const { resumen, detalle } = resumirAlumno(dias, registros.get(alumnoId) ?? [], permisos.get(alumnoId));
  await auditarReporte(ctx, alumnoId, { tipo: "alumno", desde, hasta }, como);
  return {
    tipo: "alumno", colegio: ctx.tenant.nombre,
    alumno: { id: alumno.id, nombres: alumno.nombres, apellidos: alumno.apellidos, codigo: alumno.codigo, salonId: alumno.salonId, salon: alumno.salon.nombre },
    desde, hasta, hastaEfectivo, resumen, detalle,
  };
}

/** Resumen del colegio: una fila por salón activo. Dirección y administrativo ven todos; el profesor, solo los suyos. */
export async function resumenColegio(ctx: TenantContext, entrada: unknown, como: AccionReporte = { accion: "ver" }): Promise<ReporteColegio> {
  requireFeature(ctx, "asistencia");
  const { desde, hasta } = rangoSchema.parse(entrada);
  const alcance = await alcanceDeSalones(ctx);
  const r = await resumenDeSalones(ctx, alcance, null, desde, hasta);
  await auditarReporte(ctx, ctx.tenant.id, { tipo: "colegio", desde, hasta }, como);
  return r;
}

const entradaGrado = z.object({ grado: z.union([gradoSchema, z.object({ nivel: z.enum(["inicial", "primaria", "secundaria", "academia"]), grado: z.number().int().min(1).max(12) })]) }).and(rangoSchema);

/**
 * Reporte por grado (nivel + grado): una fila por sección (salón activo de ese grado) y el total del grado.
 * Dirección y administrativo: todas las secciones. Profesor: solo sus salones de ese grado (403 si no tiene ninguno).
 * Familias y portería: 403.
 */
export async function reporteGrado(ctx: TenantContext, entrada: unknown, como: AccionReporte = { accion: "ver" }): Promise<ReporteColegio> {
  requireFeature(ctx, "asistencia");
  const { grado, desde, hasta } = entradaGrado.parse(entrada);
  const alcance = await alcanceDeSalones(ctx);
  if (alcance) {
    const propios = await ctx.db.salon.count({ where: { ...whereSalonActivo, id: { in: alcance }, nivel: grado.nivel, grado: grado.grado } });
    if (propios === 0) forbidden();
  }
  const r = await resumenDeSalones(ctx, alcance, grado, desde, hasta);
  await auditarReporte(ctx, ctx.tenant.id, { tipo: "grado", grado: claveGrado(grado), desde, hasta }, como);
  return r;
}

/** Resumen por salón de los salones activos del alcance (null = todos), opcionalmente de un solo grado. */
async function resumenDeSalones(ctx: TenantContext, alcance: string[] | null, grado: GradoReporte | null, desde: string, hasta: string): Promise<ReporteColegio> {
  const hastaEfectivo = hastaEfectivoDe(ctx, hasta);
  const [salones, dias] = await Promise.all([
    ctx.db.salon.findMany({
      where: { ...whereSalonActivo, ...(alcance ? { id: { in: alcance } } : {}), ...(grado ? { nivel: grado.nivel, grado: grado.grado } : {}) },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, alumnos: { where: { estado: "activo" }, select: { id: true } } },
    }),
    diasHabiles(ctx, desde, hastaEfectivo),
  ]);
  const alumnoIds = salones.flatMap((s) => s.alumnos.map((a) => a.id));
  const alcanceCursos = grado ? salones.map((s) => s.id) : alcance;
  const [registros, permisos, cursos] = await Promise.all([
    registrosPorAlumno(ctx, alumnoIds, desde, hastaEfectivo),
    diasConPermisoPorAlumno(ctx, alumnoIds, desde, hastaEfectivo),
    ctx.tenant.asistenciaPorCursoNiveles.length > 0 ? asistenciaPorCurso(ctx, { salones: alcanceCursos }, desde, hastaEfectivo) : Promise.resolve(null),
  ]);
  const detalles: DetalleDia[][] = [];
  const filas = salones.map<FilaSalonReporte>((s) => {
    const resumidos = s.alumnos.map((a) => resumirAlumno(dias, registros.get(a.id) ?? [], permisos.get(a.id)));
    for (const r of resumidos) detalles.push(r.detalle);
    return { salonId: s.id, salon: s.nombre, alumnos: s.alumnos.length, resumen: sumarResumenes(resumidos.map((r) => r.resumen)) };
  });
  return {
    tipo: "colegio", colegio: ctx.tenant.nombre, grado: grado ? { ...grado, nombre: nombreGrado(grado) } : null, desde, hasta, hastaEfectivo, filas,
    total: sumarResumenes(filas.map((f) => f.resumen)), porDia: agregarPorDia(detalles), cursos,
  };
}

/**
 * Faltas y tardanzas a clase por salón y curso en el rango, con las faltas de alumnos que ese día sí ingresaron al
 * colegio. Una sola consulta agregada en SQL (sin listas de ids: un colegio de 1 000 alumnos no pasa el tope de parámetros).
 * `salones`: salones visibles (null = todos); `cursos`: solo esos cursos; `alumnoId`: solo ese alumno.
 * Solo alumnos activos y salones no archivados.
 */
async function asistenciaPorCurso(ctx: TenantContext, alcance: { salones: string[] | null; cursos?: string[]; alumnoId?: string }, desde: string, hasta: string): Promise<FilaCursoReporte[]> {
  if ((alcance.salones && alcance.salones.length === 0) || (alcance.cursos && alcance.cursos.length === 0)) return [];
  const filtroSalon = Prisma.sql`${alcance.salones ? Prisma.sql`AND s.id = ANY(${alcance.salones}::uuid[])` : Prisma.empty} ${alcance.cursos ? Prisma.sql`AND c.id = ANY(${alcance.cursos}::uuid[])` : Prisma.empty} ${alcance.alumnoId ? Prisma.sql`AND a.alumno_id = ${alcance.alumnoId}::uuid` : Prisma.empty}`;
  const filas = await ctx.db.$queryRaw<{ salon_id: string; salon: string; curso_id: string; curso: string; registros: number; faltas: number; faltas_con_ingreso: number; tardanzas: number }[]>`
    SELECT s.id::text AS salon_id, s.nombre AS salon, c.id::text AS curso_id, c.nombre AS curso,
      count(*)::int AS registros,
      count(*) FILTER (WHERE a.estado = 'falta')::int AS faltas,
      count(*) FILTER (WHERE a.estado = 'falta' AND d.estado IN ('llego', 'tarde'))::int AS faltas_con_ingreso,
      count(*) FILTER (WHERE a.estado = 'tarde')::int AS tardanzas
    FROM asistencias a
    JOIN cursos c ON c.id = a.curso_id
    JOIN salones s ON s.id = c.salon_id AND s.archivado_at IS NULL
    JOIN alumnos al ON al.id = a.alumno_id AND al.estado = 'activo'
    LEFT JOIN asistencias d ON d.alumno_id = a.alumno_id AND d.fecha = a.fecha AND d.ambito = 'dia'
    WHERE a.tenant_id = ${ctx.tenant.id}::uuid AND a.ambito <> 'dia' AND a.fecha BETWEEN ${desde}::date AND ${hasta}::date ${filtroSalon}
    GROUP BY s.id, s.nombre, c.id, c.nombre
    ORDER BY s.nombre, c.nombre`;
  return filas.map((f) => ({
    salonId: f.salon_id, salon: f.salon, cursoId: f.curso_id, curso: f.curso,
    registros: f.registros, faltas: f.faltas, faltasConIngreso: f.faltas_con_ingreso, tardanzas: f.tardanzas,
  }));
}

export type FaltaCurso = {
  asistenciaId: string;
  alumnoId: string;
  alumno: string;
  fecha: string;
  hora: string;
  estado: "falta" | "tarde";
  /** Ingreso al colegio de ese día (asistencia del día), o null si no hay registro. */
  ingreso: { estado: "llego" | "tarde" | "falta" | "problema"; hora: string } | null;
  justificacion: EstadoJustificacion | null;
};

export type DetalleCurso = {
  salon: { id: string; nombre: string };
  curso: { id: string; nombre: string };
  desde: string;
  hasta: string;
  hastaEfectivo: string;
  filas: FaltaCurso[];
};

const entradaCurso = z.object({ cursoId: z.uuid() }).and(rangoSchema);

/** Detalle de un curso: cada falta o tardanza a clase del rango con el ingreso al colegio de ese día. Profesor: el del curso o el tutor. */
export async function detalleCurso(ctx: TenantContext, entrada: unknown): Promise<DetalleCurso> {
  requireFeature(ctx, "asistencia");
  const { cursoId, desde, hasta } = entradaCurso.parse(entrada);
  const curso = await requireCursoDelHistorial(ctx, cursoId);
  const salon = { id: curso.salon.id, nombre: curso.salon.nombre };
  const hastaEfectivo = hastaEfectivoDe(ctx, hasta);
  const rango = { gte: fechaDb(desde), lte: fechaDb(hastaEfectivo) };
  const registros = await ctx.db.asistencia.findMany({
    where: { ambito: cursoId, fecha: rango, estado: { in: ["falta", "tarde"] }, alumno: { estado: "activo" } },
    orderBy: [{ fecha: "desc" }, { hora: "asc" }],
    select: {
      id: true, alumnoId: true, fecha: true, hora: true, estado: true,
      alumno: { select: { nombres: true, apellidos: true } },
      justificaciones: { orderBy: { createdAt: "desc" }, take: 1, select: { estado: true } },
    },
  });
  // Ingresos al colegio de esos alumnos en el rango (a lo sumo los alumnos de un salón: pocos parámetros).
  const alumnoIds = [...new Set(registros.map((r) => r.alumnoId))];
  const ingresos = alumnoIds.length === 0 ? [] : await ctx.db.asistencia.findMany({
    where: { alumnoId: { in: alumnoIds }, ambito: AMBITO_DIA, fecha: rango },
    select: { alumnoId: true, fecha: true, estado: true, hora: true },
  });
  const ingresoDe = new Map(ingresos.map((i) => [`${i.alumnoId}:${isoDeFechaDb(i.fecha)}`, { estado: i.estado, hora: i.hora }]));
  await auditarReporte(ctx, cursoId, { tipo: "curso", desde, hasta }, { accion: "ver" });
  return {
    salon, curso: { id: curso.id, nombre: curso.nombre }, desde, hasta, hastaEfectivo,
    filas: registros.map((r) => {
      const fecha = isoDeFechaDb(r.fecha);
      return {
        asistenciaId: r.id, alumnoId: r.alumnoId, alumno: `${r.alumno.apellidos}, ${r.alumno.nombres}`, fecha, hora: r.hora,
        estado: r.estado as "falta" | "tarde", ingreso: ingresoDe.get(`${r.alumnoId}:${fecha}`) ?? null,
        justificacion: r.justificaciones[0]?.estado ?? null,
      };
    }),
  };
}

/** Reporte según los filtros: alumno → detalle; salón → tabla de alumnos; grado → sus secciones; nada → resumen por salón. */
export async function reporteSegunFiltros(ctx: TenantContext, filtros: FiltrosReporte, como: AccionReporte = { accion: "ver" }): Promise<ReporteAsistencia> {
  if (filtros.alumnoId) return reporteAlumno(ctx, filtros, como);
  if (filtros.salonId) return reporteSalon(ctx, filtros, como);
  if (filtros.grado) return reporteGrado(ctx, filtros, como);
  return resumenColegio(ctx, filtros, como);
}

export type OpcionesReporte = {
  /** `grado`: clave del grado del salón («secundaria-2»), para filtrar los salones por grado; null si no tiene. */
  salones: { id: string; nombre: string; grado: string | null }[];
  /** Grados (nivel + grado) de los salones visibles: `clave` = «primaria-3». */
  grados: { clave: string; nombre: string }[];
  alumnos: { id: string; nombres: string; apellidos: string; salonId: string }[];
  periodos: { nombre: string; inicio: string; fin: string }[];
  /**
   * Profesor: cursos que puede ver en el filtro «Curso» (los que dicta y todos los de su tutoría, de niveles que pasan
   * lista por curso). Vacío para dirección, administrativo y familias.
   */
  cursos: { id: string; nombre: string; salonId: string; salon: string; grado: string | null }[];
  /** Profesor: salones de su tutoría (ahí ve la asistencia al colegio y todos los cursos). */
  tutorias: string[];
};

/** Cursos de salones activos que el rol puede ver en reportes: todos (dirección, administrativo) o los que dicta y los de su tutoría. */
async function cursosDelReporte(ctx: TenantContext) {
  return ctx.db.curso.findMany({
    where: veTodo(ctx)
      ? { salon: whereSalonActivo }
      : { salon: whereSalonActivo, OR: [{ profesorId: ctx.membership.id }, { salon: { tutorId: ctx.membership.id } }] },
    orderBy: [{ salon: { nombre: "asc" } }, { nombre: "asc" }],
    select: { id: true, nombre: true, salonId: true, salon: { select: { nombre: true, nivel: true, grado: true } } },
  });
}

/** Opciones de los filtros según el rol: salones y alumnos que puede ver y los periodos del año (para el atajo «Bimestre»). */
export async function opcionesDeReporte(ctx: TenantContext): Promise<OpcionesReporte> {
  requireFeature(ctx, "asistencia");
  const familia = esVistaFamilia(ctx.rol);
  const profesor = ctx.rol === "profesor";
  if (!familia && !veTodo(ctx) && !profesor) forbidden();
  // Profesor: sus salones de tutoría y los salones donde dicta un curso con lista por curso.
  const [tutorias, cursosVisibles] = profesor ? await Promise.all([tutoriasDe(ctx), cursosDelReporte(ctx)]) : [[], []];
  const cursos = cursosVisibles.filter((c) => asistenciaPorCursoActiva(ctx.tenant.asistenciaPorCursoNiveles, c.salon.nivel));
  const alcance = familia ? [] : profesor ? [...new Set([...tutorias, ...cursos.map((c) => c.salonId)])] : null;
  const [salones, alumnos, periodos] = await Promise.all([
    familia ? Promise.resolve([]) : ctx.db.salon.findMany({ where: { ...whereSalonActivo, ...(alcance ? { id: { in: alcance } } : {}) }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, nivel: true, grado: true } }),
    ctx.db.alumno.findMany({
      where: familia
        ? { estado: "activo", OR: [{ cuentaId: ctx.membership.id }, { apoderados: { some: { apoderadoId: ctx.membership.id } } }] }
        : { estado: "activo", ...(alcance ? { salonId: { in: alcance } } : {}) },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      select: { id: true, nombres: true, apellidos: true, salonId: true },
    }),
    ctx.db.periodo.findMany({ where: { anio: Number(hoyDelColegio(ctx).isoFecha.slice(0, 4)) }, orderBy: { inicio: "asc" }, select: { nombre: true, inicio: true, fin: true } }),
  ]);
  const ORDEN = ["inicial", "primaria", "secundaria", "academia"];
  const grados = new Map<string, GradoReporte>();
  for (const s of salones) if (s.grado !== null) grados.set(claveGrado({ nivel: s.nivel, grado: s.grado }), { nivel: s.nivel, grado: s.grado });
  return {
    salones: salones.map((s) => ({ id: s.id, nombre: s.nombre, grado: s.grado === null ? null : claveGrado({ nivel: s.nivel, grado: s.grado }) })),
    grados: [...grados.values()]
      .sort((a, b) => ORDEN.indexOf(a.nivel) - ORDEN.indexOf(b.nivel) || a.grado - b.grado)
      .map((g) => ({ clave: claveGrado(g), nombre: nombreGrado(g) })),
    alumnos, periodos: periodos.map((p) => ({ nombre: p.nombre, inicio: isoDeFechaDb(p.inicio), fin: isoDeFechaDb(p.fin) })),
    cursos: cursos.map((c) => ({
      id: c.id, nombre: c.nombre, salonId: c.salonId, salon: c.salon.nombre,
      grado: c.salon.grado === null ? null : claveGrado({ nivel: c.salon.nivel, grado: c.salon.grado }),
    })),
    tutorias,
  };
}

// ───────────── Asistencia a clase por cursos (filtro «Curso» del profesor, specs/27) ─────────────

export type FaltaClaseAlumno = { fecha: string; hora: string; curso: string; estado: "falta" | "tarde"; justificacion: EstadoJustificacion | null };

export type ReporteCursos = {
  tipo: "cursos";
  colegio: string;
  salon: { id: string; nombre: string } | null;
  grado: (GradoReporte & { nombre: string }) | null;
  alumno: { id: string; nombres: string; apellidos: string; salonId: string; salon: string } | null;
  /** Un solo curso elegido; null = «Mis cursos» / «Todos los cursos». */
  curso: { id: string; nombre: string } | null;
  desde: string;
  hasta: string;
  hastaEfectivo: string;
  /** Una fila por curso visible del alcance (también los que aún no tienen registros). */
  filas: FilaCursoReporte[];
  total: { registros: number; faltas: number; faltasConIngreso: number; tardanzas: number };
  /** Con alumno: cada falta o tardanza a clase del rango (más reciente primero). */
  detalle: FaltaClaseAlumno[] | null;
};

/**
 * Asistencia a clase de los cursos que el rol puede ver, filtrada por salón, grado, alumno y curso. Profesor: los
 * cursos que dicta y todos los de su tutoría (403 si el filtro no deja ninguno o el curso no es suyo). Apoderado y
 * alumno: solo con `alumnoId` de un hijo (o el propio), los cursos de su salón. No incluye la asistencia al colegio.
 * Auditado (`tipo: "cursos"`).
 */
export async function reporteCursos(ctx: TenantContext, filtros: FiltrosReporte, como: AccionReporte = { accion: "ver" }): Promise<ReporteCursos> {
  requireFeature(ctx, "asistencia");
  const familia = esVistaFamilia(ctx.rol);
  if (!veTodo(ctx) && ctx.rol !== "profesor" && !familia) forbidden();
  const { desde, hasta } = rangoSchema.parse(filtros);
  const cursoId = filtros.cursoId && filtros.cursoId !== MIS_CURSOS ? z.uuid().parse(filtros.cursoId) : null;
  const alumnoId = filtros.alumnoId ? z.uuid().parse(filtros.alumnoId) : null;
  // La familia solo ve a sus hijos (el alumno, a sí mismo): siempre con un alumno visible.
  if (familia) {
    if (!alumnoId) forbidden();
    await requireAlumnoVisible(ctx, alumnoId);
  }
  const alumno = alumnoId
    ? await ctx.db.alumno.findFirst({ where: { id: alumnoId, estado: "activo" }, select: { id: true, nombres: true, apellidos: true, salonId: true, salon: { select: { nombre: true } } } })
    : null;
  if (alumnoId && !alumno) notFound();
  const salonId = alumno?.salonId ?? (filtros.salonId ? z.uuid().parse(filtros.salonId) : null);
  const grado = !salonId && filtros.grado ? filtros.grado : null;
  const visibles = familia
    ? await ctx.db.curso.findMany({
        where: { salonId: alumno!.salonId, salon: whereSalonActivo },
        orderBy: { nombre: "asc" },
        select: { id: true, nombre: true, salonId: true, salon: { select: { nombre: true, nivel: true, grado: true } } },
      })
    : await cursosDelReporte(ctx);
  const elegidos = visibles.filter((c) =>
    (!salonId || c.salonId === salonId) && (!grado || (c.salon.nivel === grado.nivel && c.salon.grado === grado.grado)) && (!cursoId || c.id === cursoId));
  if (elegidos.length === 0 && (cursoId || salonId || grado)) {
    if (!veTodo(ctx) && !familia) forbidden();
    if (cursoId) notFound();
  }
  const cursos = elegidos.filter((c) => asistenciaPorCursoActiva(ctx.tenant.asistenciaPorCursoNiveles, c.salon.nivel));
  const ids = cursos.map((c) => c.id);
  const hastaEfectivo = hastaEfectivoDe(ctx, hasta);
  const salon = salonId ? await ctx.db.salon.findFirst({ where: { id: salonId }, select: { id: true, nombre: true } }) : null;
  if (salonId && !salon) notFound();
  const [agregadas, faltas] = await Promise.all([
    asistenciaPorCurso(ctx, { salones: null, cursos: ids, ...(alumnoId ? { alumnoId } : {}) }, desde, hastaEfectivo),
    alumnoId && ids.length > 0
      ? ctx.db.asistencia.findMany({
          where: { alumnoId, ambito: { in: ids }, fecha: { gte: fechaDb(desde), lte: fechaDb(hastaEfectivo) }, estado: { in: ["falta", "tarde"] } },
          orderBy: [{ fecha: "desc" }, { hora: "asc" }],
          select: { fecha: true, hora: true, estado: true, ambito: true, justificaciones: { orderBy: { createdAt: "desc" }, take: 1, select: { estado: true } } },
        })
      : Promise.resolve(null),
  ]);
  const porId = new Map(agregadas.map((f) => [f.cursoId, f]));
  const filas = cursos.map<FilaCursoReporte>((c) => porId.get(c.id) ?? {
    salonId: c.salonId, salon: c.salon.nombre, cursoId: c.id, curso: c.nombre, registros: 0, faltas: 0, faltasConIngreso: 0, tardanzas: 0,
  });
  const nombreCurso = new Map(cursos.map((c) => [c.id, c.nombre]));
  const total = { registros: 0, faltas: 0, faltasConIngreso: 0, tardanzas: 0 };
  for (const f of filas) {
    total.registros += f.registros;
    total.faltas += f.faltas;
    total.faltasConIngreso += f.faltasConIngreso;
    total.tardanzas += f.tardanzas;
  }
  await auditarReporte(ctx, alumnoId ?? cursoId ?? salonId ?? ctx.tenant.id, { tipo: "cursos", desde, hasta, ...(grado ? { grado: claveGrado(grado) } : {}) }, como);
  const unico = cursoId ? cursos.find((c) => c.id === cursoId) ?? elegidos[0] : null;
  return {
    tipo: "cursos", colegio: ctx.tenant.nombre, salon, grado: grado ? { ...grado, nombre: nombreGrado(grado) } : null,
    alumno: alumno ? { id: alumno.id, nombres: alumno.nombres, apellidos: alumno.apellidos, salonId: alumno.salonId, salon: alumno.salon.nombre } : null,
    curso: unico ? { id: unico.id, nombre: unico.nombre } : null,
    desde, hasta, hastaEfectivo, filas, total,
    detalle: alumnoId ? (faltas ?? []).map((r) => ({
      fecha: isoDeFechaDb(r.fecha), hora: r.hora, curso: nombreCurso.get(r.ambito) ?? "", estado: r.estado as "falta" | "tarde",
      justificacion: r.justificaciones[0]?.estado ?? null,
    })) : null,
  };
}

/**
 * ¿El filtro muestra la asistencia a clase por cursos (`reporteCursos`) en vez de la asistencia al colegio? Siempre con
 * `curso`; para el profesor, además, todo lo que no sea su salón de tutoría o un alumno de ella.
 */
export async function esReporteDeCursos(ctx: TenantContext, filtros: FiltrosReporte): Promise<boolean> {
  if (filtros.cursoId) return true;
  if (ctx.rol !== "profesor") return false;
  const tutorias = await tutoriasDe(ctx);
  if (filtros.alumnoId) {
    const alumno = await ctx.db.alumno.findFirst({ where: { id: filtros.alumnoId }, select: { salonId: true } });
    return !alumno || !tutorias.includes(alumno.salonId);
  }
  return !filtros.salonId || !tutorias.includes(filtros.salonId);
}

// ───────────── Profesor: su salón de tutoría y el historial de sus cursos (specs/27) ─────────────

export type ReporteCurso = {
  tipo: "curso";
  colegio: string;
  salon: { id: string; nombre: string };
  curso: { id: string; nombre: string };
  profesor: string | null;
  desde: string;
  hasta: string;
  hastaEfectivo: string;
  fechas: string[];
  filas: FilaCurso[];
  total: ResumenCurso;
  porFecha: ConteoClase[];
};

/** Curso visible para el historial: dirección y administrativo, su profesor o el tutor del salón. */
async function requireCursoDelHistorial(ctx: TenantContext, cursoId: string) {
  const curso = await ctx.db.curso.findFirst({
    where: { id: cursoId },
    select: {
      id: true, nombre: true, profesorId: true,
      salon: { select: { id: true, nombre: true, tutorId: true } },
      profesor: { select: { user: { select: { nombres: true, apellidos: true } } } },
    },
  });
  if (!curso) notFound();
  if (!veTodo(ctx) && !(ctx.rol === "profesor" && (curso.profesorId === ctx.membership.id || curso.salon.tutorId === ctx.membership.id))) forbidden();
  return curso;
}

/**
 * Historial de asistencia de un curso en un rango: alumnos activos del salón × fechas en que se pasó lista de ese curso,
 * con el resumen por alumno y por clase. Auditado (ver o exportar).
 */
export async function historialCurso(ctx: TenantContext, entrada: unknown, como: AccionReporte = { accion: "ver" }): Promise<ReporteCurso> {
  requireFeature(ctx, "asistencia");
  const { cursoId, desde, hasta } = entradaCurso.parse(entrada);
  const curso = await requireCursoDelHistorial(ctx, cursoId);
  const hastaEfectivo = hastaEfectivoDe(ctx, hasta);
  const [alumnos, registros] = await Promise.all([
    ctx.db.alumno.findMany({
      where: { salonId: curso.salon.id, estado: "activo" },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      select: { id: true, nombres: true, apellidos: true, codigo: true },
    }),
    ctx.db.asistencia.findMany({
      where: { ambito: cursoId, fecha: { gte: fechaDb(desde), lte: fechaDb(hastaEfectivo) }, alumno: { estado: "activo" } },
      select: { alumnoId: true, fecha: true, estado: true },
    }),
  ]);
  const matriz = resumirCurso(alumnos, registros.map((r) => ({ alumnoId: r.alumnoId, fecha: isoDeFechaDb(r.fecha), estado: r.estado })));
  await auditarReporte(ctx, cursoId, { tipo: "curso", desde, hasta }, como);
  return {
    tipo: "curso", colegio: ctx.tenant.nombre, salon: { id: curso.salon.id, nombre: curso.salon.nombre }, curso: { id: curso.id, nombre: curso.nombre },
    profesor: curso.profesor ? `${curso.profesor.user.nombres} ${curso.profesor.user.apellidos}` : null,
    desde, hasta, hastaEfectivo, ...matriz,
  };
}

export type PanelProfesor = {
  /** Salones de los que es tutor, con su asistencia al colegio de los últimos 7 días. */
  tutorias: ReporteSalon[];
  /** Cursos que dicta en salones activos. `porCurso`: su nivel pasa lista por curso (si no, no hay historial). */
  cursos: { id: string; nombre: string; salon: string; porCurso: boolean }[];
  desde: string;
  hasta: string;
};

/** Inicio de «Reportes de asistencia» del profesor: su tutoría (últimos 7 días) y sus cursos. */
export async function panelReportesProfesor(ctx: TenantContext): Promise<PanelProfesor> {
  requireFeature(ctx, "asistencia");
  if (ctx.rol !== "profesor") forbidden();
  const hasta = hoyDelColegio(ctx).isoFecha;
  const desde = restarDias(hasta, 6);
  const [salones, cursos] = await Promise.all([
    ctx.db.salon.findMany({ where: { ...whereSalonActivo, tutorId: ctx.membership.id }, orderBy: { nombre: "asc" }, select: { id: true } }),
    ctx.db.curso.findMany({
      where: { profesorId: ctx.membership.id, salon: whereSalonActivo },
      orderBy: [{ salon: { nombre: "asc" } }, { nombre: "asc" }],
      select: { id: true, nombre: true, salon: { select: { nombre: true, nivel: true } } },
    }),
  ]);
  const tutorias = await Promise.all(salones.map((s) => reporteSalon(ctx, { salonId: s.id, desde, hasta })));
  return {
    tutorias,
    cursos: cursos.map((c) => ({ id: c.id, nombre: c.nombre, salon: c.salon.nombre, porCurso: asistenciaPorCursoActiva(ctx.tenant.asistenciaPorCursoNiveles, c.salon.nivel) })),
    desde,
    hasta,
  };
}
