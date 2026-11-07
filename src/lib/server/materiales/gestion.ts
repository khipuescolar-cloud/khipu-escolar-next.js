import "server-only";
import { forbidden } from "next/navigation";
import { nombreMaterial } from "@/lib/materiales";
import { auditar } from "../auditoria";
import { liberarArchivo, materializarArchivos, type EntradaArchivo } from "../almacenamiento";
import { avisarMaterialNuevo } from "../notificaciones/avisos-materiales";
import type { TenantContext } from "../tenant";
import { cursosAutorizadosMaterial, materialGestionable } from "./permisos";

const validarArchivos = (archivos: EntradaArchivo[]) => {
  if (!archivos.length || archivos.length > 5) throw new Error("Elige entre uno y cinco archivos.");
};

export async function crearMaterial(ctx: TenantContext, e: { titulo: string; descripcion?: string; unidadTema?: string; cursoIds: string[]; archivos: EntradaArchivo[]; publicar: boolean; avisar?: boolean }): Promise<{ id: string }> {
  const titulo = nombreMaterial(e.titulo);
  await cursosAutorizadosMaterial(ctx, e.cursoIds);
  validarArchivos(e.archivos);
  const archivos = await materializarArchivos(ctx, "material_clase", e.archivos, { maxArchivos: 5 });
  try {
    const material = await ctx.db.materialClase.create({ data: { tenantId: ctx.tenant.id, titulo, descripcion: e.descripcion?.trim() || null, unidadTema: e.unidadTema?.trim() || null,
      estado: e.publicar ? "publicado" : "borrador", publicadoAt: e.publicar ? new Date() : null, creadoPorId: ctx.membership.id,
      secciones: { create: e.cursoIds.map((cursoId) => ({ tenantId: ctx.tenant.id, cursoId })) },
      versiones: { create: { tenantId: ctx.tenant.id, numero: 1, creadaPorId: ctx.membership.id,
        archivos: { create: archivos.map((a, orden) => ({ tenantId: ctx.tenant.id, archivoId: a.id, orden })) } } } } });
    await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "material_clase", entidadId: material.id });
    if (e.publicar && e.avisar) await avisarMaterialNuevo(ctx, material.id).catch((error) => console.error("[materiales] aviso pendiente", error));
    return { id: material.id };
  } catch (error) {
    for (const archivo of archivos) await liberarArchivo(ctx, archivo.id);
    throw error;
  }
}

export async function actualizarMaterial(ctx: TenantContext, id: string, e: { titulo: string; descripcion?: string; unidadTema?: string; cursoIds: string[] }): Promise<void> {
  const m = await materialGestionable(ctx, id);
  if (m.eliminadoAt) forbidden();
  await cursosAutorizadosMaterial(ctx, e.cursoIds);
  await ctx.db.materialSeccion.deleteMany({ where: { materialId: id, cursoId: { notIn: e.cursoIds } } });
  for (const cursoId of e.cursoIds) await ctx.db.materialSeccion.upsert({ where: { materialId_cursoId: { materialId: id, cursoId } }, create: { tenantId: ctx.tenant.id, materialId: id, cursoId }, update: {} });
  await ctx.db.materialClase.update({ where: { id }, data: { titulo: nombreMaterial(e.titulo), descripcion: e.descripcion?.trim() || null, unidadTema: e.unidadTema?.trim() || null } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "material_clase", entidadId: id });
}

export async function nuevaVersionMaterial(ctx: TenantContext, id: string, e: { archivos: EntradaArchivo[]; nota?: string }): Promise<{ numero: number }> {
  const m = await materialGestionable(ctx, id);
  if (m.eliminadoAt) forbidden();
  validarArchivos(e.archivos);
  const archivos = await materializarArchivos(ctx, "material_clase", e.archivos, { maxArchivos: 5 });
  try {
    const version = await ctx.db.materialVersion.create({ data: { tenantId: ctx.tenant.id, materialId: id, numero: m.versionActual + 1, nota: e.nota?.trim() || null, creadaPorId: ctx.membership.id,
      archivos: { create: archivos.map((a, orden) => ({ tenantId: ctx.tenant.id, archivoId: a.id, orden })) } } });
    await ctx.db.materialClase.update({ where: { id, versionActual: m.versionActual }, data: { versionActual: version.numero } });
    await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "material_version", entidadId: version.id });
    return { numero: version.numero };
  } catch (error) {
    for (const archivo of archivos) await liberarArchivo(ctx, archivo.id);
    throw error;
  }
}

export async function publicarMaterial(ctx: TenantContext, id: string, avisar = false): Promise<void> {
  const m = await materialGestionable(ctx, id);
  if (m.eliminadoAt) forbidden();
  await ctx.db.materialClase.update({ where: { id }, data: { estado: "publicado", publicadoAt: new Date(), archivadoAt: null } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "material_clase", entidadId: id });
  if (avisar) await avisarMaterialNuevo(ctx, id).catch((error) => console.error("[materiales] aviso pendiente", error));
}
export async function archivarMaterial(ctx: TenantContext, id: string): Promise<void> {
  const m = await materialGestionable(ctx, id);
  if (m.eliminadoAt) forbidden();
  await ctx.db.materialClase.update({ where: { id }, data: { estado: "archivado", archivadoAt: new Date() } });
}
export async function moverMaterialAPapelera(ctx: TenantContext, id: string): Promise<void> {
  await materialGestionable(ctx, id);
  await ctx.db.materialClase.update({ where: { id }, data: { eliminadoAt: new Date(), eliminadoPorId: ctx.membership.id } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "borrar", entidad: "material_clase", entidadId: id });
}
export async function restaurarMaterial(ctx: TenantContext, id: string): Promise<void> {
  await materialGestionable(ctx, id);
  await ctx.db.materialClase.update({ where: { id }, data: { eliminadoAt: null, eliminadoPorId: null } });
}
export async function eliminarDefinitivoMaterial(ctx: TenantContext, id: string): Promise<void> {
  const m = await materialGestionable(ctx, id);
  if (!m.eliminadoAt || Date.now() - m.eliminadoAt.getTime() < 30 * 86400_000) throw new Error("El material permanece 30 días en la papelera.");
  if (await ctx.db.tareaMaterial.count({ where: { materialId: id } })) throw new Error("El material está referenciado por una tarea.");
  const versiones = await ctx.db.materialVersionArchivo.findMany({ where: { version: { materialId: id } } });
  await ctx.db.materialClase.delete({ where: { id } });
  for (const v of versiones) await liberarArchivo(ctx, v.archivoId);
}
