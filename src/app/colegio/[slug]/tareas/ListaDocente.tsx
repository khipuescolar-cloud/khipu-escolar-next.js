import { CheckCircle2, ChevronRight, Folder, FolderOpen, Inbox, MessageSquare, LockOpen, Pencil, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { CamposAdjuntos } from "@/components/adjuntos/CamposAdjuntos";
import { DialogoAccion } from "@/components/academico/DialogoAccion";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { Campo } from "@/components/ui/Campo";
import { Textarea } from "@/components/ui/textarea";
import { momentoEnZona } from "@/lib/fechas";
import { MAX_INSTRUCCIONES } from "@/lib/tareas";
import type { limitesTarea, TareaDocente } from "@/lib/server/tareas";
import { actualizarTareaAction, cerrarTareaAction, eliminarTareaAction, publicarTareaAction } from "./actions";
import { SelectorMaterialesTarea } from "./CamposNuevaTarea";
import { EstadoTarea, FechaEntrega, Revisada } from "./insignias";
import { SeccionFormulario } from "./SeccionFormulario";

// Lista del docente y de dirección (specs/39): mismo lenguaje que la vista del alumno. Pestaña «Cursos» con carpetas
// y, en cada pestaña o carpeta, tarjetas por salón con las tareas agrupadas por curso.

type Seccion = TareaDocente["secciones"][number];
/** Tarea con sus secciones filtradas por la pestaña; `seccionesTodas` conserva todas para «También en …». */
export type TareaLista = TareaDocente & { seccionesTodas?: Seccion[] };
type Material = { id: string; titulo: string; curso: string; salon: string; carpeta: string };
type Comun = { slug: string; zona: string; limites: ReturnType<typeof limitesTarea>; materiales: Material[]; referencias: { tareaId: string; materialId: string }[]; esDireccion: boolean };

const ordenEs = (a: string, b: string) => a.localeCompare(b, "es", { numeric: true });
const enlaceRevision = (t: TareaDocente, s: Seccion) => `/tareas/${t.id}/revision?curso=${s.cursoId}`;

/** «4 por revisar» con relleno (pide atención); sin entregas pendientes, texto neutro. */
function PorRevisar({ n }: { n: number }) {
  if (n === 0) return <span className="text-cuerpo-sm text-muted-foreground">Nada por revisar</span>;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pildora bg-sec-suave px-2.5 py-1 text-etiqueta font-semibold tabular-nums text-sec-tinta">
      <Inbox className="size-3.5" strokeWidth={2} aria-hidden />{n} por revisar
    </span>
  );
}

/** Estudiantes que escribieron y esperan respuesta del docente. */
function SinResponder({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pildora bg-sec-suave px-2.5 py-1 text-etiqueta font-semibold tabular-nums text-sec-tinta">
      <MessageSquare className="size-3.5" strokeWidth={2} aria-hidden />{n === 1 ? "1 comentario sin responder" : `${n} comentarios sin responder`}
    </span>
  );
}

/** Avance de entregas: barra corta + «3/12 entregaron». */
function Avance({ k, revisada = false }: { k: Seccion["contadores"]; revisada?: boolean }) {
  const pct = k.asignados ? Math.round((k.entregaron / k.asignados) * 100) : 0;
  return (
    <span className="inline-flex items-center gap-2 text-cuerpo-sm tabular-nums text-muted-foreground">
      <span aria-hidden className="h-1.5 w-16 overflow-hidden rounded-full bg-borde-sutil"><span className={`block h-full rounded-full ${revisada ? "bg-llego" : "bg-sec-nudo"}`} style={{ width: `${pct}%` }} /></span>
      {k.entregaron}/{k.asignados} entregaron
    </span>
  );
}

