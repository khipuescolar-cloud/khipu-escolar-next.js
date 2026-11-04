import "server-only";
import type { ProveedorTutorIA } from "@/lib/nudito/contratos";
import { configProveedor, type ConfigProveedor } from "../../nudito-plus/proveedor";
import { proveedorClaude } from "./claude";
import { proveedorGemini } from "./gemini";
import { proveedorOpenAI } from "./openai";
import { ProveedorTutorSimulado, type OpcionesSimulado } from "./simulado";

// Proveedor de IA del tutor, intercambiable (Claude/GPT/Gemini) detrás de `ProveedorTutorIA` (specs/41).
// HOY SOLO EXISTE EL SIMULADO: no hay credenciales. Un adaptador real se registra únicamente si su variable de entorno
// existe (ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY) Y la configuración de plataforma «nudito_plus:proveedor»
// lo elige por nombre («claude», «openai», «gemini»). En cualquier otro caso → simulado.

export type { ProveedorIA, MensajeIA, RespuestaIA } from "../../nudito-plus/proveedor";
export { registrarConsumo } from "./consumo";

const REALES: Record<string, (modelo: string | null) => ProveedorTutorIA | null> = {
  claude: proveedorClaude,
  openai: proveedorOpenAI,
  gemini: proveedorGemini,
};

let paraPruebas: ProveedorTutorIA | null = null;

/** Solo pruebas: fija el proveedor que devuelve `obtenerProveedorTutor` (null = volver al normal). */
export function fijarProveedorTutorParaPruebas(p: ProveedorTutorIA | null): void {
  if (process.env.NODE_ENV !== "test") throw new Error("Solo en pruebas");
  paraPruebas = p;
}

/** Proveedor según la configuración de plataforma; nombre desconocido o sin credenciales → simulado. */
export async function obtenerProveedorTutor(config?: ConfigProveedor): Promise<ProveedorTutorIA> {
  if (paraPruebas) return paraPruebas;
  const { nombre, modelo } = config ?? (await configProveedor());
  const real = REALES[nombre]?.(modelo) ?? null;
  return real ?? proveedorSimulado();
}

/** Proveedor simulado, local y determinista (sin red ni claves). */
export function proveedorSimulado(opciones?: OpcionesSimulado): ProveedorTutorIA {
  return new ProveedorTutorSimulado(opciones);
}
