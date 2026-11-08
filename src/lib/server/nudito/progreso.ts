import "server-only";
import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import { temaPorClave } from "@/lib/nudito/catalogo";
import { clavesDeVersion } from "@/lib/nudito/plan-publicado-reglas";
import {
  AREAS_NUDITO, esAreaNudito, esquemaEvidenciaPractica, type AreaNudito, type EntradaApi, type EstadoDominio, type SalidaApi, type TemaClave,
} from "@/lib/nudito/contratos";
import { auditar } from "../auditoria";
import type { DbTenant } from "../db";
import { requireFeature } from "../plan";
import { alumnoDeLaCuenta, type TenantContext } from "../tenant";

// Responsable: D (specs/44). Progreso formativo (nunca notas). Alcance: alumno → el suyo; apoderado → sus hijos
// (alumnoIdsVisibles); profesor → alumnos de los cursos que dicta, SOLO del área de ese curso (el tutor ve todas las
// áreas de su salón); dirección → todo. Agregados con groupBy sobre nudito_dominios: sin N+1 y sin texto de conversaciones.

const TODAS = [...AREAS_NUDITO] as AreaNudito[];

/**
 * Áreas de Nudito que quien llama puede ver de ese alumno. 403 si no puede ver ninguna; 404 si el alumno no es del
 * colegio. Profesor: las áreas (`cursos.area_cneb`) de los cursos que dicta en el salón del alumno; si es su tutor, todas.
 */
export async function areasVisiblesDeAlumno(ctx: TenantContext, alumnoId: string): Promise<AreaNudito[]> {
  if (!z.uuid().safeParse(alumnoId).success) notFound();
  const alumno = await ctx.db.alumno.findFirst({ where: { id: alumnoId }, select: { id: true, salonId: true, salon: { select: { tutorId: true } } } });
  if (!alumno) notFound();
  switch (ctx.rol) {
    case "direccion":
      return TODAS;
    case "alumno": {
      const propio = await alumnoDeLaCuenta(ctx);
      if (propio?.id !== alumnoId) forbidden();
      return TODAS;
    }
    case "apoderado": {
      const v = await ctx.db.apoderadoAlumno.findFirst({ where: { apoderadoId: ctx.membership.id, alumnoId }, select: { alumnoId: true } });
      if (!v) forbidden();
      return TODAS;
    }
    case "profesor": {
      if (alumno.salon.tutorId === ctx.membership.id) return TODAS;
      const cursos = await ctx.db.curso.findMany({ where: { salonId: alumno.salonId, profesorId: ctx.membership.id }, select: { areaCneb: true } });
      const areas = [...new Set(cursos.map((c) => c.areaCneb).filter(esAreaNudito))];
      if (areas.length === 0) forbidden();
      return areas;
    }
    default:
      forbidden();
  }
}

/** Nombres legibles de temas: globales del catálogo (código) y propios del colegio («col:<id>»). Si no se halla, la clave. */
export async function nombresDeTemas(db: DbTenant, claves: readonly TemaClave[]): Promise<Map<TemaClave, { nombre: string; subtema?: string }>> {
  const mapa = new Map<TemaClave, { nombre: string; subtema?: string }>();
  const propios = claves.filter((c) => c.startsWith("col:")).map((c) => c.slice(4)).filter((id) => z.uuid().safeParse(id).success);
  if (propios.length > 0) {
    const filas = await db.nuditoTemaColegio.findMany({ where: { id: { in: propios } }, select: { id: true, nombre: true, subtema: true } });
    for (const f of filas) mapa.set(`col:${f.id}`, { nombre: f.nombre, subtema: f.subtema ?? undefined });
  }
  for (const c of claves) {
    if (mapa.has(c) || c.startsWith("col:")) continue;
    let tema = null;
    try {
      tema = temaPorClave(c);
    } catch {
      // Catálogo aún no disponible (paso 0): se muestra la clave.
    }
    if (tema) mapa.set(c, { nombre: tema.nombre, subtema: tema.subtema });
  }
  return mapa;
}

/** Detalle de un tema para el seguimiento (docente, dirección y familia). Nunca incluye respuestas ni conversaciones. */
export type TemaProgresoDetalle = {
  clave: TemaClave;
  nombre: string;
  subtema?: string;
  area: AreaNudito;
  grado: number;
  estado: EstadoDominio;
  /** Dificultad alcanzada (1–5). */
  dificultad: number;
  intentos: number;
  aciertos: number;
  aciertosSinPista: number;
  /** Promedio de pistas por ejercicio en la ventana reciente de evidencia. */
  pistasPromedio: number | null;
  /** Motivo legible del último cambio (progresión, refuerzo…). */
  motivo: string | null;
  ultimaPractica: string | null;
  fueraDelPlan: boolean;
};

