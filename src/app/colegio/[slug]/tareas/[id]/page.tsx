import { ArrowLeft, CalendarClock, Link2, MessageSquare, Send, Timer, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EtiquetaCurso } from "@/components/academico/EtiquetaCurso";
import { CamposAdjuntos } from "@/components/adjuntos/CamposAdjuntos";
import { ListaAdjuntos } from "@/components/adjuntos/ListaAdjuntos";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { TituloBloque } from "@/components/shell/TituloBloque";
import { Alerta } from "@/components/ui/Alerta";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ETIQUETA_LITERAL, esLiteral, etiquetaVigesimal } from "@/lib/calificaciones";
import { formatoDia, formatoHora } from "@/lib/fechas";
import { esVistaFamilia } from "@/lib/roles";
import { MAX_COMENTARIO_TAREA, MAX_TEXTO_ENTREGA, puedeEnviar, type EstadoEntregaT } from "@/lib/tareas";
import { requireFeature } from "@/lib/server/plan";
import { alumnosConTarea, detalleTareaFamilia, limitesTarea } from "@/lib/server/tareas";
import { requireTenantContext } from "@/lib/server/tenant";
import { anularEntregaAction, comentarTareaAction, guardarEntregaAction } from "../actions";
import { FormularioEnLinea } from "../FormularioEnLinea";
import { EstadoEntrega, FechaEntrega } from "../insignias";

export const metadata: Metadata = { title: "Tarea" };

const cuando = (d: Date) => `${formatoDia(d, { weekday: "short", day: "numeric", month: "short" })}, ${formatoHora(d)}`;

/** Significado de la nota: «Logro destacado», «Aprobado»… («NE» = no entregó). */
function significado(nota: string): string | null {
  if (nota === "NE") return "No entregó";
  if (esLiteral(nota)) return ETIQUETA_LITERAL[nota];
  const n = Number(nota.replace(",", "."));
  return Number.isFinite(n) ? etiquetaVigesimal(n) : null;
}

/**
 * Avance de la entrega como una cuerda de khipu (DESIGN.md): un nudo por paso, relleno si ya ocurrió. Siempre con
 * palabra; el paso actual se anuncia con `aria-current`.
 */
