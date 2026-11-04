import "server-only";
import type { Nivel } from "@/generated/prisma/enums";
import type { CursoNuditoVista } from "@/lib/nudito/contratos";
import { pendiente } from "@/lib/nudito/pendiente";
import type { DbTenant } from "../db";
import type { TenantContext } from "../tenant";

// Responsable: A (specs/42). Área CNEB de cada curso (`cursos.area_cneb`). La migración rellenó por el prefijo de los
// desempeños importados (MAT/COM/CYT); esto completa por nombre con `detectarArea` (src/lib/cneb/catalogo.ts), sin
// tocar los cursos con `area_cneb_manual = true`.

/** Clave del área según el nombre y nivel del curso, o null. Puro (envuelve `detectarArea`). */
export function areaDeCurso(nombre: string, nivel: Nivel): string | null {
  return pendiente("A", "areaDeCurso", nombre, nivel);
}

/** Rellena las áreas que falten (idempotente). Sin `tenantId`: todos los colegios (script y seed). */
export async function rellenarAreasCursos(tenantId?: string): Promise<{ revisados: number; actualizados: number }> {
  return pendiente("A", "rellenarAreasCursos", tenantId);
}

/** Dirección fija el área a mano (`area_cneb_manual = true`); `area = null` vuelve al cálculo automático. Auditado. */
export async function fijarAreaCurso(ctx: TenantContext, entrada: unknown): Promise<void> {
  return pendiente("A", "fijarAreaCurso", ctx, entrada);
}

/** Cursos del salón del alumno con área de Nudito habilitada (una sola consulta). */
export async function cursosNuditoDelAlumno(db: DbTenant, alumnoId: string, areas: readonly string[]): Promise<CursoNuditoVista[]> {
  return pendiente("A", "cursosNuditoDelAlumno", db, alumnoId, areas);
}