async function dominiosVisibles(ctx: TenantContext, alumnoId: string, area?: AreaNudito) {
  requireFeature(ctx, "nudito_plus");
  const visibles = await areasVisiblesDeAlumno(ctx, alumnoId);
  const areas = area ? visibles.filter((a) => a === area) : visibles;
  if (area && areas.length === 0) forbidden();
  const filas = await ctx.db.nuditoDominio.findMany({
    where: { alumnoId, area: { in: areas } },
    select: {
      temaClave: true, area: true, gradoTema: true, estado: true, dificultad: true, intentos: true, aciertos: true, aciertosSinPista: true,
      evidencia: true, motivo: true, updatedAt: true,
    },
    orderBy: [{ area: "asc" }, { gradoTema: "asc" }, { temaClave: "asc" }],
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "nudito_progreso", entidadId: alumnoId, detalle: { areas } });
  return { areas, filas };
}

function pistasPromedio(evidencia: unknown): number | null {
  const r = z.array(esquemaEvidenciaPractica).safeParse(evidencia);
  if (!r.success || r.data.length === 0) return null;
  return Math.round((r.data.reduce((s, e) => s + e.pistas, 0) / r.data.length) * 10) / 10;
}

/** Progreso del alumno por área y tema (para el seguimiento del docente, la familia y el propio alumno). */
export async function detalleProgresoAlumno(ctx: TenantContext, alumnoId: string, area?: AreaNudito): Promise<{ areas: AreaNudito[]; temas: TemaProgresoDetalle[] }> {
  const { areas, filas } = await dominiosVisibles(ctx, alumnoId, area);
  const nombres = await nombresDeTemas(ctx.db, filas.map((f) => f.temaClave));
  const alumno = await ctx.db.alumno.findFirst({ where: { id: alumnoId }, select: { salon: { select: { anio: true, nivel: true, grado: true } } } });
  const salon = alumno?.salon;
  const planes = salon?.grado ? await ctx.db.planAnual.findMany({ where: { anio: salon.anio, nivel: salon.nivel, grado: salon.grado, area: { in: areas }, versionPublicada: { gt: 0 } }, select: { id: true, versionPublicada: true } }) : [];
  const versiones = planes.length ? await ctx.db.planAnualVersion.findMany({ where: { OR: planes.map(p => ({ planId: p.id, numero: p.versionPublicada })) }, select: { temas: true } }) : [];
  const vigentes = new Set(versiones.flatMap(v => clavesDeVersion(v.temas)));
  return {
    areas,
    temas: filas
      .filter((f) => esAreaNudito(f.area))
      .map((f) => ({
        clave: f.temaClave,
        nombre: nombres.get(f.temaClave)?.nombre ?? f.temaClave,
        subtema: nombres.get(f.temaClave)?.subtema,
        area: f.area as AreaNudito,
        grado: f.gradoTema,
        estado: f.estado,
        dificultad: f.dificultad,
        intentos: f.intentos,
        aciertos: f.aciertos,
        aciertosSinPista: f.aciertosSinPista,
        pistasPromedio: pistasPromedio(f.evidencia),
        motivo: f.motivo,
        ultimaPractica: f.intentos > 0 ? f.updatedAt.toISOString() : null,
        fueraDelPlan: !vigentes.has(f.temaClave),
      })),
  };
}

export async function progresoDeAlumno(ctx: TenantContext, entrada: EntradaApi<"progresoDeAlumno">): Promise<SalidaApi<"progresoDeAlumno">> {
  const { areas, temas } = await detalleProgresoAlumno(ctx, entrada.alumnoId, entrada.area);
  return {
    porArea: areas
      .map((area) => ({
        area,
        temas: temas
          .filter((t) => t.area === area)
          .map((t) => ({
            clave: t.clave, nombre: t.nombre, subtema: t.subtema, grado: t.grado, estado: t.estado,
            recomendado: t.estado === "reforzar" || t.estado === "en_progreso", ultimaPractica: t.ultimaPractica, motivo: t.motivo,
          })),
      }))
      .filter((a) => a.temas.length > 0),
  };
}

/** Curso visible para el seguimiento: dirección → todos; profesor → los que dicta y los de los salones donde es tutor. */
async function cursoVisible(ctx: TenantContext, cursoId: string) {
  requireFeature(ctx, "nudito_plus");
  if (!z.uuid().safeParse(cursoId).success) notFound();
  const curso = await ctx.db.curso.findFirst({
    where: { id: cursoId },
    select: { id: true, nombre: true, areaCneb: true, profesorId: true, salonId: true, salon: { select: { nombre: true, tutorId: true } } },
  });
  if (!curso) notFound();
  if (ctx.rol === "direccion") return curso;
  if (ctx.rol === "profesor" && (curso.profesorId === ctx.membership.id || curso.salon.tutorId === ctx.membership.id)) return curso;
  forbidden();
}

