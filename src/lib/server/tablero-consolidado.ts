import "server-only";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { Escala } from "@/lib/calificaciones";
import type { Consolidado, Valor } from "@/lib/tablero-consolidado";
import { auditar } from "./auditoria";
import { requireTablero } from "./tablero";
import type { TenantContext } from "./tenant";

// Consolidado de notas por salón y periodo (specs/33). Solo dirección y solo lectura.

const entrada = z.object({ salonId: z.uuid(), periodoId: z.uuid() });

export type FiltrosConsolidado = z.infer<typeof entrada>;

export function filtrosConsolidado(get: (clave: string) => string | null | undefined): FiltrosConsolidado {
  return entrada.parse({ salonId: get("salon") || undefined, periodoId: get("periodo") || undefined });
}

export async function consolidadoNotas(ctx: TenantContext, datos: unknown, como: { accion: "ver" } | { accion: "exportar"; formato: "excel" | "pdf" } = { accion: "ver" }): Promise<Consolidado> {
  requireTablero(ctx);
  const { salonId, periodoId } = entrada.parse(datos);
  const [salon, periodo] = await Promise.all([
    ctx.db.salon.findFirst({ where: { id: salonId }, select: { id: true, nombre: true } }),
    ctx.db.periodo.findFirst({ where: { id: periodoId }, select: { id: true, nombre: true } }),
  ]);
  if (!salon || !periodo) notFound();
  const escala = ctx.tenant.escalaCalificacion as Escala;

  const [competencias, alumnos] = await Promise.all([
    ctx.db.competencia.findMany({ where: { curso: { salonId } }, select: { id: true, nombre: true, orden: true, curso: { select: { id: true, nombre: true } } } }),
    ctx.db.alumno.findMany({ where: { salonId, estado: "activo" }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }], select: { id: true, nombres: true, apellidos: true } }),
  ]);
  competencias.sort((a, b) => a.curso.nombre.localeCompare(b.curso.nombre, "es") || a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"));
  const alumnoIds = alumnos.map((a) => a.id);

  // Solo calificaciones del periodo confirmadas por el profesor: Khipu no calcula ni sugiere notas aquí (specs/11).
  const calificaciones = await ctx.db.calificacionPeriodo.findMany({
    where: { periodoId, alumnoId: { in: alumnoIds }, competencia: { curso: { salonId } } },
    select: { alumnoId: true, competenciaId: true, valorLiteral: true, valorNumerico: true },
  });
  const oficial = new Map(calificaciones.map((c) => [`${c.alumnoId}|${c.competenciaId}`, c]));
  const filas = alumnos.map((a) => ({
    alumnoId: a.id,
    nombre: `${a.apellidos}, ${a.nombres}`,
    valores: competencias.map<Valor | null>((comp) => {
      const clave = `${a.id}|${comp.id}`;
      const o = oficial.get(clave);
      if (o && (o.valorLiteral || o.valorNumerico !== null)) return { valorLiteral: o.valorLiteral, valorNumerico: o.valorNumerico === null ? null : Number(o.valorNumerico) };
      return null;
    }),
  }));

  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: como.accion, entidad: "consolidado_notas", entidadId: salonId,
    detalle: como.accion === "exportar" ? { periodoId, formato: como.formato } : { periodoId },
  });
  return {
    colegio: ctx.tenant.nombre, salon, periodo, escala, filas,
    columnas: competencias.map((c) => ({ cursoId: c.curso.id, curso: c.curso.nombre, competenciaId: c.id, competencia: c.nombre })),
  };
}