function CuerdaAvance({ estado, calificada }: { estado: EstadoEntregaT; calificada: boolean }) {
  const pasos = ["Asignada", "Entregada", "Revisada", "Calificada"];
  const actual = calificada ? 3 : estado === "revisada" ? 2 : estado === "entregada" ? 1 : 0;
  return (
    <ol aria-label="Avance de la entrega" className="relative grid grid-cols-4">
      <span aria-hidden className="absolute top-[7px] right-[12.5%] left-[12.5%] h-0.5 rounded-full bg-borde-sutil" />
      <span aria-hidden className="absolute top-[7px] left-[12.5%] h-0.5 rounded-full bg-sec-nudo" style={{ width: `${(actual / 3) * 75}%` }} />
      {pasos.map((p, i) => (
        <li key={p} aria-current={i === actual ? "step" : undefined} className="relative flex flex-col items-center gap-1.5 text-center">
          <span
            aria-hidden
            className={`size-4 rounded-full border-2 ${i <= actual ? "border-sec-nudo bg-sec-nudo" : "border-muted-foreground/40 bg-superficie"} ${i === actual ? "ring-4 ring-sec-suave" : ""}`}
          />
          <span className={`text-etiqueta ${i === actual ? "font-semibold text-foreground" : i < actual ? "text-sec-tinta" : "text-muted-foreground"}`}>
            {p}<span className="sr-only">{i < actual ? " (hecho)" : i === actual ? " (paso actual)" : " (pendiente)"}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Detalle de una tarea para el alumno o su apoderado (specs/39). El personal va a la revisión. */
export default async function TareaPage({ params, searchParams }: PageProps<"/colegio/[slug]/tareas/[id]">) {
  const { slug, id } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "tareas");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  if (!esVistaFamilia(ctx.rol)) redirect(`/tareas/${id}/revision`);

  const hijos = await alumnosConTarea(ctx, id);
  if (hijos.length === 0) notFound();
  const alumnoId = typeof sp.alumno === "string" && hijos.some((h) => h.id === sp.alumno) ? sp.alumno : hijos[0].id;
  const d = await detalleTareaFamilia(ctx, id, alumnoId);
  const limites = limitesTarea(ctx);
  const { tarea: t, asignacion: a } = d;
  const regla = puedeEnviar({ estado: t.estado, permiteTardias: t.permiteTardias, limite: t.limite });
  const pendiente = a.estado === "asignada" || a.estado === "en_proceso" || a.estado === "devuelta";
  const puedeEditar = regla.ok && pendiente;
  const esAlumno = ctx.rol === "alumno";
  const nombre = d.alumno.nombre.split(" ")[0];
  const quien = esAlumno ? "tu" : `la de ${nombre}`;
  const intentos = d.intentos.filter((i) => i.enviadaAt || i.texto || i.archivos.length > 0);

  return (
    <div data-seccion="academico" className="flex flex-col gap-6">
      <Link href="/tareas" className={`${buttonVariants({ variant: "ghost", size: "sm" })} -mb-3 self-start`}><ArrowLeft strokeWidth={2} aria-hidden />Tareas</Link>

      <EncabezadoPagina
        seccion="academico"
        titulo={t.titulo}
        descripcion={
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <EtiquetaCurso>{t.curso}</EtiquetaCurso>
            {t.docente && <span className="inline-flex items-center gap-1.5"><UserRound className="size-4" strokeWidth={2} aria-hidden />{t.docente}</span>}
            {!esAlumno && <span>Tarea de {d.alumno.nombre}</span>}
          </span>
        }
      />
      <div className="-mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <FechaEntrega fecha={t.fechaEntrega} conHora={t.conHora} vencida={t.vencida} />
        {!d.calificacion && <EstadoEntrega estado={a.estado} tarde={a.tarde} enFisico={a.enFisico} vencida={t.vencida} />}
      </div>

      {hijos.length > 1 && (
        <nav aria-label="Elegir hijo" className="flex flex-wrap gap-2">
          {hijos.map((h) => (
            <Link key={h.id} href={`/tareas/${id}?alumno=${h.id}`} aria-current={h.id === alumnoId ? "page" : undefined} className={buttonVariants({ variant: h.id === alumnoId ? "default" : "outline", size: "sm" })}>{h.nombres}</Link>
          ))}
        </nav>
      )}

      <div className="grid items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
        {/* Panel de entrega: primero en celular, a la derecha (fijo al desplazar) en escritorio. */}
        <aside aria-labelledby="entrega" className="flex flex-col gap-5 rounded-2xl border border-borde-sutil bg-superficie p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)] lg:sticky lg:top-6 lg:order-2">
          <h2 id="entrega" className="font-heading text-lg font-semibold">{esAlumno ? "Tu entrega" : `Entrega de ${nombre}`}</h2>
          <CuerdaAvance estado={a.estado} calificada={!!d.calificacion} />

          {d.calificacion && (
            <div className="flex items-center gap-4 rounded-xl bg-sec-suave px-4 py-3.5">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-superficie font-heading text-2xl font-bold tabular-nums text-sec-tinta shadow-[0_1px_2px_rgb(0_0_0/0.06)]">{d.calificacion}</span>
              <span className="flex flex-col">
                <span className="text-cuerpo-sm text-sec-tinta">Calificación</span>
                <span className="font-heading text-base font-semibold text-sec-tinta">{significado(d.calificacion) ?? d.calificacion}</span>
              </span>
            </div>
          )}

          {intentos.length > 0 && (
            <ul className="flex flex-col gap-3" aria-label="Lo que se entregó">
              {intentos.map((i) => (
                <li key={i.numero} className="flex flex-col gap-1.5 border-l-2 border-sec-nudo pl-3 text-sm">
                  <p className="text-cuerpo-sm text-muted-foreground tabular-nums">
                    {intentos.length > 1 ? `Intento ${i.numero} · ` : ""}{i.enviadaAt ? `Enviado el ${cuando(i.enviadaAt)}` : "Borrador"}{i.tarde ? " · con retraso" : ""}
                  </p>
                  {i.texto && <p className="whitespace-pre-line">{i.texto}</p>}
                  <ListaAdjuntos adjuntos={i.archivos} etiqueta="Archivos entregados" />
                </li>
              ))}
            </ul>
          )}
          {a.enFisico && <p className="text-cuerpo-sm text-muted-foreground">El profesor registró la entrega en físico.</p>}
          {a.estado === "devuelta" && <Alerta tipo="aviso">El profesor devolvió esta tarea para corregir. Revisa los comentarios y vuelve a entregarla.</Alerta>}
          {!regla.ok && pendiente && <Alerta tipo="aviso">{regla.error}</Alerta>}

          {puedeEditar && (
            <FormularioEnLinea accion={guardarEntregaAction.bind(null, slug, id, alumnoId)} className="flex flex-col gap-3" etiqueta="Entrega">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Respuesta (opcional)</span>
                <Textarea name="texto" rows={4} maxLength={MAX_TEXTO_ENTREGA} defaultValue={d.borrador?.texto ?? ""} />
              </label>
              <CamposAdjuntos id={`entrega-${alumnoId}`} existentes={d.borrador?.archivos ?? []} maxArchivos={limites.archivos} maxMb={limites.mb} accept={limites.accept} tiposTexto={limites.tiposTexto} etiqueta="Adjuntar trabajo" />
              {regla.ok && regla.tarde && <p className="inline-flex items-center gap-1.5 text-cuerpo-sm text-tarde"><Timer className="size-4" strokeWidth={2} aria-hidden />Ya pasó el plazo: la entrega quedará «Con retraso».</p>}
              <div className="grid grid-cols-2 gap-2">
                <Button type="submit" name="enviar" value="no" variant="outline">Guardar borrador</Button>
                <Button type="submit" name="enviar" value="si"><Send strokeWidth={2} aria-hidden />Entregar</Button>
              </div>
            </FormularioEnLinea>
          )}
          {a.estado === "entregada" && !a.enFisico && regla.ok && (
            <BotonConfirmar
              etiqueta="Anular entrega" variante="outline" className="w-full"
              titulo="¿Anular la entrega?" descripcion={`Podrás corregir ${quien} entrega y volver a enviarla. Si la reenvías después del plazo, quedará con retraso.`}
              confirmar="Anular entrega" accion={anularEntregaAction.bind(null, slug, id, alumnoId)}
            />
          )}
          {!puedeEditar && !d.calificacion && (a.estado === "entregada" || a.estado === "revisada") && (
            <p className="flex items-start gap-2 text-cuerpo-sm text-muted-foreground"><CalendarClock className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />La nota aparecerá aquí cuando el profesor suba las calificaciones.</p>
          )}
        </aside>

        {/* Contenido de la tarea y conversación con el profesor. */}
        <div className="flex min-w-0 flex-col gap-10 lg:order-1">
          <section aria-labelledby="instrucciones" className="flex flex-col gap-4">
            <TituloBloque id="instrucciones">Instrucciones</TituloBloque>
            {t.descripcion ? <p className="max-w-prose whitespace-pre-line text-cuerpo leading-7">{t.descripcion}</p> : <p className="text-cuerpo text-muted-foreground">El profesor no dejó instrucciones escritas.</p>}
            {t.indicacionesEntrega && <Alerta tipo="info" titulo="Cómo entregar">{t.indicacionesEntrega}</Alerta>}
            {(t.adjuntos.length > 0 || t.enlaces.length > 0) && (
              <div className="flex flex-col gap-2">
                <h3 className="text-cuerpo-sm font-semibold">Materiales</h3>
                <ListaAdjuntos adjuntos={t.adjuntos} />
                {t.enlaces.length > 0 && (
                  <ul className="flex flex-col gap-1 text-sm" aria-label="Enlaces">
                    {t.enlaces.map((e) => <li key={e.id}><a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 break-all underline underline-offset-4"><Link2 className="size-4 shrink-0 text-sec-trazo" strokeWidth={2} aria-hidden />{e.titulo ?? e.url}</a></li>)}
                  </ul>
                )}
              </div>
            )}
          </section>

          <section aria-labelledby="comentarios" className="flex flex-col gap-4">
            <TituloBloque id="comentarios" descripcion={`Solo ${esAlumno ? "tú" : `tú, ${nombre}`} y el profesor ven los comentarios privados.`}>Comentarios</TituloBloque>
            {d.comentarios.length === 0 ? (
              <p className="flex items-center gap-2 text-cuerpo text-muted-foreground"><MessageSquare className="size-5" strokeWidth={2} aria-hidden />Aún no hay comentarios. Si tienes una duda, escríbele al profesor.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {d.comentarios.map((c) => (
                  <li key={c.id} className={`flex max-w-[85%] flex-col gap-1 ${c.esDocente ? "self-start" : "self-end items-end"}`}>
                    <span className="text-etiqueta text-muted-foreground">{c.autor}{c.esDocente ? " · profesor" : ""} · {cuando(c.createdAt)}{c.privado ? "" : " · para toda la clase"}</span>
                    <p className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${c.esDocente ? "rounded-tl-md bg-sec-suave text-foreground" : "rounded-tr-md bg-primary text-primary-foreground"}`}>{c.texto}</p>
                  </li>
                ))}
              </ul>
            )}
            <FormularioEnLinea accion={comentarTareaAction.bind(null, slug, id)} className="flex flex-col gap-2 rounded-2xl border border-borde-sutil bg-superficie p-3" etiqueta="Nuevo comentario">
              <input type="hidden" name="alumnoId" value={alumnoId} />
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="sr-only">Escribe al profesor</span>
                <Textarea name="texto" rows={2} maxLength={MAX_COMENTARIO_TAREA} required placeholder="Escribe al profesor…" className="min-h-16 resize-y border-0 bg-transparent px-1 shadow-none focus-visible:ring-0" />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-borde-sutil pt-2">
                {t.comentariosGenerales ? (
                  <label className="flex min-h-11 items-center gap-2 text-cuerpo-sm"><input type="checkbox" name="general" className="size-5 accent-primary" />Para toda la clase</label>
                ) : <span className="text-etiqueta text-muted-foreground">Privado</span>}
                <Button type="submit" size="sm"><Send strokeWidth={2} aria-hidden />Enviar</Button>
              </div>
            </FormularioEnLinea>
          </section>
        </div>
      </div>
    </div>
  );
}
