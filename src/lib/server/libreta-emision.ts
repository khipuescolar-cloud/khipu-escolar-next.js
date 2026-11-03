import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { interpretarValor, requiereConclusion, textoValor, type Literal, type ValorCalificacion } from "@/lib/calificaciones";
import { urlColegio } from "@/lib/dominio";
import { primerNombre } from "@/lib/nombres";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { auditar } from "./auditoria";
import { construirLibreta, type LibretaConstruida } from "./libreta";
import { destinatariosDeAlumno, encolarParaDestinatario, tieneCanalAviso } from "./notificaciones/encolar";
import { requireFeature } from "./plan";
import { requireAlumnoVisible, requireCursoDelProfesor, requireRol, type TenantContext } from "./tenant";

// Libretas emitidas y rectificaciones (specs/37).
// - Al publicar la libreta del periodo se emite la versión 1 de cada alumno: una copia congelada de lo que se entregó.
//   Desde ahí, ni el registro auxiliar ni las calificaciones en vivo la cambian.
// - Para corregir un error se pide una rectificación (profesor del curso o dirección) con el valor nuevo, el motivo y la
//   evidencia. Dirección la aprueba o rechaza. Al aprobar se crea la versión siguiente (copia de la anterior con solo esa
//   competencia corregida) y la anterior queda intacta. Nada se traslada al periodo siguiente.

/** Emite la versión 1 de la libreta de cada alumno del periodo que aún no la tenga. Idempotente. */
export async function emitirLibretas(ctx: TenantContext, periodoId: string): Promise<number> {
  const periodo = await ctx.db.periodo.findFirst({ where: { id: periodoId } });
  if (!periodo) return 0;
  const [alumnos, yaEmitidas] = await Promise.all([
    ctx.db.alumno.findMany({
      where: { estado: "activo", salon: { archivadoAt: null, nivel: { in: periodo.niveles }, cursos: { some: {} } } },
      select: { id: true },
    }),
    ctx.db.libretaEmitida.findMany({ where: { periodoId }, select: { alumnoId: true } }),
  ]);
  const emitidos = new Set(yaEmitidas.map((e) => e.alumnoId));
  let n = 0;
  for (const a of alumnos) {
    if (emitidos.has(a.id)) continue;
    const datos = await construirLibreta(ctx, a.id, periodoId);
    const r = await ctx.db.libretaEmitida.createMany({
      data: [{ tenantId: ctx.tenant.id, alumnoId: a.id, periodoId, version: 1, datos: datos as unknown as Prisma.InputJsonValue, emitidaPorId: ctx.membership.id }],
      skipDuplicates: true,
    });
    n += r.count;
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "libreta_emitida", entidadId: periodoId, detalle: { alumnos: n } });
  return n;
}

const valorDeSnapshot = (datos: LibretaConstruida, competenciaId: string) => {
  for (const c of datos.cursos) {
    const comp = c.competencias.find((x) => x.id === competenciaId);
    if (comp) return { curso: c, competencia: comp };
  }
  return null;
};

const esquemaSolicitud = z.object({
  alumnoId: z.uuid(),
  periodoId: z.uuid(),
  competenciaId: z.uuid(),
  valor: z.string().max(10),
  conclusion: z.string().trim().max(1000, "La conclusión es muy larga (máximo 1000 caracteres).").optional(),
  motivo: z.string().trim().min(10, "Explica el motivo de la rectificación (mínimo 10 caracteres).").max(1000, "El motivo es muy largo (máximo 1000 caracteres)."),
  evidencia: z.string().trim().max(1000, "La evidencia es muy larga (máximo 1000 caracteres).").optional(),
});

