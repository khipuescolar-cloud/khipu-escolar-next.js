import "server-only";
import type { AreaNudito, ConfigNudito } from "@/lib/nudito/contratos";
import { pendiente } from "@/lib/nudito/pendiente";
import type { TenantContext } from "../tenant";

// Responsable: D (specs/44). Interruptor institucional y límites (tabla nudito_config_colegio). Sin fila = apagado.
// Manda: interruptor global del producto (src/lib/planes.ts) → bloqueo de plataforma → `activo` del colegio.

export type EstadoNuditoColegio = { activo: boolean; motivo?: "producto" | "plataforma" | "colegio" | "plan"; config: ConfigNudito };

/** Configuración vigente (con valores por defecto si no hay fila). Lectura para todos los roles del colegio. */
export async function configNudito(ctx: TenantContext): Promise<EstadoNuditoColegio> {
  return pendiente("D", "configNudito", ctx);
}

/** Solo dirección. Valida con `esquemaConfigNudito`, audita y registra `actualizadoPorId`/`activadoAt`. */
export async function guardarConfigNudito(ctx: TenantContext, entrada: unknown): Promise<EstadoNuditoColegio> {
  return pendiente("D", "guardarConfigNudito", ctx, entrada);
}

/** El colegio permite Nudito para ese nivel, grado y área (lo usa el acceso y el selector de cursos). */
export async function nuditoHabilitadoPara(ctx: TenantContext, datos: { nivel: string; grado: number | null; area?: AreaNudito }): Promise<boolean> {
  return pendiente("D", "nuditoHabilitadoPara", ctx, datos);
}
