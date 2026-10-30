// Reuniones de padres (specs/32): reglas puras compartidas entre cliente y servidor. Sin BD ni red.
import type { AlcanceReunion, EstadoReunion, RespuestaReunion } from "@/generated/prisma/enums";

export type VinculoApoderado = { apoderadoId: string; alumnoId: string };
export type InvitadoNuevo = { membershipId: string; alumnoId: string | null };

/**
 * Filas de invitados según el alcance.
 * - `salon` / `individual`: una fila por (apoderado, alumno), sin repetir.
 * - `colegio`: una fila por apoderado (sin alumno), aunque tenga varios hijos.
 */
export function generarInvitados(alcance: AlcanceReunion, vinculos: readonly VinculoApoderado[]): InvitadoNuevo[] {
  const vistos = new Set<string>();
  const filas: InvitadoNuevo[] = [];
  for (const v of vinculos) {
    const alumnoId = alcance === "colegio" ? null : v.alumnoId;
    const clave = `${v.apoderadoId}|${alumnoId ?? ""}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    filas.push({ membershipId: v.apoderadoId, alumnoId });
  }
  return filas;
}

/** Se puede responder (o cambiar la respuesta) mientras la reunión está programada y no haya empezado. */
export function puedeResponderReunion(reunion: { estado: EstadoReunion; inicio: Date }, ahora = new Date()): boolean {
  return reunion.estado === "programada" && ahora.getTime() < reunion.inicio.getTime();
}

export type ConteoRespuestas = { asistire: number; no_asistire: number; pendiente: number };

/** Cuenta respuestas por persona (una familia con varias filas cuenta una vez; manda la primera fila). */
export function resumirRespuestas(invitados: readonly { membershipId: string; respuesta: RespuestaReunion }[]): ConteoRespuestas {
  const porPersona = new Map<string, RespuestaReunion>();
  for (const i of invitados) if (!porPersona.has(i.membershipId)) porPersona.set(i.membershipId, i.respuesta);
  const conteo: ConteoRespuestas = { asistire: 0, no_asistire: 0, pendiente: 0 };
  for (const r of porPersona.values()) conteo[r]++;
  return conteo;
}

export const TEXTO_ALCANCE: Record<AlcanceReunion, string> = { colegio: "Todo el colegio", salon: "Salón", individual: "Individual" };
export const TEXTO_ESTADO: Record<EstadoReunion, string> = { programada: "Programada", realizada: "Realizada", cancelada: "Cancelada" };
export const TEXTO_RESPUESTA: Record<RespuestaReunion, string> = { pendiente: "Sin respuesta", asistire: "Asistiré", no_asistire: "No asistiré" };
