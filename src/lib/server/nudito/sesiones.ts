import "server-only";
import type { AccesoNudito, EntradaApi, SalidaApi } from "@/lib/nudito/contratos";
import { pendiente } from "@/lib/nudito/pendiente";
import type { TenantContext } from "../tenant";

// Responsable: C (specs/41). Sesión de tutoría: bienvenida → curso → tema → repaso → práctica → resultados.
// Todo con `ctx.db` (aislamiento por colegio) y `acceso` ya validado (D: acceso.ts). `responder` guarda intento + dominio +
// evento en UNA transacción; (ejercicio, número) único evita el doble envío. La solución nunca sale del servidor.
// Nudito no escribe notas, registro auxiliar, NSP ni libretas.

export async function iniciarSesion(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"iniciarSesion">): Promise<SalidaApi<"iniciarSesion">> {
  return pendiente("C", "iniciarSesion", ctx, acceso, entrada);
}

export async function elegirCurso(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"elegirCurso">): Promise<SalidaApi<"elegirCurso">> {
  return pendiente("C", "elegirCurso", ctx, acceso, entrada);
}

export async function elegirTema(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"elegirTema">): Promise<SalidaApi<"elegirTema">> {
  return pendiente("C", "elegirTema", ctx, acceso, entrada);
}

export async function pedirRepaso(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"pedirRepaso">): Promise<SalidaApi<"pedirRepaso">> {
  return pendiente("C", "pedirRepaso", ctx, acceso, entrada);
}

export async function siguienteEjercicio(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"siguienteEjercicio">): Promise<SalidaApi<"siguienteEjercicio">> {
  return pendiente("C", "siguienteEjercicio", ctx, acceso, entrada);
}

export async function responder(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"responder">): Promise<SalidaApi<"responder">> {
  return pendiente("C", "responder", ctx, acceso, entrada);
}

export async function pedirPista(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"pedirPista">): Promise<SalidaApi<"pedirPista">> {
  return pendiente("C", "pedirPista", ctx, acceso, entrada);
}

/** Pregunta libre dentro de la sesión: reutiliza el turno de Nudito+ (filtros, topes, proveedor) con contexto mínimo. */
export async function preguntar(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"preguntar">): Promise<SalidaApi<"preguntar">> {
  return pendiente("C", "preguntar", ctx, acceso, entrada);
}

export async function finalizar(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"finalizar">): Promise<SalidaApi<"finalizar">> {
  return pendiente("C", "finalizar", ctx, acceso, entrada);
}
