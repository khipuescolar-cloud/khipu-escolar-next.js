import "server-only";
import type { EntradaApi, SalidaApi } from "@/lib/nudito/contratos";
import { pendiente } from "@/lib/nudito/pendiente";
import type { TenantContext } from "../tenant";

// Responsable: D (specs/44). Progreso formativo (nunca notas). Alcance: alumno → el suyo; apoderado → sus hijos
// (alumnoIdsVisibles); profesor → alumnos de los cursos que dicta, SOLO del área de ese curso (el tutor ve todas las
// áreas de su salón); dirección → todo. Agregados con groupBy sobre nudito_dominios: sin N+1 y sin texto de conversaciones.

export async function progresoDeAlumno(ctx: TenantContext, entrada: EntradaApi<"progresoDeAlumno">): Promise<SalidaApi<"progresoDeAlumno">> {
  return pendiente("D", "progresoDeAlumno", ctx, entrada);
}

export async function progresoDeCurso(ctx: TenantContext, entrada: EntradaApi<"progresoDeCurso">): Promise<SalidaApi<"progresoDeCurso">> {
  return pendiente("D", "progresoDeCurso", ctx, entrada);
}
