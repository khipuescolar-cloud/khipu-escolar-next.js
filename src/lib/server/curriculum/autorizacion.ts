import "server-only";
import { createHash } from "node:crypto";
import { forbidden, notFound } from "next/navigation";
import type { Rol, EstadoEditorialTema } from "@/generated/prisma/enums";
import { fichaPorClave, temaPorClaveConBanco } from "@/lib/nudito/conocimiento/servidor";
import { db } from "../db";
import { temaVisibleParaAlumno } from "./modelo";
import { requireFeature } from "../plan";
import { requireAlumnoVisible, requireCursoDelProfesor, type TenantContext } from "../tenant";

export type TemaEditorial = { estado: EstadoEditorialTema; huellaContenidoRevisado: string | null; huellaActual: string | null };
export type TemaVisible<T> = { tema: T; marcaEditorial: "Borrador" | "Revisar de nuevo" | null };

/** Huella del contenido efectivo y de su ficha, sin depender de datos de un colegio. */
export async function huellaActualDeTema(clave: string): Promise<string | null> {
  const tema = await temaPorClaveConBanco(clave);
  if (!tema) return null;
  const ficha = await fichaPorClave(clave);
  return createHash("sha256").update(JSON.stringify({ tema, ficha })).digest("hex");
}

export function requiereNuevaRevision(tema: TemaEditorial): boolean {
  return tema.estado !== "borrador" && (!tema.huellaActual || tema.huellaContenidoRevisado !== tema.huellaActual);
}

/** Un alumno solo accede a contenido revisado cuya huella coincide con la versión actual. */
export function puedeVerTema(rol: Rol, estado: EstadoEditorialTema, huellaRevisada: string | null, huellaActual: string | null): boolean {
  if (estado === "revisado" || estado === "publicado") {
    return (rol === "profesor" || rol === "direccion") || (rol === "alumno" && temaVisibleParaAlumno(estado, huellaRevisada, huellaActual));
  }
  return estado === "borrador" && (rol === "profesor" || rol === "direccion");
}

export function filtrarVisibles<T extends TemaEditorial>(rol: Rol, temas: readonly T[]): TemaVisible<T>[] {
  return temas.filter((tema) => puedeVerTema(rol, tema.estado, tema.huellaContenidoRevisado, tema.huellaActual)).map((tema) => ({
    tema,
    marcaEditorial: tema.estado === "borrador" ? "Borrador" : requiereNuevaRevision(tema) ? "Revisar de nuevo" : null,
  }));
}

export function requireLectorCurriculum(ctx: TenantContext): void {
  requireFeature(ctx, "nudito_plus");
  if (ctx.rol !== "profesor" && ctx.rol !== "direccion" && ctx.rol !== "alumno") forbidden();
}

export async function requireCursoCurriculumVisible(ctx: TenantContext, cursoId: string, alumnoId?: string): Promise<void> {
  requireLectorCurriculum(ctx);
  if (ctx.rol === "alumno") {
    if (!alumnoId) forbidden();
    await requireAlumnoVisible(ctx, alumnoId);
    const alumno = await ctx.db.alumno.findFirst({ where: { id: alumnoId, estado: "activo" }, select: { salonId: true } });
    const curso = await ctx.db.curso.findFirst({ where: { id: cursoId, salonId: alumno?.salonId ?? "" }, select: { id: true } });
    if (!curso) forbidden();
    return;
  }
  await requireCursoDelProfesor(ctx, cursoId);
  if (!await ctx.db.curso.findFirst({ where: { id: cursoId }, select: { id: true } })) notFound();
}

/** Autoriza con ctx.db; solo entonces consulta el índice global y verifica huellas. */
export async function listarTemasCurricularesDeCurso(ctx: TenantContext, cursoId: string, alumnoId?: string) {
  await requireCursoCurriculumVisible(ctx, cursoId, alumnoId);
  const curso = await ctx.db.curso.findFirst({
    where: { id: cursoId },
    select: { areaCneb: true, salon: { select: { nivel: true, grado: true } } },
  });
  if (!curso?.areaCneb || !curso.salon.grado) return [];
  const temas = await db.temaCurricular.findMany({
    where: {
      areaCneb: curso.areaCneb,
      nivel: curso.salon.nivel,
      grado: curso.salon.grado,
      ...(ctx.rol === "alumno" ? { estado: { in: ["revisado", "publicado"] } } : {}),
    },
    orderBy: { clave: "asc" },
  });
  const conHuella = await Promise.all(temas.map(async (tema) => ({ ...tema, huellaActual: await huellaActualDeTema(tema.clave) })));
  return filtrarVisibles(ctx.rol, conHuella);
}
