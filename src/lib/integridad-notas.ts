// Integridad y auditoría de notas (specs/11, specs/37). Lógica pura: la usan el servidor, la UI y los tests.

export const MENSAJE_EVALUACION_NO_ELIMINABLE = "Esta actividad ya tiene resultados publicados o historial; no se puede eliminar";

/** Caracteres (sin contar espacios) que exige el motivo de una corrección auditada. */
export const MIN_CARACTERES_MOTIVO = 5;

export const MENSAJE_MOTIVO_CORTO = `Explica el motivo del cambio (mínimo ${MIN_CARACTERES_MOTIVO} caracteres).`;

type NotaParaBorrado = { marca: string | null; vencidaAt: Date | null; recuperacion: string | null };

/**
 * Una evaluación solo se elimina si está en borrador (programada) y no tiene historial, NSP, consecuencia por
 * vencimiento ni recuperación. Cualquier nota registrada deja historial, así que en la práctica solo se borran las
 * actividades sin notas (o creadas por error antes de calificar).
 */
export function evaluacionEliminable(e: { estado: string; tieneHistorial: boolean; notas: NotaParaBorrado[] }): boolean {
  if (e.estado === "publicada" || e.tieneHistorial) return false;
  return !e.notas.some((n) => n.marca === "nsp" || n.vencidaAt !== null || n.recuperacion !== null);
}

/** ¿El motivo tiene al menos `MIN_CARACTERES_MOTIVO` caracteres que no son espacios? */
export function motivoSuficiente(motivo: string | null | undefined): boolean {
  return (motivo ?? "").replace(/\s/g, "").length >= MIN_CARACTERES_MOTIVO;
}
