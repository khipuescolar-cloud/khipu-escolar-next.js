"use client";

import { BookOpen, FileText } from "lucide-react";
import { useState, useTransition } from "react";
import { ListaAdjuntos } from "@/components/adjuntos/ListaAdjuntos";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import type { ArbolMateriales, SeccionMaterial } from "@/lib/server/materiales";
import { crearMaterialAction } from "./actions";

export function PanelMateriales({ arbol, slug, opciones }: { arbol: ArbolMateriales; slug: string; opciones: SeccionMaterial[] }) {
  const [pendiente, iniciar] = useTransition();
  const [mensaje, setMensaje] = useState("");
  const [origen, setOrigen] = useState(opciones[0]?.cursoId ?? "");
  const nombreOrigen = opciones.find((o) => o.cursoId === origen)?.curso;
  const gemelos = opciones.filter((o) => o.curso === nombreOrigen);
  return <div className="space-y-6">
    {opciones.length > 0 && <form className="space-y-3 rounded-xl border border-borde-sutil bg-superficie p-4" onSubmit={(evento) => {
      evento.preventDefault();
      const form = evento.currentTarget;
      iniciar(async () => { const r = await crearMaterialAction(slug, new FormData(form)); setMensaje(r.ok ? "Material publicado." : r.error); if (r.ok) form.reset(); });
    }}>
      <h3 className="font-semibold">Publicar material de clase</h3>
      <label className="block text-sm">Título<input name="titulo" required minLength={3} maxLength={150} className="mt-1 h-11 w-full rounded-lg border px-3" /></label>
      <label className="block text-sm">Descripción<input name="descripcion" className="mt-1 h-11 w-full rounded-lg border px-3" /></label>
      <label className="block text-sm">Unidad o tema<input name="unidadTema" className="mt-1 h-11 w-full rounded-lg border px-3" /></label>
      <label className="block text-sm">Curso<select value={origen} onChange={(e) => setOrigen(e.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3">{opciones.map((o) => <option key={o.cursoId} value={o.cursoId}>{o.curso} · {o.salon}</option>)}</select></label>
      <fieldset><legend className="text-sm font-medium">Compartir con secciones</legend>{gemelos.map((o) => <label key={o.cursoId} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="cursoIds" value={o.cursoId} defaultChecked={o.cursoId === origen} className="size-5" />{o.salon}</label>)}</fieldset>
      <label className="block text-sm">Archivo PDF<input name="archivos" type="file" accept=".pdf" required className="mt-1 block w-full text-sm" /></label>
      <input type="hidden" name="publicar" value="on" />
      <button type="submit" disabled={pendiente} className="min-h-11 rounded-lg bg-primary px-4 text-primary-foreground">{pendiente ? "Publicando…" : "Publicar material"}</button>
      {mensaje && <p role="status" className="text-sm">{mensaje}</p>}
    </form>}
    {!arbol.anios.length ? <EstadoVacio icono={BookOpen} titulo="Todavía no hay materiales de clase" descripcion="Los materiales publicados para tus cursos aparecerán aquí." /> : arbol.anios.map((anio) => <section key={anio.anio}>
      <h2 className="mb-4 text-lg font-semibold">{anio.anio}{anio.archivado ? " · Año anterior" : ""}</h2>
      <div className="space-y-5">{anio.cursos.map((curso) => <div key={curso.nombre}><h3 className="mb-2 font-medium">{curso.nombre}</h3><div className="space-y-3">{curso.secciones.map((seccion) => <div key={`${seccion.cursoId}-${seccion.salonId}`} className="rounded-xl border border-borde-sutil p-4"><h4 className="mb-3 text-sm font-medium text-muted-foreground">{seccion.salon}</h4><ul className="space-y-3">{seccion.materiales.map((m) => <li key={m.id} className="space-y-2"><div className="flex min-h-11 items-center gap-3"><FileText className="size-5 text-sec-trazo" aria-hidden /><span className="flex-1 font-medium">{m.titulo}</span><span className="text-sm text-muted-foreground">{m.estado} · v{m.versionActual}</span></div><ListaAdjuntos adjuntos={m.archivos} etiqueta={`Archivos de ${m.titulo}`} /></li>)}</ul></div>)}</div></div>)}</div>
    </section>)}
  </div>;
}
