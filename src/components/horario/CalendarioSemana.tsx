"use client";

import { ClipboardCheck, Clock, GraduationCap, ListTodo, MapPin, School, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatoDia } from "@/lib/fechas";
import { DIAS, NOMBRE_DIA, NOMBRE_DIA_CORTO, minutos, rango, type DiaHorario } from "@/lib/horario";
import { carriles, coloresPorCurso, fechasDeLaSemana, horasVisibles, type ColorCurso } from "@/lib/horario-calendario";
import type { BloqueVista } from "@/lib/server/horario";
import { cn } from "@/lib/utils";
import { InsigniaAhora } from "./Insignias";

export type AccionBloque = { href: string; texto: string; icono: "lista" | "tareas" | "notas" };
export type BloqueConAcciones = BloqueVista & { acciones: AccionBloque[]; enCruce?: boolean };

const ICONOS = { lista: ClipboardCheck, tareas: ListTodo, notas: GraduationCap } as const;

/** Alto de un minuto en la cuadrícula: una clase de 45 min mide 63 px (título, hora y salón caben). */
const PX_MIN = 1.4;

/** Fondo suave + barra izquierda del color del curso; el texto siempre en tinta (el color solo identifica). */
const COLOR: Record<ColorCurso | "sin-curso", { fondo: string; barra: string; muestra: string }> = {
  turquesa: { fondo: "bg-[color-mix(in_oklab,var(--turquesa)_14%,var(--superficie))]", barra: "border-l-turquesa", muestra: "bg-turquesa" },
  "indigo-cielo": { fondo: "bg-[color-mix(in_oklab,var(--indigo-cielo)_14%,var(--superficie))]", barra: "border-l-indigo-cielo", muestra: "bg-indigo-cielo" },
  cochinilla: { fondo: "bg-[color-mix(in_oklab,var(--cochinilla)_14%,var(--superficie))]", barra: "border-l-cochinilla", muestra: "bg-cochinilla" },
  maiz: { fondo: "bg-[color-mix(in_oklab,var(--maiz)_22%,var(--superficie))]", barra: "border-l-maiz", muestra: "bg-maiz" },
  indigo: { fondo: "bg-[color-mix(in_oklab,var(--indigo)_14%,var(--superficie))]", barra: "border-l-indigo", muestra: "bg-indigo" },
  "sin-curso": { fondo: "bg-superficie-2", barra: "border-l-pizarra", muestra: "bg-pizarra" },
};

const etiquetaHora = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

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

/**
 * Semana de clases en cuadrícula por horas, al estilo de Google Calendar (specs/34): columnas de lunes a viernes con su
 * fecha, cada bloque ubicado y medido según su hora y con el color de su curso, línea de la hora actual en el día de hoy
 * y, al tocar un bloque, su detalle con los accesos (pasar lista, tareas, notas). En pantallas chicas, un día a la vez.
 */