/** Profesor del curso de la competencia o dirección pide corregir una calificación de una libreta ya emitida. */
export async function solicitarRectificacion(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  requireFeature(ctx, "libreta");
  requireRol(ctx, ["profesor", "direccion"]);
  const d = esquemaSolicitud.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const comp = await ctx.db.competencia.findFirst({ where: { id: d.data.competenciaId }, select: { id: true, cursoId: true } });
  if (!comp) return fallo("No encontramos esa competencia.");
  if (ctx.rol === "profesor") await requireCursoDelProfesor(ctx, comp.cursoId);
  await requireAlumnoVisible(ctx, d.data.alumnoId);
  const emitida = await ctx.db.libretaEmitida.findFirst({ where: { alumnoId: d.data.alumnoId, periodoId: d.data.periodoId }, orderBy: { version: "desc" } });
  if (!emitida) return fallo("Esta libreta aún no se emitió: corrige la calificación directamente.");
  const actual = valorDeSnapshot(emitida.datos as unknown as LibretaConstruida, comp.id);
  if (!actual) return fallo("Esa competencia no está en la libreta emitida de este alumno.");
  const v = interpretarValor(ctx.tenant.escalaCalificacion, d.data.valor);
  if (!v.ok) return fallo(v.error);
  if (!v.valor) return fallo("Indica la calificación correcta.");
  if (requiereConclusion(v.valor.valorLiteral) && !d.data.conclusion) return fallo("Escribe la conclusión descriptiva: es obligatoria para B y C.");
  const pendiente = await ctx.db.rectificacionLibreta.count({ where: { alumnoId: d.data.alumnoId, periodoId: d.data.periodoId, competenciaId: comp.id, estado: "pendiente" } });
  if (pendiente > 0) return fallo("Ya hay una rectificación pendiente para esta competencia.");
  const anterior = actual.competencia.calificacion ? textoValor(actual.competencia.calificacion as ValorCalificacion) : null;
  const r = await ctx.db.rectificacionLibreta.create({
    data: {
      tenantId: ctx.tenant.id, alumnoId: d.data.alumnoId, periodoId: d.data.periodoId, competenciaId: comp.id, valorAnterior: anterior,
      valorLiteral: v.valor.valorLiteral, valorNumerico: v.valor.valorNumerico, conclusion: d.data.conclusion || null,
      motivo: d.data.motivo, evidencia: d.data.evidencia || null, solicitadaPorId: ctx.membership.id,
    },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "rectificacion_libreta", entidadId: r.id, detalle: { alumnoId: d.data.alumnoId, periodoId: d.data.periodoId } });
  return ok("Rectificación enviada. Dirección la revisará.");
}

/** Dirección aprueba (crea la versión siguiente) o rechaza una rectificación. Solo cambia las pendientes. */
export async function resolverRectificacion(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  requireFeature(ctx, "libreta");
  requireRol(ctx, ["direccion"]);
  const d = z.object({ id: z.uuid(), decision: z.enum(["aprobada", "rechazada"]), comentario: z.string().trim().max(500).optional() }).safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  const r = await ctx.db.rectificacionLibreta.findFirst({ where: { id: d.data.id }, include: { alumno: { select: { nombres: true } }, periodo: { select: { nombre: true, anio: true } } } });
  if (!r) forbidden();
  if (r.estado !== "pendiente") return fallo("Esta rectificación ya se resolvió.");
  const ahora = new Date();
  if (d.data.decision === "rechazada") {
    const x = await ctx.db.rectificacionLibreta.updateMany({
      where: { id: r.id, estado: "pendiente" },
      data: { estado: "rechazada", resueltaPorId: ctx.membership.id, resueltaAt: ahora, comentarioResolucion: d.data.comentario || null },
    });
    if (x.count === 0) return fallo("Esta rectificación ya se resolvió.");
    await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "rectificacion_libreta", entidadId: r.id, detalle: { estado: "rechazada" } });
    return ok("Rectificación rechazada. La libreta emitida no cambia.");
  }
  const valor = { valorLiteral: r.valorLiteral as Literal | null, valorNumerico: r.valorNumerico === null ? null : Number(r.valorNumerico.toString()) };
  const version = await ctx.db.$transaction(async (tx) => {
    const x = await tx.rectificacionLibreta.updateMany({
      where: { id: r.id, estado: "pendiente" },
      data: { estado: "aprobada", resueltaPorId: ctx.membership.id, resueltaAt: ahora, comentarioResolucion: d.data.comentario || null },
    });
    if (x.count === 0) return null;
    const previa = await tx.libretaEmitida.findFirst({ where: { alumnoId: r.alumnoId, periodoId: r.periodoId }, orderBy: { version: "desc" } });
    if (!previa) return null;
    // Copia de la versión anterior con solo esa competencia corregida.
    const datos = structuredClone(previa.datos as unknown as LibretaConstruida);
    const destino = valorDeSnapshot(datos, r.competenciaId);
    if (destino) {
      destino.competencia.calificacion = valor;
      destino.competencia.conclusion = r.conclusion ?? destino.competencia.conclusion;
    }
    await tx.libretaEmitida.create({
      data: {
        tenantId: ctx.tenant.id, alumnoId: r.alumnoId, periodoId: r.periodoId, version: previa.version + 1,
        datos: datos as unknown as Prisma.InputJsonValue, emitidaPorId: ctx.membership.id, rectificacionId: r.id,
      },
    });
    await tx.calificacionPeriodo.upsert({
      where: { alumnoId_competenciaId_periodoId: { alumnoId: r.alumnoId, competenciaId: r.competenciaId, periodoId: r.periodoId } },
      create: { tenantId: ctx.tenant.id, alumnoId: r.alumnoId, competenciaId: r.competenciaId, periodoId: r.periodoId, ...valor, conclusion: r.conclusion },
      update: { ...valor, ...(r.conclusion ? { conclusion: r.conclusion } : {}) },
    });
    return previa.version + 1;
  });
  if (version === null) return fallo("Esta rectificación ya se resolvió.");
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "rectificacion_libreta", entidadId: r.id, detalle: { estado: "aprobada", version } });
  // Solo la familia de este alumno: su libreta tiene una versión nueva.
  for (const dest of await destinatariosDeAlumno(ctx.db, r.alumnoId)) {
    if (!tieneCanalAviso(dest)) continue;
    await encolarParaDestinatario(ctx.db, dest, {
      tenantId: ctx.tenant.id, tipo: "libreta", plantilla: "libreta_publicada", referenciaId: r.id,
      payload: {
        colegio: ctx.tenant.nombre, alumno: primerNombre(r.alumno.nombres), periodo: `${r.periodo.nombre} ${r.periodo.anio} (versión ${version}, rectificada)`,
        url: urlColegio(ctx.tenant.slug, `/libreta?alumno=${r.alumnoId}&periodo=${r.periodoId}`),
      },
    });
  }
  return ok(`Rectificación aprobada: se emitió la versión ${version} de la libreta. La versión anterior se conserva.`);
}

