import { ArrowLeft, ClipboardList, EyeOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListaAdjuntos } from "@/components/adjuntos/ListaAdjuntos";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Button, buttonVariants } from "@/components/ui/button";
import { Selector } from "@/components/ui/Selector";
import { Textarea } from "@/components/ui/textarea";
import { formatoDia, formatoHora } from "@/lib/fechas";
import { ETIQUETA_ESTADO_ENTREGA, MAX_COMENTARIO_TAREA } from "@/lib/tareas";
import { requireFeature } from "@/lib/server/plan";
import { revisionDeTarea } from "@/lib/server/tareas";
import { requireTenantContext } from "@/lib/server/tenant";
import {
  calificarEntregaAction, comentarTareaAction, devolverEntregaAction, entregaFisicaAction, marcarNoEntregaronAction, ocultarComentarioAction, revisarEntregaAction,
} from "../../actions";
import { FormularioEnLinea } from "../../FormularioEnLinea";
import { EstadoEntrega, FechaEntrega } from "../../insignias";

export const metadata: Metadata = { title: "Revisar entregas" };

const cuando = (d: Date) => `${formatoDia(d)}, ${formatoHora(d)}`;

/** Revisión de entregas (specs/39): profesor del curso de cada sección (o autor) y dirección. */
export default async function RevisionPage({ params, searchParams }: PageProps<"/colegio/[slug]/tareas/[id]/revision">) {
  const { slug, id } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "tareas");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const filtros = {
    cursoId: typeof sp.curso === "string" && sp.curso ? sp.curso : undefined,
    estado: typeof sp.estado === "string" && sp.estado ? sp.estado : undefined,
    q: typeof sp.q === "string" ? sp.q : undefined,
  };
  const r = await revisionDeTarea(ctx, id, filtros);
  const docente = ctx.rol === "profesor";

  return (
    <div className="flex flex-col gap-4">
      <Link href="/tareas" className={`${buttonVariants({ variant: "ghost", size: "sm" })} self-start`}><ArrowLeft strokeWidth={2} aria-hidden />Tareas</Link>
      <EncabezadoPagina titulo={r.tarea.titulo} descripcion="Revisa las entregas por sección." />
      <div className="flex flex-wrap gap-2"><FechaEntrega fecha={r.tarea.fechaEntrega} conHora={r.tarea.conHora} vencida={r.vencida} /></div>
      {r.tarea.descripcion && <p className="whitespace-pre-line text-sm">{r.tarea.descripcion}</p>}
      <ListaAdjuntos adjuntos={r.tarea.adjuntos} etiqueta="Materiales" />

      <form className="flex flex-wrap items-end gap-3" aria-label="Filtrar entregas">
        <Selector etiqueta="Salón" name="curso" defaultValue={filtros.cursoId ?? ""}>
          <option value="">Todos</option>
          {r.secciones.map((s) => <option key={s.cursoId} value={s.cursoId}>{s.salon}</option>)}
        </Selector>
        <Selector etiqueta="Estado" name="estado" defaultValue={filtros.estado ?? ""}>
          <option value="">Todos</option>
          {Object.entries(ETIQUETA_ESTADO_ENTREGA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </Selector>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Estudiante</span>
          <input type="search" name="q" defaultValue={filtros.q ?? ""} className="h-11 rounded-md border bg-background px-3" />
        </label>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>Filtrar</button>
      </form>

      {r.secciones.map((s) => (
        <section key={s.id} className="flex flex-col gap-3 rounded-lg border bg-card p-4" aria-labelledby={`sec-${s.id}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id={`sec-${s.id}`} className="text-titulo-2">{s.curso} · {s.salon}</h2>
            {s.fechaPropia && <FechaEntrega fecha={s.fechaPropia} conHora={r.tarea.conHora} />}
          </div>
          <p className="text-cuerpo-sm tabular-nums" data-testid={`contadores-${s.cursoId}`}>
            {s.contadores.entregaron}/{s.contadores.asignados} entregaron · {s.contadores.tarde} con retraso · {s.contadores.pendientes} pendientes · {s.contadores.devueltas} devueltas · {s.contadores.revisadas} revisadas
          </p>
          {docente && s.evaluacion && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>Columna de notas {s.evaluacion.publicada ? "(resultados publicados)" : "(borrador; publícala desde Notas)"}</span>
              <BotonConfirmar
                etiqueta="Marcar NE a quienes no entregaron" variante="outline" tamano="sm"
                titulo="¿Marcar «NE» a quienes no entregaron?" descripcion="Solo a los asignados sin entrega y sin nota. Puedes corregirlo después en la grilla de notas."
                confirmar="Marcar NE" accion={marcarNoEntregaronAction.bind(null, slug, id, s.id)}
              />
            </div>
          )}
          {s.filas.length === 0 ? (
            <EstadoVacio icono={ClipboardList} titulo="No hay estudiantes con ese filtro" />
          ) : (
            <ul className="flex flex-col gap-3">
              {s.filas.map((f) => (
                <li key={f.asignacionId} className="flex flex-col gap-2 rounded-lg border bg-background p-3 text-sm" data-testid={`fila-${f.alumno.id}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{f.alumno.nombre}{f.retirada ? " (ya no asignado)" : ""}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <EstadoEntrega estado={f.estado} tarde={f.tarde} enFisico={f.enFisico} vencida={r.vencida} />
                      {f.nota && <span className="font-medium">Nota: {f.nota}</span>}
                    </div>
                  </div>
                  {f.intentos.map((i) => (
                    <div key={i.numero} className="flex flex-col gap-1 border-l-2 pl-3">
                      <p className="text-cuerpo-sm text-muted-foreground">Intento {i.numero}{i.enviadaAt ? ` · ${cuando(i.enviadaAt)}` : ""}{i.tarde ? " · con retraso" : ""}</p>
                      {i.texto && <p className="whitespace-pre-line">{i.texto}</p>}
                      <ListaAdjuntos adjuntos={i.archivos} etiqueta="Archivos" />
                    </div>
                  ))}
                  {f.comentarios.length > 0 && (
                    <ul className="flex flex-col gap-1" aria-label="Comentarios privados">
                      {f.comentarios.map((c) => (
                        <li key={c.id} className={`flex items-start justify-between gap-2 rounded-md bg-muted/50 p-2 ${c.oculto ? "opacity-60" : ""}`}>
                          <span><span className="text-cuerpo-sm text-muted-foreground">{c.autor} · {cuando(c.createdAt)}{c.oculto ? " · oculto" : ""}</span><br />{c.texto}</span>
                          {docente && !c.oculto && !c.esDocente && (
                            <BotonConfirmar etiqueta={<><EyeOff className="size-4" strokeWidth={2} aria-hidden /><span className="sr-only">Ocultar comentario</span></>} variante="ghost" tamano="sm" titulo="¿Ocultar este comentario?" descripcion="Dejará de verse para la familia." confirmar="Ocultar" accion={ocultarComentarioAction.bind(null, slug, id, c.id)} />
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {docente && !f.retirada && (
                    <div className="flex flex-col gap-2 border-t pt-2">
                      {(f.estado === "entregada" || f.estado === "revisada") && (
                        <FormularioEnLinea accion={devolverEntregaAction.bind(null, slug, id, f.asignacionId)} className="flex flex-col gap-2" etiqueta={`Devolver a ${f.alumno.nombre}`}>
                          <label className="flex flex-col gap-1 text-sm">
                            <span className="font-medium">Observación (privada)</span>
                            <Textarea name="observacion" rows={2} maxLength={MAX_COMENTARIO_TAREA} />
                          </label>
                          <div><Button type="submit" variant="outline" size="sm">Devolver para corregir</Button></div>
                        </FormularioEnLinea>
                      )}
                      {f.estado === "entregada" && (
                        <FormularioEnLinea accion={revisarEntregaAction.bind(null, slug, id, f.asignacionId)} etiqueta={`Revisar a ${f.alumno.nombre}`}>
                          <Button type="submit" size="sm">Marcar revisada</Button>
                        </FormularioEnLinea>
                      )}
                      {(f.estado === "asignada" || f.estado === "en_proceso" || f.estado === "devuelta") && (
                        <BotonConfirmar etiqueta="Entregada en físico" variante="outline" tamano="sm" titulo="¿Registrar entrega en físico?" descripcion="Para trabajos entregados en clase (cuaderno, maqueta…)." confirmar="Registrar" accion={entregaFisicaAction.bind(null, slug, id, f.asignacionId)} />
                      )}
                      {s.evaluacion && (
                        <FormularioEnLinea accion={calificarEntregaAction.bind(null, slug, id, f.asignacionId)} className="flex flex-wrap items-end gap-2" etiqueta={`Nota de ${f.alumno.nombre}`}>
                          <label className="flex flex-col gap-1 text-sm">
                            <span className="font-medium">Nota</span>
                            <input name="valor" maxLength={10} defaultValue={f.nota ?? ""} className="h-11 w-24 rounded-md border bg-background px-3" />
                          </label>
                          <Button type="submit" size="sm" variant="outline">Guardar nota</Button>
                        </FormularioEnLinea>
                      )}
                      <FormularioEnLinea accion={comentarTareaAction.bind(null, slug, id)} className="flex flex-wrap items-end gap-2" etiqueta={`Comentario privado a ${f.alumno.nombre}`}>
                        <input type="hidden" name="asignacionId" value={f.asignacionId} />
                        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                          <span className="font-medium">Comentario privado</span>
                          <input name="texto" required maxLength={MAX_COMENTARIO_TAREA} className="h-11 rounded-md border bg-background px-3" />
                        </label>
                        <Button type="submit" size="sm" variant="ghost">Enviar</Button>
                      </FormularioEnLinea>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
