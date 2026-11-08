import Link from "next/link";
import { ArrowDown, ArrowUp, CircleCheck, MessageSquare, Search } from "lucide-react";
import { FUENTES_CONOCIDAS } from "@/lib/nudito/catalogo";
import { TIPOS_EJERCICIO } from "@/lib/nudito/contratos";
import { FormAccion } from "@/components/FormAccion";
import { temaPorClave } from "@/lib/nudito/catalogo";
import { buscarCatalogo, obtenerPlan } from "@/lib/server/plan-anual";
import { requireTenantContext } from "@/lib/server/tenant";
import { accionPlan } from "../../actions";

export default async function TemasPage({ params, searchParams }: { params: Promise<{ slug: string; planId: string }>; searchParams: Promise<{ q?: string; competencia?: string; pagina?: string }> }) {
  const { slug, planId } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion"]);
  const [plan, catalogo] = await Promise.all([obtenerPlan(ctx, planId), buscarCatalogo(ctx, planId, { texto: sp.q, competencia: Number(sp.competencia) || undefined, pagina: Number(sp.pagina) || 1 })]);
  const editando = plan.estado === "borrador" || plan.estado === "con_observaciones";
  const propios = await ctx.db.nuditoTemaColegio.findMany({ where: { id: { in: plan.temas.filter(t => t.temaClave.startsWith("col:")).map(t => t.temaClave.slice(4)) } }, select: { id: true, nombre: true } });
  const tipoFuente = plan.area === "matematica" ? "generador" : plan.area === "comunicacion" ? "lecturas" : "banco";
  const fuentes = plan.area === "matematica" || plan.area === "comunicacion" || plan.area === "ciencia-tecnologia" ? FUENTES_CONOCIDAS[tipoFuente] : [];
  const fecha = (valor: Date) => new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: ctx.tenant.zonaHoraria }).format(valor);
  const nombreTema = (clave: string) => temaPorClave(clave)?.nombre ?? propios.find(t => "col:" + t.id === clave)?.nombre ?? clave;
  const consulta = (pagina: number) => "?q=" + encodeURIComponent(sp.q ?? "") + "&competencia=" + encodeURIComponent(sp.competencia ?? "") + "&pagina=" + pagina;
  return <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
    <section className="min-w-0 rounded-lg border border-borde-sutil bg-superficie-elevada p-4">
      <h2 className="text-lg font-semibold">Catálogo del grado</h2>
      <p className="mt-1 text-sm text-muted-foreground">Busca y agrega temas del catálogo global o del colegio.</p>
      <form method="get" className="mt-4 flex flex-wrap items-end gap-2">
        <label className="grid min-w-0 flex-1 gap-1 text-sm font-medium">Buscar tema<input name="q" defaultValue={sp.q} placeholder="Nombre o palabra clave" className="h-11 min-w-0 rounded-md border border-input bg-background px-3" /></label>
        <label className="grid gap-1 text-sm font-medium">Competencia<input name="competencia" type="number" min="1" max="31" defaultValue={sp.competencia} className="h-11 w-24 rounded-md border border-input bg-background px-3" /></label>
        <button className="inline-flex h-11 items-center gap-2 rounded-md border border-input px-4"><Search className="size-4" aria-hidden />Buscar</button>
      </form>
      <p className="my-4 text-sm text-muted-foreground">{catalogo.total} temas · Página {catalogo.pagina} de {catalogo.paginas}</p>
      <ul className="divide-y divide-borde-sutil">{catalogo.temas.map(t => <li key={t.clave} className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-3">
        <div className="min-w-0 flex-1"><p className="font-medium">{t.nombre}</p><p className="text-sm text-muted-foreground">Competencia {t.competenciaCneb} · {t.clave.startsWith("col:") ? "Colegio" : "Global"}</p></div>
        {t.seleccionado ? <span className="inline-flex items-center gap-1 text-sm text-sec-tinta"><CircleCheck className="size-4" aria-hidden />En el plan</span> : editando && <FormAccion accion={accionPlan.bind(null, slug, planId, "agregar_tema")} etiqueta="Agregar" className="shrink-0"><input type="hidden" name="temaClave" value={t.clave} /></FormAccion>}
      </li>)}</ul>
      {editando && fuentes.length > 0 && <details className="mt-5 border-t border-borde-sutil pt-4"><summary className="cursor-pointer font-semibold">Proponer tema del colegio</summary><FormAccion accion={accionPlan.bind(null, slug, planId, "proponer_tema")} etiqueta="Proponer tema" className="mt-4 grid gap-3">
        <input type="hidden" name="tipoFuente" value={tipoFuente} />
        <label className="grid gap-1 text-sm">Nombre<input name="nombre" required maxLength={80} className="h-11 rounded-md border border-input bg-background px-3" /></label>
        <label className="grid gap-1 text-sm">Descripción<textarea name="descripcion" required maxLength={600} className="min-h-20 rounded-md border border-input bg-background p-3" /></label>
        <label className="grid gap-1 text-sm">Competencia CNEB<input name="competencia" required type="number" min="1" max="31" className="h-11 w-24 rounded-md border border-input bg-background px-3" /></label>
        <label className="grid gap-1 text-sm">Palabras clave separadas por coma<input name="palabrasClave" required className="h-11 rounded-md border border-input bg-background px-3" /></label>
        <label className="grid gap-1 text-sm">Fuente de ejercicios<select name="fuenteId" className="h-11 rounded-md border border-input bg-background px-3">{fuentes.map(f => <option key={f} value={f}>{f}</option>)}</select></label>
        <label className="grid gap-1 text-sm">Tipo de ejercicio<select name="tipos" className="h-11 rounded-md border border-input bg-background px-3">{TIPOS_EJERCICIO.map(t => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}</select></label>
      </FormAccion></details>}
      <div className="mt-4 flex gap-4">{catalogo.pagina > 1 && <Link href={consulta(catalogo.pagina - 1)} className="underline">Anterior</Link>}{catalogo.pagina < catalogo.paginas && <Link href={consulta(catalogo.pagina + 1)} className="underline">Siguiente</Link>}</div>
    </section>
    <section className="min-w-0 rounded-lg border border-borde-sutil bg-superficie-elevada p-4">
      <h2 className="text-lg font-semibold">Temas del plan</h2>
      <p className="mt-1 text-sm text-muted-foreground">{plan.temas.length} temas seleccionados. El orden es una referencia para los docentes.</p>
      {editando && <FormAccion accion={accionPlan.bind(null, slug, planId, "crear_unidad")} etiqueta="Crear unidad" className="my-4 flex flex-wrap items-end gap-2"><label className="grid min-w-0 flex-1 gap-1 text-sm">Nueva unidad<input name="titulo" required maxLength={120} className="h-11 rounded-md border border-input bg-background px-3" /></label></FormAccion>}
      {plan.unidades.length > 0 && <div className="my-4 space-y-2">{plan.unidades.map(u => <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-superficie-2 p-2"><span className="font-medium">{u.titulo}</span>{editando && <FormAccion accion={accionPlan.bind(null, slug, planId, "renombrar_unidad")} etiqueta="Renombrar" variante="fantasma" className="flex flex-wrap items-end gap-2"><input type="hidden" name="unidadId" value={u.id} /><label className="grid gap-1 text-sm">Título<input name="titulo" defaultValue={u.titulo} required maxLength={120} className="h-11 rounded-md border border-input bg-background px-3" /></label></FormAccion>}{editando && <FormAccion accion={accionPlan.bind(null, slug, planId, "eliminar_unidad")} etiqueta="Eliminar unidad" variante="fantasma"><input type="hidden" name="unidadId" value={u.id} /></FormAccion>}</div>)}</div>}
      {plan.temas.length === 0 ? <p className="mt-6 text-muted-foreground">Todavía no hay temas en este plan.</p> :
        <ol className="mt-4 space-y-3">{plan.temas.map((t, i) => <li key={t.id} className="min-w-0 rounded-md border border-borde-sutil p-3">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1"><p className="font-medium">{i + 1}. {nombreTema(t.temaClave)}</p>{t.unidadId && <p className="text-sm text-muted-foreground">{plan.unidades.find(u => u.id === t.unidadId)?.titulo}</p>}</div>
            {editando && <div className="flex flex-wrap gap-1">
              {i > 0 && <FormAccion accion={accionPlan.bind(null, slug, planId, "mover_tema")} etiqueta="Subir" variante="fantasma"><input type="hidden" name="temaClave" value={t.temaClave} /><input type="hidden" name="direccion" value="arriba" /><ArrowUp className="sr-only" aria-hidden /></FormAccion>}
              {i < plan.temas.length - 1 && <FormAccion accion={accionPlan.bind(null, slug, planId, "mover_tema")} etiqueta="Bajar" variante="fantasma"><input type="hidden" name="temaClave" value={t.temaClave} /><input type="hidden" name="direccion" value="abajo" /><ArrowDown className="sr-only" aria-hidden /></FormAccion>}
              <FormAccion accion={accionPlan.bind(null, slug, planId, "quitar_tema")} etiqueta="Quitar" variante="peligro"><input type="hidden" name="temaClave" value={t.temaClave} /></FormAccion>
            </div>}
          </div>
          {editando && plan.unidades.length > 0 && <FormAccion accion={accionPlan.bind(null, slug, planId, "asignar_unidad")} etiqueta="Asignar unidad" className="mt-3 flex flex-wrap items-end gap-2"><input type="hidden" name="temaClave" value={t.temaClave} /><label className="grid gap-1 text-sm">Unidad<select name="unidadId" defaultValue={t.unidadId ?? ""} className="h-11 rounded-md border border-input bg-background px-3"><option value="">Sin unidad</option>{plan.unidades.map(u => <option key={u.id} value={u.id}>{u.titulo}</option>)}</select></label></FormAccion>}
          <div className="mt-3 border-t border-borde-sutil pt-3"><p className="mb-2 inline-flex items-center gap-2 text-sm font-medium"><MessageSquare className="size-4" aria-hidden />Comentarios</p>
            {plan.comentarios.filter(c => c.temaClave === t.temaClave).map(c => <div key={c.id} className="mb-2 rounded-md bg-superficie-2 p-2 text-sm"><p className="text-xs text-muted-foreground">{c.autor.user.nombres} {c.autor.user.apellidos} · {fecha(c.createdAt)}</p><p className="mt-1">{c.contenido}</p></div>)}
            {plan.estado !== "archivado" && <FormAccion accion={accionPlan.bind(null, slug, planId, "comentar")} etiqueta="Comentar" className="grid gap-2"><input type="hidden" name="temaClave" value={t.temaClave} /><textarea name="contenido" required maxLength={3000} aria-label={"Comentario sobre " + nombreTema(t.temaClave)} className="min-h-20 w-full rounded-md border border-input bg-background p-3" /></FormAccion>}
          </div>
        </li>)}</ol>}
    </section>
  </div>;
}
