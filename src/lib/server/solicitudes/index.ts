import "server-only";
/* eslint-disable @typescript-eslint/no-unused-vars -- Las firmas provisionales conservan argumentos para W3. */
import type { AdjuntoVista } from "@/lib/adjuntos";
import type { EntradaArchivo } from "../almacenamiento";
import type { TenantContext } from "../tenant";
export { resolverAccesoSolicitud } from "../archivos-acceso/solicitud";

export type EstadoSolicitud = "borrador" | "publicada" | "cerrada" | "anulada";
export type EstadoDestinatario = "pendiente" | "entregado" | "en_revision" | "observado" | "aprobado";
export type VersionVista = {
  id: string; numero: number; presentadaAt: Date; presentadaPor: string; tardia: boolean; comentario: string | null;
  resultado: "presentada" | "observada" | "aprobada"; observaciones: string | null; revisadaPor: string | null; revisadaAt: Date | null; archivos: AdjuntoVista[];
};
export type DestinatarioVista = {
  id: string; membershipId: string; docente: string; grupo: string | null; estado: EstadoDestinatario;
  vencida: boolean; entregaTardia: boolean; versionActual: number; plazoCorreccion: Date | null; versiones: VersionVista[];
};
export type ResumenSolicitud = {
  destinatarios: number; pendientes: number; vencidas: number; entregadas: number;
  fueraDePlazo: number; enRevision: number; observadas: number; aprobadas: number;
};
export type SolicitudVista = {
  id: string; titulo: string; instrucciones: string | null; anioAcademico: number; periodoEtiqueta: string | null;
  fechaLimite: Date | null; conHora: boolean; estado: EstadoSolicitud; plantilla: AdjuntoVista | null;
  destinatarios: DestinatarioVista[]; resumen: ResumenSolicitud;
};
/** Forma provisional para el reporte; W3 fijará las columnas con la implementación. */
export type FilaCumplimiento = {
  clave: string; nombre: string; destinatarios: number; entregadas: number; aprobadas: number;
  vencidas: number; fueraDePlazo: number;
};

const pendiente = (): never => { throw new Error("Solicitudes documentales no implementadas (W3)."); };
export async function crearSolicitud(_ctx: TenantContext, _e: { titulo: string; instrucciones?: string; anioAcademico: number; periodoEtiqueta?: string; plantillaDocumentoId?: string; fechaLimite?: Date; conHora?: boolean; permiteTardias?: boolean; destinatarios: { membershipIds?: string[]; areas?: string[] } }): Promise<{ id: string }> { return pendiente(); }
export async function publicarSolicitud(_ctx: TenantContext, _id: string): Promise<void> { return pendiente(); }
export async function presentarVersion(_ctx: TenantContext, _destinatarioId: string, _e: { archivos: EntradaArchivo[]; comentario?: string }): Promise<{ numero: number }> { return pendiente(); }
export async function comenzarRevision(_ctx: TenantContext, _destinatarioId: string): Promise<void> { return pendiente(); }
export async function observarVersion(_ctx: TenantContext, _destinatarioId: string, _e: { observaciones: string; plazoCorreccion?: Date }): Promise<void> { return pendiente(); }
export async function aprobarVersion(_ctx: TenantContext, _destinatarioId: string): Promise<void> { return pendiente(); }
export async function reabrirRevision(_ctx: TenantContext, _destinatarioId: string, _motivo: string): Promise<void> { return pendiente(); }
export async function listarSolicitudes(_ctx: TenantContext, _f?: { estado?: EstadoSolicitud; anio?: number }): Promise<SolicitudVista[]> { return []; }
export async function detalleSolicitud(_ctx: TenantContext, _id: string): Promise<SolicitudVista> { return pendiente(); }
export async function reporteCumplimiento(_ctx: TenantContext, _f: { anio?: number; periodo?: string; desde?: Date; hasta?: Date; agrupar: "docente" | "area" }): Promise<FilaCumplimiento[]> { return []; }
