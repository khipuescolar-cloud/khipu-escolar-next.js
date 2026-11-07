import type { AdjuntoVista } from "@/lib/adjuntos";
export type EstadoSolicitud = "borrador" | "publicada" | "cerrada" | "anulada";
export type EstadoDestinatario = "pendiente" | "entregado" | "en_revision" | "observado" | "aprobado";
export type VersionVista = { id: string; numero: number; presentadaAt: Date; presentadaPor: string; tardia: boolean; comentario: string | null; resultado: "presentada" | "observada" | "aprobada"; observaciones: string | null; revisadaPor: string | null; revisadaAt: Date | null; archivos: AdjuntoVista[] };
export type DestinatarioVista = { id: string; membershipId: string; docente: string; grupo: string | null; estado: EstadoDestinatario; vencida: boolean; entregaTardia: boolean; versionActual: number; plazoCorreccion: Date | null; versiones: VersionVista[] };
export type ResumenSolicitud = { destinatarios: number; pendientes: number; vencidas: number; entregadas: number; fueraDePlazo: number; enRevision: number; observadas: number; aprobadas: number };
export type SolicitudVista = { id: string; titulo: string; instrucciones: string | null; anioAcademico: number; periodoEtiqueta: string | null; fechaLimite: Date | null; conHora: boolean; estado: EstadoSolicitud; plantilla: AdjuntoVista | null; destinatarios: DestinatarioVista[]; resumen: ResumenSolicitud };
export type FilaCumplimiento = { clave: string; nombre: string; destinatarios: number; entregadas: number; aprobadas: number; vencidas: number; fueraDePlazo: number; cumplimiento: number; aprobacion: number; emitidas: number; pendientes: number; enRevision: number; observadas: number };
