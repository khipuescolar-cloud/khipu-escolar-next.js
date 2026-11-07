import "server-only";
import { adjuntoVista } from "../adjuntos";
import { requireFeature } from "../plan";
import { salonIdsVisibles, type TenantContext } from "../tenant";
import { agruparMateriales } from "@/lib/materiales";
import { cursosAutorizadosMaterial, whereMaterialVisible } from "./permisos";
import type { ArbolMateriales, MaterialVista, SeccionMaterial } from "./index";

export async function opcionesParaCompartir(ctx: TenantContext): Promise<SeccionMaterial[]> {
  requireFeature(ctx, "documentos");
  if (ctx.rol !== "profesor" || ctx.soporte) return [];
  const cursos = await ctx.db.curso.findMany({ where: { profesorId: ctx.membership.id }, include: { salon: true } });
  return cursos.map((c) => ({ cursoId: c.id, curso: c.nombre, salonId: c.salonId, salon: c.salon.nombre, anio: c.salon.anio }));
}

export async function listarMateriales(ctx: TenantContext, f: { anio?: number; curso?: string; salonId?: string; q?: string; estado?: string; papelera?: boolean; incluirArchivados?: boolean } = {}): Promise<ArbolMateriales> {
  const visible = await whereMaterialVisible(ctx);
  const salonesVisibles = ctx.rol === "alumno" || ctx.rol === "apoderado" ? new Set(await salonIdsVisibles(ctx)) : null;
  const filtroCurso = { ...(f.curso ? { nombre: f.curso } : {}), ...(f.salonId ? { salonId: f.salonId } : {}), ...(f.anio ? { salon: { anio: f.anio } } : {}) };
  const filas = await ctx.db.materialClase.findMany({
    where: { ...visible, eliminadoAt: f.papelera ? { not: null } : null,
      ...(f.estado ? { estado: f.estado as "borrador" | "publicado" | "archivado" } : !f.incluirArchivados ? { estado: { not: "archivado" as const } } : {}),
      ...(f.q ? { OR: [{ titulo: { contains: f.q, mode: "insensitive" } }, { unidadTema: { contains: f.q, mode: "insensitive" } }] } : {}),
      ...(f.anio || f.curso || f.salonId ? { secciones: { some: { curso: filtroCurso } } } : {}) },
    include: { creadoPor: { include: { user: true } }, secciones: { include: { curso: { include: { salon: true } } } }, versiones: { where: { numero: { gte: 1 } }, include: { archivos: { include: { archivo: true }, orderBy: { orden: "asc" } } } }, _count: { select: { tareas: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const materiales: MaterialVista[] = filas.map((m) => ({ id: m.id, titulo: m.titulo, descripcion: m.descripcion, unidadTema: m.unidadTema, estado: m.estado,
    versionActual: m.versionActual, autor: `${m.creadoPor.user.nombres} ${m.creadoPor.user.apellidos ?? ""}`.trim(),
    archivos: (m.versiones.find((v) => v.numero === m.versionActual)?.archivos ?? []).map((a) => adjuntoVista(a.archivo)),
    secciones: m.secciones.filter((s) => (!salonesVisibles || salonesVisibles.has(s.curso.salonId)) && (!f.anio || s.curso.salon.anio === f.anio) && (!f.curso || s.curso.nombre === f.curso) && (!f.salonId || s.curso.salonId === f.salonId)).map((s) => ({ cursoId: s.cursoId, curso: s.curso.nombre, salonId: s.curso.salonId, salon: s.curso.salon.nombre, anio: s.curso.salon.anio })),
    actualizadoAt: m.updatedAt, gestionable: ctx.rol === "profesor" && m.creadoPorId === ctx.membership.id, referenciadoPorTareas: m._count.tareas, enPapelera: !!m.eliminadoAt }));
  return { anios: agruparMateriales(materiales).map((a) => ({ ...a, archivado: a.cursos.every((c) => c.secciones.every((s) => s.materiales.every((m) => m.estado === "archivado"))) })) };
}

export async function materialesElegiblesParaTarea(ctx: TenantContext, cursoId: string): Promise<MaterialVista[]> {
  await cursosAutorizadosMaterial(ctx, [cursoId]);
  const arbol = await listarMateriales(ctx, { incluirArchivados: true });
  return arbol.anios.flatMap((a) => a.cursos.flatMap((c) => c.secciones.flatMap((s) => s.materiales))).filter((m, i, all) => all.findIndex((x) => x.id === m.id) === i && !m.enPapelera);
}