export async function progresoDeCurso(ctx: TenantContext, entrada: EntradaApi<"progresoDeCurso">): Promise<SalidaApi<"progresoDeCurso">> {
  const curso = await cursoVisible(ctx, entrada.cursoId);
  const alumnos = await ctx.db.alumno.findMany({
    where: { salonId: curso.salonId, estado: "activo" },
    select: { id: true, nombres: true, apellidos: true },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
  });
  const area = esAreaNudito(curso.areaCneb) ? curso.areaCneb : null;
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "nudito_progreso_curso", entidadId: curso.id });
  if (!area || alumnos.length === 0) {
    return { alumnos: alumnos.map((a) => ({ alumnoId: a.id, nombre: `${a.apellidos}, ${a.nombres}`, dominados: 0, enProgreso: 0, reforzar: 0, ultimaActividad: null })), temasDificiles: [] };
  }
  const ids = alumnos.map((a) => a.id);
  const where = { alumnoId: { in: ids }, area };
  const [porEstado, ultimas, dificiles] = await Promise.all([
    ctx.db.nuditoDominio.groupBy({ by: ["alumnoId", "estado"], where, _count: { _all: true } }),
    ctx.db.nuditoDominio.groupBy({ by: ["alumnoId"], where: { ...where, intentos: { gt: 0 } }, _max: { updatedAt: true } }),
    ctx.db.nuditoDominio.groupBy({ by: ["temaClave"], where: { ...where, estado: "reforzar" }, _count: { _all: true }, orderBy: { _count: { temaClave: "desc" } }, take: 5 }),
  ]);
  const cuenta = (alumnoId: string, estados: EstadoDominio[]) =>
    porEstado.filter((f) => f.alumnoId === alumnoId && estados.includes(f.estado)).reduce((s, f) => s + f._count._all, 0);
  const ultima = new Map(ultimas.map((u) => [u.alumnoId, u._max.updatedAt?.toISOString() ?? null]));
  const nombres = await nombresDeTemas(ctx.db, dificiles.map((d) => d.temaClave));
  return {
    alumnos: alumnos.map((a) => ({
      alumnoId: a.id,
      nombre: `${a.apellidos}, ${a.nombres}`,
      dominados: cuenta(a.id, ["dominado"]),
      enProgreso: cuenta(a.id, ["en_progreso", "en_comprobacion"]),
      reforzar: cuenta(a.id, ["reforzar"]),
      ultimaActividad: ultima.get(a.id) ?? null,
    })),
    temasDificiles: dificiles.map((d) => ({ clave: d.temaClave, nombre: nombres.get(d.temaClave)?.nombre ?? d.temaClave, alumnos: d._count._all })),
  };
}

export type CursoSeguimiento = { cursoId: string; nombre: string; salon: string; area: AreaNudito | null };

/** Cursos que el docente (o dirección) puede seguir en Nudito, con su área (null si el curso no tiene área de Nudito). */
export async function cursosParaSeguimiento(ctx: TenantContext): Promise<CursoSeguimiento[]> {
  requireFeature(ctx, "nudito_plus");
  if (ctx.rol !== "direccion" && ctx.rol !== "profesor") forbidden();
  const cursos = await ctx.db.curso.findMany({
    where: {
      salon: { archivadoAt: null },
      ...(ctx.rol === "profesor" ? { OR: [{ profesorId: ctx.membership.id }, { salon: { tutorId: ctx.membership.id } }] } : {}),
    },
    select: { id: true, nombre: true, areaCneb: true, salon: { select: { nombre: true } } },
    orderBy: [{ salon: { nombre: "asc" } }, { nombre: "asc" }],
  });
  return cursos.map((c) => ({ cursoId: c.id, nombre: c.nombre, salon: c.salon.nombre, area: esAreaNudito(c.areaCneb) ? c.areaCneb : null }));
}

/** Datos del curso para el encabezado de la página de seguimiento (mismo alcance que `progresoDeCurso`). */
export async function cursoDeSeguimiento(ctx: TenantContext, cursoId: string): Promise<CursoSeguimiento> {
  const c = await cursoVisible(ctx, cursoId);
  return { cursoId: c.id, nombre: c.nombre, salon: c.salon.nombre, area: esAreaNudito(c.areaCneb) ? c.areaCneb : null };
}
