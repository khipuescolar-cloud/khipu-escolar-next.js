import "server-only";
/* eslint-disable @typescript-eslint/no-unused-vars -- Firmas de contrato pendientes de implementar. */
import type { OrigenCompetencia } from "@/generated/prisma/enums";
import type { TenantContext } from "./tenant";

/** Competencia del curso; las desactivadas solo se consultan expresamente para preservar el historial. */
export type CompetenciaCurso = {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  origen: OrigenCompetencia;
  codigoOficial: string | null;
  desactivadaAt: Date | null;
};

export type DatosCompetencia = { cursoId: string; nombre: string; descripcion?: string; codigoOficial?: string };

/** Lista las competencias del curso en orden; omite las desactivadas salvo indicación expresa. */
export async function competenciasDelCurso(
  _ctx: TenantContext, _cursoId: string, _opciones: { incluirDesactivadas?: boolean } = {},
): Promise<CompetenciaCurso[]> {
  throw new Error("pendiente");
}

/** Dirección y el rol académico equivalente gestionan por rol; docentes necesitan permiso explícito. */
export function puedeGestionarCompetencias(_ctx: TenantContext): boolean {
  throw new Error("pendiente");
}

/** Crea una competencia personalizada dentro del curso autorizado. */
export async function crearCompetencia(_ctx: TenantContext, _datos: DatosCompetencia): Promise<CompetenciaCurso> {
  throw new Error("pendiente");
}

/** Edita la competencia conservando su identidad y referencias históricas. */
export async function editarCompetencia(
  _ctx: TenantContext, _competenciaId: string, _cambios: Pick<DatosCompetencia, "nombre" | "descripcion">,
): Promise<CompetenciaCurso> {
  throw new Error("pendiente");
}

/** Desactiva lógicamente la competencia y registra el responsable. */
export async function desactivarCompetencia(_ctx: TenantContext, _competenciaId: string): Promise<void> {
  throw new Error("pendiente");
}

/** Reactiva una competencia conservando su historial. */
export async function reactivarCompetencia(_ctx: TenantContext, _competenciaId: string): Promise<void> {
  throw new Error("pendiente");
}

/** Restaura la plantilla CNEB del área y nivel del curso sin borrar personalizaciones. */
export async function restaurarPlantillaOficial(_ctx: TenantContext, _cursoId: string): Promise<CompetenciaCurso[]> {
  throw new Error("pendiente");
}
