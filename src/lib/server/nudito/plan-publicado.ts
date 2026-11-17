import "server-only";
import type { AccesoNudito, Tema } from "@/lib/nudito/contratos";
import { clavesDeVersion, planCompleto } from "@/lib/nudito/plan-publicado-reglas";
import { mapearEstadoProgreso } from "@/lib/nudito/leccion";
import { requireFeature } from "../plan";
import { requireAlumnoVisible, type TenantContext } from "../tenant";
import { auditar } from "../auditoria";
import { cursoKhipu } from "@/lib/cursos-khipu/catalogo";
import { temaVisibleParaAlumno } from "@/lib/server/curriculum/modelo";
import { huellaActualDeTema } from "@/lib/curriculum/huella";
import { requireLectorCurriculum } from "@/lib/server/curriculum/autorizacion";
import { catalogoDelCursoConIndice, claveCursoAsignado } from "@/lib/server/plan-anual/catalogo-curso";

export type TemaDisponible = Tema;

/** Solo la foto de la última versión habilitada del grado matriculado. */
export async function temasPublicadosDelAlumno(ctx: TenantContext, acceso: AccesoNudito, cursoIdOClave: string): Promise<TemaDisponible[]> {
  // Modo hijo: el apoderado ya pasó `evaluarAccesoNuditoPlus` (hijo suyo sin cuenta propia + consentimiento); `requireAlumnoVisible` lo reconfirma.
  if (ctx.rol === "apoderado" && acceso.modo === "hijo") requireFeature(ctx, "nudito_plus");
  else requireLectorCurriculum(ctx);
  await requireAlumnoVisible(ctx, acceso.alumno.id);
  const alumno = await ctx.db.alumno.findFirst({ where: { id: acceso.alumno.id }, select: { salon: { select: { anio: true, nivel: true, grado: true, cursos: { select: { id: true, nombre: true, cursoColegio: { select: { cursoKhipu: true } } } } } } } });
  const salon = alumno?.salon;
  if (!salon?.grado || (salon.nivel !== "primaria" && salon.nivel !== "secundaria")) return [];
  const asignado = salon.cursos.find(c => c.id === cursoIdOClave);
  const clave = asignado ? claveCursoAsignado(asignado, salon.nivel) : cursoIdOClave;
  if (!clave || !cursoKhipu(clave)?.nudito || (!asignado && !salon.cursos.some(c => claveCursoAsignado(c, salon.nivel) === clave))) return [];
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "nudito_temas_publicados", entidadId: acceso.alumno.id, detalle: { curso: clave } });
  const plan = await ctx.db.planAnual.findFirst({
    where: { anio: salon.anio, nivel: salon.nivel, grado: salon.grado, area: clave, versionPublicada: { gt: 0 } },
    select: { id: true, versionPublicada: true },
  });
  if (!plan) return [];
  const version = await ctx.db.planAnualVersion.findFirst({ where: { planId: plan.id, numero: plan.versionPublicada }, select: { temas: true } });
  if (!version) return [];
  // Se consulta una sola vez cada tabla, sin una consulta por tema.
  const foto = clavesDeVersion(version.temas);
  if (!foto.length) return [];
  const { temas: catalogo, indices } = await catalogoDelCursoConIndice(ctx.db, { anio: salon.anio, nivel: salon.nivel, grado: salon.grado, area: clave });
  const porClave = new Map(catalogo.map(t => [t.clave, t]));
  const editorial = new Map(indices.map(i => [i.clave, i]));
  const visibles: TemaDisponible[] = [];
  for (const claveTema of foto) {
    const tema = porClave.get(claveTema);
    const indice = editorial.get(claveTema);
    if (!tema || !indice || (indice.estado !== "revisado" && indice.estado !== "publicado")) continue;
    const huellaActual = await huellaActualDeTema(claveTema);
    if (temaVisibleParaAlumno(indice.estado, indice.huellaContenidoRevisado, huellaActual)) visibles.push(tema);
  }
  return visibles;
}

export async function progresoDelPlan(ctx: TenantContext, alumnoId: string, cursoIdOClave: string) {
  await requireAlumnoVisible(ctx, alumnoId);
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "nudito_progreso_plan", entidadId: alumnoId, detalle: { curso: cursoIdOClave } });
  const alumno = await ctx.db.alumno.findFirst({ where: { id: alumnoId }, select: { id: true, nombres: true, apellidos: true, salonId: true } });
  if (!alumno) return { total: 0, dominados: 0, completo: false, temas: [] };
  const temas = await temasPublicadosDelAlumno(ctx, { alumno, modo: "alumno" }, cursoIdOClave);
  const dominios = temas.length ? await ctx.db.nuditoDominio.findMany({ where: { alumnoId, temaClave: { in: temas.map(t => t.clave) } }, select: { temaClave: true, estado: true } }) : [];
  const estados = new Map(dominios.map(d => [d.temaClave, d.estado]));
  const resultado = temas.map(t => ({ temaClave: t.clave, estado: mapearEstadoProgreso(estados.get(t.clave) ?? null) }));
  return { total: resultado.length, dominados: resultado.filter(t => t.estado === "dominado").length, completo: planCompleto(resultado.map(t => t.estado)), temas: resultado };
}
