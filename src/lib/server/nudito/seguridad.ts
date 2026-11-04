import "server-only";
import type { AccesoNudito, EjercicioConSolucion, OperacionIa, PistaIA } from "@/lib/nudito/contratos";
import { pendiente } from "@/lib/nudito/pendiente";
import type { TenantContext } from "../tenant";

// Responsable: C (specs/41). Reutiliza los filtros de Nudito+ (src/lib/server/nudito-plus/seguridad.ts: riesgo, ánimo,
// insultos, datos ajenos, «hazme la tarea», lista blanca de enlaces) y agrega: el texto del alumno va marcado como DATOS
// (no instrucciones), pistas que revelan la respuesta se descartan y límites por minuto, día y sesión.

export type LimiteNudito = { ok: true } | { ok: false; motivo: "muy_rapido" | "sesiones_dia" | "minutos_dia" | "tope_alumno" | "tope_colegio" | "fuera_de_horario"; mensaje: string };

/** Revisa todos los límites antes de una operación (los de IA cuentan consumo; los de código no). */
export async function verificarLimites(ctx: TenantContext, acceso: AccesoNudito, operacion: OperacionIa | "practica"): Promise<LimiteNudito> {
  return pendiente("C", "verificarLimites", ctx, acceso, operacion);
}

/** Envuelve el texto del alumno como datos para el prompt (delimitado; sin poder cambiar las reglas). */
export function comoDatosDelAlumno(texto: string): string {
  return pendiente("C", "comoDatosDelAlumno", texto);
}

/** true si la pista de la IA revela la solución (por `revelaRespuesta` o por comparar con la solución). */
export function pistaRevelaRespuesta(pista: PistaIA, ejercicio: EjercicioConSolucion): boolean {
  return pendiente("C", "pistaRevelaRespuesta", pista, ejercicio);
}
