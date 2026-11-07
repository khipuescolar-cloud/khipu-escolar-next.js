import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { datosCalificacionPeriodo } from "@/lib/server/calificacion-periodo";
import { listarPeriodos, periodoEnCurso } from "@/lib/server/notas";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { TablaPeriodo } from "./TablaPeriodo";

export const metadata: Metadata = { title: "Calificación del periodo" };

export default async function Page({ params, searchParams }: PageProps<"/colegio/[slug]/notas/[cursoId]/periodo">) {
  const { slug, cursoId } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "notas");
  if (ctx.rol !== "profesor" && ctx.rol !== "direccion") forbidden();
  let periodoId = typeof sp.periodo === "string" ? sp.periodo : undefined;
  if (!periodoId) {
    const curso = await ctx.db.curso.findFirst({ where: { id: cursoId }, select: { salon: { select: { nivel: true } } } });
    if (!curso) forbidden();
    periodoId = periodoEnCurso(await listarPeriodos(ctx, curso.salon.nivel))?.id;
  }
  if (!periodoId) forbidden();
  const datos = await datosCalificacionPeriodo(ctx, cursoId, periodoId);
  return <TablaPeriodo datos={datos} slug={slug} esDireccion={ctx.rol === "direccion"} />;
}
