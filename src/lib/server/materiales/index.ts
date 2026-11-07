import "server-only";
/* eslint-disable @typescript-eslint/no-unused-vars -- Las firmas provisionales conservan argumentos para W2. */
import type { AdjuntoVista } from "@/lib/adjuntos";
import type { EntradaArchivo } from "../almacenamiento";
import type { TenantContext } from "../tenant";
export { resolverAccesoMaterial } from "../archivos-acceso/material";

export type SeccionMaterial = { cursoId: string; curso: string; salonId: string; salon: string; anio: number };
export type MaterialVista = {
  id: string; titulo: string; descripcion: string | null; unidadTema: string | null;
  estado: "borrador" | "publicado" | "archivado"; versionActual: number; autor: string;
  archivos: AdjuntoVista[]; secciones: SeccionMaterial[]; actualizadoAt: Date;
  gestionable: boolean; referenciadoPorTareas: number; enPapelera: boolean;
};
export type ArbolMateriales = { anios: { anio: number; archivado: boolean;
  cursos: { nombre: string; secciones: { cursoId: string; salonId: string; salon: string; materiales: MaterialVista[] }[] }[] }[] };

const pendiente = (): never => { throw new Error("Materiales de clase no implementados (W2)."); };
export async function listarMateriales(_ctx: TenantContext, _f?: { anio?: number; curso?: string; salonId?: string; q?: string; estado?: string; papelera?: boolean; incluirArchivados?: boolean }): Promise<ArbolMateriales> { return { anios: [] }; }
export async function opcionesParaCompartir(_ctx: TenantContext): Promise<SeccionMaterial[]> { return []; }
export async function crearMaterial(_ctx: TenantContext, _e: { titulo: string; descripcion?: string; unidadTema?: string; cursoIds: string[]; archivos: EntradaArchivo[]; publicar: boolean; avisar?: boolean }): Promise<{ id: string }> { return pendiente(); }
export async function actualizarMaterial(_ctx: TenantContext, _id: string, _e: { titulo: string; descripcion?: string; unidadTema?: string; cursoIds: string[] }): Promise<void> { return pendiente(); }
export async function nuevaVersionMaterial(_ctx: TenantContext, _id: string, _e: { archivos: EntradaArchivo[]; nota?: string }): Promise<{ numero: number }> { return pendiente(); }
export async function publicarMaterial(_ctx: TenantContext, _id: string, _avisar?: boolean): Promise<void> { return pendiente(); }
export async function archivarMaterial(_ctx: TenantContext, _id: string): Promise<void> { return pendiente(); }
export async function moverMaterialAPapelera(_ctx: TenantContext, _id: string): Promise<void> { return pendiente(); }
export async function restaurarMaterial(_ctx: TenantContext, _id: string): Promise<void> { return pendiente(); }
export async function eliminarDefinitivoMaterial(_ctx: TenantContext, _id: string): Promise<void> { return pendiente(); }
export async function materialDesdeBorrador(_ctx: TenantContext, _documentoId: string, _e: { cursoIds: string[]; unidadTema?: string; publicar: boolean }): Promise<{ id: string }> { return pendiente(); }
export async function materialesElegiblesParaTarea(_ctx: TenantContext, _cursoId: string): Promise<MaterialVista[]> { return []; }
