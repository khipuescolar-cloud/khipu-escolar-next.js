import { CircleCheck, CircleHelp, MessageCircleWarning } from "lucide-react";
import { FormAccion } from "@/components/FormAccion";
import { obtenerPlan } from "@/lib/server/plan-anual";
import { requireTenantContext } from "@/lib/server/tenant";
import { accionPlan } from "../../actions";

export default async function RevisionPage({ params }: { params: Promise<{ slug: string; planId: string }> }) {
  const { slug, planId } = await params;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion"]);
  const plan = await obtenerPlan(ctx, planId);
  const coordinador = ctx.rol === "profesor" && plan.coordinadorId === ctx.membership.id;
  const direccion = ctx.rol === "direccion";
  const activos = plan.participantes.filter(p => p.activo);
  const observaciones = plan.comentarios.filter(c => c.esObservacion);
  const abiertas = observaciones.filter(c => c.estado === "abierta");
  const nombre = (p: typeof activos[number]) => [p.membership.user.nombres, p.membership.user.apellidos].filter(Boolean).join(" ");
  const fecha = (valor: Date) => new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: ctx.tenant.zonaHoraria }).format(valor);
  const docentes = direccion ? await ctx.db.membership.findMany({ where: { rol: "profesor", estado: "activa" }, include: { user: { select: { nombres: true, apellidos: true } } }, orderBy: { createdAt: "asc" } }) : [];
  return <div className="grid min-w-0 gap-6 lg:grid-cols-2">
    <section className="min-w-0 space-y-5">
      <div className="rounded-lg border border-borde-sutil bg-superficie-elevada p-4">
        <h2 className="text-lg font-semibold">Ronda de revisión {plan.rondaRevision}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{activos.length} participantes activos · {abiertas.length} observaciones abiertas.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {coordinador && plan.estado === "borrador" && <FormAccion accion={accionPlan.bind(null, slug, planId, "enviar")} etiqueta="Enviar a revisión" />}
          {coordinador && plan.estado === "con_observaciones" && <FormAccion accion={accionPlan.bind(null, slug, planId, "reenviar")} etiqueta="Reenviar a revisión" />}
          {coordinador && plan.estado === "en_revision" && <FormAccion accion={accionPlan.bind(null, slug, planId, "aprobar")} etiqueta="Aprobar plan" />}
          {coordinador && plan.estado === "aprobado" && <FormAccion accion={accionPlan.bind(null, slug, planId, "publicar")} etiqueta="Publicar plan" />}
        </div>
        {coordinador && plan.estado === "publicado" && <FormAccion accion={accionPlan.bind(null, slug, planId, "abrir")} etiqueta="Abrir revisión" className="mt-4 grid gap-2"><label className="grid gap-1 text-sm">Motivo<input name="motivo" required minLength={5} maxLength={1000} className="h-11 rounded-md border border-input bg-background px-3" /></label></FormAccion>}
      </div>
      <div className="rounded-lg border border-borde-sutil bg-superficie-elevada p-4">
        <h2 className="text-lg font-semibold">Participantes y conformidades</h2>
        <ul className="mt-3 divide-y divide-borde-sutil">{activos.map(p => { const conforme = plan.conformidades.find(c => c.ronda === plan.rondaRevision && c.membershipId === p.membershipId);
          return <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span>{nombre(p)}{p.membershipId === plan.coordinadorId ? " · Coordinador" : ""}{p.fueraDeAsignacion ? " · Fuera de asignación" : ""}</span><span className="inline-flex items-center gap-1 text-sm">{conforme?.decision === "conforme" ? <CircleCheck className="size-4" aria-hidden /> : <CircleHelp className="size-4" aria-hidden />}{conforme?.decision === "conforme" ? "Conforme" : conforme?.decision === "observaciones" ? "Con observaciones" : "Pendiente"}</span></li>;
        })}</ul>
        {ctx.rol === "profesor" && (plan.estado === "en_revision" || plan.estado === "con_observaciones") && <FormAccion accion={accionPlan.bind(null, slug, planId, "conformidad")} etiqueta="Registrar mi decisión" className="mt-4 grid gap-2"><label className="grid gap-1 text-sm">Mi decisión<select name="decision" className="h-11 rounded-md border border-input bg-background px-3"><option value="conforme">Conforme</option><option value="observaciones">Tengo observaciones</option></select></label><label className="grid gap-1 text-sm">Comentario<textarea name="comentario" maxLength={3000} className="min-h-20 rounded-md border border-input bg-background p-3" /></label></FormAccion>}
      </div>
    </section>
    <section className="min-w-0 space-y-5">
      <div className="rounded-lg border border-borde-sutil bg-superficie-elevada p-4">
        <h2 className="inline-flex items-center gap-2 text-lg font-semibold"><MessageCircleWarning className="size-5" aria-hidden />Observaciones</h2>
        {observaciones.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No hay observaciones.</p> : <ul className="mt-3 space-y-3">{observaciones.map(o => <li key={o.id} className="rounded-md border border-borde-sutil p-3"><p className="text-sm font-medium">{o.estado === "abierta" ? "Abierta" : "Resuelta"}{o.temaClave ? " · " + o.temaClave : ""}</p><p className="mt-1 text-xs text-muted-foreground">{o.autor.user.nombres} {o.autor.user.apellidos} · {fecha(o.createdAt)}</p><p className="mt-1">{o.contenido}</p>{o.resolucion && <p className="mt-2 text-sm text-muted-foreground">Resolución: {o.resolucion}</p>}{coordinador && o.estado === "abierta" && <FormAccion accion={accionPlan.bind(null, slug, planId, "resolver")} etiqueta="Resolver" className="mt-3 grid gap-2"><input type="hidden" name="comentarioId" value={o.id} /><label className="grid gap-1 text-sm">Cómo se resolvió<input name="resolucion" required minLength={5} maxLength={1000} className="h-11 rounded-md border border-input bg-background px-3" /></label></FormAccion>}</li>)}</ul>}
        {ctx.rol === "profesor" && (plan.estado === "en_revision" || plan.estado === "con_observaciones") && <FormAccion accion={accionPlan.bind(null, slug, planId, "comentar")} etiqueta="Agregar observación" className="mt-4 grid gap-2"><input type="hidden" name="esObservacion" value="true" /><label className="grid gap-1 text-sm">Observación<textarea name="contenido" required maxLength={3000} className="min-h-24 rounded-md border border-input bg-background p-3" /></label></FormAccion>}
      </div>
      {direccion && plan.estado !== "archivado" && <div className="rounded-lg border border-borde-sutil bg-superficie-elevada p-4">
        <h2 className="text-lg font-semibold">Gestión de dirección</h2>
        <FormAccion accion={accionPlan.bind(null, slug, planId, "designar")} etiqueta="Designar coordinador" className="mt-4 grid gap-2"><label className="grid gap-1 text-sm">Docente participante<select name="membershipId" required className="h-11 min-w-0 rounded-md border border-input bg-background px-3">{activos.map(p => <option key={p.id} value={p.membershipId}>{nombre(p)}</option>)}</select></label><label className="grid gap-1 text-sm">Motivo<input name="motivo" required minLength={5} maxLength={1000} className="h-11 rounded-md border border-input bg-background px-3" /></label></FormAccion>
        <FormAccion accion={accionPlan.bind(null, slug, planId, "agregar_participante")} etiqueta="Agregar participante" className="mt-5 grid gap-2"><label className="grid gap-1 text-sm">Docente<select name="membershipId" required className="h-11 min-w-0 rounded-md border border-input bg-background px-3">{docentes.map(d => <option key={d.id} value={d.id}>{d.user.nombres} {d.user.apellidos}</option>)}</select></label><label className="grid gap-1 text-sm">Motivo<input name="motivo" required minLength={5} maxLength={1000} className="h-11 rounded-md border border-input bg-background px-3" /></label></FormAccion>
        {activos.filter(p => p.membershipId !== plan.coordinadorId).map(p => <FormAccion key={p.id} accion={accionPlan.bind(null, slug, planId, "retirar_participante")} etiqueta={"Retirar a " + nombre(p)} variante="peligro" className="mt-4 grid gap-2"><input type="hidden" name="membershipId" value={p.membershipId} /><label className="grid gap-1 text-sm">Motivo<input name="motivo" required minLength={5} maxLength={1000} className="h-11 rounded-md border border-input bg-background px-3" /></label></FormAccion>)}
        <FormAccion accion={accionPlan.bind(null, slug, planId, "archivar")} etiqueta="Archivar plan" variante="peligro" className="mt-6 grid gap-2"><label className="grid gap-1 text-sm">Motivo<input name="motivo" required minLength={5} maxLength={1000} className="h-11 rounded-md border border-input bg-background px-3" /></label></FormAccion>
      </div>}
    </section>
  </div>;
}
