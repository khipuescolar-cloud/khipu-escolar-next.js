import Link from "next/link";
import { CircleCheck, CircleDashed, CircleX, Clock3, Play } from "lucide-react";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { requireTenantContext } from "@/lib/server/tenant";
import { listarLeccionesDelPlan } from "@/lib/server/nudito/lecciones";
import { metricasContenido } from "@/lib/server/nudito/lecciones/preparacion";
import { continuarAction, prepararAction } from "./actions";

const iconos = { publicada: CircleCheck, aprobada: CircleCheck, en_revision: Clock3, cambios_solicitados: CircleX, borrador: CircleDashed, retirada: CircleX } as const;

export default async function MaterialesPage({ params }: PageProps<"/colegio/[slug]/planificacion/[planId]/materiales">) {
  const { slug, planId } = await params;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion"]);
  const [filas, trabajo, metricas] = await Promise.all([
    listarLeccionesDelPlan(ctx, planId),
    ctx.db.nuditoTrabajoContenido.findFirst({ where: { planId }, orderBy: { versionPlan: "desc" } }),
    metricasContenido(ctx),
  ]);
  return <main className="min-w-0">
    <EncabezadoPagina titulo="Materiales de Nudito" seccion="academico" descripcion="Revisa las lecciones antes de publicarlas para tus alumnos." />
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <form action={prepararAction.bind(null, planId)}><button className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-primary-foreground">{trabajo ? "Preparar materiales" : "Preparar materiales"}</button></form>
      {trabajo && trabajo.estado !== "completado" && <form action={continuarAction.bind(null, planId, trabajo.id)}><button className="min-h-11 rounded-lg border border-input px-4 font-semibold"><Play className="mr-1 inline size-4" strokeWidth={2} aria-hidden />Continuar</button></form>}
    </div>
    {trabajo && <p className="mb-5 inline-flex items-center gap-2 text-cuerpo-sm" role="status"><Clock3 className="size-4" strokeWidth={2} aria-hidden />Trabajo: {trabajo.procesados} de {trabajo.total} temas procesados · {trabajo.estado.replaceAll("_", " ")}.</p>}
    <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[["Reutilizadas", metricas.reutilizadas], ["Generadas", metricas.generadas], ["Pendientes de aprobación", metricas.pendientesAprobacion], ["Costo IA del colegio", "$" + metricas.costoColegioUsd.toFixed(2)]].map(([titulo, valor]) => <div key={titulo} className="rounded-lg border border-borde-sutil bg-superficie p-3"><dt className="text-cuerpo-sm text-muted-foreground">{titulo}</dt><dd className="text-xl font-semibold">{valor}</dd></div>)}
    </dl>
    {filas.length === 0 && <p className="mb-5 inline-flex items-center gap-2 text-cuerpo-sm"><CircleDashed className="size-4" strokeWidth={2} aria-hidden />Este plan todavía no tiene temas publicados.</p>}
    <ul className="grid gap-3 sm:grid-cols-2">
      {filas.map(({ temaClave, leccion }) => {
        const estado = leccion?.estado ?? "pendiente";
        const Icono = leccion ? iconos[leccion.estado] : CircleDashed;
        return <li key={temaClave} className="min-w-0 rounded-lg border border-borde-sutil bg-superficie p-4">
          <p className="break-all font-semibold">{temaClave}</p>
          <p className="mt-2 inline-flex items-center gap-2 text-cuerpo-sm"><Icono className="size-4" strokeWidth={2} aria-hidden />{estado.replaceAll("_"," ")}</p>
          {leccion && <Link href={"/planificacion/" + planId + "/materiales/" + encodeURIComponent(temaClave)} className="mt-3 block min-h-11 rounded-lg border border-input px-3 py-2 text-center font-semibold">Revisar lección</Link>}
        </li>;
      })}
    </ul>
  </main>;
}
