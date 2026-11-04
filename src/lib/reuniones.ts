// Reuniones de padres (specs/32): reglas puras compartidas entre cliente y servidor. Sin BD ni red.
import type { AlcanceReunion, EstadoReunion, ModalidadReunion, RespuestaReunion, Rol, TipoReunion } from "@/generated/prisma/enums";

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

export type ConteoRespuestas = { asistire: number; no_asistire: number; pendiente: number; propone_otra: number };

/** Cuenta respuestas por persona (una familia con varias filas cuenta una vez; manda la primera fila). */
export function resumirRespuestas(invitados: readonly { membershipId: string; respuesta: RespuestaReunion }[]): ConteoRespuestas {
  const porPersona = new Map<string, RespuestaReunion>();
  for (const i of invitados) if (!porPersona.has(i.membershipId)) porPersona.set(i.membershipId, i.respuesta);
  const conteo: ConteoRespuestas = { asistire: 0, no_asistire: 0, pendiente: 0, propone_otra: 0 };
  for (const r of porPersona.values()) conteo[r]++;
  return conteo;
}

export const TEXTO_ALCANCE: Record<AlcanceReunion, string> = { colegio: "Todo el colegio", salon: "Salón", individual: "Individual" };
export const TEXTO_ESTADO: Record<EstadoReunion, string> = { por_confirmar: "Por confirmar", programada: "Confirmada", realizada: "Realizada", cancelada: "Cancelada" };
export const TEXTO_RESPUESTA: Record<RespuestaReunion, string> = { pendiente: "Sin respuesta", asistire: "Aceptada", no_asistire: "Rechazada", propone_otra: "Propone otra hora" };

// ───────────── Tipos de reunión y quién convoca (specs/40) ─────────────

export const TIPOS_REUNION = ["docente_apoderado", "tutoria", "coordinacion", "direccion", "administrativa", "institucional"] as const satisfies readonly TipoReunion[];

export const TEXTO_TIPO: Record<TipoReunion, string> = {
  docente_apoderado: "Docente y familia",
  tutoria: "Tutoría",
  coordinacion: "Coordinación docente",
  direccion: "Dirección",
  administrativa: "Administrativa",
  institucional: "Institucional",
};

export const TEXTO_MODALIDAD: Record<ModalidadReunion, string> = { presencial: "Presencial", virtual: "Virtual", mixta: "Mixta" };

/** Roles del personal: tienen agenda (reservas, bloqueos) y pueden ser participantes con disponibilidad. */
export const ROLES_PERSONAL = ["direccion", "profesor", "administrativo"] as const satisfies readonly Rol[];
export type RolPersonal = (typeof ROLES_PERSONAL)[number];
export function esPersonal(rol: Rol): rol is RolPersonal {
  return (ROLES_PERSONAL as readonly Rol[]).includes(rol);
}

/** Matriz de quién convoca qué: dirección todo; administrativo administrativas e institucionales; profesor con familias, tutoría y coordinación. */
export const TIPOS_POR_ROL: Record<RolPersonal, readonly TipoReunion[]> = {
  direccion: TIPOS_REUNION,
  administrativo: ["administrativa", "institucional"],
  profesor: ["docente_apoderado", "tutoria", "coordinacion"],
};

export function puedeConvocar(rol: Rol, tipo: TipoReunion): boolean {
  return esPersonal(rol) && TIPOS_POR_ROL[rol].includes(tipo);
}

/** Familias según el tipo: obligatorias en docente-familia y tutoría; prohibidas en coordinación; opcionales en el resto. */
export function familiasDelTipo(tipo: TipoReunion): "obligatorias" | "prohibidas" | "opcionales" {
  if (tipo === "docente_apoderado" || tipo === "tutoria") return "obligatorias";
  if (tipo === "coordinacion") return "prohibidas";
  return "opcionales";
}

/** Tipo por defecto de las convocatorias antiguas (solo alcance). */
export function tipoPorAlcance(alcance: AlcanceReunion, esTutor: boolean): TipoReunion {
  if (alcance === "colegio") return "institucional";
  if (alcance === "salon") return esTutor ? "tutoria" : "docente_apoderado";
  return "docente_apoderado";
}

/** Antiabuso de solicitudes de familias: máx. 2 abiertas por familia y docente; máx. 5 por semana por familia. */
export const MAX_SOLICITUDES_ABIERTAS_POR_DOCENTE = 2;
export const MAX_SOLICITUDES_POR_SEMANA = 5;

export function motivoAntiabuso(abiertasConDocente: number, enLaSemana: number): string | null {
  if (abiertasConDocente >= MAX_SOLICITUDES_ABIERTAS_POR_DOCENTE) return "Ya tienes 2 solicitudes abiertas con este docente. Espera su respuesta.";
  if (enLaSemana >= MAX_SOLICITUDES_POR_SEMANA) return "Llegaste al máximo de 5 solicitudes por semana. Intenta la próxima semana.";
  return null;
}
