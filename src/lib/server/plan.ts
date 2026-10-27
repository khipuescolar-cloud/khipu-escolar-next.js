import "server-only";
import { forbidden } from "next/navigation";
import { planIncluye, type Feature } from "@/lib/planes";
import type { TenantContext } from "./tenant";

/**
 * Funciones privadas que el super administrador NUNCA ve en modo soporte (specs/16, Ley 29733):
 * chats, notas, libreta y Nudito. Se bloquean aquí porque todas sus páginas, actions y route handlers
 * ya llaman a `requireFeature`.
 */
export const FEATURES_PRIVADAS_SOPORTE: ReadonlySet<Feature> = new Set<Feature>(["mensajes", "notas", "libreta", "nudito"]);

/** Corta el request con 403 si el plan del colegio no incluye la función (o si es privada y se está en modo soporte). */
export function requireFeature(ctx: TenantContext, feature: Feature): void {
  if (!tieneFeature(ctx, feature)) forbidden();
}

export function tieneFeature(ctx: TenantContext, feature: Feature): boolean {
  if (ctx.soporte && FEATURES_PRIVADAS_SOPORTE.has(feature)) return false;
  return planIncluye(ctx.tenant.plan, feature);
}
