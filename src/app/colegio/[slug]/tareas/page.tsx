import { EtiquetaCurso } from "@/components/academico/EtiquetaCurso";
import { CheckCircle2, ChevronRight, ClipboardCheck, Link2, ListTodo, Pencil, Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { CamposAdjuntos } from "@/components/adjuntos/CamposAdjuntos";
import { ListaAdjuntos } from "@/components/adjuntos/ListaAdjuntos";
import { DialogoAccion } from "@/components/academico/DialogoAccion";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { NOMBRE_GRUPO } from "@/lib/fechas";
import { esVistaFamilia } from "@/lib/roles";
import { MAX_INSTRUCCIONES } from "@/lib/tareas";
import { requireFeature } from "@/lib/server/plan";
import { alumnosParaDestinatarios, cursosParaTareas, limitesTarea, tareasDeFamilia, tareasDelDocente, type ItemTareaFamilia } from "@/lib/server/tareas";
import { requireTenantContext } from "@/lib/server/tenant";
import { momentoEnZona } from "@/lib/fechas";
import { actualizarTareaAction, archivarTareaAction, cerrarTareaAction, crearTareaAction, eliminarTareaAction, publicarTareaAction } from "./actions";
import { CamposNuevaTarea } from "./CamposNuevaTarea";
import { EstadoEntrega, EstadoTarea, FechaEntrega } from "./insignias";

export const metadata: Metadata = { title: "Tareas" };

const GRUPOS = { ...NOMBRE_GRUPO, sinFecha: "Sin fecha límite" } as const;

function FilaFamilia({ t, alumnoId }: { t: ItemTareaFamilia; alumnoId: string }) {
  return (
    <li>
      <Link href={`/tareas/${t.id}?alumno=${alumnoId}`} className="flex min-h-11 items-start gap-3 rounded-lg border bg-background p-3 text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
        <ListTodo className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="font-medium">{t.titulo}</p>
          <p className="flex flex-wrap items-center gap-2 text-muted-foreground"><EtiquetaCurso>{t.curso}</EtiquetaCurso>{t.docente}</p>
          <div className="flex flex-wrap gap-2"><FechaEntrega fecha={t.fechaEntrega} conHora={t.conHora} vencida={t.vencida} /><EstadoEntrega estado={t.estado} tarde={t.tarde} vencida={t.vencida} /></div>
        </div>
        <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
      </Link>
    </li>
  );
}

export default async function TareasPage({ params, searchParams }: PageProps<"/colegio/[slug]/tareas">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "tareas");

  if (esVistaFamilia(ctx.rol)) {
    const hijos = await tareasDeFamilia(ctx);
    return (
      <div>
        <EncabezadoPagina titulo="Tareas" descripcion={ctx.rol === "alumno" ? "Lo que tienes que entregar." : "Lo que tus hijos tienen que entregar."} />
        {hijos.length === 0 ? (
          <EstadoVacio icono={Users} titulo="No encontramos hijos vinculados a tu cuenta" descripcion="Si crees que es un error, avisa al colegio." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {hijos.map(({ alumno, grupos, historial }) => {
              const total = Object.values(grupos).reduce((n, g) => n + g.length, 0);
              return (
                <Card key={alumno.id}>
                  <CardHeader><h2 className="font-titulo text-cuerpo font-semibold">{alumno.nombres} {alumno.apellidos}</h2></CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {total === 0 && (
                      <p className="flex items-center gap-2 text-cuerpo-sm text-muted-foreground">
                        <CheckCircle2 className="size-4 text-llego" strokeWidth={2} aria-hidden />No tiene tareas pendientes.
                      </p>
                    )}
                    {(Object.keys(GRUPOS) as (keyof typeof GRUPOS)[]).map((g) =>
                      grupos[g].length === 0 ? null : (
                        <section key={g}>
                          <h3 className="sobretitulo mb-2">{GRUPOS[g]}</h3>
                          <ul className="flex flex-col gap-2">{grupos[g].map((t) => <FilaFamilia key={t.id} t={t} alumnoId={alumno.id} />)}</ul>
                        </section>
                      ),
                    )}
                    {historial.length > 0 && (
                      <details>
                        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Entregadas y vencidas ({historial.length})</summary>
                        <ul className="mt-2 flex flex-col gap-2">{historial.map((t) => <FilaFamilia key={t.id} t={t} alumnoId={alumno.id} />)}</ul>
                      </details>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (ctx.rol !== "profesor" && ctx.rol !== "direccion") forbidden();
  const filtros = { cursoId: typeof sp.curso === "string" ? sp.curso : undefined, estado: typeof sp.estado === "string" ? sp.estado : undefined };
  const [cursos, tareas] = await Promise.all([cursosParaTareas(ctx), tareasDelDocente(ctx, filtros)]);
  const alumnos = ctx.rol === "profesor" && cursos.length > 0 ? await alumnosParaDestinatarios(ctx, cursos.map((c) => c.id)) : [];
  const limites = limitesTarea(ctx);
  const hoy = momentoEnZona(new Date(), ctx.tenant.zonaHoraria).isoFecha;

  return (
    <div>
      <EncabezadoPagina
        titulo="Tareas"
        descripcion="Publica tareas para uno o varios salones, recibe entregas y revísalas."
        acciones={
          ctx.rol === "profesor" && cursos.length > 0 ? (
            <DialogoAccion
              disparador={<><Plus strokeWidth={2} aria-hidden />Nueva tarea</>}
              titulo="Nueva tarea"
              descripcion="Los estudiantes y sus familias la verán en su lista y podrán entregarla en Khipu."
              etiqueta="Crear tarea"
              accion={crearTareaAction.bind(null, slug)}
            >
              <CamposNuevaTarea
                cursos={cursos.map((c) => ({ id: c.id, nombre: c.nombre, salon: c.salon.nombre }))}
                alumnos={Object.fromEntries(alumnos.map((a) => [a.cursoId, a.alumnos]))}
              />
              <div className="sm:col-span-2"><Campo etiqueta="Título" name="titulo" required maxLength={150} placeholder="Fichas de fracciones (pág. 42)" /></div>
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium">Instrucciones (opcional)</span>
                <Textarea name="descripcion" rows={4} maxLength={MAX_INSTRUCCIONES} />
              </label>
              <Campo etiqueta="Fecha de entrega" name="fechaEntrega" type="date" min={hoy} />
              <Campo etiqueta="Hora límite (opcional)" name="horaEntrega" type="time" />
              <p className="text-cuerpo-sm text-muted-foreground sm:col-span-2">Sin fecha, la tarea no vence. Sin hora, vence al final del día.</p>
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium">Enlaces (uno por línea, opcional)</span>
                <Textarea name="enlacesTexto" rows={2} placeholder="https://…" />
              </label>
              <CamposAdjuntos id="adjuntos-nueva-tarea" maxArchivos={limites.archivos} maxMb={limites.mb} accept={limites.accept} tiposTexto={limites.tiposTexto} etiqueta="Materiales (opcional)" />
              <div className="flex flex-col gap-2 sm:col-span-2">
                {[
                  ["permiteTardias", "Permitir entregas tardías", "Después del plazo se aceptan, marcadas «Con retraso».", true],
                  ["comentariosGenerales", "Comentarios generales", "Todos los asignados ven las preguntas y respuestas.", false],
                  ["calificable", "Calificable", "Crea una columna en el registro de notas de cada sección (sin NSP).", false],
                  ["avisarFamilias", "Avisar a las familias", "Las familias y los estudiantes la ven en sus notificaciones de Khipu y en el celular (sin correo).", true],
                ].map(([nombre, titulo, ayuda, defecto]) => (
                  <label key={String(nombre)} className="flex items-start gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
                    <input type="checkbox" name={String(nombre)} defaultChecked={Boolean(defecto)} className="mt-0.5 size-5 accent-primary" />
                    <span><span className="font-medium">{titulo}</span><span className="block text-muted-foreground">{ayuda}</span></span>
                  </label>
                ))}
              </div>
            </DialogoAccion>
          ) : undefined
        }
      />

      {ctx.rol === "profesor" && cursos.length === 0 && (
        <div className="mb-4"><EstadoVacio icono={ListTodo} titulo="Todavía no tienes cursos asignados" descripcion="Cuando dirección te asigne un curso, podrás crear tareas." /></div>
      )}

      <form className="mb-4 flex flex-wrap items-end gap-3" aria-label="Filtrar tareas">
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
          <option value="archivada">Archivadas</option>
        </Selector>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>Filtrar</button>
      </form>

      {tareas.length === 0 ? (
        <EstadoVacio icono={CheckCircle2} titulo="No hay tareas" descripcion={ctx.rol === "profesor" ? "Crea una con «Nueva tarea»." : undefined} />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {tareas.map((t) => (
            <li key={t.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">{t.titulo}</p>
                  <FechaEntrega fecha={t.fechaEntrega} conHora={t.conHora} vencida={t.vencida} />
                </div>
                <p className="flex flex-wrap items-center gap-2 text-cuerpo-sm text-muted-foreground"><EtiquetaCurso>{t.curso}</EtiquetaCurso>{t.secciones.join(" · ")}</p>
                <div className="flex flex-wrap gap-2"><EstadoTarea estado={t.estado} programada={t.programada} /></div>
                {t.descripcion && <p className="line-clamp-3 whitespace-pre-line text-cuerpo-sm text-muted-foreground">{t.descripcion}</p>}
                <ListaAdjuntos adjuntos={t.adjuntos} />
                {t.enlaces.length > 0 && (
                  <ul className="flex flex-col gap-1 text-sm">
                    {t.enlaces.map((e) => <li key={e.url}><a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 underline"><Link2 className="size-4" strokeWidth={2} aria-hidden />{e.titulo ?? e.url}</a></li>)}
                  </ul>
                )}
                <p className="text-cuerpo-sm tabular-nums" aria-label="Contadores de entrega">
                  {t.contadores.entregaron}/{t.contadores.asignados} entregaron · {t.contadores.tarde} con retraso · {t.contadores.pendientes} pendientes · {t.contadores.devueltas} devueltas · {t.contadores.revisadas} revisadas
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                {t.estado !== "borrador" && (
                  <Link href={`/tareas/${t.id}/revision`} className={buttonVariants({ variant: "default", size: "sm" })}><ClipboardCheck strokeWidth={2} aria-hidden />Revisar entregas</Link>
                )}
                {t.esAutor && t.estado === "borrador" && (
                  <BotonConfirmar etiqueta="Publicar" tamano="sm" titulo="¿Publicar esta tarea?" descripcion="Los destinatarios la verán y recibirán un aviso." confirmar="Publicar" accion={publicarTareaAction.bind(null, slug, t.id)} />
                )}
                {t.esAutor && (
                  <DialogoAccion
                    disparador={<><Pencil strokeWidth={2} aria-hidden />Editar tarea</>}
                    variante="outline" tamano="sm" titulo="Editar tarea" etiqueta="Guardar cambios"
                    accion={actualizarTareaAction.bind(null, slug, t.id)}
                  >
                    <div className="sm:col-span-2"><Campo etiqueta="Nombre de la tarea" id={`titulo-${t.id}`} name="titulo" required maxLength={150} defaultValue={t.titulo} /></div>
                    <Campo etiqueta="Día de entrega" id={`fecha-${t.id}`} name="fechaEntrega" type="date" defaultValue={t.fechaEntrega ? momentoEnZona(t.fechaEntrega, ctx.tenant.zonaHoraria).isoFecha : ""} />
                    <Campo etiqueta="Hora límite" id={`hora-${t.id}`} name="horaEntrega" type="time" defaultValue={t.fechaEntrega && t.conHora ? momentoEnZona(t.fechaEntrega, ctx.tenant.zonaHoraria).hora : ""} />
                    <div className="sm:col-span-2"><Campo etiqueta="Motivo del cambio de plazo (si lo cambias)" id={`motivo-${t.id}`} name="motivoPlazo" maxLength={300} /></div>
                    <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                      <span className="font-medium">Instrucciones (opcional)</span>
                      <Textarea name="descripcion" rows={4} maxLength={MAX_INSTRUCCIONES} defaultValue={t.descripcion ?? ""} />
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                      <span className="font-medium">Enlaces (uno por línea)</span>
                      <Textarea name="enlacesTexto" rows={2} defaultValue={t.enlaces.map((e) => e.url).join("\n")} />
                    </label>
                    <label className="flex items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" name="permiteTardias" defaultChecked={t.permiteTardias} className="size-5 accent-primary" />Permitir entregas tardías</label>
                    <label className="flex items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" name="comentariosGenerales" defaultChecked={t.comentariosGenerales} className="size-5 accent-primary" />Comentarios generales</label>
                    <CamposAdjuntos id={`adjuntos-${t.id}`} existentes={t.adjuntos} maxArchivos={limites.archivos} maxMb={limites.mb} accept={limites.accept} tiposTexto={limites.tiposTexto} etiqueta="Materiales" />
                  </DialogoAccion>
                )}
                {t.esAutor && (t.estado === "publicada" || t.estado === "cerrada") && (
                  <BotonConfirmar
                    etiqueta={t.estado === "cerrada" ? "Reabrir entregas" : "Cerrar entregas"} variante="outline" tamano="sm"
                    titulo={t.estado === "cerrada" ? "¿Reabrir las entregas?" : "¿Cerrar las entregas?"}
                    descripcion={t.estado === "cerrada" ? "Los estudiantes podrán volver a entregar." : "Nadie podrá entregar ni anular; las entregas hechas se conservan."}
                    confirmar={t.estado === "cerrada" ? "Reabrir" : "Cerrar entregas"}
                    campos={{ cerrar: t.estado === "cerrada" ? "false" : "true" }}
                    accion={cerrarTareaAction.bind(null, slug, t.id)}
                  />
                )}
                {t.esAutor && t.estado !== "archivada" && (
                  <BotonConfirmar etiqueta="Archivar" variante="ghost" tamano="sm" titulo="¿Archivar esta tarea?" descripcion="Sale de las listas; las entregas y notas se conservan." confirmar="Archivar" accion={archivarTareaAction.bind(null, slug, t.id)} />
                )}
                {(t.esAutor || ctx.rol === "direccion") && (
                  <BotonConfirmar
                    etiqueta="Eliminar" variante="ghost" tamano="sm" peligro
                    titulo="¿Eliminar esta tarea?"
                    descripcion="Solo se puede si nadie la entregó. Las familias dejarán de verla. No se puede deshacer."
                    confirmar="Eliminar tarea"
                    accion={eliminarTareaAction.bind(null, slug, t.id)}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
