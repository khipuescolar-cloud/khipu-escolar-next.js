import "server-only";
import { cumplimiento, vencida } from "@/lib/solicitudes";
import type { TenantContext } from "../tenant";
import { acceso } from "./comun";
import type { FilaCumplimiento } from "./tipos";
import { auditar } from "../auditoria";

export async function reporteCumplimiento(ctx: TenantContext, f: { anio?: number; periodo?: string; desde?: Date; hasta?: Date; agrupar: "docente" | "area" }): Promise<FilaCumplimiento[]> {
  acceso(ctx, ["direccion"]);
  const filas = await ctx.db.solicitudDestinatario.findMany({ where: { retiradoAt: null, solicitud: { estado: { in: ["publicada", "cerrada"] }, anioAcademico: f.anio, periodoEtiqueta: f.periodo, publicadaAt: f.desde || f.hasta ? { gte: f.desde, lte: f.hasta } : undefined } }, include: { solicitud: true, membership: { include: { user: true } } } });
  const mapa = new Map<string, FilaCumplimiento & { aTiempo: number }>();
  for (const d of filas) {
    const clave = f.agrupar === "docente" ? d.membershipId : d.grupo ?? "Sin área";
    const nombre = f.agrupar === "docente" ? `${d.membership.user.nombres} ${d.membership.user.apellidos}`.trim() : clave;
    const fila = mapa.get(clave) ?? { clave, nombre, destinatarios: 0, entregadas: 0, aprobadas: 0, vencidas: 0, fueraDePlazo: 0, cumplimiento: 0, aprobacion: 0, emitidas: 0, pendientes: 0, enRevision: 0, observadas: 0, aTiempo: 0 };
    fila.destinatarios++;
    fila.emitidas++;
    if (d.estado === "pendiente") fila.pendientes++;
    if (d.estado === "en_revision") fila.enRevision++;
    if (d.estado === "observado") fila.observadas++;
    if (d.estado === "aprobado") fila.aprobadas++;
    if (d.versionActual > 0) fila.entregadas++;
    if (d.versionActual > 0 && !d.entregaTardia) fila.aTiempo++;
    const vencio = vencida(d.estado, d.solicitud.fechaLimite, d.plazoCorreccion);
    if (vencio) fila.vencidas++;
    if (d.entregaTardia || vencio) fila.fueraDePlazo++;
    mapa.set(clave, fila);
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.membership.id, accion: "ver", entidad: "reporte_solicitudes" });
  return [...mapa.values()].map(({ aTiempo, ...fila }) => ({ ...fila, cumplimiento: cumplimiento(aTiempo, fila.destinatarios), aprobacion: cumplimiento(fila.aprobadas, fila.destinatarios) })).sort((a,b) => a.nombre.localeCompare(b.nombre, "es"));
}
export function reporteCsv(filas: FilaCumplimiento[]): string {
  const c = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  return ["Grupo,Nombre,Destinatarios,Entregadas,Aprobadas,Pendientes,Vencidas,Fuera de plazo,Cumplimiento %,Aprobación %", ...filas.map(f => [f.clave,f.nombre,f.destinatarios,f.entregadas,f.aprobadas,f.pendientes,f.vencidas,f.fueraDePlazo,f.cumplimiento,f.aprobacion].map(c).join(","))].join("\r\n");
}
