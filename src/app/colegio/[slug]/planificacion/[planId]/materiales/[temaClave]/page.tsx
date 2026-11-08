import { notFound } from "next/navigation";
import { CircleCheck, CircleDashed, CircleX, Clock3 } from "lucide-react";
import { FormAccion } from "@/components/FormAccion";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { esquemaLeccion } from "@/lib/nudito/leccion";
import { temaPorClave } from "@/lib/nudito/catalogo";
import { requireTenantContext } from "@/lib/server/tenant";
import { listarLeccionesDelPlan } from "@/lib/server/nudito/lecciones";
import { editarAction, revisarAction } from "../actions";

export default async function LeccionPage({ params }: PageProps<"/colegio/[slug]/planificacion/[planId]/materiales/[temaClave]">) {
  const { slug, planId, temaClave } = await params;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion"]);
  const fila = (await listarLeccionesDelPlan(ctx, planId)).find(f => f.temaClave === temaClave);
  if (!fila?.leccion) notFound();
  const l = fila.leccion;
  const contenido = esquemaLeccion.parse(l.contenido);
  const revisiones = await ctx.db.nuditoLeccionRevision.findMany({ where: { leccionId: l.id }, orderBy: { createdAt: "desc" }, take: 20 });
  const tema = temaPorClave(temaClave);
  const botones = [
    ["enviar", "Enviar a revisión"], ["cambios", "Solicitar cambios"], ["aprobar", "Aprobar"], ["publicar", "Publicar"], ["retirar", "Retirar"],
  ] as const;
  const acciones = l.estado === "borrador" || l.estado === "cambios_solicitados" ? ["enviar", "retirar"] : l.estado === "en_revision" ? ["cambios", "aprobar", "retirar"] : l.estado === "aprobada" ? ["publicar", "retirar"] : l.estado === "publicada" ? ["retirar"] : [];
  const Icono = l.estado === "publicada" || l.estado === "aprobada" ? CircleCheck : l.estado === "en_revision" ? Clock3 : l.estado === "retirada" || l.estado === "cambios_solicitados" ? CircleX : CircleDashed;
  return <main className="min-w-0 space-y-5">
    <EncabezadoPagina titulo={contenido.titulo} seccion="academico" descripcion={"Origen: " + l.origen} />
    <p className="inline-flex items-center gap-2 text-cuerpo-sm font-semibold"><Icono className="size-4" strokeWidth={2} aria-hidden />{l.estado.replaceAll("_"," ")}</p>
    <section className="rounded-lg border border-borde-sutil bg-superficie p-4">
      <h2 className="text-lg font-semibold">Repaso</h2>
      {tema && <p className="text-cuerpo-sm text-muted-foreground">Dificultad: {tema.dificultad.min} a {tema.dificultad.max} de 5 · {tema.grado}.° grado</p>}
      <p className="mt-2 font-semibold">{contenido.idea}</p><p className="mt-2 whitespace-pre-line">{contenido.explicacion}</p>
      <h3 className="mt-4 font-semibold">Ejemplos</h3><ol className="list-inside list-decimal space-y-2">{contenido.ejemplos.map((e,i) => <li key={i}>{e.enunciado} — {e.desarrollo}</li>)}</ol>
      {contenido.errorFrecuente && <p className="mt-3">Error frecuente: {contenido.errorFrecuente}</p>}
    </section>
    <section className="rounded-lg border border-borde-sutil bg-superficie p-4"><h2 className="text-lg font-semibold">Ejercicios de muestra</h2>
      <ol className="mt-2 space-y-4">{contenido.ejerciciosMuestra.map((e,i) => <li key={i} className="rounded-lg bg-superficie-2 p-3">
        <p>{e.enunciado}</p><p className="mt-1 text-cuerpo-sm">Respuesta verificada: <code className="break-all">{e.respuesta}</code></p>
        <ol className="mt-1 list-inside list-decimal text-cuerpo-sm">{e.pistas.map((p,j) => <li key={j}>{p}</li>)}</ol>
      </li>)}</ol>
    </section>
    {contenido.recursos.length > 0 && <section className="rounded-lg border border-borde-sutil bg-superficie p-4"><h2 className="font-semibold">Recursos</h2><ul>{contenido.recursos.map((r,i) => <li key={i}>{r.titulo} ({r.tipo}): <code className="break-all">{r.valor}</code></li>)}</ul></section>}
    {["borrador","cambios_solicitados"].includes(l.estado) && <section className="min-w-0 rounded-lg border border-borde-sutil bg-superficie p-4">
      <h2 className="text-lg font-semibold">Editar lección</h2>
      <p className="mt-1 text-sm text-muted-foreground">Revisa el repaso y las respuestas antes de enviarlo a aprobación.</p>
      <FormAccion accion={editarAction.bind(null, planId, l.id)} etiqueta="Guardar edición docente" className="mt-4 grid min-w-0 gap-4">
        <label className="grid gap-1 text-sm font-medium">Título<input name="titulo" required maxLength={200} defaultValue={contenido.titulo} className="h-11 min-w-0 rounded-md border border-input bg-background px-3" /></label>
        <label className="grid gap-1 text-sm font-medium">Idea principal<textarea name="idea" required maxLength={400} defaultValue={contenido.idea} className="min-h-20 min-w-0 rounded-md border border-input bg-background p-3" /></label>
        <label className="grid gap-1 text-sm font-medium">Explicación<textarea name="explicacion" required maxLength={1500} defaultValue={contenido.explicacion} className="min-h-32 min-w-0 rounded-md border border-input bg-background p-3" /></label>
        <fieldset className="grid min-w-0 gap-3"><legend className="font-semibold">Ejemplos (1 a 3)</legend>
          {Array.from({ length: 3 }, (_, i) => <div key={i} className="grid min-w-0 gap-2 rounded-md border border-borde-sutil p-3"><p className="text-sm font-medium">Ejemplo {i + 1}</p>
            <label className="grid gap-1 text-sm">Enunciado<input name={"ejemploEnunciado" + i} defaultValue={contenido.ejemplos[i]?.enunciado ?? ""} maxLength={1000} className="h-11 min-w-0 rounded-md border border-input bg-background px-3" /></label>
            <label className="grid gap-1 text-sm">Desarrollo<textarea name={"ejemploDesarrollo" + i} defaultValue={contenido.ejemplos[i]?.desarrollo ?? ""} maxLength={1500} className="min-h-20 min-w-0 rounded-md border border-input bg-background p-3" /></label>
          </div>)}</fieldset>
        <label className="grid gap-1 text-sm font-medium">Error frecuente (opcional)<textarea name="errorFrecuente" maxLength={500} defaultValue={contenido.errorFrecuente ?? ""} className="min-h-20 min-w-0 rounded-md border border-input bg-background p-3" /></label>
        <fieldset className="grid min-w-0 gap-3"><legend className="font-semibold">Ejercicios de muestra (1 a 5)</legend>
          {Array.from({ length: 5 }, (_, i) => <div key={i} className="grid min-w-0 gap-2 rounded-md border border-borde-sutil p-3"><p className="text-sm font-medium">Muestra {i + 1}</p>
            <label className="grid gap-1 text-sm">Enunciado<input name={"muestraEnunciado" + i} defaultValue={contenido.ejerciciosMuestra[i]?.enunciado ?? ""} maxLength={1000} className="h-11 min-w-0 rounded-md border border-input bg-background px-3" /></label>
            <label className="grid gap-1 text-sm">Respuesta<input name={"muestraRespuesta" + i} defaultValue={contenido.ejerciciosMuestra[i]?.respuesta ?? ""} maxLength={1000} className="h-11 min-w-0 rounded-md border border-input bg-background px-3" /></label>
            <label className="grid gap-1 text-sm">Pistas (una por línea)<textarea name={"muestraPistas" + i} defaultValue={contenido.ejerciciosMuestra[i]?.pistas.join("\n") ?? ""} className="min-h-20 min-w-0 rounded-md border border-input bg-background p-3" /></label>
          </div>)}</fieldset>
      </FormAccion>
    </section>}
    <div className="flex flex-wrap gap-2">{botones.filter(([accion]) => acciones.includes(accion)).map(([accion,texto]) => <form key={accion} action={revisarAction.bind(null, planId, l.id, accion)} className="flex flex-wrap gap-2">
      {(accion === "cambios" || accion === "retirar") && <input name="comentario" aria-label={"Motivo para " + texto.toLowerCase()} placeholder="Motivo" className="min-h-11 rounded-lg border border-input bg-background px-3" />}
      <button className="min-h-11 rounded-lg border border-input px-4 font-semibold">{texto}</button>
    </form>)}</div>
    <section className="rounded-lg border border-borde-sutil bg-superficie p-4"><h2 className="font-semibold">Historial de revisión</h2><ol className="mt-2 space-y-2 text-cuerpo-sm">{revisiones.map(r => <li key={r.id}>{r.accion.replaceAll("_"," ")} · {r.createdAt.toLocaleDateString("es-PE")}{r.comentario ? " · " + r.comentario : ""}</li>)}</ol></section>
  </main>;
}
