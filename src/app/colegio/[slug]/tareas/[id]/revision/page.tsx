import { ArrowLeft, CheckCircle2, ChevronDown, Circle, ClipboardList, FileText, RotateCcw, Upload, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListaAdjuntos } from "@/components/adjuntos/ListaAdjuntos";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Button, buttonVariants } from "@/components/ui/button";
import { Selector } from "@/components/ui/Selector";
import { formatoDia, formatoHora } from "@/lib/fechas";
import { requireFeature } from "@/lib/server/plan";
import { revisionDeTarea } from "@/lib/server/tareas";
import { requireTenantContext } from "@/lib/server/tenant";
import { activarCalificacionAction, revisarConNotaAction, subirNotasAction } from "../../actions";
import { FormularioEnLinea } from "../../FormularioEnLinea";
import { FechaEntrega } from "../../insignias";
import { PanelRevision } from "./PanelRevision";

export const metadata: Metadata = { title: "Revisar entregas" };

type Revision = Awaited<ReturnType<typeof revisionDeTarea>>;
type Fila = Revision["secciones"][number]["filas"][number];

const cuando = (d: Date) => `${formatoDia(d, { weekday: "short", day: "numeric", month: "short" })}, ${formatoHora(d)}`;
const entrego = (f: Fila) => f.estado === "entregada" || f.estado === "revisada";

/** Columna «Entrega»: ícono + palabra; la fecha y «Con retraso» / «En físico» debajo. */
function Entrega({ f, vencida }: { f: Fila; vencida: boolean }) {
  if (entrego(f)) {
    return (
      <span className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1.5 font-medium text-llego"><CheckCircle2 className="size-4" strokeWidth={2} aria-hidden />Entregado</span>
        <span className="hidden text-cuerpo-sm text-muted-foreground tabular-nums sm:block">
          {f.entregadaAt ? cuando(f.entregadaAt) : ""}{f.tarde ? " · con retraso" : ""}{f.enFisico ? " · en físico" : ""}
        </span>
      </span>
    );
  }
  if (f.estado === "devuelta") return <span className="inline-flex items-center gap-1.5 font-medium text-tarde"><RotateCcw className="size-4" strokeWidth={2} aria-hidden />Devuelta</span>;
  if (vencida) return <span className="inline-flex items-center gap-1.5 font-medium text-falta sm:whitespace-nowrap"><XCircle className="size-4" strokeWidth={2} aria-hidden />No entregó</span>;
  return <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Circle className="size-4" strokeWidth={2} aria-hidden />Pendiente</span>;
}

