import { CheckCircle2, ChevronRight, ClipboardCheck, Inbox, LockOpen, Pencil, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { CamposAdjuntos } from "@/components/adjuntos/CamposAdjuntos";
import { DialogoAccion } from "@/components/academico/DialogoAccion";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { TituloBloque } from "@/components/shell/TituloBloque";
import { buttonVariants } from "@/components/ui/button";
import { Campo } from "@/components/ui/Campo";
import { Textarea } from "@/components/ui/textarea";
import { momentoEnZona } from "@/lib/fechas";
import { agendaDeRevision, HORIZONTE_REVISION_DIAS, MAX_INSTRUCCIONES, type ItemRevision } from "@/lib/tareas";
import type { limitesTarea, TareaDocente } from "@/lib/server/tareas";
import { actualizarTareaAction, cerrarTareaAction, eliminarTareaAction, publicarTareaAction } from "./actions";
import { SelectorMaterialesTarea } from "./CamposNuevaTarea";
import { EstadoTarea, FechaEntrega } from "./insignias";
import { SeccionFormulario } from "./SeccionFormulario";

// Lista del docente y de dirección (specs/39): «Para revisar» arriba y las tareas agrupadas por salón y curso.

type Seccion = TareaDocente["secciones"][number];
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

function FilaAgenda({ item }: { item: ItemRevision<TareaDocente, Seccion> }) {
  const { tarea: t, seccion: s } = item;
  return (
    <li>
      <Link
        href={enlaceRevision(t, s)}
        className="group/fila flex min-h-16 items-center gap-3 rounded-lg px-2 py-3 outline-none transition-colors duration-150 hover:bg-sec-suave focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
      >
        <ClipboardCheck className="size-5 shrink-0 text-sec-trazo" strokeWidth={2} aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-cuerpo font-medium text-pretty">{t.titulo}</span>
          <span className="text-cuerpo-sm text-muted-foreground">{s.curso} · {s.salon}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <FechaEntrega fecha={s.fechaPropia ?? t.fechaEntrega} conHora={t.conHora} vencida={s.vencida} />
            <PorRevisar n={s.contadores.porRevisar} />
            <span className="text-cuerpo-sm tabular-nums text-muted-foreground">{s.contadores.entregaron}/{s.contadores.asignados} entregaron</span>
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover/fila:translate-x-0.5 motion-reduce:transition-none" strokeWidth={2} aria-hidden />
      </Link>
    </li>
  );
}

/** Lo que el docente debe revisar hoy y lo que vence en los próximos días. */
export function AgendaRevision({ tareas, zona }: { tareas: TareaDocente[]; zona: string }) {
  const { hoy, proximos } = agendaDeRevision(tareas, new Date(), zona);
  const columnas = [
    { id: "revisar-hoy", titulo: "Hoy", ayuda: "Vencen hoy o ya vencieron con entregas sin revisar.", items: hoy, vacio: "No tienes entregas por revisar hoy." },
    { id: "revisar-proximos", titulo: `Próximos ${HORIZONTE_REVISION_DIAS} días`, ayuda: "Plazos que vencen pronto: aquí llegarán las próximas entregas.", items: proximos, vacio: "Ninguna tarea vence en los próximos días." },
  ];
  return (
    <section aria-labelledby="para-revisar" className="mb-10 flex flex-col gap-4">
      <TituloBloque id="para-revisar" descripcion="Toca una tarea para abrir sus entregas en ese salón.">Para revisar</TituloBloque>
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
        {columnas.map((c) => (
          <div key={c.id} className="flex flex-col gap-1">
            <h3 id={c.id} className="flex items-baseline gap-2 font-heading text-base font-semibold">
              {c.titulo}<span className="text-cuerpo-sm font-normal tabular-nums text-muted-foreground">{c.items.length}</span>
            </h3>
            <p className="text-cuerpo-sm text-muted-foreground">{c.ayuda}</p>
            {c.items.length === 0 ? (
              <p className="mt-2 flex items-center gap-2 border-t border-borde-sutil pt-3 text-cuerpo text-muted-foreground">
                <CheckCircle2 className="size-5 text-llego" strokeWidth={2} aria-hidden />{c.vacio}
              </p>
            ) : (
              <ul aria-labelledby={c.id} className="mt-1 flex flex-col divide-y divide-borde-sutil border-t border-borde-sutil">
                {c.items.map((item) => <FilaAgenda key={item.seccion.id} item={item} />)}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
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
    <div className="flex w-full shrink-0 items-center gap-2 lg:w-auto lg:justify-end">
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
          disparador={<><Pencil strokeWidth={2} aria-hidden />Editar<span className="sr-only"> «{t.titulo}»</span></>}
          variante="outline" tamano="sm" titulo="Editar tarea" etiqueta="Guardar cambios"
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
      {t.estado === "borrador" ? (
        t.esAutor && (
          <BotonConfirmar
            etiqueta={<><Send strokeWidth={2} aria-hidden />Publicar</>} variante="default" tamano="sm" className="flex-1 lg:w-44 lg:flex-none"
            titulo="¿Publicar esta tarea?" descripcion="Los destinatarios la verán y recibirán un aviso." confirmar="Publicar"
            accion={publicarTareaAction.bind(null, slug, t.id)}
          />
        )
      ) : (
        <Link href={enlaceRevision(t, s)} className={`${buttonVariants({ variant: "default", size: "sm" })} flex-1 lg:w-44 lg:flex-none`}>
          <ClipboardCheck strokeWidth={2} aria-hidden />Revisar entregas<span className="sr-only"> de {s.salon}</span>
        </Link>
      )}
    </div>
  );
}

function FilaTarea({ t, s, c }: { t: TareaDocente; s: Seccion; c: Comun }) {
  const k = s.contadores;
  const otras = t.secciones.filter((x) => x.id !== s.id).map((x) => x.salon);
  return (
    <li className="flex flex-col gap-3 py-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-cuerpo font-semibold text-pretty">{t.titulo}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <EstadoTarea estado={t.estado} programada={t.programada} />
          <FechaEntrega fecha={s.fechaPropia ?? t.fechaEntrega} conHora={t.conHora} vencida={s.vencida} />
          {t.estado !== "borrador" && k.porRevisar > 0 && <PorRevisar n={k.porRevisar} />}
        </div>
        {otras.length > 0 && <p className="text-cuerpo-sm text-muted-foreground">También en {otras.join(", ")}</p>}
        {t.estado !== "borrador" && (
          <div className="mt-1 flex max-w-xl flex-col gap-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-borde-sutil" aria-hidden>
              <div className="h-full rounded-full bg-sec-nudo" style={{ width: `${k.asignados ? Math.round((k.entregaron / k.asignados) * 100) : 0}%` }} />
            </div>
            <p className="text-cuerpo-sm tabular-nums text-muted-foreground" aria-label="Contadores de entrega">
              {k.entregaron}/{k.asignados} entregaron · {k.tarde} con retraso · {k.pendientes} pendientes · {k.devueltas} devueltas · {k.revisadas} revisadas
            </p>
          </div>
        )}
      </div>
      <AccionesTarea t={t} s={s} c={c} />
    </li>
  );
}

/** Tareas agrupadas por salón y, dentro, por curso. Una tarea con varias secciones aparece en cada salón. */
export function TareasPorSalon({ tareas, comun }: { tareas: TareaDocente[]; comun: Comun }) {
  const salones = new Map<string, { nombre: string; cursos: Map<string, { nombre: string; filas: { t: TareaDocente; s: Seccion }[] }> }>();
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
    <div className="flex flex-col gap-10">
      {lista.map(([salonId, salon]) => {
        const cursos = [...salon.cursos.entries()].sort(([, a], [, b]) => ordenEs(a.nombre, b.nombre));
        const total = cursos.reduce((n, [, x]) => n + x.filas.length, 0);
        const porRevisar = cursos.reduce((n, [, x]) => n + x.filas.reduce((m, f) => m + f.s.contadores.porRevisar, 0), 0);
        return (
          <section key={salonId} aria-labelledby={`salon-${salonId}`} className="flex flex-col gap-4">
            <TituloBloque
              id={`salon-${salonId}`}
              accion={<span className="text-cuerpo-sm tabular-nums text-muted-foreground">{total} {total === 1 ? "tarea" : "tareas"}{porRevisar > 0 ? ` · ${porRevisar} por revisar` : ""}</span>}
            >
              {salon.nombre}
            </TituloBloque>
            {cursos.map(([cursoId, curso]) => (
              <div key={cursoId} className="flex flex-col">
                <h3 id={`curso-${salonId}-${cursoId}`} className="text-cuerpo-sm font-semibold text-sec-tinta">{curso.nombre}</h3>
                <ul aria-labelledby={`curso-${salonId}-${cursoId}`} className="flex flex-col divide-y divide-borde-sutil border-b border-borde-sutil">
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
