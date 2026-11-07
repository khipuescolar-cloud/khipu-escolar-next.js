import { BookOpen, FileText } from "lucide-react";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import type { ArbolMateriales } from "@/lib/server/materiales";

export function PanelMateriales({ arbol }: { arbol: ArbolMateriales }) {
  if (!arbol.anios.length) return <EstadoVacio icono={BookOpen} titulo="Todavía no hay materiales de clase" descripcion="Los materiales publicados para tus cursos aparecerán aquí." />;
  return <div className="space-y-8">{arbol.anios.map((anio) => <section key={anio.anio}>
    <h2 className="mb-4 text-lg font-semibold">{anio.anio}{anio.archivado ? " · Año anterior" : ""}</h2>
    <div className="space-y-5">{anio.cursos.map((curso) => <div key={curso.nombre}><h3 className="mb-2 font-medium">{curso.nombre}</h3><div className="space-y-3">{curso.secciones.map((seccion) => <div key={`${seccion.cursoId}-${seccion.salonId}`} className="rounded-xl border border-borde-sutil p-4"><h4 className="mb-3 text-sm font-medium text-muted-foreground">{seccion.salon}</h4><ul className="space-y-2">{seccion.materiales.map((m) => <li key={m.id} className="flex min-h-11 items-center gap-3"><FileText className="size-5 text-sec-trazo" aria-hidden /><span className="flex-1 font-medium">{m.titulo}</span><span className="text-sm text-muted-foreground">{m.estado} · v{m.versionActual}</span></li>)}</ul></div>)}</div></div>)}</div>
  </section>)}</div>;
}
