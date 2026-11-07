import "server-only";
import { forbidden } from "next/navigation";
import { auditar } from "../auditoria";
import { requireFeature } from "../plan";
import { salonIdsVisibles, type TenantContext } from "../tenant";

export async function carpetasDeSalon(ctx: TenantContext) {
  requireFeature(ctx, "documentos");
  if (ctx.soporte || !["profesor", "direccion", "alumno", "apoderado"].includes(ctx.rol)) forbidden();
  const where = ctx.rol === "profesor" ? { profesorId: ctx.membership.id } : ctx.rol === "direccion" ? {} : { salonId: { in: await salonIdsVisibles(ctx) } };
  const cursos = await ctx.db.curso.findMany({ where, include: { salon: true }, orderBy: [{ salon: { anio: "desc" } }, { nombre: "asc" }] });
  return cursos.map(c => ({ id: c.id, nombre: c.nombre, profesorId: c.profesorId, salonId: c.salonId, salon: c.salon.nombre, anio: c.salon.anio, grado: c.salon.grado, nivel: c.salon.nivel, archivado: !!c.salon.archivadoAt }));
}

export async function requireCursoMaterialVisible(ctx: TenantContext, cursoId: string) {
  const curso = (await carpetasDeSalon(ctx)).find(c => c.id === cursoId);
  if (!curso) forbidden();
  return curso;
}

export async function listarSubcarpetasMaterial(ctx: TenantContext, cursoId: string) {
  await requireCursoMaterialVisible(ctx, cursoId);
  return ctx.db.carpetaMaterial.findMany({ where: { cursoId }, orderBy: { nombre: "asc" } });
}

export async function requireSubcarpetaMaterial(ctx: TenantContext, cursoId: string, carpetaId: string) {
  await requireCursoMaterialVisible(ctx, cursoId);
  const carpeta = await ctx.db.carpetaMaterial.findFirst({ where: { id: carpetaId, cursoId } });
  if (!carpeta) forbidden();
  return carpeta;
}

export async function crearSubcarpetaMaterial(ctx: TenantContext, e: { cursoId: string; parentId?: string | null; nombre: string }) {
  if (ctx.rol !== "profesor" || ctx.soporte) forbidden();
  await requireCursoMaterialVisible(ctx, e.cursoId);
  if (e.parentId) await requireSubcarpetaMaterial(ctx, e.cursoId, e.parentId);
  const nombre = e.nombre.trim().replace(/\s+/g, " ");
  if (nombre.length < 1 || nombre.length > 100) throw new Error("El nombre debe tener entre 1 y 100 caracteres.");
  const previa = await ctx.db.carpetaMaterial.findFirst({ where: { cursoId: e.cursoId, parentId: e.parentId || null, nombre: { equals: nombre, mode: "insensitive" } } });
  if (previa) throw new Error("Ya hay una carpeta con ese nombre aquí.");
  try {
    const carpeta = await ctx.db.carpetaMaterial.create({ data: { tenantId: ctx.tenant.id, cursoId: e.cursoId, parentId: e.parentId || null, nombre, creadoPorId: ctx.membership.id } });
    await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "carpeta_material", entidadId: carpeta.id });
    return { id: carpeta.id };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") throw new Error("Ya hay una carpeta con ese nombre aquí.");
    throw error;
  }
}

export async function moverMaterialACarpeta(ctx: TenantContext, materialId: string, cursoId: string, carpetaId: string | null) {
  if (ctx.rol !== "profesor" || ctx.soporte) forbidden();
  await requireCursoMaterialVisible(ctx, cursoId);
  if (carpetaId) await requireSubcarpetaMaterial(ctx, cursoId, carpetaId);
  const material = await ctx.db.materialClase.findFirst({ where: { id: materialId, creadoPorId: ctx.membership.id, secciones: { some: { cursoId } }, eliminadoAt: null }, include: { secciones: true } });
  if (!material || material.carpetaId && !await ctx.db.carpetaMaterial.findFirst({ where: { id: material.carpetaId, cursoId } })) forbidden();
  if (material.secciones.length !== 1) throw new Error("Un material de varios salones permanece en la raíz de cada salón.");
  await ctx.db.materialClase.update({ where: { id: materialId }, data: { carpetaId } });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "material_clase", entidadId: materialId });
}
