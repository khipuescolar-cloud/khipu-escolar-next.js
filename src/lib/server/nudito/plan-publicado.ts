import "server-only";
import type { AccesoNudito, AreaNudito, Tema } from "@/lib/nudito/contratos";
import { clavesDeVersion, planCompleto } from "@/lib/nudito/plan-publicado-reglas";
import { mapearEstadoProgreso } from "@/lib/nudito/leccion";
import { requireAlumnoVisible, type TenantContext } from "../tenant";
import { auditar } from "../auditoria";
import { catalogoDelColegio } from "./catalogo";

export type TemaDisponible = Tema;

/** Solo la foto de la última versión habilitada del grado matriculado. */
export async function temasPublicadosDelAlumno(ctx: TenantContext, acceso: AccesoNudito, area: AreaNudito): Promise<TemaDisponible[]> {
  await requireAlumnoVisible(ctx, acceso.alumno.id);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "nudito_temas_publicados", entidadId: acceso.alumno.id, detalle: { area } });
  const alumno = await ctx.db.alumno.findFirst({ where: { id: acceso.alumno.id }, select: { salon: { select: { anio: true, nivel: true, grado: true } } } });
  const salon = alumno?.salon;
  if (!salon?.grado || (salon.nivel !== "primaria" && salon.nivel !== "secundaria")) return [];
  const plan = await ctx.db.planAnual.findFirst({
    where: { anio: salon.anio, nivel: salon.nivel, grado: salon.grado, area, versionPublicada: { gt: 0 } },
    select: { id: true, versionPublicada: true },
  });
  if (!plan) return [];
  const version = await ctx.db.planAnualVersion.findFirst({ where: { planId: plan.id, numero: plan.versionPublicada }, select: { temas: true } });
  if (!version) return [];
  // Se consulta una sola vez cada tabla, sin una consulta por tema.
  const foto = clavesDeVersion(version.temas);
  if (!foto.length) return [];
  const catalogo = await catalogoDelColegio(ctx.db, { area, nivel: salon.nivel });
  const porClave = new Map(catalogo.filter(t => t.nivel === salon.nivel && t.grado === salon.grado).map(t => [t.clave, t]));
  return foto.flatMap(clave => { const tema = porClave.get(clave); return tema ? [tema] : []; });
}

export async function progresoDelPlan(ctx: TenantContext, alumnoId: string, area: AreaNudito) {
  await requireAlumnoVisible(ctx, alumnoId);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "nudito_progreso_plan", entidadId: alumnoId, detalle: { area } });
  const alumno = await ctx.db.alumno.findFirst({ where: { id: alumnoId }, select: { id: true, nombres: true, apellidos: true, salonId: true } });
  if (!alumno) return { total: 0, dominados: 0, completo: false, temas: [] };
  const temas = await temasPublicadosDelAlumno(ctx, { alumno, modo: "alumno" }, area);
  const dominios = temas.length ? await ctx.db.nuditoDominio.findMany({ where: { alumnoId, temaClave: { in: temas.map(t => t.clave) } }, select: { temaClave: true, estado: true } }) : [];
  const estados = new Map(dominios.map(d => [d.temaClave, d.estado]));
  const resultado = temas.map(t => ({ temaClave: t.clave, estado: mapearEstadoProgreso(estados.get(t.clave) ?? null) }));
  return { total: resultado.length, dominados: resultado.filter(t => t.estado === "dominado").length, completo: planCompleto(resultado.map(t => t.estado)), temas: resultado };
}
