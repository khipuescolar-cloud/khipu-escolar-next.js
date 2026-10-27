// Planes y funciones por plan (specs/03-planes-y-permisos.md).
// Archivo compartido cliente/servidor: solo datos y funciones puras. El bloqueo real se hace en lib/server/plan.ts.
import type { Plan } from "@/generated/prisma/enums";

export const ORDEN_PLANES: Record<Plan, number> = { basico: 1, fase2: 2, promax: 3 };

export const NOMBRE_PLAN: Record<Plan, string> = {
  basico: "Básico",
  fase2: "Familia",
  promax: "Pro Max",
};

export const FEATURES = {
  asistencia: "basico",
  avisos: "basico",
  porteria: "basico",
  justificaciones: "basico",
  mensajes: "basico",
  comunicados: "basico",
  gestion: "basico",
  notas: "fase2",
  libreta: "fase2",
  tareas: "fase2",
  agenda: "fase2",
  nudito: "promax",
} as const satisfies Record<string, Plan>;

export type Feature = keyof typeof FEATURES;

export function planIncluye(plan: Plan, feature: Feature): boolean {
  return ORDEN_PLANES[plan] >= ORDEN_PLANES[FEATURES[feature]];
}

export function planMinimo(feature: Feature): Plan {
  return FEATURES[feature];
}