/** Lo que mandó el estudiante: cada intento con su hora, texto y archivos; y los comentarios privados. */
function ContenidoEntrega({ f }: { f: Fila }) {
  const intentos = f.intentos.filter((i) => i.enviadaAt || i.texto || i.archivos.length > 0);
  return (
    <>
      {intentos.length === 0 ? (
        <p className="flex items-center gap-2 text-cuerpo text-muted-foreground"><FileText className="size-5" strokeWidth={2} aria-hidden />No envió nada por Khipu.</p>
      ) : (
        intentos.map((i) => (
          <section key={i.numero} aria-label={`Intento ${i.numero}`} className="flex flex-col gap-2 rounded-lg border border-borde-sutil bg-superficie px-4 py-3">
            <p className="text-cuerpo-sm font-medium text-muted-foreground">
              {intentos.length > 1 ? `Intento ${i.numero} · ` : ""}{i.enviadaAt ? `Enviado el ${cuando(i.enviadaAt)}` : "Entregado en físico"}{i.tarde ? " · con retraso" : ""}
            </p>
            {i.texto ? <p className="whitespace-pre-line text-cuerpo">{i.texto}</p> : null}
            <ListaAdjuntos adjuntos={i.archivos} etiqueta="Archivos" />
          </section>
        ))
      )}
      {f.comentarios.length > 0 && (
        <section aria-label="Comentarios privados" className="flex flex-col gap-1.5">
          <h3 className="text-cuerpo-sm font-semibold">Comentarios</h3>
          <ul className="flex flex-col gap-1.5">
            {f.comentarios.filter((c) => !c.oculto).map((c) => (
              <li key={c.id} className="rounded-md bg-muted/60 px-3 py-2 text-sm">
                <span className="text-cuerpo-sm text-muted-foreground">{c.autor} · {cuando(c.createdAt)}</span>
                <span className="block">{c.texto}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** Revisión de entregas (specs/39): lista de estudiantes del salón, entrega, nota y «Subir notas». */
export default async function RevisionPage({ params, searchParams }: PageProps<"/colegio/[slug]/tareas/[id]/revision">) {
  const { slug, id } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "tareas");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const todas = await revisionDeTarea(ctx, id);
  const elegido = typeof sp.curso === "string" ? sp.curso : undefined;
  const s = todas.secciones.find((x) => x.cursoId === elegido) ?? todas.secciones[0];
  const docente = ctx.rol === "profesor";
  const tarea = todas.tarea;
  const vencida = s ? (s.limite ? s.limite < new Date() : false) || tarea.estado === "cerrada" : false;

  const filas = s ? s.filas.filter((f) => !f.retirada) : [];
  const conEntrega = filas.filter((f) => entrego(f) || f.estado === "devuelta");
  const conNota = conEntrega.filter((f) => f.nota && f.nota !== "NE").length;
  const faltan = conEntrega.length - conNota;
  const sinEntregar = filas.length - conEntrega.length;
  const ev = s?.evaluacion ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/tareas" className={`${buttonVariants({ variant: "ghost", size: "sm" })} -mb-3 self-start`}><ArrowLeft strokeWidth={2} aria-hidden />Tareas</Link>
      <EncabezadoPagina seccion="academico" titulo={tarea.titulo} descripcion={s ? `${s.curso} · ${s.salon}${ev?.competencia ? ` · ${ev.competencia}` : ""}` : undefined} />

      <div className="-mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <FechaEntrega fecha={s?.fechaPropia ?? tarea.fechaEntrega} conHora={tarea.conHora} vencida={vencida} />
        {(tarea.descripcion || tarea.adjuntos.length > 0) && (
          <details className="group w-full">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden"><ChevronDown className="size-4 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" strokeWidth={2} aria-hidden />Ver instrucciones y materiales</summary>
            <div className="mt-2 flex max-w-prose flex-col gap-3">
              {tarea.descripcion && <p className="whitespace-pre-line text-sm">{tarea.descripcion}</p>}
              <ListaAdjuntos adjuntos={tarea.adjuntos} etiqueta="Materiales" />
            </div>
          </details>
        )}
      </div>

      {todas.secciones.length > 1 && (
        <nav aria-label="Salones de esta tarea" className="flex flex-wrap gap-2">
          {todas.secciones.map((x) => (
            <Link
              key={x.cursoId}
              href={`/tareas/${id}/revision?curso=${x.cursoId}`}
              aria-current={x.cursoId === s?.cursoId ? "page" : undefined}
              className={buttonVariants({ variant: x.cursoId === s?.cursoId ? "default" : "outline", size: "sm" })}
            >
              {x.salon}
            </Link>
          ))}
        </nav>
      )}

      {!s ? (
        <EstadoVacio icono={ClipboardList} titulo="No hay salones para revisar" />
      ) : (
        <>
          {/* Estado de la calificación del salón y «Subir notas». */}
          {!ev ? (
            docente && s.competencias.length > 0 ? (
              <FormularioEnLinea accion={activarCalificacionAction.bind(null, slug, id, s.id)} etiqueta="Elegir competencia" className="flex flex-col gap-3 rounded-xl border border-borde-sutil bg-superficie px-4 py-4">
                <p className="text-sm"><span className="font-semibold">Esta tarea aún no tiene notas.</span> Elige la competencia que evalúa y podrás calificar a cada estudiante.</p>
                <div className="flex flex-wrap items-end gap-3">
                  <Selector etiqueta="Competencia" name="competenciaId" required defaultValue="" className="min-w-64">
                    <option value="" disabled>Elige una competencia</option>
                    {s.competencias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </Selector>
                  <Button type="submit">Activar notas</Button>
                </div>
              </FormularioEnLinea>
            ) : (
              <p className="rounded-xl border border-borde-sutil bg-superficie px-4 py-3 text-sm text-muted-foreground">
                Esta tarea no tiene columna de notas{docente ? ": el curso no tiene competencias activas. Pídele a dirección que las configure." : "."}
              </p>
            )
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-borde-sutil bg-superficie px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-cuerpo font-semibold tabular-nums">
                  {conEntrega.length} de {filas.length} entregaron · {conNota} de {conEntrega.length} con nota
                </p>
                <p className="text-cuerpo-sm text-muted-foreground">
                  {ev.publicada
                    ? <>Notas subidas{ev.publicadaAt ? ` el ${formatoDia(ev.publicadaAt, { day: "numeric", month: "long" })}` : ""}. Para cambiar una nota, corrígela en el <Link href={`/notas/${s.cursoId}`} className="font-medium text-foreground underline underline-offset-4">Registro de notas</Link>.</>
                    : faltan > 0
                      ? `Pon nota a ${faltan === 1 ? "1 estudiante que entregó" : `${faltan} estudiantes que entregaron`} para subir las notas.`
                      : sinEntregar > 0
                        ? `Al subir, ${sinEntregar === 1 ? "1 estudiante que no entregó recibirá" : `${sinEntregar} estudiantes que no entregaron recibirán`} «NE».`
                        : "Todos tienen nota."}
                </p>
              </div>
              {docente && (ev.publicada ? (
                <span className="inline-flex h-10 items-center gap-1.5 self-start rounded-pildora bg-llego-fondo px-3 text-sm font-semibold text-llego sm:self-center"><CheckCircle2 className="size-4" strokeWidth={2} aria-hidden />Notas subidas</span>
              ) : faltan > 0 || conEntrega.length === 0 ? (
                <Button disabled className="self-start sm:self-center"><Upload strokeWidth={2} aria-hidden />Subir notas</Button>
              ) : (
                <BotonConfirmar
                  etiqueta={<><Upload strokeWidth={2} aria-hidden />Subir notas</>} variante="default" className="self-start sm:self-center"
                  titulo={`¿Subir las notas de ${s.salon}?`}
                  descripcion={`Se crea el registro en ${ev.competencia ?? "la competencia de la tarea"}${sinEntregar > 0 ? `, ${sinEntregar} ${sinEntregar === 1 ? "estudiante recibe" : "estudiantes reciben"} «NE» por no entregar` : ""} y cada familia y estudiante recibe un aviso con su nota.${!vencida && sinEntregar > 0 ? " El plazo todavía no vence." : ""}`}
                  confirmar="Subir notas"
                  accion={subirNotasAction.bind(null, slug, id, s.id)}
                />
              ))}
            </div>
          )}

          {filas.length === 0 ? (
            <EstadoVacio icono={ClipboardList} titulo="Este salón no tiene estudiantes asignados" />
          ) : (
            <div className="relative min-w-0 overflow-x-auto rounded-xl border border-borde-sutil bg-superficie">
              <table className="w-full text-sm">
                <caption className="sr-only">Estudiantes de {s.salon}: entrega y nota</caption>
                <thead className="border-b border-borde-sutil text-left text-cuerpo-sm text-muted-foreground">
                  <tr>
                    <th scope="col" className="hidden w-14 px-4 py-3 font-medium whitespace-nowrap sm:table-cell">N.º</th>
                    <th scope="col" className="px-2 py-3 font-medium sm:px-4"><span className="sm:hidden">Estudiante y entrega</span><span className="hidden sm:inline">Estudiante</span></th>
                    <th scope="col" className="hidden px-2 py-3 font-medium sm:table-cell sm:px-4">Entrega</th>
                    <th scope="col" className="w-14 px-2 py-3 font-medium sm:w-24 sm:px-4">Nota</th>
                    <th scope="col" className="px-2 py-3 text-right font-medium sm:w-36 sm:px-4"><span className="sr-only">Acción</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde-sutil">
                  {filas.map((f, i) => {
                    const sinEntrega = !entrego(f);
                    const puedeCalificar = docente && !!ev && !ev.publicada;
                    const revisar = puedeCalificar && !sinEntrega && !f.nota;
                    return (
                      <tr key={f.asignacionId} data-testid={`fila-${f.alumno.id}`} className="align-middle">
                        <td className="hidden px-4 py-3 tabular-nums text-muted-foreground sm:table-cell">{i + 1}</td>
                        <th scope="row" className="px-2 py-3 text-left font-medium sm:px-4">
                          {f.alumno.nombre}
                          <span className="mt-1 block font-normal sm:hidden"><Entrega f={f} vencida={vencida} /></span>
                        </th>
                        <td className="hidden px-2 py-3 sm:table-cell sm:px-4"><Entrega f={f} vencida={vencida} /></td>
                        <td className="px-2 py-3 font-heading text-base font-semibold tabular-nums sm:px-4">
                          {f.nota ? (f.nota === "NE" ? <span className="text-muted-foreground">NE</span> : f.nota) : <span className="text-muted-foreground" aria-label="Sin nota">—</span>}
                        </td>
                        <td className="px-2 py-3 text-right sm:px-4">
                          <PanelRevision
                            disparador={<>{revisar ? "Revisar" : "Ver"}<span className="sr-only"> la entrega de {f.alumno.nombre}</span></>}
                            destacado={revisar}
                            titulo={f.alumno.nombre}
                            descripcion={`${s.curso} · ${s.salon}${f.nota ? ` · Nota: ${f.nota}` : ""}`}
                            accion={puedeCalificar ? revisarConNotaAction.bind(null, slug, id, f.asignacionId) : undefined}
                            escala={todas.escala}
                            notaInicial={f.nota && f.nota !== "NE" ? f.nota : ""}
                            sinEntrega={sinEntrega}
                          >
                            <ContenidoEntrega f={f} />
                            {docente && ev?.publicada && (
                              <p className="text-cuerpo-sm text-muted-foreground">
                                Las notas ya se subieron. Para cambiar esta nota, corrígela en el <Link href={`/notas/${s.cursoId}`} className="font-medium text-foreground underline underline-offset-4">Registro de notas</Link>.
                              </p>
                            )}
                          </PanelRevision>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
