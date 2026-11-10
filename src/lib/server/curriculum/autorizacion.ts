import "server-only";
import { forbidden } from "next/navigation";
import type { Rol } from "@/generated/prisma/enums";
import { requireFeature } from "../plan";
import { requireCursoDelProfesor, type TenantContext } from "../tenant";

/** Estado global de la pieza editorial; un valor desconocido se trata como no publicado. */
export type EstadoEditorial = "borrador" | "revisado";
export type TemaEditorial = { estadoEditorial: EstadoEditorial };
export type TemaVisible<T> = { tema: T; marcaEditorial: "Borrador" | null };

/** Profesores pueden planificar con borradores; dirección observa; estudiantes solo consumen revisados. */
export function puedeVerTema(rol: Rol, estado: EstadoEditorial): boolean {
  if (estado === "revisado") return rol === "profesor" || rol === "direccion" || rol === "alumno";
  return estado === "borrador" && (rol === "profesor" || rol === "direccion");
}

/** Filtra en el servidor y marca explícitamente cada borrador visible para adultos. */
export function filtrarVisibles<T extends TemaEditorial>(rol: Rol, temas: readonly T[]): TemaVisible<T>[] {
  return temas.filter((tema) => puedeVerTema(rol, tema.estadoEditorial)).map((tema) => ({
    tema,
    marcaEditorial: tema.estadoEditorial === "borrador" ? "Borrador" : null,
  }));
}

/** Barrera para toda lectura de catálogo de Nudito desde un colegio. */
export function requireLectorCurriculum(ctx: TenantContext): void {
  requireFeature(ctx, "nudito_plus");
  if (ctx.rol !== "profesor" && ctx.rol !== "direccion" && ctx.rol !== "alumno") forbidden();
}

/** Antes de leer/seleccionar temas de un curso, limita al profesor asignado. */
export async function requireCursoCurriculumVisible(ctx: TenantContext, cursoId: string): Promise<void> {
  requireLectorCurriculum(ctx);
  if (ctx.rol === "alumno") forbidden();
  await requireCursoDelProfesor(ctx, cursoId);
}

/** TODO(modelo A): el lector de temas globales debe usar esta barrera y filtrar antes de devolver datos al cliente. */
