import { FormAccion } from "@/components/FormAccion";
import { eventos, obtenerPlan, versiones } from "@/lib/server/plan-anual";
import { requireTenantContext } from "@/lib/server/tenant";
import { accionPlan } from "../../actions";

export default async function VersionesPage({ params }: { params: Promise<{ slug: string; planId: string }> }) {
  const { slug, planId } = await params;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion"]);
  const [plan, historial, movimientos] = await Promise.all([obtenerPlan(ctx, planId), versiones(ctx, planId), eventos(ctx, planId)]);
  return <div className="grid min-w-0 gap-6 lg:grid-cols-2">
    <section className="rounded-lg border border-borde-sutil bg-superficie-elevada p-4"><h2 className="text-lg font-semibold">Versiones publicadas</h2><p className="mt-1 text-sm text-muted-foreground">La versión publicada permanece disponible mientras se prepara una revisión.</p>
      {historial.length === 0 ? <p className="mt-4 text-muted-foreground">Todavía no se publicó ninguna versión.</p> : <ol className="mt-4 space-y-3">{historial.map(v => <li key={v.id} className="rounded-md border border-borde-sutil p-3"><p className="font-semibold">Versión {v.numero}{v.numero === plan.versionPublicada ? " · Vigente" : ""}</p><p className="text-sm text-muted-foreground">{v.publicadoAt.toLocaleString("es-PE", { timeZone: ctx.tenant.zonaHoraria })} · {Array.isArray(v.temas) ? v.temas.length : 0} temas</p></li>)}</ol>}
      {plan.estado !== "archivado" && <FormAccion accion={accionPlan.bind(null, slug, planId, "copiar")} etiqueta="Copiar a otro año" className="mt-6 grid gap-2"><label className="grid gap-1 text-sm">Año de destino<input type="number" name="anio" min="2020" max="2100" defaultValue={plan.anio + 1} required className="h-11 w-32 rounded-md border border-input bg-background px-3" /></label></FormAccion>}
    </section>
    <section className="rounded-lg border border-borde-sutil bg-superficie-elevada p-4"><h2 className="text-lg font-semibold">Actividad del plan</h2><ol className="mt-4 space-y-3">{movimientos.map(e => <li key={e.id} className="border-b border-borde-sutil pb-3"><p className="font-medium">{e.tipo.replaceAll("_", " ")}</p><p className="text-sm text-muted-foreground">{e.createdAt.toLocaleString("es-PE", { timeZone: ctx.tenant.zonaHoraria })}</p></li>)}</ol></section>
  </div>;
}
