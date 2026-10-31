"use client";

import { ArrowRight, CalendarDays, CalendarOff, ClipboardCheck, Clock, GraduationCap, ListTodo, MapPin, NotebookPen, School, TriangleAlert, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatoDia } from "@/lib/fechas";
import { DIAS, NOMBRE_DIA, NOMBRE_DIA_CORTO, minutos, rango, type DiaHorario } from "@/lib/horario";
import { carriles, coloresPorCurso, escalaHoras, fechasDeLaSemana, type ColorCurso, type EventoSemana, type TipoEventoSemana } from "@/lib/horario-calendario";
import type { BloqueVista } from "@/lib/server/horario";
import { cn } from "@/lib/utils";
import { InsigniaAhora } from "./Insignias";

export type AccionBloque = { href: string; texto: string; icono: "lista" | "tareas" | "notas" };
export type BloqueConAcciones = BloqueVista & { acciones: AccionBloque[]; enCruce?: boolean };

const ICONOS = { lista: ClipboardCheck, tareas: ListTodo, notas: GraduationCap } as const;

/** Alto de un minuto en la cuadrícula: una clase de 45 min mide 63 px. */
const PX_MIN = 1.4;

/** Fondo suave + barra izquierda del color del curso; el texto siempre en tinta (el color solo identifica). */
const COLOR: Record<ColorCurso | "sin-curso", { fondo: string; barra: string; muestra: string }> = {
  turquesa: { fondo: "bg-[color-mix(in_oklab,var(--turquesa)_12%,var(--superficie))]", barra: "before:bg-turquesa", muestra: "bg-turquesa" },
  "indigo-cielo": { fondo: "bg-[color-mix(in_oklab,var(--indigo-cielo)_12%,var(--superficie))]", barra: "before:bg-indigo-cielo", muestra: "bg-indigo-cielo" },
  cochinilla: { fondo: "bg-[color-mix(in_oklab,var(--cochinilla)_12%,var(--superficie))]", barra: "before:bg-cochinilla", muestra: "bg-cochinilla" },
  maiz: { fondo: "bg-[color-mix(in_oklab,var(--maiz)_20%,var(--superficie))]", barra: "before:bg-maiz", muestra: "bg-maiz" },
  indigo: { fondo: "bg-[color-mix(in_oklab,var(--indigo)_12%,var(--superficie))]", barra: "before:bg-indigo dark:before:bg-[color-mix(in_oklab,var(--indigo)_55%,white)]", muestra: "bg-indigo dark:bg-[color-mix(in_oklab,var(--indigo)_55%,white)]" },
  "sin-curso": { fondo: "bg-superficie-2", barra: "before:bg-pizarra", muestra: "bg-pizarra" },
};

/** Reuniones y eventos de la agenda: ícono + palabra (nunca solo color) y un estilo propio, distinto de las clases. */
const TIPO_EVENTO: Record<TipoEventoSemana, { palabra: string; Icono: LucideIcon }> = {
  reunion: { palabra: "Reunión", Icono: Users },
  examen: { palabra: "Examen", Icono: NotebookPen },
  feriado: { palabra: "Feriado", Icono: CalendarOff },
  actividad: { palabra: "Actividad", Icono: CalendarDays },
  evento: { palabra: "Evento", Icono: CalendarDays },
};

const etiquetaHora = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
const duracion = (min: number) => (min % 60 === 0 ? `${min / 60} h` : min > 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);

/** Hora del colegio que avanza sola cada minuto (parte de la hora del servidor para no depender del reloj del equipo). */
function useMinutoActual(horaServidor: string) {
  const [min, setMin] = useState(() => minutos(horaServidor));
  useEffect(() => {
    const base = minutos(horaServidor);
    const t0 = Date.now();
    const id = setInterval(() => setMin(base + Math.floor((Date.now() - t0) / 60_000)), 30_000);
    return () => clearInterval(id);
  }, [horaServidor]);
  return min;
}

