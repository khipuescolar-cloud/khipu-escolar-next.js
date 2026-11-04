import "server-only";
import { pendiente } from "@/lib/nudito/pendiente";

// Responsable: D (specs/44). Purga lo que supera `retencion_dias` de cada colegio: intentos, ejercicios, mensajes de
// sesión y fotos (también en el proveedor de archivos). Conserva nudito_dominios y nudito_dominio_eventos (agregados).
// Corre en el cron semanal de Nudito (/api/cron/nudito-plus).

export type ResultadoRetencion = { colegios: number; intentos: number; ejercicios: number; mensajes: number; fotos: number };

export async function purgarRetencion(ahora: Date = new Date()): Promise<ResultadoRetencion> {
  return pendiente("D", "purgarRetencion", ahora);
}
