"use client";

import { CalendarOff, CircleAlert, Clock } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { NumeroDia, etiquetaHora } from "@/components/calendario/GrillaTiempo";
import { Skeleton } from "@/components/ui/skeleton";
import { NOMBRE_DIA_SEMANA, NOMBRE_DIA_SEMANA_CORTO } from "@/lib/agenda-calendario";
import {
  ENCAJE_MIN, encajar, horaTexto, limitar, siguienteMarca, libresParaTodos, nombreCorto, textoChoques, tramoDe,
  type Analisis, type DatosHorario, type Seleccion, type Tramo,
} from "@/lib/asistente-horario";
import { diaDeSemana, minutos } from "@/lib/horario";
import { cn } from "@/lib/utils";
import { tonoDe } from "./paleta-personas";

/** Alto de un minuto: 15 min = 18 px (el encaje del bloque). */
export const PX_MIN_HORARIO = 1.2;

/** Trama de los días no lectivos (rayas de `superficie-2` sobre la columna). */
export const TRAMA_NO_LECTIVO = "bg-[repeating-linear-gradient(135deg,var(--superficie-2)_0_6px,transparent_6px_12px)]";

export type PropsVistaHorario = {
  datos: DatosHorario | null;
  rango: Tramo;
  /** Índice de color por membresía. */
  colores: Map<string, number>;
  seleccion: Seleccion | null;
  duracion: number;
  analisis: Analisis | null;
  onElegir: (s: Seleccion) => void;
  /** Mueve la selección `delta` días (salta fines de semana; puede cambiar de semana). */
  moverDia: (delta: number) => void;
  onSeguir: () => void;
  puedeSeguir: boolean;
};

/** Estado visual del bloque «Nueva reunión»: índigo libre, rojo si choca con un requerido, ámbar si solo avisa. */
export function tonoSeleccion(a: Analisis | null): "libre" | "choque" | "aviso" {
  if (!a) return "libre";
  if (a.choquesRequeridos.length > 0 || a.pasada) return "choque";
  if (a.choques.length > 0 || a.fueraDeHorario) return "aviso";
  return "libre";
}

export function avisoSeleccion(a: Analisis | null, jornada?: { desde: string; hasta: string }): string | null {
  if (!a) return null;
  if (a.pasada) return "Esa hora ya pasó";
  if (a.choquesRequeridos.length > 0) return textoChoques(a.choquesRequeridos);
  if (a.choques.length > 0) return `Opcional ocupado: ${a.choques.map((c) => nombreCorto(c)).join(", ")}`;
  if (a.noLectivo) return "Día no lectivo";
  if (a.fueraDeHorario) return jornada ? `Fuera de la jornada (${jornada.desde}–${jornada.hasta})` : "Fuera de la jornada";
  return null;
}

/** Teclas del bloque: ↑/↓ 15 min, ←/→ un día, Enter sigue. */
export function teclasBloque(e: KeyboardEvent, p: Pick<PropsVistaHorario, "seleccion" | "duracion" | "rango" | "onElegir" | "moverDia" | "onSeguir" | "puedeSeguir">, eje: "vertical" | "horizontal") {
  const s = p.seleccion;
  if (!s) return;
  const mas = eje === "vertical" ? "ArrowDown" : "ArrowRight";
  const menos = eje === "vertical" ? "ArrowUp" : "ArrowLeft";
  const diaMas = eje === "vertical" ? "ArrowRight" : "ArrowDown";
  const diaMenos = eje === "vertical" ? "ArrowLeft" : "ArrowUp";
  if (e.key === mas || e.key === menos) {
    e.preventDefault();
    p.onElegir({ fecha: s.fecha, inicio: limitar(siguienteMarca(s.inicio, e.key === mas ? 1 : -1), p.duracion, p.rango) });
  } else if (e.key === diaMas || e.key === diaMenos) {
    e.preventDefault();
    p.moverDia(e.key === diaMas ? 1 : -1);
  } else if (e.key === "Enter" && p.puedeSeguir) {
    e.preventDefault();
    p.onSeguir();
  }
}

const esPasado = (datos: DatosHorario, fecha: string, min: number) => fecha < datos.hoy.fecha || (fecha === datos.hoy.fecha && min < minutos(datos.hoy.hora));

/**
 * Vista «Calendario» del paso Horario (specs/40): columnas de días con el eje de horas de la agenda (`GrillaTiempo`).
 * Cada participante tiene un carril con su color; las franjas libres para todos los requeridos se insinúan en verde;
 * fuera de la jornada va sombreado y los días no lectivos con trama. Un clic coloca la «Nueva reunión» (encaje de 15 min),
 * que se arrastra o se mueve con las flechas.
 */
