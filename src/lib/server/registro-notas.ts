import "server-only";
/* eslint-disable @typescript-eslint/no-unused-vars -- Firmas de contrato pendientes de implementar. */
import type { Nivel } from "@/generated/prisma/enums";
import type { TenantContext } from "./tenant";

export type CursoRegistro = {
  id: string;
  nombre: string;
  nivel: Nivel;
  grado: number | null;
  seccion: string;
  numeroAlumnos: number;
};
export type ValorRegistro = string | null;
export type ColumnaRegistro = {
  evaluacionId: string;
  nombre: string;
  descripcion: string | null;
  fecha: Date;
  origen: "manual" | "tarea";
  tareaId: string | null;
};
export type BloqueRegistro = { competenciaId: string; competenciaNombre: string; columnas: ColumnaRegistro[] };
export type NotaRegistro = {
  evaluacionId: string;
  alumnoId: string;
  valor: ValorRegistro;
  marca: "nsp" | "no_entrego" | null;
};
export type RegistroCurso = {
  curso: CursoRegistro;
  periodoId: string;
  alumnos: { id: string; nombres: string; apellidos: string }[];
  bloques: BloqueRegistro[];
  notas: NotaRegistro[];
};
export type NuevaCalificacion = {
  cursoId: string;
  periodoId?: string;
  nombre: string;
  descripcion?: string;
  fecha: Date;
  competenciaId: string;
  notas: { alumnoId: string; valor: ValorRegistro }[];
  claveIdempotencia: string;
};

/** Cursos visibles para el docente en el año solicitado o vigente. */
export async function cursosDelDocente(_ctx: TenantContext, _anio?: number): Promise<CursoRegistro[]> {
  throw new Error("pendiente");
}

/** Registro de alumnos y evaluaciones agrupadas por competencia, con una sola Nota por alumno y evaluación. */
export async function registroDelCurso(
  _ctx: TenantContext, _cursoId: string, _periodoId?: string,
): Promise<RegistroCurso> {
  throw new Error("pendiente");
}

/** Guarda la evaluación y sus notas de forma atómica e idempotente; null permanece pendiente. */
export async function crearCalificacion(_ctx: TenantContext, _datos: NuevaCalificacion): Promise<{ evaluacionId: string }> {
  throw new Error("pendiente");
}

/** Corrige una nota mediante las reglas y el historial existentes, con motivo cuando corresponda. */
export async function editarNotaRegistro(
  _ctx: TenantContext,
  _datos: { evaluacionId: string; alumnoId: string; valor: ValorRegistro; motivo: string },
): Promise<void> {
  throw new Error("pendiente");
}
