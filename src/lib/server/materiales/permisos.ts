import "server-only";
import { forbidden } from "next/navigation";
import { requireFeature } from "../plan";
import { salonIdsVisibles, type TenantContext } from "../tenant";

export async function cursosAutorizadosMaterial(ctx: TenantContext, cursoIds: string[]) {
  requireFeature(ctx, "documentos");
  if (ctx.rol !== "profesor" || ctx.soporte) forbidden();
  const ids = [...new Set(cursoIds)];
  if (!ids.length || ids.length > 12 || ids.length !== cursoIds.length) forbidden();
  const propios = await ctx.db.curso.findMany({ where: { profesorId: ctx.membership.id }, include: { salon: true } });
  const cursos = propios.filter((c) => ids.includes(c.id));
  if (cursos.length !== ids.length || new Set(cursos.map((c) => c.nombre.trim().toLocaleLowerCase("es"))).size !== 1) forbidden();
  return cursos;
}

export async function materialGestionable(ctx: TenantContext, id: string) {
  requireFeature(ctx, "documentos");
  if (ctx.rol !== "profesor" || ctx.soporte) forbidden();
  const material = await ctx.db.materialClase.findFirst({ where: { id, creadoPorId: ctx.membership.id } });
  if (!material) forbidden();
  const secciones = await ctx.db.materialSeccion.findMany({ where: { materialId: id }, include: { curso: true } });
  if (!secciones.length || secciones.some(s => s.curso.profesorId !== ctx.membership.id)) forbidden();
  return material;
}

export async function whereMaterialVisible(ctx: TenantContext) {
  requireFeature(ctx, "documentos");
  if (ctx.rol === "direccion") return {};
  if (ctx.rol === "profesor") return { creadoPorId: ctx.membership.id };
  if (ctx.rol === "alumno" || ctx.rol === "apoderado") {
    const salones = await salonIdsVisibles(ctx);
    return { estado: "publicado" as const, eliminadoAt: null, secciones: { some: { curso: { salonId: { in: salones } } } } };
  }
  forbidden();
}
