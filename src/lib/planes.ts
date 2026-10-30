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
} as const satisfies Record<string, Plan>;

export type Feature = keyof typeof FEATURES;

export function planIncluye(plan: Plan, feature: Feature): boolean {
  return ORDEN_PLANES[plan] >= ORDEN_PLANES[FEATURES[feature]];
}

export function planMinimo(feature: Feature): Plan {
  return FEATURES[feature];
}
