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
