import type { EstadoPlanAnual } from "@/generated/prisma/enums";

export type AccionPlan = "enviar_revision" | "registrar_observacion" | "reenviar_revision" | "aprobar" | "publicar" | "abrir_revision" | "archivar";
export type ContextoTransicion = {
  esCoordinador: boolean;
  esDireccion: boolean;
  observacionesAbiertas: number;
  participantesActivos: number;
  conformesRonda: number;
  cantidadTemas: number;
  hayCoordinador: boolean;
};
export type ResultadoTransicion = { ok: true; siguiente: EstadoPlanAnual } | { ok: false; motivo: string };
const destinos: Record<EstadoPlanAnual, Partial<Record<AccionPlan, EstadoPlanAnual>>> = {
  borrador: { enviar_revision: "en_revision", archivar: "archivado" },
  en_revision: { registrar_observacion: "con_observaciones", aprobar: "aprobado", archivar: "archivado" },
  con_observaciones: { reenviar_revision: "en_revision", archivar: "archivado" },
  aprobado: { publicar: "publicado", archivar: "archivado" },
  publicado: { abrir_revision: "borrador", archivar: "archivado" },
  archivado: {},
};
export function editable(estado: EstadoPlanAnual): boolean {
  return estado === "borrador" || estado === "con_observaciones";
}
export function puedeTransicionar(estado: EstadoPlanAnual, accion: AccionPlan, c: ContextoTransicion): ResultadoTransicion {
  const siguiente = destinos[estado][accion];
  if (!siguiente) return { ok: false, motivo: "La acción no corresponde al estado actual del plan." };
  if (accion === "archivar") return c.esDireccion ? { ok: true, siguiente } : { ok: false, motivo: "Solo dirección puede archivar el plan." };
  if (accion !== "registrar_observacion" && !c.esCoordinador) return { ok: false, motivo: "Solo el coordinador puede realizar esta acción." };
  if ((accion === "enviar_revision" || accion === "reenviar_revision") && !c.hayCoordinador)
    return { ok: false, motivo: "Designa un coordinador antes de enviar el plan." };
  if (accion === "enviar_revision" && c.cantidadTemas < 1)
    return { ok: false, motivo: "Agrega al menos un tema antes de enviar el plan." };
  if ((accion === "reenviar_revision" || accion === "aprobar" || accion === "publicar") && c.observacionesAbiertas > 0)
    return { ok: false, motivo: "Resuelve todas las observaciones abiertas." };
  if (accion === "aprobar" && (c.participantesActivos < 1 || c.conformesRonda !== c.participantesActivos))
    return { ok: false, motivo: "Falta la conformidad de todos los participantes activos en esta ronda." };
  return { ok: true, siguiente };
}