export function CalendarioHorario({ dias, sinEncabezado, ...p }: PropsVistaHorario & { dias: string[]; sinEncabezado?: boolean }) {
  const { datos, rango } = p;
  const alto = (rango.hasta - rango.desde) * PX_MIN_HORARIO;
  const y = (min: number) => (min - rango.desde) * PX_MIN_HORARIO;
  const marcas = Array.from({ length: (rango.hasta - rango.desde) / 60 + 1 }, (_, i) => rango.desde + i * 60);
  const columnas = { gridTemplateColumns: `3.25rem repeat(${dias.length}, minmax(0, 1fr))` };
  const capa = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ desfase: number; movido: boolean } | null>(null);
  const [fantasma, setFantasma] = useState<Seleccion | null>(null);
  const hoy = datos?.hoy.fecha;
  const minAhora = datos ? minutos(datos.hoy.hora) : -1;
  const verAhora = !!hoy && dias.includes(hoy) && minAhora >= rango.desde && minAhora <= rango.hasta;

  /** Día y minuto bajo el puntero (columna por posición horizontal dentro de la capa de días). */
  function bajoPuntero(e: { clientX: number; clientY: number }): Seleccion | null {
    const r = capa.current?.getBoundingClientRect();
    if (!r) return null;
    const i = Math.floor(((e.clientX - r.left) / r.width) * dias.length);
    if (i < 0 || i >= dias.length) return null;
    return { fecha: dias[i], inicio: rango.desde + (e.clientY - r.top) / PX_MIN_HORARIO };
  }

  function alMover(e: PointerEvent) {
    const b = bajoPuntero(e);
    if (arrastre.current && p.seleccion) {
      if (!b) return;
      const inicio = encajar(b.inicio - arrastre.current.desfase, p.duracion, rango);
      if (inicio !== p.seleccion.inicio || b.fecha !== p.seleccion.fecha) {
        arrastre.current.movido = true;
        p.onElegir({ fecha: b.fecha, inicio });
      }
      return;
    }
    if (e.pointerType === "touch" || !b || !datos) return setFantasma(null);
    const inicio = encajar(Math.floor(b.inicio / ENCAJE_MIN) * ENCAJE_MIN, p.duracion, rango);
    const sobreSeleccion = p.seleccion?.fecha === b.fecha && b.inicio >= p.seleccion.inicio && b.inicio < p.seleccion.inicio + p.duracion;
    setFantasma(sobreSeleccion || esPasado(datos, b.fecha, inicio) ? null : { fecha: b.fecha, inicio });
  }

  function alClic(e: { clientX: number; clientY: number }) {
    if (arrastre.current) return;
    const b = bajoPuntero(e);
    if (!b || !datos) return;
    const inicio = encajar(Math.floor(b.inicio / ENCAJE_MIN) * ENCAJE_MIN, p.duracion, rango);
    if (esPasado(datos, b.fecha, inicio)) return;
    p.onElegir({ fecha: b.fecha, inicio });
    setFantasma(null);
  }

  function empezarArrastre(e: PointerEvent<HTMLButtonElement>) {
    const b = bajoPuntero(e);
    if (!b || !p.seleccion) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastre.current = { desfase: b.inicio - p.seleccion.inicio, movido: false };
    setFantasma(null);
  }

  function terminarArrastre(e: PointerEvent<HTMLButtonElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    // El clic que sigue al soltar no debe colocar otro bloque.
    setTimeout(() => (arrastre.current = null), 0);
  }

  const sel = p.seleccion && dias.includes(p.seleccion.fecha) ? p.seleccion : null;
  const tono = tonoSeleccion(p.analisis);
  const aviso = avisoSeleccion(p.analisis, datos?.jornada);
  const altoSel = p.duracion * PX_MIN_HORARIO;

  return (
    <div>
      <div className={cn("grid border-b", sinEncabezado && "sr-only")} style={columnas}>
        <span aria-hidden />
        {dias.map((d) => (
          <div key={d} className={cn("flex flex-col items-center gap-0.5 border-l py-2", d === hoy && "bg-primary/[0.04]")}>
            <span className={cn("text-etiqueta font-medium tracking-wide uppercase", d === hoy ? "text-primary" : "text-muted-foreground")}>{NOMBRE_DIA_SEMANA_CORTO[diaDeSemana(d)]}</span>
            <NumeroDia fecha={d} hoy={d === hoy} chico={dias.length > 1} />
          </div>
        ))}
      </div>
      <div className="grid pt-3 pb-4" style={columnas}>
        <div className="relative" style={{ height: alto }} aria-hidden>
          {marcas.filter((m) => !verAhora || Math.abs(m - minAhora) >= 12).map((m) => (
            <span key={m} className="absolute right-2 -translate-y-1/2 text-etiqueta font-normal text-muted-foreground tabular-nums" style={{ top: y(m) }}>
              {etiquetaHora(m)}
            </span>
          ))}
          {verAhora && (
            <span className="absolute right-1 z-10 -translate-y-1/2 rounded-pildora bg-cochinilla px-1.5 py-px text-etiqueta font-semibold text-background tabular-nums" style={{ top: y(minAhora) }}>
              {etiquetaHora(minAhora)}
            </span>
          )}
        </div>
        <div
          ref={capa}
          className="relative grid touch-pan-y select-none"
          style={{ gridColumn: `2 / span ${dias.length}`, gridTemplateColumns: `repeat(${dias.length}, minmax(0, 1fr))`, height: alto }}
          onPointerMove={alMover}
          onPointerLeave={() => setFantasma(null)}
          onClick={alClic}
          aria-busy={!datos}
        >
          {dias.map((d) => <ColumnaDia key={d} fecha={d} datos={datos} rango={rango} y={y} marcas={marcas} colores={p.colores} />)}

          {fantasma && (
            <div
              aria-hidden
              className="pointer-events-none absolute z-[5] px-1"
              style={{ top: y(fantasma.inicio), height: altoSel, left: `${(dias.indexOf(fantasma.fecha) / dias.length) * 100}%`, width: `${100 / dias.length}%` }}
            >
              <div className="flex size-full items-start overflow-hidden rounded-md border-2 border-dashed border-primary/60 bg-primary/[0.06] px-1.5 py-0.5 text-etiqueta font-semibold text-primary tabular-nums">
                {horaTexto(fantasma.inicio)} – {horaTexto(fantasma.inicio + p.duracion)}
              </div>
            </div>
          )}

          {sel && (
            <div
              className="absolute z-[6] px-1 transition-[top,left] duration-150 ease-out motion-reduce:transition-none"
              style={{ top: y(sel.inicio), height: altoSel, left: `${(dias.indexOf(sel.fecha) / dias.length) * 100}%`, width: `${100 / dias.length}%` }}
            >
              <button
                type="button"
                data-testid="bloque-nueva-reunion"
                aria-label={`Nueva reunión, ${NOMBRE_DIA_SEMANA[diaDeSemana(sel.fecha)]} de ${horaTexto(sel.inicio)} a ${horaTexto(sel.inicio + p.duracion)}${aviso ? `. ${aviso}` : ". Todos libres"}. Usa las flechas para moverla y Enter para seguir.`}
                onPointerDown={empezarArrastre}
                onPointerUp={terminarArrastre}
                onPointerCancel={terminarArrastre}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => teclasBloque(e, { ...p, rango }, "vertical")}
                className={cn(
                  "flex size-full cursor-grab touch-none flex-col items-start overflow-hidden rounded-md px-1.5 text-left shadow-[var(--sombra-1)] active:cursor-grabbing",
                  altoSel < 30 ? "justify-center py-0" : "py-0.5",
                  tono === "libre" && "bg-primary text-primary-foreground",
                  tono === "choque" && "border-2 border-falta bg-falta-fondo text-falta",
                  tono === "aviso" && "border-2 border-tarde bg-tarde-fondo text-tarde",
                )}
              >
                <span className="flex w-full min-w-0 items-center gap-1 text-etiqueta leading-4 font-semibold">
                  {tono === "choque" && <CircleAlert className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />}
                  {tono === "aviso" && <Clock className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />}
                  <span className="truncate">Nueva reunión</span>
                </span>
                {altoSel >= 30 && <span className="w-full truncate text-etiqueta leading-4 font-normal tabular-nums opacity-90">{horaTexto(sel.inicio)} – {horaTexto(sel.inicio + p.duracion)}</span>}
              </button>
              {aviso && (
                <p
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute top-full z-[8] mt-1 w-max max-w-[15rem] rounded-sm px-1.5 py-0.5 text-etiqueta leading-4 font-semibold shadow-[var(--sombra-1)]",
                    dias.indexOf(sel.fecha) === dias.length - 1 && dias.length > 1 ? "right-1" : "left-1",
                    tono === "choque" ? "bg-falta text-background" : "bg-tarde text-background",
                  )}
                >
                  {aviso}
                </p>
              )}
            </div>
          )}

          {verAhora && (
            <div
              aria-hidden
              className="pointer-events-none absolute z-[7] flex -translate-y-1/2 items-center"
              style={{ top: y(minAhora), left: `${(dias.indexOf(hoy!) / dias.length) * 100}%`, width: `${100 / dias.length}%` }}
            >
              <span className="-ml-[5px] size-2.5 rounded-full bg-cochinilla" />
              <span className="h-0.5 flex-1 bg-cochinilla" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ColumnaDia({ fecha, datos, rango, y, marcas, colores }: {
  fecha: string; datos: DatosHorario | null; rango: Tramo; y: (m: number) => number; marcas: number[]; colores: Map<string, number>;
}) {
  const dia = datos?.dias.find((d) => d.fecha === fecha);
  const noLectivo = !!dia && !dia.lectivo;
  const jornada = datos ? tramoDe(datos.jornada) : null;
  const personas = datos?.personas ?? [];
  const pasadoHasta = !datos ? null : fecha < datos.hoy.fecha ? rango.hasta : fecha === datos.hoy.fecha ? minutos(datos.hoy.hora) : null;
  const titulo = `${NOMBRE_DIA_SEMANA[diaDeSemana(fecha)]} ${Number(fecha.slice(8))}`;
  return (
    <section
      data-columna-fecha={fecha}
      aria-label={`${titulo}${noLectivo ? " (no lectivo)" : ""}`}
      className={cn("relative border-l", noLectivo && TRAMA_NO_LECTIVO, datos?.hoy.fecha === fecha && "bg-primary/[0.04]")}
    >
      {/* Fuera de la jornada: sombreado suave. */}
      {jornada && !noLectivo && (
        <>
          <div aria-hidden className="absolute inset-x-0 top-0 bg-muted/70" style={{ height: Math.max(0, y(jornada.desde)) }} />
          <div aria-hidden className="absolute inset-x-0 bottom-0 bg-muted/70" style={{ top: y(jornada.hasta) }} />
        </>
      )}
      {/* Franjas libres para todos los requeridos: verde muy tenue. */}
      {datos && !noLectivo && libresParaTodos(datos, fecha).map((t) => (
        <div key={t.desde} aria-hidden className="absolute inset-x-0 bg-llego-fondo/70" style={{ top: y(t.desde), height: y(t.hasta) - y(t.desde) }} />
      ))}
      {pasadoHasta !== null && pasadoHasta > rango.desde && (
        <div aria-hidden className="absolute inset-x-0 top-0 bg-background/55" style={{ height: y(Math.min(pasadoHasta, rango.hasta)) }} />
      )}
      {marcas.map((m) => <div key={m} aria-hidden className="pointer-events-none absolute inset-x-0 border-t" style={{ top: y(m) }} />)}
      {marcas.slice(0, -1).map((m) => <div key={`m${m}`} aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/60" style={{ top: y(m + 30) }} />)}

      {!datos && (
        <div aria-hidden className="absolute inset-0 flex gap-1 px-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="relative flex-1">
              <Skeleton className="absolute inset-x-0" style={{ top: y(rango.desde + 90 + i * 70), height: 60 }} />
              <Skeleton className="absolute inset-x-0" style={{ top: y(rango.desde + 330 - i * 40), height: 80 }} />
            </div>
          ))}
        </div>
      )}

      {noLectivo && (
        <p className="absolute inset-x-1 top-2 flex items-center justify-center gap-1 rounded-sm bg-card/90 px-1 py-0.5 text-etiqueta font-semibold text-muted-foreground">
          <CalendarOff className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="truncate">No lectivo</span>
        </p>
      )}

      {/* Un carril por participante: lo ocupado como barras redondeadas de su color. */}
      <ul className="absolute inset-0 flex gap-px px-0.5">
        {personas.map((persona) => (
          <li key={persona.membershipId} className="relative min-w-0 flex-1 @container" aria-label={persona.propia ? "Tu agenda" : `Agenda de ${persona.nombre}`}>
            {persona.bloques.filter((b) => b.fecha === fecha).map((b) => {
              const t = tramoDe(b);
              const desde = Math.max(t.desde, rango.desde);
              const hasta = Math.min(t.hasta, rango.hasta);
              if (hasta <= desde) return null;
              const tono = tonoDe(colores.get(persona.membershipId) ?? 0);
              return (
                <span
                  key={`${b.desde}-${b.etiqueta}`}
                  title={`${persona.propia ? "Tú" : persona.nombre}: ${b.etiqueta} (${b.desde}–${b.hasta})`}
                  className={cn(
                    "absolute inset-x-0 overflow-hidden rounded-[5px] pl-[5px] before:absolute before:inset-y-0 before:left-0 before:w-[3px]",
                    tono.barra,
                  )}
                  style={{ top: y(desde) + 1, height: Math.max(y(hasta) - y(desde) - 2, 4) }}
                >
                  <span className="sr-only">{persona.propia ? "Tú" : persona.nombre}: {b.etiqueta}, de {b.desde} a {b.hasta}</span>
                  <span aria-hidden className="hidden truncate pt-0.5 text-etiqueta leading-4 font-medium text-foreground @[4.5rem]:block">{b.etiqueta}</span>
                </span>
              );
            })}
          </li>
        ))}
      </ul>
    </section>
  );
}
