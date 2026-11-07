// Pedidos de demo (specs/25): textos y orden de los estados. Puro: lo usan el servidor y los componentes.
import type { EstadoSolicitud } from "@/generated/prisma/enums";

export const ESTADOS_SOLICITUD: EstadoSolicitud[] = ["nueva", "contactada", "demo_agendada", "convertida", "descartada"];

export const NOMBRE_ESTADO_SOLICITUD: Record<EstadoSolicitud, string> = {
  nueva: "Nueva",
  contactada: "Contactada",
  demo_agendada: "Demo agendada",
  convertida: "Convertida en colegio",
  descartada: "Descartada",
};

/** Query para prellenar `/colegios/nuevo` desde una solicitud (la lee la página de nuevo colegio). */
export function queryNuevoColegio(s: { id: string; nombre: string; cargo: string | null; colegio: string; ciudad: string | null; correo: string; telefono: string | null; planInteres: string | null }): string {
  const q = new URLSearchParams({ solicitud: s.id, nombre: s.colegio, admin_nombres: s.nombre, admin_email: s.correo });
  if (s.ciudad) q.set("ciudad", s.ciudad);
  if (s.planInteres) q.set("plan", s.planInteres);
  if (s.telefono) q.set("admin_telefono", s.telefono);
  if (s.cargo) q.set("admin_cargo", s.cargo);
  return q.toString();
}

// Reglas puras del circuito documental (specs/46).
import type { EstadoDestinatario, EstadoSolicitud as EstadoSolicitudDocumental, ResumenSolicitud } from "@/lib/server/solicitudes/tipos";

export const TRANSICIONES_SOLICITUD: Record<EstadoSolicitudDocumental, readonly EstadoSolicitudDocumental[]> = {
  borrador: ["publicada"], publicada: ["cerrada", "anulada"], cerrada: ["publicada"], anulada: [],
};
export const TRANSICIONES_DESTINATARIO: Record<EstadoDestinatario, readonly EstadoDestinatario[]> = {
  pendiente: ["entregado"], entregado: ["en_revision", "observado", "aprobado"],
  en_revision: ["observado", "aprobado"], observado: ["entregado"], aprobado: ["en_revision"],
};
export function puedeTransicionarSolicitud(desde: EstadoSolicitudDocumental, hacia: EstadoSolicitudDocumental): boolean {
  return TRANSICIONES_SOLICITUD[desde].includes(hacia);
}
export function puedeTransicionarDestinatario(desde: EstadoDestinatario, hacia: EstadoDestinatario): boolean {
  return TRANSICIONES_DESTINATARIO[desde].includes(hacia);
}
export function vencida(estado: EstadoDestinatario, fechaLimite: Date | null, plazoCorreccion: Date | null, ahora = new Date()): boolean {
  return estado === "pendiente" ? !!fechaLimite && ahora > fechaLimite : estado === "observado" && !!plazoCorreccion && ahora > plazoCorreccion;
}
export function entregaTardia(primeraPresentacion: Date, fechaLimite: Date | null): boolean {
  return !!fechaLimite && primeraPresentacion > fechaLimite;
}
export function cumplimiento(entregadasATiempo: number, destinatarios: number): number {
  return destinatarios === 0 ? 0 : Math.round(entregadasATiempo * 10000 / destinatarios) / 100;
}
export function resumenDestinatarios(filas: { estado: EstadoDestinatario; versionActual: number; entregaTardia: boolean; fechaLimite: Date | null; plazoCorreccion: Date | null }[], ahora = new Date()): ResumenSolicitud {
  return { destinatarios: filas.length, pendientes: filas.filter(x => x.estado === "pendiente").length,
    vencidas: filas.filter(x => vencida(x.estado, x.fechaLimite, x.plazoCorreccion, ahora)).length,
    entregadas: filas.filter(x => x.versionActual > 0).length,
    fueraDePlazo: filas.filter(x => x.entregaTardia || vencida(x.estado, x.fechaLimite, x.plazoCorreccion, ahora)).length,
    enRevision: filas.filter(x => x.estado === "en_revision").length,
    observadas: filas.filter(x => x.estado === "observado").length,
    aprobadas: filas.filter(x => x.estado === "aprobado").length };
}
export function expandirAreas(cursos: { profesorId: string | null; areaCneb: string | null; nombre: string }[], areas: string[]): { membershipId: string; grupo: string }[] {
  const pedidos = new Set(areas.map(x => x.trim().toLocaleLowerCase("es-PE")));
  return [...new Map(cursos.filter(c => c.profesorId && (pedidos.has((c.areaCneb ?? "").toLocaleLowerCase("es-PE")) || pedidos.has(c.nombre.toLocaleLowerCase("es-PE"))))
    .map(c => [c.profesorId!, { membershipId: c.profesorId!, grupo: c.areaCneb ?? c.nombre }])).values()];
}
