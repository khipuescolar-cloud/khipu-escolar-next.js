import "server-only";
import type { ConsumoIA, OperacionIa, ProveedorTutorIA } from "@/lib/nudito/contratos";
import { pendiente } from "@/lib/nudito/pendiente";
import type { DbTenant } from "../../db";

// Responsable: C (specs/41). Proveedor de IA del tutor, intercambiable (Claude/GPT/Gemini) detrás de `ProveedorTutorIA`.
// HOY SOLO EXISTE EL SIMULADO: no hay credenciales. Un adaptador real se registra únicamente si su variable de entorno
// existe; si no, se usa el simulado. Configuración: ConfigPlataforma «nudito_plus:proveedor» (src/lib/server/nudito-plus/proveedor.ts).

export type { ProveedorIA, MensajeIA, RespuestaIA } from "../../nudito-plus/proveedor";

/** Proveedor según la configuración de plataforma; nombre desconocido o sin credenciales → simulado. */
export async function obtenerProveedorTutor(): Promise<ProveedorTutorIA> {
  return pendiente("C", "obtenerProveedorTutor");
}

/** Proveedor simulado, local y determinista (sin red ni claves). */
export function proveedorSimulado(): ProveedorTutorIA {
  return pendiente("C", "proveedorSimulado");
}

/** Registra una llamada en `nudito_consumos_ia` y suma el total del mes en `UsoNudito`. */
export async function registrarConsumo(
  db: DbTenant,
  datos: { tenantId: string; alumnoId: string; sesionId: string | null; operacion: OperacionIa; consumo: ConsumoIA; ok: boolean; error?: string },
): Promise<void> {
  return pendiente("C", "registrarConsumo", db, datos);
}
