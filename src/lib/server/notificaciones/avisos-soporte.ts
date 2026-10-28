import "server-only";
import { urlColegio, urlPlataforma } from "@/lib/dominio";
import { NOMBRE_PRIORIDAD } from "@/lib/soporte";
import type { PrioridadTicket } from "@/generated/prisma/enums";
import { db, dbTenant } from "../db";
import { encolarAviso } from "./encolar";
import { destinoPersonal } from "./preferencias";

// Avisos de la mesa de ayuda (specs/23). Solo encolan (tipo `soporte`, `referenciaId = ticketId`); el worker envía.
// - Responde Khipu → `soporte_respuesta` a quien abrió la conversación y, si no la abrió dirección, también a la dirección
//   (correo y push según su perfil). Sin el texto del mensaje.
// - Escribe el colegio → `soporte_nuevo` al buzón del equipo (`ConfigPlataforma` «soporte:correo») y al asignado.
// Máx. 1 aviso por conversación, plantilla y destinatario cada 15 min (salvo la conversación nueva).

export const CLAVE_CORREO_SOPORTE = "soporte:correo";
export const VENTANA_AVISO_SOPORTE_MIN = 15;

export type TicketParaAviso = { id: string; tenantId: string; asunto: string; prioridad: PrioridadTicket; creadoPorId: string; asignadoAId: string | null };

/** Buzón del equipo Khipu: «soporte:correo» en la configuración o, si no hay, el remitente del sistema. */
export async function correoEquipoSoporte(): Promise<string | null> {
  const fila = await db.configPlataforma.findUnique({ where: { clave: CLAVE_CORREO_SOPORTE } });
  const v = fila?.valor;
  const guardado = typeof v === "string" ? v : v && typeof v === "object" && !Array.isArray(v) && typeof (v as { correo?: unknown }).correo === "string" ? (v as { correo: string }).correo : null;
  const correo = guardado?.trim() || process.env.SMTP_USER?.trim() || process.env.EMAIL_FROM_ADDRESS?.trim() || "";
  return correo.includes("@") ? correo : null;
}

async function recienAvisado(tenantId: string, plantilla: string, ticketId: string, destinatario: string): Promise<boolean> {
  const desde = new Date(Date.now() - VENTANA_AVISO_SOPORTE_MIN * 60_000);
  const n = await dbTenant(tenantId).aviso.count({ where: { plantilla, referenciaId: ticketId, destinatario, createdAt: { gte: desde } } });
  return n > 0;
}

/** Respuesta pública de Khipu → creador (y dirección si no la abrió dirección). Devuelve cuántas filas encoló. */
export async function avisarRespuestaKhipu(ticket: TicketParaAviso): Promise<number> {
  const tdb = dbTenant(ticket.tenantId);
  const [colegio, creador] = await Promise.all([
    db.tenant.findUnique({ where: { id: ticket.tenantId }, select: { nombre: true, slug: true } }),
    tdb.membership.findFirst({ where: { id: ticket.creadoPorId }, select: { id: true, rol: true } }),
  ]);
  if (!colegio) return 0;
  const membresias = new Set<string>();
  if (creador) membresias.add(creador.id);
  if (creador?.rol !== "direccion") {
    const direccion = await tdb.membership.findMany({ where: { rol: "direccion", estado: "activa" }, select: { id: true } });
    for (const d of direccion) membresias.add(d.id);
  }
  const payload = { colegio: colegio.nombre, asunto: ticket.asunto, url: urlColegio(colegio.slug, `/soporte/${ticket.id}`) };
  const base = { tenantId: ticket.tenantId, tipo: "soporte" as const, plantilla: "soporte_respuesta" as const, payload, referenciaId: ticket.id };
  let filas = 0;
  for (const id of membresias) {
    const destino = await destinoPersonal(tdb, id, ["direccion", "administrativo"]);
    if (!destino) continue;
    if (destino.correo && !(await recienAvisado(ticket.tenantId, "soporte_respuesta", ticket.id, destino.email))) {
      await encolarAviso(tdb, { ...base, canal: "correo", destinatario: destino.email });
      filas++;
    }
    for (const endpoint of destino.pushEndpoints) {
      if (await recienAvisado(ticket.tenantId, "soporte_respuesta", ticket.id, endpoint)) continue;
      await encolarAviso(tdb, { ...base, canal: "push", destinatario: endpoint });
      filas++;
    }
  }
  return filas;
}

/** Conversación o mensaje nuevo del colegio → buzón del equipo y asignado. Devuelve cuántas filas encoló. */
export async function avisarEquipoSoporte(ticket: TicketParaAviso, opciones: { nueva: boolean }): Promise<number> {
  const tdb = dbTenant(ticket.tenantId);
  const colegio = await db.tenant.findUnique({ where: { id: ticket.tenantId }, select: { nombre: true } });
  if (!colegio) return 0;
  const destinos = new Set<string>();
  const buzon = await correoEquipoSoporte();
  if (buzon) destinos.add(buzon.toLowerCase());
  if (ticket.asignadoAId) {
    const asignado = await db.adminPlataforma.findFirst({ where: { userId: ticket.asignadoAId, activo: true }, select: { user: { select: { email: true } } } });
    if (asignado) destinos.add(asignado.user.email.toLowerCase());
  }
  const payload = {
    colegio: colegio.nombre,
    asunto: ticket.asunto,
    prioridad: NOMBRE_PRIORIDAD[ticket.prioridad],
    nueva: opciones.nueva,
    url: urlPlataforma(`/mesa-ayuda/${ticket.id}`),
  };
  let filas = 0;
  for (const destinatario of destinos) {
    if (!opciones.nueva && (await recienAvisado(ticket.tenantId, "soporte_nuevo", ticket.id, destinatario))) continue;
    await encolarAviso(tdb, { tenantId: ticket.tenantId, tipo: "soporte", canal: "correo", destinatario, plantilla: "soporte_nuevo", payload, referenciaId: ticket.id });
    filas++;
  }
  return filas;
}
