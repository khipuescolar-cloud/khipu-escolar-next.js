import { BookOpenCheck, CalendarDays, ChevronLeft, ChevronRight, Download, Flag, ListTodo, Pencil, PartyPopper, Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { FormAccion } from "@/components/FormAccion";
import { Alerta } from "@/components/ui/Alerta";
import { Campo } from "@/components/ui/Campo";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { cuadriculaMes, diasDeSemana, esFechaIso, fechaLima, formatoDia, formatoHora, inicioDiaLima, lunesDeSemana, sumarDias } from "@/lib/fechas";
import { itemsDeAgenda, salonesParaEventos, type ItemAgenda } from "@/lib/server/agenda";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { actualizarEventoAction, crearEventoAction, eliminarEventoAction } from "./actions";

export const metadata: Metadata = { title: "Agenda" };

const TIPOS = {
  evento: { palabra: "Evento", Icono: CalendarDays },
  reunion: { palabra: "Reunión", Icono: Users },
  examen: { palabra: "Examen", Icono: BookOpenCheck },
  feriado: { palabra: "Feriado", Icono: Flag },
  actividad: { palabra: "Actividad", Icono: PartyPopper },
  entrega: { palabra: "Entrega de tarea", Icono: ListTodo },
} as const;

const NOMBRES_DIA = ["L", "M", "M", "J", "V", "S", "D"];

export default async function AgendaPage({ params, searchParams }: PageProps<"/colegio/[slug]/agenda">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "agenda");
  if (ctx.rol !== "apoderado" && ctx.rol !== "profesor" && ctx.rol !== "direccion") forbidden();

  const hoy = fechaLima(new Date());
  const f = Array.isArray(sp.fecha) ? sp.fecha[0] : sp.fecha;
  const fecha = esFechaIso(f) ? f : hoy;
  const lunes = lunesDeSemana(fecha);
  const [anio, mes] = fecha.split("-").map(Number);
  const semanas = cuadriculaMes(anio, mes);

  // Una sola consulta cubre la semana y el mes mostrados.
  const desde = inicioDiaLima(semanas[0][0] < lunes ? semanas[0][0] : lunes);
  const ultimo = semanas[semanas.length - 1][6];
  const hasta = inicioDiaLima(sumarDias(ultimo > sumarDias(lunes, 6) ? ultimo : sumarDias(lunes, 6), 1));
  const items = await itemsDeAgenda(ctx, desde, hasta);
  const porDia = new Map<string, ItemAgenda[]>();
  for (const it of items) {
    const d = fechaLima(it.inicio);
    porDia.set(d, [...(porDia.get(d) ?? []), it]);
  }
  const salones = ctx.rol === "apoderado" ? [] : await salonesParaEventos(ctx);
  const mesAnterior = `${mes === 1 ? anio - 1 : anio}-${String(mes === 1 ? 12 : mes - 1).padStart(2, "0")}-01`;
  const mesSiguiente = `${mes === 12 ? anio + 1 : anio}-${String(mes === 12 ? 1 : mes + 1).padStart(2, "0")}-01`;
  const nombreMes = formatoDia(`${anio}-${String(mes).padStart(2, "0")}-15`, { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Agenda</h1>
        <p className="text-sm text-pizarra">Eventos del colegio, exámenes y fechas de entrega de tareas.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="semana" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="semana" className="text-lg font-semibold">
              Semana del {formatoDia(lunes, { day: "numeric", month: "long" })}
            </h2>
            <div className="flex items-center gap-1 text-sm font-semibold">
              <Link href={`/agenda?fecha=${sumarDias(lunes, -7)}`} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-acento hover:bg-superficie-2"><ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />Anterior</Link>
              <Link href="/agenda" className="rounded-md px-2 py-1.5 text-acento hover:bg-superficie-2">Hoy</Link>
              <Link href={`/agenda?fecha=${sumarDias(lunes, 7)}`} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-acento hover:bg-superficie-2">Siguiente<ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden /></Link>
            </div>
          </div>
          <a href="/api/agenda.ics" className="inline-flex items-center gap-2 self-start text-sm font-semibold text-acento">
            <Download className="h-4 w-4" strokeWidth={2} aria-hidden />Descargar calendario (.ics)
          </a>
          <ul className="flex flex-col gap-3">
            {diasDeSemana(lunes).map((dia) => {
              const delDia = porDia.get(dia) ?? [];
              return (
                <li key={dia} className={`rounded-lg border bg-superficie p-4 ${dia === hoy ? "border-acento" : "border-arena"}`}>
                  <h3 className="text-sm font-semibold capitalize">{formatoDia(dia)}{dia === hoy ? " · Hoy" : ""}</h3>
                  {delDia.length === 0 ? (
                    <p className="mt-1 text-sm text-pizarra">Sin eventos.</p>
                  ) : (
                    <ul className="mt-2 flex flex-col gap-2">
                      {delDia.map((it) => {
                        const { palabra, Icono } = TIPOS[it.tipo];
                        return (
                          <li key={`${it.tipo}-${it.id}`} className="flex flex-wrap items-start justify-between gap-2 text-sm">
                            <div className="flex items-start gap-2">
                              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pildora bg-superficie-2 px-2.5 py-1 text-xs font-semibold">
                                <Icono className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />{palabra}
                              </span>
                              <div>
                                <p className="font-medium">{it.titulo}</p>
                                <p className="text-pizarra">{it.tipo === "entrega" ? "" : `${formatoHora(it.inicio)} · `}{it.ambito}</p>
                                {it.descripcion && <p className="text-pizarra">{it.descripcion}</p>}
                              </div>
                            </div>
                            {it.eliminable && <FormAccion accion={eliminarEventoAction.bind(null, slug, it.id)} etiqueta="Eliminar" variante="fantasma" className="contents" />}
                            {it.eliminable && (
                              <details className="w-full rounded-md border border-arena p-3">
                                <summary className="flex cursor-pointer items-center gap-2 font-semibold text-acento"><Pencil className="h-4 w-4" strokeWidth={2} aria-hidden />Editar evento</summary>
                                <FormAccion accion={actualizarEventoAction.bind(null, slug, it.id)} etiqueta="Guardar cambios" className="mt-3 flex flex-col gap-3">
                                  <Campo etiqueta="Nombre del evento" id={`titulo-${it.id}`} name="titulo" required maxLength={150} defaultValue={it.titulo} />
                                  <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">Tipo</span>
                                    <select name="tipo" defaultValue={it.tipo} className="rounded-md border border-arena bg-superficie px-3 py-2.5">
                                      <option value="evento">Evento</option><option value="reunion">Reunión</option><option value="examen">Examen</option>
                                      <option value="feriado">Feriado</option><option value="actividad">Actividad</option>
                                    </select>
                                  </label>
                                  <Campo etiqueta="Día" id={`fecha-${it.id}`} name="fecha" type="date" required defaultValue={fechaLima(it.inicio)} />
                                  <Campo etiqueta="Hora de inicio" id={`hora-${it.id}`} name="hora" type="time" defaultValue={formatoHora(it.inicio)} />
                                  <label className="flex flex-col gap-1.5 text-sm">
                                    <span className="font-medium">Descripción (opcional)</span>
                                    <textarea name="descripcion" rows={2} maxLength={1000} defaultValue={it.descripcion ?? ""} className="rounded-md border border-arena bg-superficie px-3 py-2.5 text-base" />
                                  </label>
                                </FormAccion>
                              </details>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="flex flex-col gap-5">
          <Tarjeta className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-semibold capitalize">{nombreMes}</h2>
              <div className="flex">
                <Link href={`/agenda?fecha=${mesAnterior}`} aria-label="Mes anterior" className="rounded-md p-1.5 hover:bg-superficie-2"><ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden /></Link>
                <Link href={`/agenda?fecha=${mesSiguiente}`} aria-label="Mes siguiente" className="rounded-md p-1.5 hover:bg-superficie-2"><ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden /></Link>
              </div>
            </div>
            <table className="w-full text-center text-sm">
              <thead>
                <tr>{NOMBRES_DIA.map((n, i) => <th key={i} scope="col" className="py-1 text-xs font-medium text-pizarra">{n}</th>)}</tr>
              </thead>
              <tbody>
                {semanas.map((sem) => (
                  <tr key={sem[0]}>
                    {sem.map((d) => {
                      const cantidad = porDia.get(d)?.length ?? 0;
                      const delMes = Number(d.slice(5, 7)) === mes;
                      return (
                        <td key={d} className="p-0.5">
                          <Link
                            href={`/agenda?fecha=${d}`}
                            aria-label={`${formatoDia(d, { day: "numeric", month: "long" })}${cantidad ? `, ${cantidad} ${cantidad === 1 ? "evento" : "eventos"}` : ""}`}
                            aria-current={d === hoy ? "date" : undefined}
                            className={`flex h-9 flex-col items-center justify-center rounded-md ${d === hoy ? "bg-acento text-sobre-acento" : delMes ? "hover:bg-superficie-2" : "text-pizarra opacity-60 hover:bg-superficie-2"} ${lunes <= d && d <= sumarDias(lunes, 6) && d !== hoy ? "bg-superficie-2 font-semibold" : ""}`}
                          >
                            <span>{Number(d.slice(8))}</span>
                            {cantidad > 0 && <span aria-hidden className="text-[10px] leading-none">{"•".repeat(Math.min(cantidad, 3))}</span>}
                          </Link>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-pizarra">Los puntos marcan días con eventos o entregas.</p>
          </Tarjeta>

          {ctx.rol !== "apoderado" && (
            <Tarjeta className="p-4">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><Plus className="h-5 w-5" strokeWidth={2} aria-hidden />Nuevo evento</h2>
              {salones.length === 0 && ctx.rol === "profesor" ? (
                <Alerta tipo="info">Todavía no tienes salones asignados.</Alerta>
              ) : (
                <FormAccion accion={crearEventoAction.bind(null, slug)} etiqueta="Crear evento">
                  <Campo etiqueta="Título" name="titulo" required maxLength={150} />
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Tipo</span>
                    <select name="tipo" className="rounded-md border border-arena bg-superficie px-3 py-2.5">
                      <option value="evento">Evento</option><option value="reunion">Reunión</option><option value="examen">Examen</option>
                      <option value="feriado">Feriado</option><option value="actividad">Actividad</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Para</span>
                    <select name="salonId" defaultValue={ctx.rol === "direccion" ? "" : salones[0]?.id} className="rounded-md border border-arena bg-superficie px-3 py-2.5">
                      {ctx.rol === "direccion" && <option value="">Todo el colegio</option>}
                      {salones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </label>
                  <Campo etiqueta="Fecha" name="fecha" type="date" required defaultValue={fecha} />
                  <Campo etiqueta="Hora (opcional)" name="hora" type="time" />
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Descripción (opcional)</span>
                    <textarea name="descripcion" rows={2} maxLength={1000} className="rounded-md border border-arena bg-superficie px-3 py-2.5 text-base" />
                  </label>
                </FormAccion>
              )}
            </Tarjeta>
          )}
        </aside>
      </div>
    </div>
  );
}
