import "server-only";
import { z } from "zod";
import type { Nivel } from "@/generated/prisma/enums";
import { areaPorClave, detectarArea } from "@/lib/cneb/catalogo";
import { AREAS_NUDITO, esAreaNudito, type CursoNuditoVista } from "@/lib/nudito/contratos";
import { cursoKhipu } from "@/lib/cursos-khipu/catalogo";
import { claveCursoAsignado } from "@/lib/server/plan-anual/catalogo-curso";
import { auditar } from "../auditoria";
import { ErrorDeNegocio } from "../contexto-accion";
import { db as dbGlobal, type DbTenant } from "../db";
import { requireAlumnoVisible, requireRol, type TenantContext } from "../tenant";

// Responsable: A (specs/42). Área CNEB de cada curso (`cursos.area_cneb`). La migración rellenó por el prefijo de los
// desempeños importados (MAT/COM/CYT); esto completa por nombre con `detectarArea` (src/lib/cneb/catalogo.ts), sin
// tocar los cursos con `area_cneb_manual = true`.

/** Clave del área según el nombre y nivel del curso, o null. Puro (envuelve `detectarArea`). */
export function areaDeCurso(nombre: string, nivel: Nivel): string | null {
  return detectarArea(nombre, nivel)?.area ?? null;
}

/**
 * Rellena las áreas que falten (idempotente): solo cursos sin área y no manuales. Sin `tenantId`: todos los colegios
 * (script `pnpm nudito:areas` y seed). Una actualización por área detectada.
 */
export async function rellenarAreasCursos(tenantId?: string): Promise<{ revisados: number; actualizados: number }> {
  const cursos = await dbGlobal.curso.findMany({
    where: { ...(tenantId ? { tenantId } : {}), areaCneb: null, areaCnebManual: false },
    select: { id: true, nombre: true, salon: { select: { nivel: true } } },
  });
  const porArea = new Map<string, string[]>();
  for (const c of cursos) {
    const area = areaDeCurso(c.nombre, c.salon.nivel);
    if (area) porArea.set(area, [...(porArea.get(area) ?? []), c.id]);
  }
  let actualizados = 0;
  for (const [area, ids] of porArea) {
    const r = await dbGlobal.curso.updateMany({ where: { id: { in: ids }, areaCneb: null, areaCnebManual: false }, data: { areaCneb: area } });
    actualizados += r.count;
  }
  return { revisados: cursos.length, actualizados };
}

/** Alias con el nombre del plan de trabajo de A: detecta y guarda las áreas de un colegio. */
export const detectarYGuardarAreas = (tenantId: string) => rellenarAreasCursos(tenantId);

const esquemaFijarArea = z.object({
  cursoId: z.uuid(),
  /** Clave de `CATALOGO_CNEB`; null vuelve al cálculo automático por nombre. */
  area: z.string().nullable(),
});

/** Dirección fija el área a mano (`area_cneb_manual = true`); `area = null` vuelve al cálculo automático. Auditado. */
export async function fijarAreaCurso(ctx: TenantContext, entrada: unknown): Promise<void> {
  requireRol(ctx, ["direccion"]);
  const r = esquemaFijarArea.safeParse(entrada);
  if (!r.success) throw new ErrorDeNegocio("Revisa el área elegida.");
  const { cursoId, area } = r.data;
  if (area !== null && !areaPorClave(area)) throw new ErrorDeNegocio("El área no existe en el catálogo CNEB.");
  const curso = await ctx.db.curso.findFirst({ where: { id: cursoId }, select: { nombre: true, areaCneb: true, areaCnebManual: true, salon: { select: { nivel: true } } } });
  if (!curso) throw new ErrorDeNegocio("No se encontró el curso.");
  // Sin cambios (p. ej. el formulario de Gestión reenvía el mismo valor): no se escribe ni se audita.
  if (area === null ? !curso.areaCnebManual : curso.areaCnebManual && curso.areaCneb === area) return;
  const data = area === null ? { areaCneb: areaDeCurso(curso.nombre, curso.salon.nivel), areaCnebManual: false } : { areaCneb: area, areaCnebManual: true };
  await ctx.db.curso.updateMany({ where: { id: cursoId }, data });
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "curso", entidadId: cursoId,
    detalle: { campo: "area_cneb", antes: curso.areaCneb, despues: data.areaCneb, manual: data.areaCnebManual },
  });
}

/** Alias con el nombre del plan de trabajo de A. */
export const asignarAreaCurso = fijarAreaCurso;

/** Una entrada por curso de Khipu del salón; conserva el id del curso real para la sesión. */
export async function cursosNuditoDelAlumno(db: DbTenant, alumnoId: string, areas: readonly string[]): Promise<CursoNuditoVista[]> {
  const habilitadas = areas.filter(esAreaNudito);
  if (!habilitadas.length) return [];
  const alumno = await db.alumno.findFirst({
    where: { id: alumnoId },
    select: { salon: { select: { nivel: true, cursos: { select: { id: true, nombre: true, cursoColegio: { select: { cursoKhipu: true } } } } } } },
  });
  if (!alumno) return [];
  const porCurso = new Map<string, CursoNuditoVista>();
  for (const c of alumno.salon.cursos) {
    const clave = claveCursoAsignado(c, alumno.salon.nivel);
    const curso = clave ? cursoKhipu(clave) : null;
    if (curso && esAreaNudito(curso.area) && habilitadas.includes(curso.area) && !porCurso.has(clave!))
      porCurso.set(clave!, { cursoId: c.id, nombre: c.nombre, area: curso.area });
  }
  return [...porCurso.entries()].sort(([ka, a], [kb, b]) => AREAS_NUDITO.indexOf(a.area) - AREAS_NUDITO.indexOf(b.area) || Number(ka !== a.area) - Number(kb !== b.area) || ka.localeCompare(kb, "es")).map(([, curso]) => curso);
}

/** Igual que `cursosNuditoDelAlumno` con las 3 áreas, exigiendo que el alumno sea visible para quien pregunta. */
export async function cursosNuditoDeAlumno(ctx: TenantContext, alumnoId: string, areas: readonly string[] = AREAS_NUDITO): Promise<CursoNuditoVista[]> {
  await requireAlumnoVisible(ctx, alumnoId);
  return cursosNuditoDelAlumno(ctx.db, alumnoId, areas);
}