type Contexto = {
  bloques: BloqueConAcciones[];
  eventos: EventoSemana[];
  fechas: Record<DiaHorario, string>;
  horas: ReturnType<typeof escalaHoras>;
  colores: Map<string, ColorCurso>;
  minAhora: number;
  ahoraId: string | null;
  esHoy: (d: DiaHorario) => boolean;
  /** Clase que ya terminó en la semana en curso (se atenúa, como en Google Calendar). */
  yaPaso: (b: { dia: DiaHorario; horaFin: string }) => boolean;
};

/**
 * Semana de clases en cuadrícula por horas, al estilo de Google Calendar (specs/34): barra con el mes y la semana,
 * columnas de lunes a viernes con su fecha, cada bloque ubicado y medido según su hora y con el color de su curso, las
 * clases ya dictadas atenuadas, línea de la hora actual en el día de hoy y, al tocar un bloque, su detalle con los
 * accesos (pasar lista, tareas, notas). Abajo, la leyenda de cursos con sus horas por semana. En el celular, un día a la vez.
 */
export function CalendarioSemana({ bloques, eventos = [], hoyIso, diaHoy, horaAhora, ahoraId, resumen }: {
  bloques: BloqueConAcciones[]; hoyIso: string; diaHoy: number; horaAhora: string; ahoraId: string | null;
  /** Reuniones y eventos de la agenda de esta semana. */
  eventos?: EventoSemana[];
  /** «Ahora / Después», en la barra superior del calendario. */
  resumen?: ReactNode;
}) {
  const fechas = fechasDeLaSemana(hoyIso);
  const semanaEnCurso = fechas[1] <= hoyIso && hoyIso <= fechas[5];
  const esHoy = (d: DiaHorario) => fechas[d] === hoyIso;
  const minAhora = useMinutoActual(horaAhora);
  const ctx: Contexto = {
    bloques,
    eventos,
    fechas,
    horas: escalaHoras([...bloques, ...eventos.filter((e) => !e.todoElDia)], PX_MIN),
    colores: coloresPorCurso(bloques),
    minAhora,
    ahoraId,
    esHoy,
    yaPaso: (b) => semanaEnCurso && (b.dia < diaHoy || (b.dia === diaHoy && minutos(b.horaFin) <= minAhora)),
  };
  const diaInicial = String(diaHoy >= 1 && diaHoy <= 5 ? diaHoy : 1);
  const mes = formatoDia(fechas[5], { month: "long", year: "numeric" });
  const rangoSemana = fechas[1].slice(0, 7) === fechas[5].slice(0, 7)
    ? `${Number(fechas[1].slice(8))} al ${Number(fechas[5].slice(8))}`
    : `${formatoDia(fechas[1], { day: "numeric", month: "short" })} al ${formatoDia(fechas[5], { day: "numeric", month: "short" })}`;

  return (
    <section aria-labelledby="titulo-semana" className="overflow-hidden rounded-lg border bg-card">
      <header className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="titulo-semana" className="font-heading text-lg font-semibold first-letter:uppercase">{mes}</h2>
          <p className="text-cuerpo-sm text-muted-foreground">Semana del {rangoSemana}</p>
          {!semanaEnCurso && <span className="rounded-pildora border px-2.5 py-0.5 text-etiqueta text-muted-foreground">Próxima semana</span>}
        </div>
        {resumen && <div className="rounded-md bg-muted/50 px-3 py-2 lg:max-w-[55%]">{resumen}</div>}
      </header>

      <div className="hidden lg:block">
        <Cuadricula ctx={ctx} dias={DIAS} />
      </div>
      <Tabs defaultValue={diaInicial} className="gap-0 lg:hidden">
        <TabsList className="w-full rounded-none border-b bg-transparent p-1.5 group-data-horizontal/tabs:h-auto" aria-label="Día de la semana">
          {DIAS.map((d) => (
            <TabsTrigger key={d} value={String(d)} className="min-h-14 flex-col gap-0.5 py-1.5">
              <span aria-hidden className="text-etiqueta font-medium tracking-wide uppercase">{NOMBRE_DIA_CORTO[d]}</span>
              <NumeroDia fecha={fechas[d]} hoy={esHoy(d)} chico />
              <span className="sr-only">{NOMBRE_DIA[d]}{esHoy(d) ? " (hoy)" : ""}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {DIAS.map((d) => (
          <TabsContent key={d} value={String(d)}>
            <Cuadricula ctx={ctx} dias={[d]} sinEncabezado />
          </TabsContent>
        ))}
      </Tabs>

      <Leyenda bloques={bloques} colores={ctx.colores} conEventos={eventos.length > 0} />
    </section>
  );
}

function NumeroDia({ fecha, hoy, chico }: { fecha: string; hoy: boolean; chico?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-full font-heading font-semibold tabular-nums",
        chico ? "size-7 text-cuerpo-sm" : "size-9 text-[1.375rem]",
        hoy ? "bg-primary text-primary-foreground" : "text-foreground",
      )}
    >
      {Number(fecha.slice(8))}
    </span>
  );
}

function Cuadricula({ ctx, dias, sinEncabezado }: { ctx: Contexto; dias: readonly DiaHorario[]; sinEncabezado?: boolean }) {
  const { horas, minAhora, esHoy, fechas } = ctx;
  const alto = horas.alto;
  // Una línea por hora en los tramos a escala (los bordes de las franjas libres también llevan su hora).
  const marcas = [...new Set(horas.tramos.flatMap((t) => (t.libre ? [t.desde, t.hasta] : Array.from({ length: (t.hasta - t.desde) / 60 + 1 }, (_, i) => t.desde + i * 60))))];
  const columnas = { gridTemplateColumns: `3.75rem repeat(${dias.length}, minmax(0, 1fr))` };
  const verAhora = dias.some(esHoy) && minAhora >= horas.inicio && minAhora <= horas.fin;

  return (
    <div>
      {!sinEncabezado && (
        <div className="grid border-b" style={columnas}>
          <span className="self-end px-2 pb-1.5 text-right text-etiqueta font-normal text-muted-foreground">Hora</span>
          {dias.map((d) => (
            <div key={d} className={cn("flex flex-col items-center gap-1 border-l py-2.5", esHoy(d) && "bg-primary/[0.04]")}>
              <span className={cn("text-etiqueta font-medium tracking-wide uppercase", esHoy(d) ? "text-primary" : "text-muted-foreground")}>{NOMBRE_DIA_CORTO[d]}</span>
              <NumeroDia fecha={fechas[d]} hoy={esHoy(d)} />
            </div>
          ))}
        </div>
      )}
      {dias.some((d) => ctx.eventos.some((e) => e.dia === d && e.todoElDia)) && (
        <div className="grid border-b" style={columnas}>
          <span className="px-2 py-2 text-right text-etiqueta leading-tight font-normal text-muted-foreground">Todo el día</span>
          {dias.map((d) => (
            <ul key={d} aria-label={`Todo el día del ${NOMBRE_DIA[d].toLowerCase()}`} className={cn("flex min-w-0 flex-col gap-1 border-l p-1", esHoy(d) && "bg-primary/[0.04]")}>
              {ctx.eventos.filter((e) => e.dia === d && e.todoElDia).map((e) => (
                <li key={e.id} className="h-7"><EventoAgenda e={e} pasado={false} /></li>
              ))}
            </ul>
          ))}
        </div>
      )}
      <div className="grid pt-3 pb-4" style={columnas}>
        {/* Horas a la izquierda, centradas sobre su línea; la hora actual las reemplaza cuando caen cerca. */}
        <div className="relative" style={{ height: alto }} aria-hidden>
          {marcas.filter((m) => !verAhora || Math.abs(m - minAhora) >= 12).map((m) => (
            <span key={m} className="absolute right-2.5 -translate-y-1/2 text-etiqueta font-normal text-muted-foreground tabular-nums" style={{ top: horas.y(m) }}>
              {etiquetaHora(m)}
            </span>
          ))}
          {verAhora && (
            <span className="absolute right-1.5 z-10 -translate-y-1/2 rounded-pildora bg-cochinilla px-1.5 py-px text-etiqueta font-semibold text-background tabular-nums" style={{ top: horas.y(minAhora) }}>
              {etiquetaHora(minAhora)}
            </span>
          )}
        </div>
        {dias.map((d) => <ColumnaDia key={d} ctx={ctx} dia={d} marcas={marcas} alto={alto} />)}
      </div>
    </div>
  );
}

function ColumnaDia({ ctx, dia, marcas, alto }: { ctx: Contexto; dia: DiaHorario; marcas: number[]; alto: number }) {
  const { horas, minAhora, ahoraId, colores, fechas } = ctx;
  const hoy = ctx.esHoy(dia);
  const bloques = ctx.bloques.filter((b) => b.dia === dia);
  const eventos = ctx.eventos.filter((e) => e.dia === dia && !e.todoElDia);
  // Clases, reuniones y eventos comparten carriles: si se cruzan, se reparten el ancho.
  const posicion = carriles([...bloques, ...eventos]);
  const caja = (x: { id: string; horaInicio: string; horaFin: string }) => {
    const { carril, carriles: total } = posicion.get(x.id) ?? { carril: 0, carriles: 1 };
    return { top: y(minutos(x.horaInicio)) + 1, height: Math.max(y(minutos(x.horaFin)) - y(minutos(x.horaInicio)) - 2, 24), left: `${(carril / total) * 100}%`, width: `${100 / total}%` };
  };
  const verLinea = hoy && minAhora >= horas.inicio && minAhora <= horas.fin;
  const y = horas.y;
  return (
    <section aria-label={`${NOMBRE_DIA[dia]} ${formatoDia(fechas[dia], { day: "numeric", month: "long" })}${hoy ? " (hoy)" : ""}`} className={cn("relative border-l", hoy && "bg-primary/[0.04]")} style={{ height: alto }}>
      {marcas.map((m) => <div key={m} aria-hidden className="absolute inset-x-0 border-t" style={{ top: y(m) }} />)}
      {horas.tramos.filter((t) => !t.libre).flatMap((t) => Array.from({ length: (t.hasta - t.desde) / 60 }, (_, i) => t.desde + i * 60 + 30)).map((m) => (
        <div key={`m${m}`} aria-hidden className="absolute inset-x-0 border-t border-dashed border-border/60" style={{ top: y(m) }} />
      ))}
      {horas.tramos.filter((t) => t.libre).map((t) => (
        <div
          key={`l${t.desde}`}
          aria-hidden
          className="absolute inset-x-0 flex items-center justify-center bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--arena)_6px_7px)] text-etiqueta font-normal text-muted-foreground"
          style={{ top: y(t.desde), height: y(t.hasta) - y(t.desde) }}
        >
          <span className="rounded-pildora bg-card px-2">Libre</span>
        </div>
      ))}
      {bloques.length === 0 && eventos.length === 0 ? (
        <p className="absolute inset-x-0 top-3 text-center text-cuerpo-sm text-muted-foreground">Sin clases</p>
      ) : (
        <ul>
          {bloques.map((b) => (
            <li key={b.id} className="absolute px-[3px]" style={caja(b)}>
              <Evento b={b} color={b.cursoId ? colores.get(b.titulo) ?? "indigo" : "sin-curso"} ahora={b.id === ahoraId} pasado={ctx.yaPaso(b)} />
            </li>
          ))}
          {eventos.map((e) => (
            <li key={e.id} className="absolute z-[1] px-[3px]" style={caja(e)}>
              <EventoAgenda e={e} pasado={ctx.yaPaso(e)} />
            </li>
          ))}
        </ul>
      )}
      {verLinea && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 flex -translate-y-1/2 items-center" style={{ top: y(minAhora) }}>
          <span className="-ml-[5px] size-2.5 rounded-full bg-cochinilla" />
          <span className="h-0.5 flex-1 bg-cochinilla" />
        </div>
      )}
    </section>
  );
}

