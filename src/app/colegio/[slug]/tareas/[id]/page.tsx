import { Award, Link2, Send, Timer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EtiquetaCurso } from "@/components/academico/EtiquetaCurso";
import { CamposAdjuntos } from "@/components/adjuntos/CamposAdjuntos";
import { ListaAdjuntos } from "@/components/adjuntos/ListaAdjuntos";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Alerta } from "@/components/ui/Alerta";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatoDia, formatoHora } from "@/lib/fechas";
import { esVistaFamilia } from "@/lib/roles";
import { MAX_COMENTARIO_TAREA, MAX_TEXTO_ENTREGA, puedeEnviar } from "@/lib/tareas";
import { requireFeature } from "@/lib/server/plan";
import { alumnosConTarea, detalleTareaFamilia, limitesTarea } from "@/lib/server/tareas";
import { requireTenantContext } from "@/lib/server/tenant";
import { anularEntregaAction, comentarTareaAction, guardarEntregaAction } from "../actions";
import { FormularioEnLinea } from "../FormularioEnLinea";
import { TituloBloque } from "../../inicio/TituloBloque";
import { EstadoEntrega, FechaEntrega } from "../insignias";

export const metadata: Metadata = { title: "Tarea" };

const cuando = (d: Date) => `${formatoDia(d)}, ${formatoHora(d)}`;

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
  const puedeEditar = regla.ok && (a.estado === "asignada" || a.estado === "en_proceso" || a.estado === "devuelta");
  const quien = ctx.rol === "alumno" ? "tu" : `la de ${d.alumno.nombre.split(" ")[0]}`;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <EncabezadoPagina seccion="academico" titulo={t.titulo} descripcion={ctx.rol === "apoderado" ? `Tarea de ${d.alumno.nombre}` : undefined} />
      {hijos.length > 1 && (
        <nav aria-label="Elegir hijo" className="flex flex-wrap gap-2">
          {hijos.map((h) => (
            <Link key={h.id} href={`/tareas/${id}?alumno=${h.id}`} aria-current={h.id === alumnoId ? "page" : undefined} className={buttonVariants({ variant: h.id === alumnoId ? "default" : "outline", size: "sm" })}>{h.nombres}</Link>
          ))}
        </nav>
      )}

      <section aria-label="Datos de la tarea" className="-mt-5 flex flex-col gap-3">
          <p className="flex flex-wrap items-center gap-2 text-cuerpo-sm text-muted-foreground"><EtiquetaCurso>{t.curso}</EtiquetaCurso>{t.docente}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <FechaEntrega fecha={t.fechaEntrega} conHora={t.conHora} vencida={t.vencida} />
            <EstadoEntrega estado={a.estado} tarde={a.tarde} enFisico={a.enFisico} vencida={t.vencida} />
          </div>
          {t.descripcion && <p className="max-w-prose whitespace-pre-line text-cuerpo">{t.descripcion}</p>}
          {t.indicacionesEntrega && <Alerta tipo="info">{t.indicacionesEntrega}</Alerta>}
          <ListaAdjuntos adjuntos={t.adjuntos} etiqueta="Materiales" />
          {t.enlaces.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm" aria-label="Enlaces">
              {t.enlaces.map((e) => <li key={e.id}><a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 break-all underline"><Link2 className="size-4 shrink-0" strokeWidth={2} aria-hidden />{e.titulo ?? e.url}</a></li>)}
            </ul>
          )}
          {d.calificacion && (
            <p className="inline-flex items-center gap-2 font-medium"><Award className="size-4 text-sec-trazo" strokeWidth={2} aria-hidden />Calificación: {d.calificacion}</p>
          )}
      </section>

      <section aria-labelledby="entrega" className="flex flex-col gap-4">
          <TituloBloque id="entrega">{ctx.rol === "alumno" ? "Tu entrega" : "Entrega"}</TituloBloque>
          {d.intentos.map((i) => (
            <div key={i.numero} className="flex flex-col gap-1.5 rounded-lg bg-sec-suave px-4 py-3 text-sm">
              <p className="font-medium text-sec-tinta">Intento {i.numero}{i.enviadaAt ? ` · enviado el ${cuando(i.enviadaAt)}` : ""}{i.tarde ? " · con retraso" : ""}</p>
              {i.texto && <p className="whitespace-pre-line">{i.texto}</p>}
              <ListaAdjuntos adjuntos={i.archivos} etiqueta="Archivos entregados" />
            </div>
          ))}
          {a.estado === "devuelta" && <Alerta tipo="aviso">El profesor devolvió esta tarea para corregir. Revisa los comentarios y vuelve a entregarla.</Alerta>}
          {!regla.ok && (a.estado === "asignada" || a.estado === "en_proceso" || a.estado === "devuelta") && <Alerta tipo="aviso">{regla.error}</Alerta>}
          {a.enFisico && <p className="text-sm text-muted-foreground">El profesor registró la entrega en físico.</p>}
          {puedeEditar && (
            <FormularioEnLinea accion={guardarEntregaAction.bind(null, slug, id, alumnoId)} className="flex flex-col gap-3" etiqueta="Entrega">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Respuesta (opcional)</span>
                <Textarea name="texto" rows={4} maxLength={MAX_TEXTO_ENTREGA} defaultValue={d.borrador?.texto ?? ""} />
              </label>
              <CamposAdjuntos id={`entrega-${alumnoId}`} existentes={d.borrador?.archivos ?? []} maxArchivos={limites.archivos} maxMb={limites.mb} accept={limites.accept} tiposTexto={limites.tiposTexto} etiqueta="Adjuntar trabajo" />
              {regla.ok && regla.tarde && <p className="inline-flex items-center gap-1.5 text-cuerpo-sm text-tarde"><Timer className="size-4" strokeWidth={2} aria-hidden />Ya pasó el plazo: la entrega quedará «Con retraso».</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" name="enviar" value="si"><Send strokeWidth={2} aria-hidden />Entregar</Button>
                <Button type="submit" name="enviar" value="no" variant="outline">Guardar borrador</Button>
              </div>
            </FormularioEnLinea>
          )}
          {a.estado === "entregada" && !a.enFisico && regla.ok && (
            <BotonConfirmar
              etiqueta="Anular entrega" variante="outline"
              titulo="¿Anular la entrega?" descripcion={`Podrás corregir ${quien} entrega y volver a enviarla. Si la reenvías después del plazo, quedará con retraso.`}
              confirmar="Anular entrega" accion={anularEntregaAction.bind(null, slug, id, alumnoId)}
            />
          )}
      </section>

      <section aria-labelledby="comentarios" className="flex flex-col gap-3">
          <TituloBloque id="comentarios">Comentarios</TituloBloque>
          {d.comentarios.length === 0 && <p className="text-cuerpo-sm text-muted-foreground">Aún no hay comentarios.</p>}
          <ul className="flex flex-col divide-y divide-borde-sutil">
            {d.comentarios.map((c) => (
              <li key={c.id} className="py-3 text-sm">
                <p className="text-cuerpo-sm text-muted-foreground">{c.autor}{c.esDocente ? " (profesor)" : ""} · {cuando(c.createdAt)} · {c.privado ? "Privado" : "Para todos"}</p>
                <p className="whitespace-pre-line">{c.texto}</p>
              </li>
            ))}
          </ul>
          <FormularioEnLinea accion={comentarTareaAction.bind(null, slug, id)} className="flex flex-col gap-2" etiqueta="Nuevo comentario">
            <input type="hidden" name="alumnoId" value={alumnoId} />
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Escribe al profesor (privado)</span>
              <Textarea name="texto" rows={2} maxLength={MAX_COMENTARIO_TAREA} required />
            </label>
            {t.comentariosGenerales && (
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="general" className="size-5 accent-primary" />Publicar para toda la clase</label>
            )}
            <div><Button type="submit" variant="outline">Enviar comentario</Button></div>
          </FormularioEnLinea>
      </section>
    </div>
  );
}