/** Rectificaciones de un alumno en un periodo (o todas las pendientes, para dirección). Profesor: las que pidió. */
export async function listarRectificaciones(ctx: TenantContext, filtro: { alumnoId?: string; periodoId?: string; soloPendientes?: boolean } = {}) {
  requireFeature(ctx, "libreta");
  requireRol(ctx, ["profesor", "direccion"]);
  if (filtro.alumnoId) await requireAlumnoVisible(ctx, filtro.alumnoId);
  const filas = await ctx.db.rectificacionLibreta.findMany({
    where: {
      ...(filtro.alumnoId ? { alumnoId: filtro.alumnoId } : {}),
      ...(filtro.periodoId ? { periodoId: filtro.periodoId } : {}),
      ...(filtro.soloPendientes ? { estado: "pendiente" as const } : {}),
      ...(ctx.rol === "profesor" ? { solicitadaPorId: ctx.membership.id } : {}),
    },
    orderBy: { solicitadaAt: "desc" },
    take: 100,
    include: {
      alumno: { select: { nombres: true, apellidos: true } },
      competencia: { select: { nombre: true, curso: { select: { nombre: true } } } },
      periodo: { select: { nombre: true, anio: true } },
      solicitadaPor: { select: { user: { select: { nombres: true, apellidos: true } } } },
      resueltaPor: { select: { user: { select: { nombres: true, apellidos: true } } } },
      libreta: { select: { version: true } },
    },
  });
  return filas.map((r) => ({
    id: r.id, estado: r.estado, alumnoId: r.alumnoId, periodoId: r.periodoId,
    alumno: `${r.alumno.apellidos}, ${r.alumno.nombres}`, periodo: `${r.periodo.nombre} ${r.periodo.anio}`,
    curso: r.competencia.curso.nombre, competencia: r.competencia.nombre,
    anterior: r.valorAnterior, nuevo: textoValor({ valorLiteral: r.valorLiteral as Literal | null, valorNumerico: r.valorNumerico === null ? null : Number(r.valorNumerico.toString()) }),
    conclusion: r.conclusion, motivo: r.motivo, evidencia: r.evidencia,
    solicitadaPor: `${r.solicitadaPor.user.nombres} ${r.solicitadaPor.user.apellidos}`.trim(), solicitadaAt: r.solicitadaAt,
    resueltaPor: r.resueltaPor ? `${r.resueltaPor.user.nombres} ${r.resueltaPor.user.apellidos}`.trim() : null, resueltaAt: r.resueltaAt,
    comentario: r.comentarioResolucion, version: r.libreta?.version ?? null,
  }));
}
