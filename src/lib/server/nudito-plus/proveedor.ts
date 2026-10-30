import "server-only";
import { db } from "../db";
import { ProveedorFalso } from "./proveedor-falso";

// Interfaz intercambiable del proveedor de IA de Nudito+ (como `FileStorage`). El proveedor real aún no está elegido:
// no hay ninguna API key en el código; cuando se elija, sus claves irán en variables de entorno (specs/29).

export type MensajeIA = { rol: "usuario" | "asistente"; texto: string };

/** Herramientas que un proveedor real podría usar (por ahora ninguna: el contexto va en el prompt de sistema). */
export type HerramientaIA = { nombre: string; descripcion: string };

export type RespuestaIA = { texto: string; tokensEntrada: number; tokensSalida: number };

export interface ProveedorIA {
  readonly nombre: string;
  responder(entrada: { sistema: string; mensajes: MensajeIA[]; herramientas?: HerramientaIA[] }): Promise<RespuestaIA>;
}

export type ConfigProveedor = {
  nombre: string;
  modelo: string | null;
  costoEntradaUsdPorMillon: number;
  costoSalidaUsdPorMillon: number;
};

export const CLAVE_CONFIG_PROVEEDOR = "nudito_plus:proveedor";

export const CONFIG_PROVEEDOR_POR_DEFECTO: ConfigProveedor = { nombre: "falso", modelo: null, costoEntradaUsdPorMillon: 0, costoSalidaUsdPorMillon: 0 };

function noNegativo(v: unknown, respaldo: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : respaldo;
}

/** Configuración del proveedor (`ConfigPlataforma` «nudito_plus:proveedor»), con respaldo al proveedor falso. */
export async function configProveedor(): Promise<ConfigProveedor> {
  const fila = await db.configPlataforma.findUnique({ where: { clave: CLAVE_CONFIG_PROVEEDOR } });
  const v = (fila?.valor ?? {}) as Partial<Record<keyof ConfigProveedor, unknown>>;
  return {
    nombre: typeof v.nombre === "string" && v.nombre.trim() ? v.nombre.trim() : CONFIG_PROVEEDOR_POR_DEFECTO.nombre,
    modelo: typeof v.modelo === "string" ? v.modelo : null,
    costoEntradaUsdPorMillon: noNegativo(v.costoEntradaUsdPorMillon, 0),
    costoSalidaUsdPorMillon: noNegativo(v.costoSalidaUsdPorMillon, 0),
  };
}

/** Proveedores disponibles. Hoy solo el falso (local, determinista, sin red ni claves). */
const PROVEEDORES: Record<string, () => ProveedorIA> = {
  falso: () => new ProveedorFalso(),
};

/** Proveedor según la configuración; un nombre desconocido cae al falso (y queda en el log). */
export async function obtenerProveedor(config?: ConfigProveedor): Promise<ProveedorIA> {
  const { nombre } = config ?? (await configProveedor());
  const fabrica = PROVEEDORES[nombre];
  if (!fabrica) {
    console.warn(`[nudito-plus] proveedor «${nombre}» no disponible; se usa el proveedor falso`);
    return PROVEEDORES.falso();
  }
  return fabrica();
}
