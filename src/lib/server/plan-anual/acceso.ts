import "server-only";
import { notFound } from "next/navigation";
import type { Nivel, PlanAnual } from "@/generated/prisma/client";
import { claveCursoAsignado } from "./catalogo-curso";
import { requireFeature } from "@/lib/server/plan";
import type { DbTenant } from "@/lib/server/db";
import type { TenantContext } from "@/lib/server/tenant";

export type GrupoCurricular = { anio: number; nivel: Nivel; grado: number; area: string; nombreCurso: string };
export function exigirPlanificacion(ctx: TenantContext): void {
  requireFeature(ctx, "nudito_plus");
}
export function agrupar(cursos: { nombre: string; cursoColegio: { cursoKhipu: string | null } | null; salon: { anio: number; nivel: Nivel; grado: number | null } }[]): GrupoCurricular[] {
  const grupos = new Map<string, GrupoCurricular>();
  for (const curso of cursos) {
    const { anio, nivel, grado } = curso.salon;
    const clave = claveCursoAsignado(curso, nivel);
    if (!clave || grado === null) continue;
    const key = [anio, nivel, grado, clave].join("|");
    if (!grupos.has(key)) grupos.set(key, { anio, nivel, grado, area: clave, nombreCurso: curso.nombre });
  }
  return [...grupos.values()].sort((a,b) => a.anio-b.anio || a.nivel.localeCompare(b.nivel) || a.grado-b.grado || a.area.localeCompare(b.area));
}
export async function gruposDelDocente(ctx: TenantContext): Promise<GrupoCurricular[]> {
  exigirPlanificacion(ctx);
  if (ctx.rol !== "profesor") notFound();
  const cursos = await ctx.db.curso.findMany({
    where: { profesorId: ctx.membership.id, salon: { archivadoAt: null, grado: { not: null } } },
    select: { nombre: true, cursoColegio: { select: { cursoKhipu: true } }, salon: { select: { anio: true, nivel: true, grado: true } } },
  });
  return agrupar(cursos);
}
export async function docentesDelGrupo(db: DbTenant, grupo: GrupoCurricular): Promise<{ membershipId: string; nombre: string; secciones: string[] }[]> {
  const cursos = await db.curso.findMany({
    where: { profesorId: { not: null }, salon: { anio: grupo.anio, nivel: grupo.nivel, grado: grupo.grado, archivadoAt: null } },
    select: { nombre: true, cursoColegio: { select: { cursoKhipu: true } }, profesorId: true, salon: { select: { seccion: true, nombre: true } }, profesor: { select: { estado: true, user: { select: { nombres: true, apellidos: true } } } } },
  });
  const docentes = new Map<string, { membershipId: string; nombre: string; secciones: string[] }>();
  for (const curso of cursos) {
    if (!curso.profesorId || curso.profesor?.estado !== "activa" || claveCursoAsignado(curso, grupo.nivel) !== grupo.area) continue;
    let docente = docentes.get(curso.profesorId);
    if (!docente) {
      docente = { membershipId: curso.profesorId, nombre: [curso.profesor.user.nombres, curso.profesor.user.apellidos].filter(Boolean).join(" "), secciones: [] };
      docentes.set(curso.profesorId, docente);
    }
    const seccion = curso.salon.seccion || curso.salon.nombre;
    if (!docente.secciones.includes(seccion)) docente.secciones.push(seccion);
  }
  return [...docentes.values()].map(d => ({ ...d, secciones: d.secciones.sort() })).sort((a,b) => a.nombre.localeCompare(b.nombre));
}
export async function requireAccesoPlan(ctx: TenantContext, planId: string, opciones: { editar?: boolean; coordinador?: boolean } = {}): Promise<PlanAnual> {
  exigirPlanificacion(ctx);
  if (ctx.rol !== "direccion" && ctx.rol !== "profesor") notFound();
  const plan = await ctx.db.planAnual.findFirst({
    where: { id: planId },
    include: { participantes: { where: { membershipId: ctx.membership.id, activo: true }, select: { id: true } } },
  });
  if (!plan) notFound();
  if (ctx.rol === "profesor" && !(await docentesDelGrupo(ctx.db, plan)).some(d => d.membershipId === ctx.membership.id)) notFound();
  if (opciones.coordinador) notFound();
  if (opciones.editar && ctx.rol !== "profesor") notFound();
  return plan;
}