function Evento({ b, color, ahora, pasado }: { b: BloqueConAcciones; color: ColorCurso | "sin-curso"; ahora: boolean; pasado: boolean }) {
  const c = COLOR[color];
  const lugar = `${b.salonNombre}${b.aula ? ` · ${b.aula}` : ""}`;
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          // La barra de color es un ::before para que el borde redondeado no la deforme.
          "relative flex size-full flex-col items-start gap-px overflow-hidden rounded-md py-1 pr-2 pl-3 text-left before:absolute before:inset-y-0 before:left-0 before:w-[3px]",
          "transition-[box-shadow,opacity] duration-150 hover:shadow-[var(--sombra-1)] hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring data-[popup-open]:shadow-[var(--sombra-1)] motion-reduce:transition-none",
          c.fondo,
          c.barra,
          pasado && !ahora && "opacity-60",
          ahora && "shadow-[var(--sombra-1)] ring-2 ring-primary",
          b.enCruce && "outline-2 outline-dashed outline-falta",
        )}
        aria-label={`${b.titulo}, ${b.salonNombre}, ${rango(b)}${ahora ? " (ahora)" : ""}${b.enCruce ? " (se cruza con otra clase)" : ""}`}
      >
        <span className="w-full truncate text-cuerpo-sm leading-snug font-semibold">{b.titulo}</span>
        <span className="w-full truncate text-etiqueta font-normal text-muted-foreground tabular-nums">{b.horaInicio} – {b.horaFin}</span>
        <span className="w-full truncate text-etiqueta font-medium">{lugar}</span>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-[22rem] max-w-[calc(100vw-2rem)] gap-0 p-0">
        <div className="flex items-start gap-3 p-4 pb-3">
          <span aria-hidden className={cn("mt-1.5 size-3 shrink-0 rounded-[3px]", c.muestra)} />
          <div className="flex min-w-0 flex-col gap-0.5">
            {ahora && <InsigniaAhora />}
            <p className="font-heading text-cuerpo font-semibold">{b.titulo}</p>
            <p className="text-cuerpo-sm text-muted-foreground">{NOMBRE_DIA[b.dia]} · <span className="tabular-nums">{b.horaInicio} – {b.horaFin}</span></p>
          </div>
        </div>
        <ul className="flex flex-col gap-2 px-4 pb-4 pl-10 text-cuerpo-sm">
          <li className="flex items-center gap-2.5"><School className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden />{b.salonNombre}</li>
          {b.aula && <li className="flex items-center gap-2.5"><MapPin className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden />{b.aula}</li>}
          <li className="flex items-center gap-2.5"><Clock className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden />{duracion(minutos(b.horaFin) - minutos(b.horaInicio))}</li>
          {b.enCruce && <li className="flex items-center gap-2.5 font-medium text-falta"><TriangleAlert className="size-4" strokeWidth={2} aria-hidden />Se cruza con otra clase</li>}
        </ul>
        {b.acciones.length > 0 && (
          <div className="grid auto-cols-fr grid-flow-col gap-2 border-t bg-muted/40 px-4 py-3">
            {b.acciones.map((a) => {
              const Icono = ICONOS[a.icono];
              return (
                <Link key={a.href} href={a.href} className={cn(buttonVariants({ variant: a.icono === "lista" ? "default" : "outline", size: "sm" }), "px-2")}>
                  <Icono className="size-4" strokeWidth={2} aria-hidden />{a.texto}
                </Link>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Cursos de la semana con su color y sus horas: identifica cada color con su nombre (no solo color). */
function Leyenda({ bloques, colores, conEventos }: { bloques: BloqueConAcciones[]; colores: Map<string, ColorCurso>; conEventos: boolean }) {
  const porCurso = new Map<string, { color: ColorCurso | "sin-curso"; min: number }>();
  for (const b of bloques) {
    const actual = porCurso.get(b.titulo) ?? { color: b.cursoId ? colores.get(b.titulo) ?? "indigo" : "sin-curso", min: 0 };
    actual.min += minutos(b.horaFin) - minutos(b.horaInicio);
    porCurso.set(b.titulo, actual);
  }
  const items = [...porCurso.entries()].sort((a, b) => b[1].min - a[1].min || a[0].localeCompare(b[0], "es"));
  return (
    <footer className="border-t bg-muted/30 px-4 py-3">
      <h3 className="sr-only">Cursos de la semana</h3>
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-cuerpo-sm">
        {items.map(([titulo, { color, min }]) => (
          <li key={titulo} className="inline-flex items-center gap-2">
            <span aria-hidden className={cn("size-2.5 rounded-[3px]", COLOR[color].muestra)} />
            <span className="font-medium">{titulo}</span>
            <span className="text-muted-foreground tabular-nums">{duracion(min)}</span>
          </li>
        ))}
        {conEventos && (
          <li className="inline-flex items-center gap-2">
            <span aria-hidden className="size-2.5 rounded-[3px] border border-dashed border-primary" />
            <span className="font-medium">Reuniones y eventos de la agenda</span>
          </li>
        )}
      </ul>
    </footer>
  );
}

/** Reunión o evento de la agenda: borde punteado del color principal sobre la superficie, con ícono y tipo. */
function EventoAgenda({ e, pasado }: { e: EventoSemana; pasado: boolean }) {
  const { palabra, Icono } = TIPO_EVENTO[e.tipo];
  const horario = e.todoElDia ? "Todo el día" : `${e.horaInicio} – ${e.horaFin}`;
  // Eventos cortos (≤ 35 min): una sola línea con la hora delante, para que no se corte el texto.
  const unaLinea = e.todoElDia || minutos(e.horaFin) - minutos(e.horaInicio) <= 35;
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex size-full min-w-0 flex-col items-start gap-px overflow-hidden rounded-md border border-dashed border-primary/60 bg-card px-2 text-left",
          unaLinea ? "justify-center py-0.5" : "py-1",
          "transition-[box-shadow,opacity] duration-150 hover:opacity-100 hover:shadow-[var(--sombra-1)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring data-[popup-open]:shadow-[var(--sombra-1)] motion-reduce:transition-none",
          pasado && "opacity-60",
        )}
        aria-label={`${palabra}: ${e.titulo}, ${horario}`}
      >
        <span className="flex w-full min-w-0 items-center gap-1.5 text-cuerpo-sm leading-snug font-semibold">
          <Icono className="size-3.5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
          {unaLinea && !e.todoElDia && <span className="shrink-0 font-normal text-muted-foreground tabular-nums">{e.horaInicio}</span>}
          <span className="truncate">{e.titulo}</span>
        </span>
        {!unaLinea && <span className="w-full truncate text-etiqueta font-normal text-muted-foreground tabular-nums">{palabra} · {horario}</span>}
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-[22rem] max-w-[calc(100vw-2rem)] gap-0 p-0">
        <div className="flex items-start gap-3 p-4 pb-3">
          <Icono className="mt-1 size-4 shrink-0 text-primary" strokeWidth={2} aria-hidden />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-etiqueta font-medium text-primary uppercase">{palabra}</p>
            <p className="font-heading text-cuerpo font-semibold">{e.titulo}</p>
            <p className="text-cuerpo-sm text-muted-foreground">{NOMBRE_DIA[e.dia]} · <span className="tabular-nums">{horario}</span></p>
          </div>
        </div>
        <ul className="flex flex-col gap-2 px-4 pb-4 pl-11 text-cuerpo-sm">
          <li className="flex items-center gap-2.5"><School className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden />{e.ambito}</li>
          {e.lugar && <li className="flex items-center gap-2.5"><MapPin className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden />{e.lugar}</li>}
          {e.descripcion && <li className="text-muted-foreground">{e.descripcion}</li>}
        </ul>
        <div className="border-t bg-muted/40 px-4 py-3">
          <Link href={e.href ?? "/agenda"} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            {e.href ? "Ver la reunión" : "Ver en la agenda"}<ArrowRight className="size-4" strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
