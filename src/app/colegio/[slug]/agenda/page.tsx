import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Download, Grid3x3, List, Pencil, Plus, Rows3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import type { ReactNode } from "react";
import { DialogoAccion } from "@/components/academico/DialogoAccion";
import { NavegacionPildoras } from "@/components/academico/NavegacionPildoras";
import { ListaAdjuntos } from "@/components/adjuntos/ListaAdjuntos";
import { GrillaTiempo } from "@/components/calendario/GrillaTiempo";
import { estiloDe } from "@/components/calendario/estilos";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Alerta } from "@/components/ui/Alerta";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FILTROS, NOMBRE_DIA_SEMANA_CORTO, NOMBRE_FILTRO, NOMBRE_VISTA, VISTAS, itemCalendarioDe, leerEstadoAgenda, porFecha, rangoDeVista, resumenCelda, urlAgenda,
  type FiltroAgenda, type ItemCalendario, type VistaAgenda,
} from "@/lib/agenda-calendario";
import { instanteEnZona } from "@/lib/dias-habiles";
import { fechaLima, formatoDia, formatoHora, sumarDias } from "@/lib/fechas";
import { minutos } from "@/lib/horario";
import { itemsDeAgenda, salonesParaEventos, salonesParaFiltro, type ItemAgenda } from "@/lib/server/agenda";
import { ahoraDelColegio } from "@/lib/server/horario";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { cn } from "@/lib/utils";
import { actualizarEventoAction, crearEventoAction, eliminarEventoAction } from "./actions";

export const metadata: Metadata = { title: "Agenda" };

const ICONO_VISTA: Record<VistaAgenda, typeof CalendarDays> = { dia: Rows3, semana: CalendarRange, mes: Grid3x3, lista: List };

function OpcionesTipo() {
  return (
    <>
      <option value="evento">Evento</option><option value="reunion">Reunión</option><option value="examen">Examen</option>
      <option value="feriado">Feriado</option><option value="actividad">Actividad</option>
    </>
  );
}

/**
 * Calendario institucional (specs/12, plan Pro): vistas Día, Semana, Mes y Lista; filtros por tipo y por salón; el
 * profesor ve sus clases (proyectadas desde su horario) junto con sus reuniones. Todo el estado va en la URL.
 */
