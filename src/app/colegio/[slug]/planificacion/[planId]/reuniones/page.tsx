import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { FormAccion } from "@/components/FormAccion";
import { obtenerPlan, reunionesDelPlan, sugerirHorariosPlan } from "@/lib/server/plan-anual";
import { requireTenantContext } from "@/lib/server/tenant";
import { accionPlan } from "../../actions";

export default async function ReunionesPlanPage({ params, searchParams }: { params: Promise<{ slug: string; planId: string }>; searchParams: Promise<{ fecha?: string; hora?: string }> }) {
  const { slug, planId } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion"]);
  const [plan, reuniones] = await Promise.all([obtenerPlan(ctx, planId), reunionesDelPlan(ctx, planId)]);
  const coordinador = ctx.rol === "profesor" && plan.coordinadorId === ctx.membership.id;
  const sugerencias = coordinador && sp.fecha && sp.hora ? await sugerirHorariosPlan(ctx, planId, { fecha: sp.fecha, hora: sp.hora }) : null;
  return <div className="grid min-w-0 gap-6 lg:grid-cols-2">
    <section className="rounded-lg border border-borde-sutil bg-superficie-elevada p-4">
      <h2 className="text-lg font-semibold">Reuniones del plan</h2>
      <p className="mt-1 text-sm text-muted-foreground">Se convocan en la agenda institucional; las actas y los acuerdos se gestionan allí.</p>
      {reuniones.length === 0 ? <p className="mt-5 text-muted-foreground">Aún no hay reuniones vinculadas.</p> : <ul className="mt-4 divide-y divide-borde-sutil">{reuniones.map(r => <li key={r.id} className="py-3"><Link href={"/reuniones/" + r.id} className="font-semibold text-sec-tinta underline underline-offset-4">{r.titulo}</Link><p className="text-sm text-muted-foreground">{r.inicio.toLocaleString("es-PE", { timeZone: ctx.tenant.zonaHoraria })} · {r.acuerdos.length} acuerdos</p>{r.acta && <p className="mt-2 line-clamp-2 text-sm">{r.acta}</p>}</li>)}</ul>}
    </section>
    {coordinador && <section className="rounded-lg border border-borde-sutil bg-superficie-elevada p-4">
      <h2 className="inline-flex items-center gap-2 text-lg font-semibold"><CalendarDays className="size-5" aria-hidden />Convocar</h2>
      <p className="mt-1 text-sm text-muted-foreground">Se invitará a todos los participantes activos del plan.</p>
      <form method="get" className="mt-4 flex flex-wrap items-end gap-2"><label className="grid gap-1 text-sm">Fecha<input type="date" name="fecha" required defaultValue={sp.fecha} className="h-11 rounded-md border border-input bg-background px-3" /></label><label className="grid gap-1 text-sm">Hora<input type="time" name="hora" required defaultValue={sp.hora ?? "15:00"} className="h-11 rounded-md border border-input bg-background px-3" /></label><button className="h-11 rounded-md border border-input px-4">Ver disponibilidad</button></form>
      {sugerencias && ("error" in sugerencias ? <p className="mt-3 text-sm text-destructive">{sugerencias.error}</p> : <div className="mt-4"><p className="font-medium">{sugerencias.preferida.libre ? "Horario libre" : "Horario ocupado"}</p><p className="text-sm text-muted-foreground">Alternativas: {sugerencias.alternativas.map(a => a.fecha + " " + a.hora).join(" · ") || "No hay alternativas cercanas"}</p></div>)}
      <FormAccion accion={accionPlan.bind(null, slug, planId, "reunion")} etiqueta="Convocar reunión" className="mt-5 grid gap-3">
        <label className="grid gap-1 text-sm">Título<input name="titulo" required minLength={3} maxLength={150} className="h-11 min-w-0 rounded-md border border-input bg-background px-3" /></label>
        <label className="grid gap-1 text-sm">Descripción<textarea name="descripcion" maxLength={1000} className="min-h-20 rounded-md border border-input bg-background p-3" /></label>
        <div className="flex flex-wrap gap-3"><label className="grid gap-1 text-sm">Fecha<input name="fecha" type="date" required defaultValue={sp.fecha} className="h-11 rounded-md border border-input bg-background px-3" /></label><label className="grid gap-1 text-sm">Hora<input name="hora" type="time" required defaultValue={sp.hora ?? "15:00"} className="h-11 rounded-md border border-input bg-background px-3" /></label><label className="grid gap-1 text-sm">Minutos<input name="duracion" type="number" min="15" max="240" defaultValue={60} className="h-11 w-24 rounded-md border border-input bg-background px-3" /></label></div>
        <label className="grid gap-1 text-sm">Modalidad<select name="modalidad" className="h-11 rounded-md border border-input bg-background px-3"><option value="presencial">Presencial</option><option value="virtual">Virtual</option><option value="mixta">Mixta</option></select></label>
        <label className="grid gap-1 text-sm">Lugar<input name="lugar" maxLength={200} placeholder="Sala de profesores" className="h-11 min-w-0 rounded-md border border-input bg-background px-3" /></label>
        <label className="grid gap-1 text-sm">Enlace existente, si aplica<input name="enlace" type="url" placeholder="https://" className="h-11 min-w-0 rounded-md border border-input bg-background px-3" /></label>
      </FormAccion>
    </section>}
  </div>;
}
