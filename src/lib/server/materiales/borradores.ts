import "server-only";
import { forbidden } from "next/navigation";
import { recategorizarArchivo } from "../almacenamiento";
import type { TenantContext } from "../tenant";
import { cursosAutorizadosMaterial } from "./permisos";

export async function materialDesdeBorrador(ctx: TenantContext, documentoId: string, e: { cursoIds: string[]; unidadTema?: string; publicar: boolean }): Promise<{ id: string }> {
  await cursosAutorizadosMaterial(ctx, e.cursoIds);
  const d = await ctx.db.documento.findFirst({ where: { id: documentoId, publicadoPorId: ctx.membership.id, ambito: "unidad", visibleRoles: { isEmpty: true }, eliminadoAt: null }, include: { archivos: true } });
  if (!d || !d.archivos.length) forbidden();
  const m = await ctx.db.materialClase.create({ data: { tenantId: ctx.tenant.id, titulo: d.titulo, descripcion: d.descripcion, unidadTema: e.unidadTema ?? null, creadoPorId: ctx.membership.id,
    estado: e.publicar ? "publicado" : "borrador", publicadoAt: e.publicar ? new Date() : null,
    secciones: { create: e.cursoIds.map((cursoId) => ({ tenantId: ctx.tenant.id, cursoId })) },
    versiones: { create: { tenantId: ctx.tenant.id, numero: 1, creadaPorId: ctx.membership.id,
      archivos: { create: d.archivos.map((a, orden) => ({ tenantId: ctx.tenant.id, archivoId: a.id, orden })) } } } } });
  for (const a of d.archivos) {
    await recategorizarArchivo(ctx, a.id, "material_clase");
    await ctx.db.archivo.update({ where: { id: a.id }, data: { documentoId: null } });
  }
  return { id: m.id };
}