/** Pestaña «Cursos»: una carpeta por curso (salón + curso) con sus tareas y lo que falta revisar; abre `/tareas?curso=`. */
export function CarpetasCursos({ carpetas }: { carpetas: { id: string; curso: string; salon: string; tareas: number; porRevisar: number; sinResponder: number }[] }) {
  const orden = [...carpetas].sort((a, b) => ordenEs(a.salon, b.salon) || ordenEs(a.curso, b.curso));
  return (
    <ul aria-label="Cursos" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {orden.map((c) => (
        <li key={c.id} className="min-w-0">
          <Link
            href={`/tareas?curso=${c.id}`}
            className="group/carpeta flex h-full items-start gap-3 rounded-2xl border border-borde-sutil bg-superficie p-4 outline-none transition-[box-shadow,border-color] duration-150 hover:border-sec-trazo/40 hover:shadow-[0_2px_4px_rgb(0_0_0/0.06),0_8px_20px_-8px_rgb(0_0_0/0.18)] focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sec-suave text-sec-tinta">
              <Folder className="size-5 group-hover/carpeta:hidden" strokeWidth={2} aria-hidden />
              <FolderOpen className="hidden size-5 group-hover/carpeta:block" strokeWidth={2} aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-heading text-base font-semibold">{c.salon}</span>
              <span className="line-clamp-2 text-cuerpo-sm text-muted-foreground">{c.curso}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-cuerpo-sm tabular-nums text-muted-foreground">{c.tareas === 0 ? "Sin tareas" : `${c.tareas} ${c.tareas === 1 ? "tarea" : "tareas"}`}</span>
                {c.porRevisar > 0 && <PorRevisar n={c.porRevisar} />}
                {c.sinResponder > 0 && <SinResponder n={c.sinResponder} />}
              </span>
            </span>
            <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover/carpeta:translate-x-0.5 motion-reduce:transition-none" strokeWidth={2} aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Acciones de una fila, en una sola línea alineada a la derecha y a la misma altura: eliminar (ícono, solo si nadie
 * entregó), reabrir (solo tareas cerradas antes), editar y, al extremo, la acción principal (revisar o publicar).
 */
function AccionesTarea({ t, s, c }: { t: TareaDocente; s: Seccion; c: Comun }) {
  const { slug, zona, limites } = c;
  const clave = `${t.id}-${s.id}`;
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {(t.esAutor || c.esDireccion) && !t.tieneEntregas && (
        <BotonConfirmar
          etiqueta={<><Trash2 strokeWidth={2} aria-hidden /><span className="sr-only">Eliminar «{t.titulo}»</span></>}
          variante="outline" tamano="sm" peligro className="w-10 px-0 text-muted-foreground hover:border-falta/40 hover:text-falta"
          titulo="¿Eliminar esta tarea?"
          descripcion="Las familias dejarán de verla. No se puede deshacer."
          confirmar="Eliminar tarea"
          accion={eliminarTareaAction.bind(null, slug, t.id)}
        />
      )}
      {/* Sin botón «Cerrar entregas»: el plazo y «Permitir entregas tardías» deciden el cierre. Solo se ofrece reabrir
          las tareas que se cerraron a mano antes de este cambio, para que ninguna quede bloqueada. */}
      {t.esAutor && t.estado === "cerrada" && (
        <BotonConfirmar
          etiqueta={<><LockOpen strokeWidth={2} aria-hidden />Reabrir</>} variante="outline" tamano="sm"
          titulo="¿Reabrir las entregas?" descripcion="Los estudiantes podrán volver a entregar según el plazo de la tarea."
          confirmar="Reabrir" campos={{ cerrar: "false" }}
          accion={cerrarTareaAction.bind(null, slug, t.id)}
        />
      )}
      {t.esAutor && (
        <DialogoAccion
          disparador={<><Pencil strokeWidth={2} aria-hidden /><span className="sr-only">Editar «{t.titulo}»</span></>}
          variante="outline" tamano="sm" className="w-10 px-0 text-muted-foreground hover:text-foreground" titulo="Editar tarea" etiqueta="Guardar cambios"
          accion={actualizarTareaAction.bind(null, slug, t.id)}
        >
          <SeccionFormulario titulo="La tarea">
            <div className="sm:col-span-2"><Campo etiqueta="Nombre de la tarea" id={`titulo-${clave}`} name="titulo" required maxLength={150} defaultValue={t.titulo} /></div>
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Instrucciones (opcional)</span>
              <Textarea name="descripcion" rows={4} maxLength={MAX_INSTRUCCIONES} defaultValue={t.descripcion ?? ""} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
              <span className="font-medium">Enlaces (uno por línea)</span>
              <Textarea name="enlacesTexto" rows={2} defaultValue={t.enlaces.map((e) => e.url).join("\n")} />
            </label>
            <div className="sm:col-span-2"><CamposAdjuntos id={`adjuntos-${clave}`} existentes={t.adjuntos} maxArchivos={limites.archivos} maxMb={limites.mb} accept={limites.accept} tiposTexto={limites.tiposTexto} etiqueta="Materiales" /></div>
            <SelectorMaterialesTarea materiales={c.materiales} curso={t.curso} elegidosIniciales={c.referencias.filter((r) => r.tareaId === t.id).map((r) => r.materialId)} />
          </SeccionFormulario>
          <SeccionFormulario titulo="Plazo">
            <Campo etiqueta="Día de entrega" id={`fecha-${clave}`} name="fechaEntrega" type="date" defaultValue={t.fechaEntrega ? momentoEnZona(t.fechaEntrega, zona).isoFecha : ""} />
            <Campo etiqueta="Hora límite" id={`hora-${clave}`} name="horaEntrega" type="time" defaultValue={t.fechaEntrega && t.conHora ? momentoEnZona(t.fechaEntrega, zona).hora : ""} />
            <div className="sm:col-span-2"><Campo etiqueta="Motivo del cambio de plazo (si lo cambias)" id={`motivo-${clave}`} name="motivoPlazo" maxLength={300} /></div>
          </SeccionFormulario>
          <SeccionFormulario titulo="Opciones">
            <div className="flex flex-col divide-y divide-borde-sutil rounded-lg border border-borde-sutil sm:col-span-2">
              <label className="flex min-h-11 items-start gap-3 px-3 py-2.5 text-sm"><input type="checkbox" name="permiteTardias" defaultChecked={t.permiteTardias} className="mt-0.5 size-5 accent-primary" /><span><span className="font-medium">Permitir entregas tardías</span><span className="block text-muted-foreground">Desmárcala y, al vencer el plazo, la tarea deja de recibir entregas.</span></span></label>
              <label className="flex min-h-11 items-center gap-3 px-3 text-sm"><input type="checkbox" name="comentariosGenerales" defaultChecked={t.comentariosGenerales} className="size-5 accent-primary" />Comentarios generales</label>
            </div>
          </SeccionFormulario>
        </DialogoAccion>
      )}
      {t.estado === "borrador" && t.esAutor && (
        <BotonConfirmar
          etiqueta={<><Send strokeWidth={2} aria-hidden />Publicar</>} variante="default" tamano="sm"
          titulo="¿Publicar esta tarea?" descripcion="Los destinatarios la verán y recibirán un aviso." confirmar="Publicar"
          accion={publicarTareaAction.bind(null, slug, t.id)}
        />
      )}
    </div>
  );
}

/** Nudo del estado: check verde (todo revisado), relleno (hay por revisar), anillo (sin entregas por revisar, borrador o programada), gris (cerrada o archivada). */
/** Todas las entregas de esta sección están revisadas (ninguna por revisar y al menos una revisada). */
const estaRevisada = (t: TareaDocente, s: Seccion) =>
  !t.programada && (t.estado === "publicada" || t.estado === "cerrada") && s.contadores.porRevisar === 0 && s.contadores.revisadas > 0;

function Nudo({ t, s }: { t: TareaDocente; s: Seccion }) {
  if (estaRevisada(t, s)) return <CheckCircle2 aria-hidden className="mt-1 size-4 shrink-0 text-llego" strokeWidth={2.5} />;
  const clase = t.estado === "borrador" || t.programada
    ? "border-muted-foreground/50 bg-superficie"
    : t.estado === "publicada" ? (s.contadores.porRevisar > 0 ? "border-sec-nudo bg-sec-nudo" : "border-sec-trazo bg-superficie") : "border-borde-sutil bg-borde-sutil";
  return <span aria-hidden className="flex size-4 shrink-0 items-center justify-center pt-2"><span className={`size-3 rounded-full border-2 ${clase}`} /></span>;
}

function FilaTarea({ t, s, c }: { t: TareaLista; s: Seccion; c: Comun }) {
  const otras = (t.seccionesTodas ?? t.secciones).filter((x) => x.id !== s.id).map((x) => x.salon);
  const borrador = t.estado === "borrador";
  const revisada = estaRevisada(t, s);
  const contenido = (
    <>
      <Nudo t={t} s={s} />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-cuerpo font-medium text-pretty">{t.titulo}</span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {(borrador || t.programada || t.estado !== "publicada") && <EstadoTarea estado={t.estado} programada={t.programada} />}
          {revisada && <Revisada />}
          <FechaEntrega fecha={s.fechaPropia ?? t.fechaEntrega} conHora={t.conHora} vencida={s.vencida} neutra={revisada} />
          {!borrador && s.contadores.porRevisar > 0 && <PorRevisar n={s.contadores.porRevisar} />}
          {s.comentariosSinResponder > 0 && <SinResponder n={s.comentariosSinResponder} />}
        </span>
        {!borrador && <Avance k={s.contadores} revisada={revisada} />}
        {otras.length > 0 && <span className="text-etiqueta text-muted-foreground">También en {otras.join(", ")}</span>}
      </span>
    </>
  );
  return (
    <li className="flex flex-col py-1 sm:flex-row sm:items-start sm:gap-1">
      {borrador ? (
        <div className="flex min-w-0 flex-1 items-start gap-3 px-3 py-2.5">{contenido}</div>
      ) : (
        <Link
          href={enlaceRevision(t, s)}
          className="group/fila flex min-w-0 flex-1 items-start gap-3 rounded-lg px-3 py-2.5 outline-none transition-colors duration-150 hover:bg-sec-suave/70 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
        >
          {contenido}
          <span className="sr-only">Revisar entregas de {s.salon}</span>
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover/fila:translate-x-0.5 motion-reduce:transition-none" strokeWidth={2} aria-hidden />
        </Link>
      )}
      <div className="self-end px-3 pb-2 sm:self-start sm:px-0 sm:pt-1.5 sm:pr-1 sm:pb-0"><AccionesTarea t={t} s={s} c={c} /></div>
    </li>
  );
}

/** Tareas agrupadas por salón (una tarjeta por salón, en dos columnas en escritorio) y, dentro, por curso. */
/** Dentro de una carpeta (un curso de un salón): una sola tarjeta con las tareas, sin repetir salón ni curso. */
export function TareasDeCarpeta({ tareas, comun, etiqueta }: { tareas: TareaLista[]; comun: Comun; etiqueta: string }) {
  const filas = tareas.flatMap((t) => t.secciones.map((s) => ({ t, s })));
  return (
    <section aria-label={etiqueta} className="rounded-2xl border border-borde-sutil bg-superficie p-2">
      <ul className="flex flex-col divide-y divide-borde-sutil">{filas.map(({ t, s }) => <FilaTarea key={s.id} t={t} s={s} c={comun} />)}</ul>
    </section>
  );
}

export function TareasPorSalon({ tareas, comun }: { tareas: TareaLista[]; comun: Comun }) {
  const salones = new Map<string, { nombre: string; cursos: Map<string, { nombre: string; filas: { t: TareaLista; s: Seccion }[] }> }>();
  for (const t of tareas) {
    for (const s of t.secciones) {
      const salon = salones.get(s.salonId) ?? { nombre: s.salon, cursos: new Map() };
      const curso = salon.cursos.get(s.cursoId) ?? { nombre: s.curso, filas: [] };
      curso.filas.push({ t, s });
      salon.cursos.set(s.cursoId, curso);
      salones.set(s.salonId, salon);
    }
  }
  const lista = [...salones.entries()].sort(([, a], [, b]) => ordenEs(a.nombre, b.nombre));
  return (
    <div className="gap-x-6 lg:columns-2">
      {lista.map(([salonId, salon]) => {
        const cursos = [...salon.cursos.entries()].sort(([, a], [, b]) => ordenEs(a.nombre, b.nombre));
        const total = cursos.reduce((n, [, x]) => n + x.filas.length, 0);
        const porRevisar = cursos.reduce((n, [, x]) => n + x.filas.reduce((m, f) => m + f.s.contadores.porRevisar, 0), 0);
        return (
          <section key={salonId} aria-labelledby={`salon-${salonId}`} className="mb-6 break-inside-avoid rounded-2xl border border-borde-sutil bg-superficie p-2">
            <header className="flex items-baseline justify-between gap-3 px-3 pt-2 pb-1">
              <h2 id={`salon-${salonId}`} className="flex items-center gap-2 font-heading text-base font-semibold"><span aria-hidden className="size-2 shrink-0 rounded-full bg-sec-nudo" />{salon.nombre}</h2>
              <span className="shrink-0 text-cuerpo-sm tabular-nums text-muted-foreground">{total} {total === 1 ? "tarea" : "tareas"}{porRevisar > 0 ? ` · ${porRevisar} por revisar` : ""}</span>
            </header>
            {cursos.map(([cursoId, curso]) => (
              <div key={cursoId} className="flex flex-col">
                <h3 id={`curso-${salonId}-${cursoId}`} className="px-3 pt-2 text-cuerpo-sm font-medium text-sec-tinta">{curso.nombre}</h3>
                <ul aria-labelledby={`curso-${salonId}-${cursoId}`} className="flex flex-col divide-y divide-borde-sutil">
                  {curso.filas.map(({ t, s }) => <FilaTarea key={s.id} t={t} s={s} c={comun} />)}
                </ul>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
