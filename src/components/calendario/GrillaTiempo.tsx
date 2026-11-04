"use client";

import { ArrowRight, ClipboardCheck, Clock, Coffee, GraduationCap, ListTodo, MapPin, School, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { InsigniaAhora } from "@/components/horario/Insignias";
import { buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NOMBRE_DIA_SEMANA, NOMBRE_DIA_SEMANA_CORTO, type ItemCalendario } from "@/lib/agenda-calendario";
import { formatoDia } from "@/lib/fechas";
import { diaDeSemana, minutos } from "@/lib/horario";
import { carriles, coloresPorCurso, horasVisibles, type ColorCurso, type Jornada } from "@/lib/horario-calendario";
import { cn } from "@/lib/utils";
import { estiloDe } from "./estilos";

const ICONOS_ACCION = { lista: ClipboardCheck, tareas: ListTodo, notas: GraduationCap } as const;

/** Alto de un minuto en la cuadrícula: una clase de 45 min mide 63 px. */
const PX_MIN = 1.4;

/** Fondo suave + barra izquierda del color del curso; el texto siempre en tinta (el color solo identifica). */
export const COLOR: Record<ColorCurso | "sin-curso", { fondo: string; barra: string; muestra: string }> = {
  turquesa: { fondo: "bg-[color-mix(in_oklab,var(--turquesa)_12%,var(--superficie))]", barra: "before:bg-turquesa", muestra: "bg-turquesa" },
  "indigo-cielo": { fondo: "bg-[color-mix(in_oklab,var(--indigo-cielo)_12%,var(--superficie))]", barra: "before:bg-indigo-cielo", muestra: "bg-indigo-cielo" },
  cochinilla: { fondo: "bg-[color-mix(in_oklab,var(--cochinilla)_12%,var(--superficie))]", barra: "before:bg-cochinilla", muestra: "bg-cochinilla" },
  maiz: { fondo: "bg-[color-mix(in_oklab,var(--maiz)_20%,var(--superficie))]", barra: "before:bg-maiz", muestra: "bg-maiz" },
  indigo: { fondo: "bg-[color-mix(in_oklab,var(--indigo)_12%,var(--superficie))]", barra: "before:bg-indigo dark:before:bg-[color-mix(in_oklab,var(--indigo)_55%,white)]", muestra: "bg-indigo dark:bg-[color-mix(in_oklab,var(--indigo)_55%,white)]" },
  "sin-curso": { fondo: "bg-superficie-2", barra: "before:bg-pizarra", muestra: "bg-pizarra" },
};

function escala({ inicio, fin }: { inicio: number; fin: number }) {
  return { inicio, fin, alto: (fin - inicio) * PX_MIN, y: (min: number) => (min - inicio) * PX_MIN };
}

export const etiquetaHora = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
export const duracion = (min: number) => (min % 60 === 0 ? `${min / 60} h` : min > 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);
const nombreDia = (fecha: string) => NOMBRE_DIA_SEMANA[diaDeSemana(fecha)];

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
  items: ItemCalendario[];
  jornada: Jornada | null;
  horas: { inicio: number; fin: number; alto: number; y: (min: number) => number };
  colores: Map<string, ColorCurso>;
  minAhora: number;
  ahoraId: string | null;
  hoyIso: string;
  textoVacio: string;
  detalles: Record<string, ReactNode>;
  /** Ítem que ya terminó (se atenúa, como en Google Calendar). */
  yaPaso: (i: { fecha: string; horaFin: string }) => boolean;
};

/**
 * Grilla de tiempo reutilizable (specs/12 y 34): N días en columnas (1 = día, 5 o 7 = semana), escala por minuto, carriles
 * cuando los ítems se cruzan, fila «Todo el día», línea de la hora actual y detalle en un popover. Las clases llevan el
 * color de su curso; reuniones, eventos, evaluaciones y entregas, borde punteado con ícono + palabra. En el celular, con
 * más de un día, se ve un día a la vez con pestañas.
 */
