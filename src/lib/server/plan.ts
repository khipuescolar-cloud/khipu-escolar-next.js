import "server-only";
import { forbidden } from "next/navigation";
import { planIncluye, type Feature } from "@/lib/planes";
import type { TenantContext } from "./tenant";

/** Corta el request con 403 si el plan del colegio no incluye la función. Úsalo en páginas, actions y route handlers. */
export function requireFeature(ctx: TenantContext, feature: Feature): void {
  if (!planIncluye(ctx.tenant.plan, feature)) forbidden();
}

export function tieneFeature(ctx: TenantContext, feature: Feature): boolean {
  return planIncluye(ctx.tenant.plan, feature);
}
