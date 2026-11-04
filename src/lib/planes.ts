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
  /**
   * Nudito, tutor de práctica de Khipu Pro (specs/41–44). La clave interna sigue siendo `nudito_plus` para no romper
   * datos (PlanModulo, RolModulo, auditoría); es fijo por plan (ver MODULOS_FIJOS_POR_PLAN).
   */
  nudito_plus: "pro",
} as const satisfies Record<string, Plan>;

export type Feature = keyof typeof FEATURES;

/**
 * Interruptor del tutor Nudito en Khipu Pro (specs/41, specs/44). Encendido: todo colegio Pro tiene el módulo
 * `nudito_plus`; cada colegio lo activa en su configuración (`nudito_config_colegio.activo`, sin fila = apagado).
 */
export const NUDITO_TUTOR_DISPONIBLE = true;

/** @deprecated Nombre antiguo (Nudito+ como producto aparte, specs/28–29). Usa `NUDITO_TUTOR_DISPONIBLE`. */
export const NUDITO_PLUS_DISPONIBLE = NUDITO_TUTOR_DISPONIBLE;

/**
 * Licencias familiares de Nudito+ pagadas con Yape (specs/28): DESCARTADAS. Nudito es parte de Khipu Pro, sin cobro a
 * familias. Apagado: «Activar», reportar pagos, verificar pagos y crear o extender licencias responden 404/403; el cron
 * no procesa vencimientos; el panel de plataforma las muestra como «Histórico». Las tablas y sus filas se conservan.
 */
export const NUDITO_LICENCIAS_FAMILIARES = false;

/** El tutor Nudito está disponible en el producto (hoy siempre). */
export function nuditoPlusDisponible(): boolean {
  return NUDITO_TUTOR_DISPONIBLE;
}

/**
 * Licencias familiares activas. Solo en tests (vitest, `NODE_ENV === "test"`) se pueden forzar con
 * `KHIPU_TEST_NUDITO_LICENCIAS=1` para validar la lógica histórica (regresión del modo inerte).
 */
export function licenciasFamiliaresNudito(): boolean {
  if (NUDITO_LICENCIAS_FAMILIARES) return true;
  return process.env.NODE_ENV === "test" && process.env.KHIPU_TEST_NUDITO_LICENCIAS === "1";
}

export function planIncluye(plan: Plan, feature: Feature): boolean {
  return ORDEN_PLANES[plan] >= ORDEN_PLANES[FEATURES[feature]];
}

export function planMinimo(feature: Feature): Plan {
  return FEATURES[feature];
}
