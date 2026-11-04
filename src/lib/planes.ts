// Planes y funciones por plan (specs/03-planes-y-permisos.md).
// Archivo compartido cliente/servidor: solo datos y funciones puras. El bloqueo real se hace en lib/server/plan.ts.
import type { Plan } from "@/generated/prisma/enums";

export const ORDEN_PLANES: Record<Plan, number> = { base: 1, pro: 2 };

/** Respaldo si el catálogo (`planes_catalogo.nombre`) no tiene el plan. */
export const NOMBRE_PLAN: Record<Plan, string> = {
  base: "Khipu Base",
  pro: "Khipu Pro",
};

export const FEATURES = {
  asistencia: "base",
  avisos: "base",
  porteria: "base",
  justificaciones: "base",
  mensajes: "base",
  comunicados: "base",
  gestion: "base",
  /** Horario semanal por salón: horas del día por nivel, cursos por casillero, «Mi horario» (specs/34). */
  horario: "base",
  notas: "pro",
  libreta: "pro",
  tareas: "pro",
  agenda: "pro",
  /** Tablero e informes de dirección (specs/33). */
  tablero: "pro",
  /** Biblioteca de documentos con carpetas y permisos por rol y salón (specs/31). */
  documentos: "pro",
  /** Reuniones de padres: convocatoria, confirmación, asistencia y acta (specs/32). */
  reuniones: "pro",
  /** Chat con el equipo Khipu (mesa de ayuda, specs/23): en todos los planes. */
  soporte: "base",
  /** Nudito+ (tutor IA por alumno, specs/29): solo Khipu Pro, fijo por plan (ver MODULOS_FIJOS_POR_PLAN). */
  nudito_plus: "pro",
} as const satisfies Record<string, Plan>;

export type Feature = keyof typeof FEATURES;

/**
 * Interruptor de Nudito+ (specs/28, specs/29). Nudito+ es un producto FUTURO que contrataría el colegio; el modelo de
 * licencia familiar pagada con Yape está en pausa (se descartó). Apagado: `nudito_plus` no queda activo en ningún
 * colegio (desaparece del menú y `requireFeature` responde 403) y los crons de Nudito+ no hacen nada.
 * No se borra código, tablas ni datos: para reactivarlo basta cambiar esta constante (con decisión comercial).
 */
export const NUDITO_PLUS_DISPONIBLE = false;

/**
 * Nudito+ está disponible. Solo en tests (vitest, `NODE_ENV === "test"`) se puede forzar con
 * `KHIPU_TEST_NUDITO_PLUS=1` para seguir validando su lógica; en desarrollo y producción manda la constante.
 */
export function nuditoPlusDisponible(): boolean {
  if (NUDITO_PLUS_DISPONIBLE) return true;
  return process.env.NODE_ENV === "test" && process.env.KHIPU_TEST_NUDITO_PLUS === "1";
}

export function planIncluye(plan: Plan, feature: Feature): boolean {
  return ORDEN_PLANES[plan] >= ORDEN_PLANES[FEATURES[feature]];
}

export function planMinimo(feature: Feature): Plan {
  return FEATURES[feature];
}
