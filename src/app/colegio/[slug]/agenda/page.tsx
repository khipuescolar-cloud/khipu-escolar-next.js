import { BookOpenCheck, CalendarDays, ChevronLeft, ChevronRight, Download, Flag, ListTodo, Pencil, PartyPopper, Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { DialogoAccion } from "@/components/academico/DialogoAccion";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Alerta } from "@/components/ui/Alerta";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cuadriculaMes, diasDeSemana, esFechaIso, fechaLima, formatoDia, formatoHora, inicioDiaLima, lunesDeSemana, sumarDias } from "@/lib/fechas";
import { itemsDeAgenda, salonesParaEventos, type ItemAgenda } from "@/lib/server/agenda";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { actualizarEventoAction, crearEventoAction, eliminarEventoAction } from "./actions";

export const metadata: Metadata = { title: "Agenda" };

const TIPOS = {
  evento: { palabra: "Evento", Icono: CalendarDays, clase: "bg-muted text-foreground" },
  reunion: { palabra: "Reunión", Icono: Users, clase: "bg-accent text-accent-foreground" },
  examen: { palabra: "Examen", Icono: BookOpenCheck, clase: "bg-falta-fondo text-falta" },
  feriado: { palabra: "Feriado", Icono: Flag, clase: "bg-problema-fondo text-problema" },
  actividad: { palabra: "Actividad", Icono: PartyPopper, clase: "bg-llego-fondo text-llego" },
  entrega: { palabra: "Entrega de tarea", Icono: ListTodo, clase: "bg-tarde-fondo text-tarde" },
} as const;

function OpcionesTipo() {
  return (
    <>
      <option value="evento">Evento</option><option value="reunion">Reunión</option><option value="examen">Examen</option>
      <option value="feriado">Feriado</option><option value="actividad">Actividad</option>
    </>
  );
}

const NOMBRES_DIA = ["L", "M", "M", "J", "V", "S", "D"];

export default async function AgendaPage({ params, searchParams }: PageProps<"/colegio/[slug]/agenda">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "agenda");
  if (!["apoderado", "alumno", "profesor", "direccion", "administrativo"].includes(ctx.rol)) forbidden();

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
  const soloLectura = ctx.rol === "apoderado" || ctx.rol === "alumno";
  const salones = soloLectura ? [] : await salonesParaEventos(ctx);
  const mesAnterior = `${mes === 1 ? anio - 1 : anio}-${String(mes === 1 ? 12 : mes - 1).padStart(2, "0")}-01`;
  const mesSiguiente = `${mes === 12 ? anio + 1 : anio}-${String(mes === 12 ? 1 : mes + 1).padStart(2, "0")}-01`;
  const nombreMes = formatoDia(`${anio}-${String(mes).padStart(2, "0")}-15`, { month: "long", year: "numeric" });
  const puedeCrear = !soloLectura && !(salones.length === 0 && ctx.rol === "profesor");
  const enlaceNav = "inline-flex min-h-10 items-center gap-1 rounded-md px-3 text-sm font-medium text-primary transition-colors hover:bg-accent";

  return (
    <div className="flex flex-col">
      <EncabezadoPagina
        titulo="Agenda"
        descripcion="Eventos del colegio, exámenes y fechas de entrega de tareas."
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
        <div className="mb-4"><Alerta tipo="info">Todavía no tienes salones asignados, por eso no puedes crear eventos.</Alerta></div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="semana" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="semana" className="text-lg font-semibold">
              Semana del {formatoDia(lunes, { day: "numeric", month: "long" })}
            </h2>
            <div className="flex items-center gap-1">
              <Link href={`/agenda?fecha=${sumarDias(lunes, -7)}`} className={enlaceNav}><ChevronLeft className="size-4" strokeWidth={2} aria-hidden />Anterior</Link>
              <Link href="/agenda" className={enlaceNav}>Hoy</Link>
              <Link href={`/agenda?fecha=${sumarDias(lunes, 7)}`} className={enlaceNav}>Siguiente<ChevronRight className="size-4" strokeWidth={2} aria-hidden /></Link>
            </div>
          </div>
          <ul className="flex flex-col gap-3">
            {diasDeSemana(lunes).map((dia) => {
              const delDia = porDia.get(dia) ?? [];
              return (
                <li key={dia} className={`rounded-xl border bg-card p-4 shadow-xs ${dia === hoy ? "border-primary ring-1 ring-primary" : ""}`}>
                  <h3 className="flex items-center gap-2 text-sm font-semibold first-letter:uppercase">
                    {formatoDia(dia)}
                    {dia === hoy && <span className="rounded-pildora bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">Hoy</span>}
                  </h3>
                  {delDia.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">Sin eventos.</p>
                  ) : (
                    <ul className="mt-3 flex flex-col gap-3">
                      {delDia.map((it) => {
                        const { palabra, Icono, clase } = TIPOS[it.tipo];
                        return (
                          <li key={`${it.tipo}-${it.id}`} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border bg-background p-3 text-sm">
                            <div className="flex min-w-0 flex-col gap-1.5">
                              <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-pildora px-2.5 py-1 text-xs font-semibold ${clase}`}>
                                <Icono className="size-3.5" strokeWidth={2} aria-hidden />{palabra}
                              </span>
                              <p className="font-medium">{it.titulo}</p>
                              <p className="text-muted-foreground">{it.tipo === "entrega" ? "" : `${formatoHora(it.inicio)} · `}{it.ambito}</p>
                              {it.descripcion && <p className="text-muted-foreground">{it.descripcion}</p>}
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
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="flex flex-col gap-5">
          <Card>
            <CardContent>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-base font-semibold first-letter:uppercase">{nombreMes}</h2>
                <div className="flex">
                  <Link href={`/agenda?fecha=${mesAnterior}`} aria-label="Mes anterior" className="inline-flex size-10 items-center justify-center rounded-md hover:bg-accent"><ChevronLeft className="size-4" strokeWidth={2} aria-hidden /></Link>
                  <Link href={`/agenda?fecha=${mesSiguiente}`} aria-label="Mes siguiente" className="inline-flex size-10 items-center justify-center rounded-md hover:bg-accent"><ChevronRight className="size-4" strokeWidth={2} aria-hidden /></Link>
                </div>
              </div>
              <table className="w-full text-center text-sm">
                <thead>
                  <tr>{NOMBRES_DIA.map((n, i) => <th key={i} scope="col" className="py-1 text-xs font-medium text-muted-foreground">{n}</th>)}</tr>
                </thead>
                <tbody>
                  {semanas.map((sem) => (
                    <tr key={sem[0]}>
                      {sem.map((d) => {
                        const cantidad = porDia.get(d)?.length ?? 0;
                        const delMes = Number(d.slice(5, 7)) === mes;
                        const enSemana = lunes <= d && d <= sumarDias(lunes, 6);
                        return (
                          <td key={d} className="p-0.5">
                            <Link
                              href={`/agenda?fecha=${d}`}
                              aria-label={`${formatoDia(d, { day: "numeric", month: "long" })}${cantidad ? `, ${cantidad} ${cantidad === 1 ? "evento" : "eventos"}` : ""}`}
                              aria-current={d === hoy ? "date" : undefined}
                              className={`flex h-10 flex-col items-center justify-center rounded-md transition-colors ${d === hoy ? "bg-primary text-primary-foreground" : delMes ? "hover:bg-accent" : "text-muted-foreground opacity-60 hover:bg-accent"} ${enSemana && d !== hoy ? "bg-muted font-semibold" : ""}`}
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
              <p className="mt-2 text-xs text-muted-foreground">Los puntos marcan días con eventos o entregas.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
