// Integridad y auditoría de notas (specs/11, specs/37). Lógica pura: la usan el servidor, la UI y los tests.

export const MENSAJE_EVALUACION_NO_ELIMINABLE = "Esta actividad ya tiene resultados publicados o historial; no se puede eliminar";

/** Caracteres (sin contar espacios) que exige el motivo de una corrección auditada. */
export const MIN_CARACTERES_MOTIVO = 5;

export const MENSAJE_MOTIVO_CORTO = `Explica el motivo del cambio (mínimo ${MIN_CARACTERES_MOTIVO} caracteres).`;

type NotaParaBorrado = { marca: string | null; vencidaAt: Date | null; recuperacion: string | null };

/** Tipos de historial que solo existen si la actividad se publicó o tuvo NSP/consecuencia/recuperación. */
export const TIPOS_HISTORIAL_BLOQUEANTES = ["correccion_digitacion", "otra", "recuperacion", "consecuencia_vencimiento", "decision_recuperacion"] as const;

/**
 * Una evaluación se elimina si NUNCA se publicó y no tiene NSP, consecuencia por vencimiento ni recuperación, aunque
 * tenga notas e historial de borrador (el docente la creó por error). «Se publicó alguna vez»: estado `publicada`,
 * `publicada_at`, historial marcado `publicada` o de un tipo de corrección, o eventos académicos del grupo.
 */
export function evaluacionEliminable(e: {
  estado: string; publicadaAt: Date | null; historialBloqueante: boolean; eventosDelGrupo: boolean; notas: NotaParaBorrado[];
}): boolean {
  if (e.estado === "publicada" || e.publicadaAt !== null || e.historialBloqueante || e.eventosDelGrupo) return false;
  return !e.notas.some((n) => n.marca === "nsp" || n.vencidaAt !== null || n.recuperacion !== null);
}

/** ¿El motivo tiene al menos `MIN_CARACTERES_MOTIVO` caracteres que no son espacios? */
export function motivoSuficiente(motivo: string | null | undefined): boolean {
  return (motivo ?? "").replace(/\s/g, "").length >= MIN_CARACTERES_MOTIVO;
}