export function CalendarioSemana({ bloques, hoyIso, diaHoy, horaAhora, ahoraId }: { bloques: BloqueConAcciones[]; hoyIso: string; diaHoy: number; horaAhora: string; ahoraId: string | null }) {
  const fechas = fechasDeLaSemana(hoyIso);
  const esHoy = (d: DiaHorario) => fechas[d] === hoyIso;
  const minAhora = useMinutoActual(horaAhora);
  const horas = horasVisibles(bloques);
  const colores = coloresPorCurso(bloques);
  const diaInicial = String(diaHoy >= 1 && diaHoy <= 5 ? diaHoy : 1);
  const lunes = fechas[1];
  const viernes = fechas[5];
  const titulo = lunes.slice(0, 7) === viernes.slice(0, 7)
    ? `${Number(lunes.slice(8))} – ${formatoDia(viernes, { day: "numeric", month: "long", year: "numeric" })}`
    : `${formatoDia(lunes, { day: "numeric", month: "short" })} – ${formatoDia(viernes, { day: "numeric", month: "short", year: "numeric" })}`;
  const comun = { bloques, horas, colores, minAhora, ahoraId, esHoy };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-cuerpo-sm font-medium text-muted-foreground">Semana del {titulo}</p>
      <div className="hidden overflow-hidden rounded-lg border bg-card lg:block">
        <Cuadricula {...comun} dias={DIAS} fechas={fechas} />
      </div>
      <Tabs defaultValue={diaInicial} className="lg:hidden">
        <TabsList className="w-full group-data-horizontal/tabs:h-auto" aria-label="Día de la semana">
          {DIAS.map((d) => (
            <TabsTrigger key={d} value={String(d)} className="min-h-14 flex-col gap-0.5 py-1.5">
              <span aria-hidden className="text-etiqueta uppercase">{NOMBRE_DIA_CORTO[d]}</span>
              <NumeroDia fecha={fechas[d]} hoy={esHoy(d)} chico />
              <span className="sr-only">{NOMBRE_DIA[d]}{esHoy(d) ? " (hoy)" : ""}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {DIAS.map((d) => (
          <TabsContent key={d} value={String(d)} className="mt-2 overflow-hidden rounded-lg border bg-card">
            <Cuadricula {...comun} dias={[d]} fechas={fechas} sinEncabezado />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function NumeroDia({ fecha, hoy, chico }: { fecha: string; hoy: boolean; chico?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center rounded-full font-heading tabular-nums",
        chico ? "size-7 text-cuerpo-sm font-semibold" : "size-10 text-titulo-2",
        hoy && "bg-primary text-primary-foreground",
      )}
    >
      {Number(fecha.slice(8))}
    </span>
  );
}

type PropsCuadricula = {
  dias: readonly DiaHorario[];
  fechas: Record<DiaHorario, string>;
  bloques: BloqueConAcciones[];
  horas: { inicio: number; fin: number };
  colores: Map<string, ColorCurso>;
  minAhora: number;
  ahoraId: string | null;
  esHoy: (d: DiaHorario) => boolean;
  sinEncabezado?: boolean;
};

function Cuadricula({ dias, fechas, bloques, horas, colores, minAhora, ahoraId, esHoy, sinEncabezado }: PropsCuadricula) {
  const alto = (horas.fin - horas.inicio) * PX_MIN;
  const marcas: number[] = [];
  for (let m = horas.inicio; m <= horas.fin; m += 60) marcas.push(m);
  const columnas = { gridTemplateColumns: `3.5rem repeat(${dias.length}, minmax(0, 1fr))` };

  return (
    <div>
      {!sinEncabezado && (
        <div className="grid border-b" style={columnas}>
          <span />
          {dias.map((d) => (
            <div key={d} className="flex flex-col items-center gap-0.5 border-l py-2">
              <span className={cn("text-etiqueta font-medium uppercase", esHoy(d) ? "text-primary" : "text-muted-foreground")}>{NOMBRE_DIA_CORTO[d]}</span>
              <NumeroDia fecha={fechas[d]} hoy={esHoy(d)} />
            </div>
          ))}
        </div>
      )}
      <div className="grid pt-3 pb-4" style={columnas}>
        {/* Horas a la izquierda: cada etiqueta centrada sobre su línea. */}
        <div className="relative" style={{ height: alto }} aria-hidden>
          {marcas.map((m) => (
            <span key={m} className="absolute right-2 -translate-y-1/2 text-etiqueta text-muted-foreground tabular-nums" style={{ top: (m - horas.inicio) * PX_MIN }}>
              {etiquetaHora(m)}
            </span>
          ))}
        </div>
        {dias.map((d) => (
          <ColumnaDia
            key={d}
            dia={d}
            fecha={fechas[d]}
            hoy={esHoy(d)}
            bloques={bloques.filter((b) => b.dia === d)}
            horas={horas}
            marcas={marcas}
            alto={alto}
            colores={colores}
            minAhora={minAhora}
            ahoraId={ahoraId}
          />
        ))}
      </div>
    </div>
  );
}

function ColumnaDia({ dia, fecha, hoy, bloques, horas, marcas, alto, colores, minAhora, ahoraId }: {
  dia: DiaHorario; fecha: string; hoy: boolean; bloques: BloqueConAcciones[]; horas: { inicio: number; fin: number }; marcas: number[]; alto: number;
  colores: Map<string, ColorCurso>; minAhora: number; ahoraId: string | null;
}) {
  const posicion = carriles(bloques);
  const verLinea = hoy && minAhora >= horas.inicio && minAhora <= horas.fin;
  return (
    <section aria-label={`${NOMBRE_DIA[dia]} ${formatoDia(fecha, { day: "numeric", month: "long" })}${hoy ? " (hoy)" : ""}`} className={cn("relative border-l", hoy && "bg-primary/[0.03]")} style={{ height: alto }}>
      {marcas.map((m) => <div key={m} aria-hidden className="absolute inset-x-0 border-t border-border/70" style={{ top: (m - horas.inicio) * PX_MIN }} />)}
      {bloques.length === 0 ? (
        <p className="absolute inset-x-0 top-2 text-center text-cuerpo-sm text-muted-foreground">Sin clases</p>
      ) : (
        <ul>
          {bloques.map((b) => {
            const { carril, carriles: total } = posicion.get(b.id) ?? { carril: 0, carriles: 1 };
            const top = (minutos(b.horaInicio) - horas.inicio) * PX_MIN;
            const height = (minutos(b.horaFin) - minutos(b.horaInicio)) * PX_MIN;
            return (
              <li key={b.id} className="absolute px-0.5" style={{ top: top + 1, height: height - 2, left: `${(carril / total) * 100}%`, width: `${100 / total}%` }}>
                <Evento b={b} color={b.cursoId ? colores.get(b.titulo) ?? "indigo" : "sin-curso"} ahora={b.id === ahoraId} />
              </li>
            );
          })}
        </ul>
      )}
      {verLinea && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: (minAhora - horas.inicio) * PX_MIN }}>
          <span className="-ml-1.5 size-3 rounded-full bg-cochinilla" />
          <span className="h-0.5 flex-1 bg-cochinilla" />
        </div>
      )}
    </section>
  );
}

function Evento({ b, color, ahora }: { b: BloqueConAcciones; color: ColorCurso | "sin-curso"; ahora: boolean }) {
  const c = COLOR[color];
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex size-full flex-col items-start overflow-hidden rounded-md border-l-4 px-2 py-1 text-left transition-[box-shadow,filter] hover:shadow-[var(--sombra-1)] hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring motion-reduce:transition-none",
          c.fondo,
          c.barra,
          ahora && "ring-2 ring-primary",
          b.enCruce && "outline-2 outline-dashed outline-falta",
        )}
        aria-label={`${b.titulo}, ${b.salonNombre}, ${rango(b)}${ahora ? " (ahora)" : ""}${b.enCruce ? " (se cruza con otra clase)" : ""}`}
      >
        <span className="w-full truncate text-cuerpo-sm leading-tight font-semibold">{b.titulo}</span>
        <span className="w-full truncate text-etiqueta font-normal text-muted-foreground tabular-nums">{b.horaInicio} – {b.horaFin}</span>
        <span className="w-full truncate text-etiqueta">{b.salonNombre}{b.aula ? ` · ${b.aula}` : ""}</span>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-80 gap-3 p-4">
        <div className="flex items-start gap-3">
          <span aria-hidden className={cn("mt-1.5 size-3.5 shrink-0 rounded-sm", c.muestra)} />
          <div className="flex min-w-0 flex-col gap-0.5">
            {ahora && <InsigniaAhora />}
            <p className="font-heading text-cuerpo font-semibold">{b.titulo}</p>
            <p className="text-cuerpo-sm text-muted-foreground">{NOMBRE_DIA[b.dia]} · <span className="tabular-nums">{b.horaInicio} – {b.horaFin}</span></p>
          </div>
        </div>
        <ul className="flex flex-col gap-1.5 text-cuerpo-sm">
          <li className="flex items-center gap-2"><School className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden />{b.salonNombre}</li>
          {b.aula && <li className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden />{b.aula}</li>}
          <li className="flex items-center gap-2"><Clock className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden />{minutos(b.horaFin) - minutos(b.horaInicio)} min</li>
          {b.enCruce && <li className="flex items-center gap-2 font-medium text-falta"><TriangleAlert className="size-4" strokeWidth={2} aria-hidden />Se cruza con otra clase</li>}
        </ul>
        {b.acciones.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {b.acciones.map((a) => {
              const Icono = ICONOS[a.icono];
              return (
                <Link key={a.href} href={a.href} className={buttonVariants({ variant: a.icono === "lista" ? "default" : "outline", size: "sm" })}>
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
