import "server-only";
import { forbidden } from "next/navigation";
import { rolPuedeVer } from "@/lib/modulos";
import type { Feature } from "@/lib/planes";
import type { TenantContext } from "./tenant";

/**
 * Funciones privadas que el super administrador NUNCA ve en modo soporte (specs/16, Ley 29733):
 * chats, notas, libreta y Nudito. Se bloquean aquí porque todas sus páginas, actions y route handlers
 * ya llaman a `requireFeature`.
 */
export const FEATURES_PRIVADAS_SOPORTE: ReadonlySet<Feature> = new Set<Feature>(["mensajes", "notas", "libreta", "nudito"]);

/**
 * Corta el request con 403 si el colegio no tiene el módulo (plan ± ajustes del colegio), si el módulo
 * está desactivado para el rol, o si es privado y se está en modo soporte (specs/03 y specs/19).
 */
export function requireFeature(ctx: TenantContext, feature: Feature): void {
  if (!tieneFeature(ctx, feature)) forbidden();
}

/**
 * El módulo está disponible en este request. La restricción por rol que impone el código (p. ej. el alumno
 * nunca usa Mensajes) la siguen haciendo `requireRol` y cada página; aquí solo se aplica lo configurable:
 * el módulo desactivado para el rol en el panel (RolModulo).
 */
export function tieneFeature(ctx: TenantContext, feature: Feature): boolean {
  if (ctx.soporte && FEATURES_PRIVADAS_SOPORTE.has(feature)) return false;
  if (!ctx.modulos.has(feature)) return false;
  return !ctx.accesoModulos.quitadosRol.has(feature) || feature === "gestion";
}

export type EstadoModulo = { estado: "activo" } | { estado: "oculto" } | { estado: "bloqueado"; planMinimo: string };

/**
 * Cómo se muestra un módulo en la navegación y el inicio:
 * - `oculto`: quitado al colegio o al rol, o privado en modo soporte (no aparece);
 * - `bloqueado`: no está en el plan → candado con el plan mínimo que lo incluye según el catálogo
 *   (si ningún plan lo incluye, se oculta);
 * - `activo`: enlace normal.
 */
export function estadoModulo(ctx: TenantContext, feature: Feature): EstadoModulo {
  if (ctx.soporte && FEATURES_PRIVADAS_SOPORTE.has(feature)) return { estado: "oculto" };
  if (!rolPuedeVer(ctx.rol, feature, ctx.accesoModulos.quitadosRol)) return { estado: "oculto" };
  if (ctx.accesoModulos.quitadosColegio.has(feature)) return { estado: "oculto" };
  if (!ctx.modulos.has(feature)) {
    const planMinimo = ctx.accesoModulos.planMinimo[feature];
    return planMinimo ? { estado: "bloqueado", planMinimo } : { estado: "oculto" };
  }
  return { estado: "activo" };
}