export function GrillaTiempo({ dias, items, hoyIso, horaAhora, ahoraId = null, jornada = null, detalles = {}, textoVacio = "Sin clases", diaInicial }: {
  /** Fechas AAAA-MM-DD de las columnas. */
  dias: readonly string[];
  items: ItemCalendario[];
  hoyIso: string;
  /** Hora del colegio «HH:mm» (del servidor). */
  horaAhora: string;
  /** Clase en curso (resaltada). */
  ahoraId?: string | null;
  /** Entrada, salida y recreos de las plantillas (solo «Mi horario»). */
  jornada?: Jornada | null;
  /** Contenido extra del popover por id (adjuntos, editar o eliminar), renderizado en el servidor. */
  detalles?: Record<string, ReactNode>;
  /** Texto de una columna sin nada. */
  textoVacio?: string;
  /** Pestaña inicial en el celular (fecha); por defecto hoy si está en el rango, si no el primer día. */
  diaInicial?: string;
}) {
  const minAhora = useMinutoActual(horaAhora);
  const clases = items.filter((i) => i.tipo === "clase");
  const ctx: Contexto = {
    items,
    jornada,
    horas: escala(horasVisibles(items.filter((i) => !i.todoElDia))),
    colores: coloresPorCurso(clases.map((c) => ({ titulo: c.titulo, cursoId: c.cursoId ?? null }))),
    minAhora,
    ahoraId,
    hoyIso,
    textoVacio,
    detalles,
    yaPaso: (i) => i.fecha < hoyIso || (i.fecha === hoyIso && minutos(i.horaFin) <= minAhora),
  };
  if (dias.length === 1) return <Cuadricula ctx={ctx} dias={dias} />;
  const inicial = diaInicial && dias.includes(diaInicial) ? diaInicial : dias.includes(hoyIso) ? hoyIso : dias[0];
  return (
    <>
      <div className="hidden lg:block">
        <Cuadricula ctx={ctx} dias={dias} />
      </div>
      <Tabs defaultValue={inicial} className="gap-0 lg:hidden">
        <TabsList className="w-full rounded-none border-b bg-transparent p-1.5 group-data-horizontal/tabs:h-auto" aria-label="Día de la semana">
          {dias.map((d) => (
            <TabsTrigger key={d} value={d} className="min-h-14 flex-col gap-0.5 px-0.5 py-1.5">
              <span aria-hidden className="text-etiqueta font-medium tracking-wide uppercase">{NOMBRE_DIA_SEMANA_CORTO[diaDeSemana(d)]}</span>
              <NumeroDia fecha={d} hoy={d === hoyIso} chico />
              <span className="sr-only">{nombreDia(d)}{d === hoyIso ? " (hoy)" : ""}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {dias.map((d) => (
          <TabsContent key={d} value={d}>
            <Cuadricula ctx={ctx} dias={[d]} sinEncabezado />
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}

export function NumeroDia({ fecha, hoy, chico }: { fecha: string; hoy: boolean; chico?: boolean }) {
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

function Cuadricula({ ctx, dias, sinEncabezado }: { ctx: Contexto; dias: readonly string[]; sinEncabezado?: boolean }) {
  const { horas, minAhora, hoyIso } = ctx;
  const alto = horas.alto;
  const esHoy = (d: string) => d === hoyIso;
  // Una fila por hora.
  const marcas = Array.from({ length: (horas.fin - horas.inicio) / 60 + 1 }, (_, i) => horas.inicio + i * 60);
  const columnas = { gridTemplateColumns: `3.75rem repeat(${dias.length}, minmax(0, 1fr))` };
  const verAhora = dias.some(esHoy) && minAhora >= horas.inicio && minAhora <= horas.fin;
  const hitos = ctx.jornada ? [minutos(ctx.jornada.entrada), minutos(ctx.jornada.salida)] : [];

  return (
    <div>
      {!sinEncabezado && (
        <div className="grid border-b" style={columnas}>
          <span className="self-end px-2 pb-1.5 text-right text-etiqueta font-normal text-muted-foreground">Hora</span>
          {dias.map((d) => (
            <div key={d} className={cn("flex flex-col items-center gap-1 border-l py-2.5", esHoy(d) && "bg-primary/[0.04]")}>
              <span className={cn("text-etiqueta font-medium tracking-wide uppercase", esHoy(d) ? "text-primary" : "text-muted-foreground")}>{NOMBRE_DIA_SEMANA_CORTO[diaDeSemana(d)]}</span>
              <NumeroDia fecha={d} hoy={esHoy(d)} />
            </div>
          ))}
        </div>
      )}
      {dias.some((d) => ctx.items.some((e) => e.fecha === d && e.todoElDia)) && (
        <div className="grid border-b" style={columnas}>
          <span className="px-2 py-2 text-right text-etiqueta leading-tight font-normal text-muted-foreground">Todo el día</span>
          {dias.map((d) => (
            <ul key={d} aria-label={`Todo el día del ${nombreDia(d).toLowerCase()}`} className={cn("flex min-w-0 flex-col gap-1 border-l p-1", esHoy(d) && "bg-primary/[0.04]")}>
              {ctx.items.filter((e) => e.fecha === d && e.todoElDia).map((e) => (
                <li key={e.id} className="h-7"><ItemAgenda e={e} pasado={false} extra={ctx.detalles[e.id]} /></li>
              ))}
            </ul>
          ))}
        </div>
      )}
      <div className="grid pt-3 pb-4" style={columnas}>
        {/* Horas a la izquierda, centradas sobre su línea; la hora actual las reemplaza cuando caen cerca. */}
        <div className="relative" style={{ height: alto }} aria-hidden>
          {marcas.filter((m) => (!verAhora || Math.abs(m - minAhora) >= 12) && !hitos.some((h) => Math.abs(m - h) < 12)).map((m) => (
            <span key={m} className="absolute right-2.5 -translate-y-1/2 text-etiqueta font-normal text-muted-foreground tabular-nums" style={{ top: horas.y(m) }}>
              {etiquetaHora(m)}
            </span>
          ))}
          {ctx.jornada && [ctx.jornada.entrada, ctx.jornada.salida].map((h) => (
            <span key={h} className="absolute right-1.5 -translate-y-1/2 rounded-pildora border border-primary/40 bg-card px-1.5 text-etiqueta font-semibold text-primary tabular-nums" style={{ top: horas.y(minutos(h)) }}>
              {etiquetaHora(minutos(h))}
            </span>
          ))}
          {verAhora && (
            <span className="absolute right-1.5 z-10 -translate-y-1/2 rounded-pildora bg-cochinilla px-1.5 py-px text-etiqueta font-semibold text-background tabular-nums" style={{ top: horas.y(minAhora) }}>
              {etiquetaHora(minAhora)}
            </span>
          )}
        </div>
        {dias.map((d, i) => <ColumnaDia key={d} ctx={ctx} fecha={d} marcas={marcas} alto={alto} primera={i === 0} />)}
      </div>
    </div>
  );
}

function ColumnaDia({ ctx, fecha, marcas, alto, primera }: { ctx: Contexto; fecha: string; marcas: number[]; alto: number; primera: boolean }) {
  const { horas, minAhora, ahoraId, colores } = ctx;
  const hoy = fecha === ctx.hoyIso;
  const delDia = ctx.items.filter((e) => e.fecha === fecha && !e.todoElDia);
  const clases = delDia.filter((e) => e.tipo === "clase");
  const otros = delDia.filter((e) => e.tipo !== "clase");
  // Clases, reuniones y eventos comparten carriles: si se cruzan, se reparten el ancho.
  const posicion = carriles(delDia);
  const y = horas.y;
  const caja = (x: { id: string; horaInicio: string; horaFin: string }) => {
    const { carril, carriles: total } = posicion.get(x.id) ?? { carril: 0, carriles: 1 };
    return { top: y(minutos(x.horaInicio)) + 1, height: Math.max(y(minutos(x.horaFin)) - y(minutos(x.horaInicio)) - 2, 24), left: `${(carril / total) * 100}%`, width: `${100 / total}%` };
  };
  const verLinea = hoy && minAhora >= horas.inicio && minAhora <= horas.fin;
  const { jornada } = ctx;
  const franja = (i: { horaInicio: string; horaFin: string }) => ({ top: y(minutos(i.horaInicio)), height: y(minutos(i.horaFin)) - y(minutos(i.horaInicio)) });
  return (
    <section aria-label={`${nombreDia(fecha)} ${formatoDia(fecha, { day: "numeric", month: "long" })}${hoy ? " (hoy)" : ""}`} className={cn("relative border-l", hoy && "bg-primary/[0.04]")} style={{ height: alto }}>
      {marcas.map((m) => <div key={m} aria-hidden className="absolute inset-x-0 border-t" style={{ top: y(m) }} />)}
      {marcas.slice(0, -1).map((m) => <div key={`m${m}`} aria-hidden className="absolute inset-x-0 border-t border-dashed border-border/60" style={{ top: y(m + 30) }} />)}
      {jornada?.recreos.map((r) => (
        <div key={`r${r.horaInicio}`} className="absolute inset-x-0 flex items-center justify-center gap-1 bg-[color-mix(in_oklab,var(--maiz)_16%,transparent)] text-etiqueta font-medium text-foreground/80" style={franja(r)}>
          <Coffee className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="truncate">Recreo<span className="sr-only"> de {r.horaInicio} a {r.horaFin}</span></span>
        </div>
      ))}
      {jornada && (["entrada", "salida"] as const).map((k) => (
        <div key={k} aria-hidden className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-primary/45" style={{ top: y(minutos(jornada[k])) }}>
          {primera && (
            <span className={cn("absolute left-1 rounded-sm bg-card px-1 text-etiqueta font-semibold text-primary", k === "entrada" ? "-top-5" : "top-0.5")}>
              {k === "entrada" ? "Entrada" : "Salida"}
            </span>
          )}
        </div>
      ))}
      {delDia.length === 0 && !jornada ? (
        <p className="absolute inset-x-0 top-3 text-center text-cuerpo-sm text-muted-foreground">{ctx.textoVacio}</p>
      ) : (
        <ul>
          {clases.map((b) => (
            <li key={b.id} className="absolute px-[3px]" style={caja(b)}>
              <Clase b={b} color={b.cursoId ? colores.get(b.titulo) ?? "indigo" : "sin-curso"} ahora={b.id === ahoraId} pasado={ctx.yaPaso(b)} extra={ctx.detalles[b.id]} />
            </li>
          ))}
          {otros.map((e) => (
            <li key={e.id} className="absolute z-[1] px-[3px]" style={caja(e)}>
              <ItemAgenda e={e} pasado={ctx.yaPaso(e)} extra={ctx.detalles[e.id]} />
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

function Clase({ b, color, ahora, pasado, extra }: { b: ItemCalendario; color: ColorCurso | "sin-curso"; ahora: boolean; pasado: boolean; extra?: ReactNode }) {
  const c = COLOR[color];
  const salon = b.salonNombre ?? b.ambito;
  const lugar = `${salon}${b.aula ? ` · ${b.aula}` : ""}`;
  const acciones = b.acciones ?? [];
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
        aria-label={`${b.titulo}, ${salon}, ${b.horaInicio} – ${b.horaFin}${ahora ? " (ahora)" : ""}${b.enCruce ? " (se cruza con otra clase)" : ""}`}
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
            <p className="text-cuerpo-sm text-muted-foreground">{nombreDia(b.fecha)} · <span className="tabular-nums">{b.horaInicio} – {b.horaFin}</span></p>
          </div>
        </div>
        <ul className="flex flex-col gap-2 px-4 pb-4 pl-10 text-cuerpo-sm">
          <li className="flex items-center gap-2.5"><School className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden />{salon}</li>
          {b.aula && <li className="flex items-center gap-2.5"><MapPin className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden />{b.aula}</li>}
          <li className="flex items-center gap-2.5"><Clock className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden />{duracion(minutos(b.horaFin) - minutos(b.horaInicio))}</li>
          {b.enCruce && <li className="flex items-center gap-2.5 font-medium text-falta"><TriangleAlert className="size-4" strokeWidth={2} aria-hidden />Se cruza con otra clase</li>}
        </ul>
        {extra}
        {acciones.length > 0 && (
          <div className="grid auto-cols-fr grid-flow-col gap-2 border-t bg-muted/40 px-4 py-3">
            {acciones.map((a) => {
              const Icono = ICONOS_ACCION[a.icono];
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

/** Reunión, evento, evaluación o entrega: borde punteado del color de su tipo sobre la superficie, con ícono y tipo. */
function ItemAgenda({ e, pasado, extra }: { e: ItemCalendario; pasado: boolean; extra?: ReactNode }) {
  const { palabra, Icono, tinta, borde } = estiloDe(e);
  const horario = e.todoElDia ? "Todo el día" : `${e.horaInicio} – ${e.horaFin}`;
  // Eventos cortos (≤ 35 min): una sola línea con la hora delante, para que no se corte el texto.
  const unaLinea = e.todoElDia || minutos(e.horaFin) - minutos(e.horaInicio) <= 35;
  const verMas = e.href ?? `/agenda?vista=dia&fecha=${e.fecha}`;
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex size-full min-w-0 flex-col items-start gap-px overflow-hidden rounded-md border border-dashed bg-card px-2 text-left",
          borde,
          unaLinea ? "justify-center py-0.5" : "py-1",
          "transition-[box-shadow,opacity] duration-150 hover:opacity-100 hover:shadow-[var(--sombra-1)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring data-[popup-open]:shadow-[var(--sombra-1)] motion-reduce:transition-none",
          pasado && "opacity-60",
        )}
        aria-label={`${palabra}: ${e.titulo}, ${horario}${e.cancelado ? " (cancelada)" : ""}`}
      >
        <span className="flex w-full min-w-0 items-center gap-1.5 text-cuerpo-sm leading-snug font-semibold">
          <Icono className={cn("size-3.5 shrink-0", tinta)} strokeWidth={2} aria-hidden />
          {unaLinea && !e.todoElDia && <span className="shrink-0 font-normal text-muted-foreground tabular-nums">{e.horaInicio}</span>}
          <span className={cn("truncate", e.cancelado && "line-through")}>{e.titulo}</span>
        </span>
        {!unaLinea && <span className="w-full truncate text-etiqueta font-normal text-muted-foreground tabular-nums">{palabra} · {horario}</span>}
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-[22rem] max-w-[calc(100vw-2rem)] gap-0 p-0">
        <div className="flex items-start gap-3 p-4 pb-3">
          <Icono className={cn("mt-1 size-4 shrink-0", tinta)} strokeWidth={2} aria-hidden />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className={cn("text-etiqueta font-medium uppercase", tinta)}>{palabra}{e.cancelado ? " · Cancelada" : ""}</p>
            <p className="font-heading text-cuerpo font-semibold">{e.titulo}</p>
            <p className="text-cuerpo-sm text-muted-foreground">{nombreDia(e.fecha)} · <span className="tabular-nums">{horario}</span></p>
          </div>
        </div>
        <ul className="flex flex-col gap-2 px-4 pb-4 pl-11 text-cuerpo-sm">
          <li className="flex items-center gap-2.5"><School className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden />{e.ambito}</li>
          {e.lugar && <li className="flex items-center gap-2.5"><MapPin className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden />{e.lugar}</li>}
          {e.descripcion && <li className="text-muted-foreground">{e.descripcion}</li>}
        </ul>
        {extra && <div className="px-4 pb-3">{extra}</div>}
        <div className="border-t bg-muted/40 px-4 py-3">
          <Link href={verMas} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            {e.href ? (e.tipo === "reunion" ? "Ver la reunión" : "Ver detalle") : "Ver en la agenda"}<ArrowRight className="size-4" strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
