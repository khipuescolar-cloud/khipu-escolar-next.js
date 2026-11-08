import { CheckCircle2, Filter, ListTodo, Plus } from "lucide-react";
import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { CamposAdjuntos } from "@/components/adjuntos/CamposAdjuntos";
import { DialogoAccion } from "@/components/academico/DialogoAccion";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { Textarea } from "@/components/ui/textarea";
import { esVistaFamilia } from "@/lib/roles";
import { MAX_INSTRUCCIONES } from "@/lib/tareas";
import { requireFeature } from "@/lib/server/plan";
import { listarMateriales } from "@/lib/server/materiales";
import { alumnosParaDestinatarios, cursosParaTareas, limitesTarea, tareasDeFamilia, tareasDelDocente } from "@/lib/server/tareas";
import { requireTenantContext } from "@/lib/server/tenant";
import { momentoEnZona } from "@/lib/fechas";
import { crearTareaAction } from "./actions";
import { CamposNuevaTarea, CamposPublicacion } from "./CamposNuevaTarea";
import { SeccionFormulario } from "./SeccionFormulario";
import { AgendaRevision, TareasPorSalon } from "./ListaDocente";
import { VistaFamilia } from "./VistaFamilia";

export const metadata: Metadata = { title: "Tareas" };

export default async function TareasPage({ params, searchParams }: PageProps<"/colegio/[slug]/tareas">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "tareas");

  if (esVistaFamilia(ctx.rol)) {
    const hijos = await tareasDeFamilia(ctx);
    return <VistaFamilia hijos={hijos} esAlumno={ctx.rol === "alumno"} alumnoElegido={typeof sp.alumno === "string" ? sp.alumno : undefined} pestana={typeof sp.ver === "string" ? sp.ver : undefined} />;
  }

  if (ctx.rol !== "profesor" && ctx.rol !== "direccion") forbidden();
  const filtros = { cursoId: typeof sp.curso === "string" ? sp.curso : undefined, estado: typeof sp.estado === "string" ? sp.estado : undefined };
  const [cursos, tareas] = await Promise.all([cursosParaTareas(ctx), tareasDelDocente(ctx, filtros)]);
  const competenciasTarea = ctx.rol === "profesor" ? await ctx.db.competencia.findMany({ where: { cursoId: { in: cursos.map((c) => c.id) }, desactivadaAt: null }, select: { id: true, cursoId: true, nombre: true }, orderBy: { orden: "asc" } }) : [];
  const alumnos = ctx.rol === "profesor" && cursos.length > 0 ? await alumnosParaDestinatarios(ctx, cursos.map((c) => c.id)) : [];
  const arbolMateriales = ctx.rol === "profesor" && ctx.modulos.has("documentos") ? await listarMateriales(ctx, { incluirArchivados: true }) : { anios: [] };
  const carpetasMaterial = ctx.rol === "profesor" && ctx.modulos.has("documentos") ? await ctx.db.carpetaMaterial.findMany({ where: { creadoPorId: ctx.membership.id } }) : [];
  const mapaCarpetas = new Map(carpetasMaterial.map(c => [c.id, c]));
  const rutaCarpeta = (id: string | null) => { const partes: string[] = []; const vistos = new Set<string>(); for (let c = id ? mapaCarpetas.get(id) : undefined; c && !vistos.has(c.id); c = c.parentId ? mapaCarpetas.get(c.parentId) : undefined) { partes.unshift(c.nombre); vistos.add(c.id); } return partes.join(" › "); };
  const materiales = arbolMateriales.anios.flatMap((a) => a.cursos.flatMap((c) => c.secciones.flatMap((s) => s.materiales.map((m) => ({ id: m.id, titulo: m.titulo, curso: c.nombre, salon: s.salon, carpeta: rutaCarpeta(m.carpetaId) }))))).filter((m, i, a) => a.findIndex((x) => x.id === m.id) === i);
  const referencias = ctx.rol === "profesor" ? await ctx.db.tareaMaterial.findMany({ where: { tareaId: { in: tareas.map((t) => t.id) } }, select: { tareaId: true, materialId: true } }) : [];
  const limites = limitesTarea(ctx);
  // «Para revisar» mira siempre las tareas activas, aunque el filtro de estado muestre borradores o archivadas.
  const agenda = ctx.rol === "profesor" && filtros.estado ? await tareasDelDocente(ctx, { cursoId: filtros.cursoId }) : tareas;
  const hoy = momentoEnZona(new Date(), ctx.tenant.zonaHoraria).isoFecha;

  return (
    <div>
      <EncabezadoPagina
        seccion="academico"
        titulo="Tareas"
        descripcion={ctx.rol === "profesor" ? "Tus tareas por salón y curso, y lo que tienes por revisar." : "Tareas del colegio por salón y curso."}
        acciones={
          ctx.rol === "profesor" && cursos.length > 0 ? (
            <DialogoAccion
              disparador={<><Plus strokeWidth={2} aria-hidden />Nueva tarea</>}
              titulo="Nueva tarea"
              descripcion="Los estudiantes y sus familias la verán en su lista y podrán entregarla en Khipu."
              etiqueta="Crear tarea"
              accion={crearTareaAction.bind(null, slug)}
            >
              <SeccionFormulario titulo="Para quién">
                <CamposNuevaTarea
                  cursos={cursos.map((c) => ({ id: c.id, nombre: c.nombre, salon: c.salon.nombre }))}
                  alumnos={Object.fromEntries(alumnos.map((a) => [a.cursoId, a.alumnos]))}
                  materiales={materiales}
                  competencias={competenciasTarea}
                />
              </SeccionFormulario>
              <SeccionFormulario titulo="La tarea">
                <div className="sm:col-span-2"><Campo etiqueta="Título" name="titulo" required maxLength={150} placeholder="Fichas de fracciones (pág. 42)" /></div>
                <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                  <span className="font-medium">Instrucciones (opcional)</span>
                  <Textarea name="descripcion" rows={4} maxLength={MAX_INSTRUCCIONES} />
                </label>
                <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                  <span className="font-medium">Enlaces (uno por línea, opcional)</span>
                  <Textarea name="enlacesTexto" rows={2} placeholder="https://…" />
                </label>
                <div className="sm:col-span-2"><CamposAdjuntos id="adjuntos-nueva-tarea" maxArchivos={limites.archivos} maxMb={limites.mb} accept={limites.accept} tiposTexto={limites.tiposTexto} etiqueta="Materiales (opcional)" /></div>
              </SeccionFormulario>
              <SeccionFormulario titulo="Plazo" ayuda="Sin fecha, la tarea no vence. Sin hora, vence al final del día.">
                <Campo etiqueta="Fecha de entrega" name="fechaEntrega" type="date" min={hoy} />
                <Campo etiqueta="Hora límite (opcional)" name="horaEntrega" type="time" />
              </SeccionFormulario>
              <SeccionFormulario titulo="Publicación">
                <CamposPublicacion />
              </SeccionFormulario>
              <SeccionFormulario titulo="Opciones">
                <div className="flex flex-col divide-y divide-borde-sutil rounded-lg border border-borde-sutil sm:col-span-2">
                  {[
                    ["permiteTardias", "Permitir entregas tardías", "Después del plazo se aceptan, marcadas «Con retraso». Desmárcala para que la tarea se cierre sola al vencer.", true],
                    ["comentariosGenerales", "Comentarios generales", "Todos los asignados ven las preguntas y respuestas.", false],
                    ["avisarFamilias", "Avisar a las familias", "Las familias y los estudiantes la ven en sus notificaciones de Khipu y en el celular (sin correo).", true],
                  ].map(([nombre, titulo, ayuda, defecto]) => (
                    <label key={String(nombre)} className="flex min-h-11 items-start gap-3 px-3 py-2.5 text-sm">
                      <input type="checkbox" name={String(nombre)} defaultChecked={Boolean(defecto)} className="mt-0.5 size-5 accent-primary" />
                      <span><span className="font-medium">{titulo}</span><span className="block text-muted-foreground">{ayuda}</span></span>
                    </label>
                  ))}
                </div>
              </SeccionFormulario>
            </DialogoAccion>
          ) : undefined
        }
      />

      {ctx.rol === "profesor" && cursos.length === 0 && (
        <div className="mb-4"><EstadoVacio icono={ListTodo} titulo="Todavía no tienes cursos asignados" descripcion="Cuando dirección te asigne un curso, podrás crear tareas." /></div>
      )}

      {ctx.rol === "profesor" && cursos.length > 0 && <AgendaRevision tareas={agenda} zona={ctx.tenant.zonaHoraria} />}

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-borde-sutil bg-superficie px-4 py-3" aria-label="Filtrar tareas">
        <Selector etiqueta="Curso" name="curso" defaultValue={filtros.cursoId ?? ""}>
          <option value="">Todos</option>
          {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.salon.nombre}</option>)}
        </Selector>
        <Selector etiqueta="Estado" name="estado" defaultValue={filtros.estado ?? ""}>
          <option value="">Activas</option>
          <option value="borrador">Borradores</option>
          <option value="programada">Programadas</option>
          <option value="publicada">Publicadas</option>
          <option value="cerrada">Cerradas</option>
        </Selector>
        <button type="submit" className={buttonVariants({ variant: "outline" })}><Filter strokeWidth={2} aria-hidden />Filtrar</button>
        <p className="ml-auto self-center text-cuerpo-sm tabular-nums text-muted-foreground" aria-live="polite">{tareas.length} {tareas.length === 1 ? "tarea" : "tareas"}</p>
      </form>

      {tareas.length === 0 ? (
        <EstadoVacio icono={CheckCircle2} titulo="No hay tareas" descripcion={ctx.rol === "profesor" ? "Crea una con «Nueva tarea»." : undefined} />
      ) : (
        <TareasPorSalon tareas={tareas} comun={{ slug, zona: ctx.tenant.zonaHoraria, limites, materiales, referencias, esDireccion: ctx.rol === "direccion" }} />
      )}
    </div>
  );
}
