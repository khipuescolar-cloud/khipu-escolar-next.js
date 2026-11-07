"use client";

import { useState, useTransition } from "react";
import { BookOpen, FileText, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ArbolMateriales, SeccionMaterial } from "@/lib/server/materiales";
import { crearMaterialAction, moverMaterialAPapeleraAction, restaurarMaterialAction } from "./actions";

export function PanelMateriales({ slug, arbol, opciones }: { slug: string; arbol: ArbolMateriales; opciones: SeccionMaterial[] }) {
  const [mostrar, setMostrar] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const router = useRouter();
  const crear = (f: FormData) => iniciar(async () => {
    const r = await crearMaterialAction(slug, f);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Material creado."); setMostrar(false); router.refresh();
  });
  const cambiarPapelera = (id: string, restaurar: boolean) => iniciar(async () => {
    const r = restaurar ? await restaurarMaterialAction(slug, id) : await moverMaterialAPapeleraAction(slug, id);
    if (!r.ok) toast.error(r.error); else { toast.success(restaurar ? "Material restaurado." : "Material movido a la papelera."); router.refresh(); }
  });
  return <div className="space-y-5">
    {opciones.length > 0 && <div><Button onClick={() => setMostrar((v) => !v)}><Plus aria-hidden /> Nuevo material</Button></div>}
    {mostrar && <form action={crear} className="space-y-4 rounded-xl border border-borde-sutil bg-card p-5">
      <h2 className="text-lg font-semibold">Publicar material de clase</h2>
      <label className="block space-y-1.5 text-sm font-medium">Título<Input name="titulo" required maxLength={150} /></label>
      <label className="block space-y-1.5 text-sm font-medium">Descripción<Input name="descripcion" maxLength={600} /></label>
      <label className="block space-y-1.5 text-sm font-medium">Unidad o tema<Input name="unidadTema" maxLength={120} /></label>
      <fieldset><legend className="mb-2 text-sm font-medium">Secciones</legend><div className="grid gap-2 sm:grid-cols-2">{opciones.map((o) => <label key={o.cursoId} className="flex min-h-11 items-center gap-2 rounded-md border border-borde-sutil px-3 text-sm"><input type="checkbox" name="cursoIds" value={o.cursoId} className="size-5 accent-primary" />{o.curso} · {o.salon} ({o.anio})</label>)}</div></fieldset>
      <label className="block space-y-1.5 text-sm font-medium">Archivos<input type="file" name="archivos" multiple className="block min-h-11 w-full text-sm" /></label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="publicar" className="size-5 accent-primary" defaultChecked />Publicar ahora</label>
      <Button type="submit" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar material"}</Button>
    </form>}
    {!arbol.anios.length ? <EstadoVacio icono={BookOpen} titulo="Todavía no hay materiales de clase" descripcion="Los materiales publicados para tus cursos aparecerán aquí." /> : arbol.anios.map((anio) => <section key={anio.anio} className="space-y-4"><h2 className="text-lg font-semibold">{anio.anio}{anio.archivado ? " · Año anterior" : ""}</h2>{anio.cursos.map((curso) => <section key={curso.nombre} className="space-y-3"><h3 className="font-semibold">{curso.nombre}</h3>{curso.secciones.map((seccion) => <div key={`${seccion.cursoId}-${seccion.salonId}`} className="rounded-xl border border-borde-sutil p-4"><h4 className="mb-3 text-sm font-medium text-muted-foreground">{seccion.salon}</h4><ul className="space-y-2">{seccion.materiales.map((m) => <li key={m.id} className="flex min-h-11 flex-wrap items-center gap-3"><FileText className="size-5 text-sec-trazo" aria-hidden /><span className="min-w-0 flex-1 font-medium">{m.titulo}<span className="ml-2 text-sm font-normal text-muted-foreground">{m.estado} · v{m.versionActual}</span></span>{m.gestionable && <Button type="button" variant="ghost" size="sm" disabled={pendiente} onClick={() => cambiarPapelera(m.id, m.enPapelera)}>{m.enPapelera ? <RotateCcw aria-hidden /> : <Trash2 aria-hidden />}{m.enPapelera ? "Restaurar" : "Papelera"}</Button>}</li>)}</ul></div>)}</section>)}</section>)}
  </div>;
}
