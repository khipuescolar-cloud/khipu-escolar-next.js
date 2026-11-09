import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { FormAccion } from "@/components/FormAccion";
import { EstadoPlan } from "@/components/planificacion/EstadoPlan";
import { gruposDelDocente, listarPlanes } from "@/lib/server/plan-anual";
import { requireTenantContext } from "@/lib/server/tenant";
import { crearPlanAccion } from "./actions";

export const metadata: Metadata = { title: "Planificación anual" };
export default async function PlanificacionPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ anio?: string }> }) {
  const { slug } = await params;
  const { anio: anioTexto } = await searchParams;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion"]);
  const anio = Number(anioTexto) || new Date().getFullYear();
  const planes = await listarPlanes(ctx, { anio });
  const grupos = ctx.rol === "profesor" ? await gruposDelDocente(ctx) : await ctx.db.curso.findMany({
    where: { salon: { anio, archivadoAt: null, grado: { not: null } }, areaCneb: { not: null } },
    select: { nombre: true, areaCneb: true, salon: { select: { anio: true, nivel: true, grado: true } } },
  }).then(cursos => [...new Map(cursos.filter(c => c.areaCneb && c.salon.grado !== null).map(c => {
    const g = { anio: c.salon.anio, nivel: c.salon.nivel, grado: c.salon.grado!, area: c.areaCneb!, nombreCurso: c.nombre };
    return [[g.anio, g.nivel, g.grado, g.area].join("|"), g] as const;
  })).values()]);
  const visibles = grupos.filter(g => g.anio === anio);
  return <div className="min-w-0">
    <EncabezadoPagina titulo="Planificación anual" descripcion="Un plan compartido por grado, curso y año. Los docentes acuerdan los temas antes de publicarlos." seccion="academico" />
    <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-sm font-medium">Año<input name="anio" type="number" min="2020" max="2100" defaultValue={anio} className="h-11 w-28 rounded-md border border-input bg-background px-3" /></label>
      <button className="h-11 rounded-md border border-input px-4 font-medium">Ver año</button>
    </form>
    {visibles.length === 0 ? <p className="rounded-lg border border-borde-sutil p-6 text-muted-foreground">No hay grupos curriculares para este año.</p> :
      <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">{visibles.map(g => {
        const existente = planes.find(p => p.anio === g.anio && p.nivel === g.nivel && p.grado === g.grado && p.area === g.area);
        return <article key={[g.anio, g.nivel, g.grado, g.area].join("|")} className="min-w-0 rounded-lg border border-borde-sutil bg-superficie-elevada p-4">
          <div className="mb-3 flex items-start gap-3"><BookOpen className="mt-1 size-5 shrink-0 text-sec-trazo" strokeWidth={2} aria-hidden /><div className="min-w-0"><h2 className="font-semibold">{g.nombreCurso}</h2><p className="text-sm text-muted-foreground">{g.nivel} · {g.grado}.° grado · {g.anio}</p></div></div>
          {existente ? <div className="flex flex-wrap items-center justify-between gap-2"><EstadoPlan estado={existente.estado} /><Link href={"/planificacion/" + existente.id} className="inline-flex min-h-11 items-center font-semibold text-sec-tinta underline underline-offset-4">Abrir plan</Link></div> :
            <FormAccion accion={crearPlanAccion.bind(null, slug)} etiqueta="Crear plan" className="mt-2">
              <input type="hidden" name="anio" value={g.anio} /><input type="hidden" name="nivel" value={g.nivel} /><input type="hidden" name="grado" value={g.grado} /><input type="hidden" name="area" value={g.area} /><Plus className="sr-only" aria-hidden />
            </FormAccion>}
        </article>;
      })}</div>}
  </div>;
}