export default async function AgendaPage({ params, searchParams }: PageProps<"/colegio/[slug]/agenda">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "agenda");
  if (!["apoderado", "alumno", "profesor", "direccion", "administrativo"].includes(ctx.rol)) forbidden();

  const zona = ctx.tenant.zonaHoraria;
  const { isoFecha: hoy, hora } = ahoraDelColegio(ctx);
  const estado = leerEstadoAgenda(sp, hoy);
  const verPersonal = ctx.rol === "direccion" || ctx.rol === "administrativo";
  const filtros = FILTROS.filter((f) => f !== "personal" || verPersonal);
  const filtro: FiltroAgenda = filtros.includes(estado.filtro) ? estado.filtro : "todo";
  const { vista, fecha } = estado;
  const salonesFiltro = await salonesParaFiltro(ctx);
  const salon = salonesFiltro.some((s) => s.id === estado.salon) ? estado.salon : undefined;
  const { dias, anterior, siguiente } = rangoDeVista(vista, fecha);

  const items = await itemsDeAgenda(ctx, {
    desde: instanteEnZona(dias[0], "00:00", zona),
    hasta: instanteEnZona(sumarDias(dias[dias.length - 1], 1), "00:00", zona),
    filtros: { filtro, salonId: salon },
    incluirClases: true,
  });
  const cal = items.map((i) => itemCalendarioDe(i, zona));
  const porId = new Map(items.map((i) => [i.id, i]));
  const soloLectura = ctx.rol === "apoderado" || ctx.rol === "alumno";
  const salones = soloLectura ? [] : await salonesParaEventos(ctx);
  const puedeCrear = !soloLectura && !(salones.length === 0 && ctx.rol === "profesor");
  const url = (cambios: Partial<{ vista: VistaAgenda; fecha: string; filtro: FiltroAgenda; salon: string | undefined }>) =>
    urlAgenda({ vista, fecha, filtro, salon, ...cambios });

  // Popover de la grilla: adjuntos y, si el usuario puede editarlo, un enlace a la lista de ese día (los diálogos de
  // edición viven en la vista Lista, fuera del popover).
  const detalles: Record<string, ReactNode> = {};
  for (const it of items) {
    if (it.adjuntos.length === 0 && !it.eliminable) continue;
    detalles[it.id] = (
      <div className="flex flex-col gap-2">
        {it.adjuntos.length > 0 && <ListaAdjuntos adjuntos={it.adjuntos} />}
        {it.eliminable && (
          <Link href={url({ vista: "lista", fecha: fechaLima(it.inicio) })} className="inline-flex w-fit items-center gap-1.5 text-cuerpo-sm font-medium text-indigo-cielo underline-offset-2 hover:underline">
            <Pencil className="size-4" strokeWidth={2} aria-hidden />Editar o eliminar
          </Link>
        )}
      </div>
    );
  }
  const ahoraId = cal.find((c) => c.tipo === "clase" && c.fecha === hoy && minutos(c.horaInicio) <= minutos(hora) && minutos(hora) < minutos(c.horaFin))?.id ?? null;
  // Semana: sábado y domingo solo si tienen algo.
  const diasGrilla = vista === "semana" ? dias.filter((d, i) => i < 5 || cal.some((c) => c.fecha === d)) : dias;
  const etiquetaNav = { dia: "Día", semana: "Semana", mes: "Mes", lista: "Periodo" }[vista];

  return (
    <div className="flex flex-col gap-4">
      <EncabezadoPagina
        titulo="Agenda"
        seccion="academico"
        descripcion={ctx.rol === "profesor" ? "Tus clases, reuniones, evaluaciones, entregas y actividades del colegio." : "Eventos del colegio, reuniones, evaluaciones y fechas de entrega de tareas."}
        acciones={
          <>
            <a href="/api/agenda.ics" className={buttonVariants({ variant: "outline" })}>
              <Download strokeWidth={2} aria-hidden />Descargar calendario (.ics)
            </a>
            {puedeCrear && (
              <DialogoAccion
                disparador={<><Plus strokeWidth={2} aria-hidden />Nuevo evento</>}
                titulo="Nuevo evento"
                descripcion="Lo verán las familias del salón elegido o de todo el colegio."
                etiqueta="Crear evento"
                accion={crearEventoAction.bind(null, slug)}
              >
                <div className="sm:col-span-2"><Campo etiqueta="Título" name="titulo" required maxLength={150} /></div>
                <Selector etiqueta="Tipo" name="tipo"><OpcionesTipo /></Selector>
                <Selector etiqueta="Para" name="salonId" defaultValue={ctx.rol === "profesor" ? salones[0]?.id : ""}>
                  {ctx.rol !== "profesor" && <option value="">Todo el colegio</option>}
                  {salones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </Selector>
                <Campo etiqueta="Fecha" name="fecha" type="date" required defaultValue={fecha} />
                <Campo etiqueta="Hora (opcional)" name="hora" type="time" />
                <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                  <span className="font-medium">Descripción (opcional)</span>
                  <Textarea name="descripcion" rows={3} maxLength={1000} />
                </label>
              </DialogoAccion>
            )}
          </>
        }
      />
      {ctx.rol === "profesor" && salones.length === 0 && (
        <Alerta tipo="info">Todavía no tienes salones asignados, por eso no puedes crear eventos.</Alerta>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Vista del calendario" className="inline-flex w-fit rounded-[10px] border border-borde-sutil bg-card p-1">
            {VISTAS.map((v) => {
              const Icono = ICONO_VISTA[v];
              return (
                <Link
                  key={v}
                  href={url({ vista: v })}
                  aria-current={v === vista ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
                    v === vista ? "bg-sec-suave font-semibold text-sec-tinta" : "text-foreground hover:bg-accent",
                  )}
                >
                  <Icono className="size-4" strokeWidth={2} aria-hidden />{NOMBRE_VISTA[v]}
                </Link>
              );
            })}
          </nav>
          <form action="/agenda" method="get" className="flex items-end gap-2">
            <input type="hidden" name="vista" value={vista} />
            <input type="hidden" name="fecha" value={fecha} />
            {filtro !== "todo" && <input type="hidden" name="filtro" value={filtro} />}
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Curso o sección</span>
              <select name="salon" defaultValue={salon ?? ""} className="min-h-10 rounded-[10px] border border-input bg-card px-3 text-sm">
                <option value="">Todos mis salones</option>
                {salonesFiltro.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </label>
            <button type="submit" className={buttonVariants({ variant: "outline" })}>Ver</button>
          </form>
        </div>
        <NavegacionPildoras
          etiqueta="Filtrar por tipo"
          items={filtros.map((f) => ({ href: url({ filtro: f }), texto: NOMBRE_FILTRO[f], activo: f === filtro }))}
        />
      </div>

      <section aria-labelledby="titulo-periodo" className="overflow-hidden rounded-[14px] border border-borde-sutil bg-card">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-borde-sutil px-4 py-3">
          <h2 id="titulo-periodo" className="font-heading text-lg font-semibold first-letter:uppercase">{tituloPeriodo(vista, fecha, dias)}</h2>
          <div className="flex items-center gap-1">
            <Link href={url({ fecha: anterior })} aria-label={`${etiquetaNav} anterior`} className={enlaceNav}><ChevronLeft className="size-4" strokeWidth={2} aria-hidden />Anterior</Link>
            <Link href={url({ fecha: hoy })} className={enlaceNav}>Hoy</Link>
            <Link href={url({ fecha: siguiente })} aria-label={`${etiquetaNav} siguiente`} className={enlaceNav}>Siguiente<ChevronRight className="size-4" strokeWidth={2} aria-hidden /></Link>
          </div>
        </header>
        {vista === "dia" || vista === "semana" ? (
          <GrillaTiempo dias={diasGrilla} items={cal} hoyIso={hoy} horaAhora={hora} ahoraId={ahoraId} detalles={detalles} textoVacio="Sin actividades" />
        ) : vista === "mes" ? (
          <VistaMes dias={dias} fecha={fecha} hoy={hoy} items={cal} url={url} />
        ) : (
          <VistaLista items={cal} porId={porId} slug={slug} />
        )}
      </section>
      <Leyenda />
    </div>
  );
}

const enlaceNav = "inline-flex min-h-10 items-center gap-1 rounded-md px-3 text-sm font-medium text-indigo-cielo transition-colors hover:bg-accent";

function tituloPeriodo(vista: VistaAgenda, fecha: string, dias: string[]): string {
  if (vista === "dia") return formatoDia(fecha);
  if (vista === "semana") {
    const [a, b] = [dias[0], dias[6]];
    return a.slice(0, 7) === b.slice(0, 7)
      ? `Semana del ${Number(a.slice(8))} al ${formatoDia(b, { day: "numeric", month: "long" })}`
      : `Semana del ${formatoDia(a, { day: "numeric", month: "short" })} al ${formatoDia(b, { day: "numeric", month: "short" })}`;
  }
  if (vista === "mes") return formatoDia(`${fecha.slice(0, 7)}-15`, { month: "long", year: "numeric" });
  return `Próximos 30 días desde el ${formatoDia(fecha, { day: "numeric", month: "long" })}`;
}

function Insignia({ it }: { it: Pick<ItemCalendario, "tipo" | "subtipo"> }) {
  const { palabra, Icono, tinta } = estiloDe(it);
  return (
    <span className={cn("inline-flex w-fit shrink-0 items-center gap-1.5 text-etiqueta font-semibold", tinta)}>
      <Icono className="size-3.5" strokeWidth={2} aria-hidden />{palabra}
    </span>
  );
}

/** Mes en cuadrícula: hasta 3 ítems por día y «N más»; el día lleva a la vista Día. */
function VistaMes({ dias, fecha, hoy, items, url }: {
  dias: string[]; fecha: string; hoy: string; items: ItemCalendario[];
  url: (c: { vista: VistaAgenda; fecha: string }) => string;
}) {
  const mes = fecha.slice(0, 7);
  const delDia = porFecha(items);
  const semanas = Array.from({ length: dias.length / 7 }, (_, i) => dias.slice(i * 7, i * 7 + 7));
  return (
    <table className="w-full table-fixed border-collapse text-sm">
      <thead>
        <tr>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <th key={d} scope="col" className="border-b border-borde-sutil py-2 text-etiqueta font-medium text-muted-foreground">{NOMBRE_DIA_SEMANA_CORTO[d]}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {semanas.map((sem) => (
          <tr key={sem[0]}>
            {sem.map((d) => {
              const lista = delDia.get(d) ?? [];
              const { visibles, mas } = resumenCelda(lista);
              const esHoy = d === hoy;
              return (
                <td key={d} className={cn("h-24 border-t border-l border-borde-sutil p-1 align-top first:border-l-0 lg:h-28", d.slice(0, 7) !== mes && "bg-muted/30", esHoy && "bg-sec-suave/40")}>
                  <Link
                    href={url({ vista: "dia", fecha: d })}
                    aria-label={`${formatoDia(d)}${lista.length ? `, ${lista.length} ${lista.length === 1 ? "actividad" : "actividades"}` : ""}`}
                    aria-current={esHoy ? "date" : undefined}
                    className="flex h-full flex-col gap-0.5 rounded-md p-0.5 transition-colors hover:bg-accent/60"
                  >
                    <span className={cn("inline-flex size-7 items-center justify-center rounded-full text-cuerpo-sm font-semibold tabular-nums", esHoy ? "bg-sec-tinta text-fondo" : d.slice(0, 7) !== mes && "text-muted-foreground")}>
                      {Number(d.slice(8))}
                    </span>
                    {/* En el celular, puntos; desde tablet, hasta 3 ítems y «N más». */}
                    {lista.length > 0 && <span aria-hidden className="text-[10px] leading-none sm:hidden">{"•".repeat(Math.min(lista.length, 3))}</span>}
                    <ul aria-hidden className="hidden flex-col gap-0.5 sm:flex">
                      {visibles.map((it) => {
                        const { Icono, tinta } = estiloDe(it);
                        return (
                          <li key={it.id} className="flex min-w-0 items-center gap-1 text-etiqueta leading-tight">
                            <Icono className={cn("size-3 shrink-0", tinta)} strokeWidth={2} />
                            {!it.todoElDia && <span className="shrink-0 text-muted-foreground tabular-nums">{it.horaInicio}</span>}
                            <span className={cn("truncate", it.cancelado && "line-through")}>{it.titulo}</span>
                          </li>
                        );
                      })}
                      {mas > 0 && <li className="text-etiqueta font-medium text-indigo-cielo">{mas} más</li>}
                    </ul>
                  </Link>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Próximos 30 días agrupados por día, con editar y eliminar para quien creó el evento. */
function VistaLista({ items, porId, slug }: { items: ItemCalendario[]; porId: Map<string, ItemAgenda>; slug: string }) {
  const grupos = [...porFecha(items).entries()];
  if (grupos.length === 0) {
    return <div className="p-4"><EstadoVacio icono={CalendarDays} titulo="Nada programado" descripcion="No hay actividades en estos 30 días con el filtro elegido." /></div>;
  }
  return (
    <ul className="flex flex-col divide-y divide-borde-sutil">
      {grupos.map(([dia, delDia]) => (
        <li key={dia} className="p-4">
          <h3 className="font-heading text-cuerpo font-semibold first-letter:uppercase">{formatoDia(dia)}</h3>
          <ul className="mt-2 flex flex-col divide-y divide-borde-sutil">
            {delDia.map((c) => {
              const it = porId.get(c.id);
              if (!it) return null;
              return (
                <li key={`${c.tipo}-${c.id}`} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <Insignia it={c} />
                    <p className={cn("font-medium", c.cancelado && "line-through")}>{c.titulo}</p>
                    <p className="text-muted-foreground">{c.todoElDia ? "" : `${c.horaInicio} – ${c.horaFin} · `}{c.ambito}{c.lugar && c.tipo !== "clase" ? ` · ${c.lugar}` : ""}</p>
                    {c.descripcion && <p className="text-muted-foreground">{c.descripcion}</p>}
                    {c.href && c.tipo === "reunion" && <Link href={c.href} className="w-fit font-medium text-indigo-cielo underline-offset-2 hover:underline">Ver reunión y responder</Link>}
                    {it.adjuntos.length > 0 && <ListaAdjuntos adjuntos={it.adjuntos} />}
                  </div>
                  {it.eliminable && (
                    <div className="flex items-center gap-1">
                      <DialogoAccion
                        disparador={<><Pencil strokeWidth={2} aria-hidden />Editar evento</>}
                        variante="outline" tamano="sm"
                        titulo="Editar evento"
                        etiqueta="Guardar cambios"
                        accion={actualizarEventoAction.bind(null, slug, it.id)}
                      >
                        <div className="sm:col-span-2"><Campo etiqueta="Nombre del evento" id={`titulo-${it.id}`} name="titulo" required maxLength={150} defaultValue={it.titulo} /></div>
                        <Selector etiqueta="Tipo" name="tipo" defaultValue={it.tipo}><OpcionesTipo /></Selector>
                        <Campo etiqueta="Día" id={`fecha-${it.id}`} name="fecha" type="date" required defaultValue={fechaLima(it.inicio)} />
                        <Campo etiqueta="Hora de inicio" id={`hora-${it.id}`} name="hora" type="time" defaultValue={formatoHora(it.inicio)} />
                        <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                          <span className="font-medium">Descripción (opcional)</span>
                          <Textarea name="descripcion" rows={3} maxLength={1000} defaultValue={it.descripcion ?? ""} />
                        </label>
                      </DialogoAccion>
                      <BotonConfirmar
                        etiqueta="Eliminar" variante="ghost" tamano="sm" peligro
                        titulo="¿Eliminar este evento?"
                        descripcion="Las familias dejarán de verlo en la agenda. No se puede deshacer."
                        confirmar="Eliminar evento"
                        accion={eliminarEventoAction.bind(null, slug, it.id)}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

/** Qué significa cada ícono (palabra + ícono, no solo color). */
function Leyenda() {
  const tipos: Pick<ItemCalendario, "tipo" | "subtipo">[] = [
    { tipo: "clase" }, { tipo: "reunion" }, { tipo: "evaluacion" }, { tipo: "entrega" }, { tipo: "evento", subtipo: "actividad" }, { tipo: "evento", subtipo: "feriado" },
  ];
  return (
    <ul aria-label="Tipos de la agenda" className="flex flex-wrap gap-2">
      {tipos.map((t) => <li key={`${t.tipo}-${t.subtipo ?? ""}`}><Insignia it={t} /></li>)}
    </ul>
  );
}
