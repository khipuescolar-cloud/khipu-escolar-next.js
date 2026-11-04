"use client";

import { CalendarOff, Check, CircleAlert, Clock, Users } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { etiquetaHora } from "@/components/calendario/GrillaTiempo";
import { Skeleton } from "@/components/ui/skeleton";
import { ENCAJE_MIN, encajar, horaTexto, iniciales, libresParaTodos, tramoDe, type Seleccion } from "@/lib/asistente-horario";
import { minutos } from "@/lib/horario";
import { cn } from "@/lib/utils";
import { TRAMA_NO_LECTIVO, avisoSeleccion, teclasBloque, tonoSeleccion, type PropsVistaHorario } from "./CalendarioHorario";
import { tonoDe } from "./paleta-personas";

/** Ancho de un minuto: una hora = 96 px. */
const PX_MIN = 1.6;
const FILA = "h-12";

/**
 * Vista «Por persona» (specs/40), al estilo del asistente de programación: regla horaria arriba, una fila por participante
 * con lo ocupado como barras continuas, una fila «Todos» con las coincidencias y la reunión propuesta como una banda
 * vertical que cruza todas las filas (se arrastra, se coloca con un clic o se mueve con las flechas).
 */
export function LineaPersonas({ fecha, familias, ...p }: PropsVistaHorario & { fecha: string; familias: string | null }) {
  const { datos, rango } = p;
  const ancho = (rango.hasta - rango.desde) * PX_MIN;
  const x = (min: number) => (min - rango.desde) * PX_MIN;
  const marcas = Array.from({ length: (rango.hasta - rango.desde) / 60 + 1 }, (_, i) => rango.desde + i * 60);
  const pista = useRef<HTMLDivElement>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ desfase: number } | null>(null);
  const [fantasma, setFantasma] = useState<number | null>(null);
  const dia = datos?.dias.find((d) => d.fecha === fecha);
  const noLectivo = !!dia && !dia.lectivo;
  const jornada = datos ? tramoDe(datos.jornada) : null;
  const sel = p.seleccion?.fecha === fecha ? p.seleccion : null;
  const tono = tonoSeleccion(p.analisis);
  const aviso = avisoSeleccion(p.analisis, datos?.jornada);
  const pasadoHasta = !datos ? null : fecha < datos.hoy.fecha ? rango.hasta : fecha === datos.hoy.fecha ? minutos(datos.hoy.hora) : null;

  // Lleva la banda a la vista al cambiar de día o al elegir una sugerencia (desplaza solo el contenedor, no la página).
  const inicioSel = sel?.inicio;
  useEffect(() => {
    const c = contenedor.current;
    if (!c || inicioSel === undefined) return;
    const izquierda = x(inicioSel);
    const visible = c.clientWidth - 160;
    if (izquierda < c.scrollLeft || izquierda > c.scrollLeft + visible) c.scrollTo({ left: Math.max(0, izquierda - visible / 3) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cambiar el día o el inicio
  }, [fecha, inicioSel]);

  const minutoEn = (clientX: number) => {
    const r = pista.current?.getBoundingClientRect();
    return r ? rango.desde + (clientX - r.left) / PX_MIN : null;
  };
  const esPasado = (min: number) => pasadoHasta !== null && min < pasadoHasta;

  function alMover(e: PointerEvent) {
    const m = minutoEn(e.clientX);
    if (m === null) return;
    if (arrastre.current && sel) {
      const inicio = encajar(m - arrastre.current.desfase, p.duracion, rango);
      if (inicio !== sel.inicio) p.onElegir({ fecha, inicio });
      return;
    }
    if (e.pointerType === "touch" || !datos) return setFantasma(null);
    const inicio = encajar(Math.floor(m / ENCAJE_MIN) * ENCAJE_MIN, p.duracion, rango);
    setFantasma(esPasado(inicio) || (sel && m >= sel.inicio && m < sel.inicio + p.duracion) ? null : inicio);
  }

  function alClic(e: { clientX: number }) {
    if (arrastre.current) return;
    const m = minutoEn(e.clientX);
    if (m === null || !datos) return;
    const inicio = encajar(Math.floor(m / ENCAJE_MIN) * ENCAJE_MIN, p.duracion, rango);
    if (esPasado(inicio)) return;
    p.onElegir({ fecha, inicio } satisfies Seleccion);
    setFantasma(null);
  }

  const personas = datos?.personas ?? [];
  const libres = datos ? libresParaTodos(datos, fecha) : [];

  return (
    <div ref={contenedor} className="overflow-x-auto overscroll-x-contain">
      <div className="flex w-max min-w-full">
        {/* Nombres (fijos al desplazar la regla). */}
        <div className="sticky left-0 z-20 w-36 shrink-0 border-r bg-card sm:w-56">
          <div className="flex h-9 items-end border-b px-3 pb-1.5 text-etiqueta font-normal text-muted-foreground">Participantes</div>
          <div className={cn(FILA, "flex items-center gap-2.5 border-b px-3")}>
            <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-llego-fondo text-llego">
              <Users className="size-4" strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-cuerpo-sm font-semibold">Todos</span>
              <span className="block truncate text-etiqueta font-normal text-muted-foreground">Requeridos libres</span>
            </span>
          </div>
          {personas.map((persona) => (
            <div key={persona.membershipId} className={cn(FILA, "flex items-center gap-2.5 border-b px-3")}>
              <span aria-hidden className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-full text-etiqueta font-semibold text-foreground ring-2 ring-inset", tonoDe(p.colores.get(persona.membershipId) ?? 0).avatar)}>
                {iniciales(persona.nombre)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-cuerpo-sm font-semibold">{persona.propia ? "Tú" : persona.nombre}</span>
                <span className="block truncate text-etiqueta font-normal text-muted-foreground">{persona.requerido ? "Requerido" : "Opcional"}</span>
              </span>
            </div>
          ))}
          {familias && (
            <div className={cn(FILA, "flex items-center gap-2.5 px-3")}>
              <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Users className="size-4" strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-cuerpo-sm font-semibold">{familias}</span>
                <span className="block truncate text-etiqueta font-normal text-muted-foreground">Pendiente de confirmar</span>
              </span>
            </div>
          )}
        </div>

        {/* Regla horaria y filas. */}
        <div
          ref={pista}
          className={cn("relative touch-pan-x select-none", noLectivo && TRAMA_NO_LECTIVO)}
          style={{ width: ancho }}
          onPointerMove={alMover}
          onPointerLeave={() => setFantasma(null)}
          onClick={alClic}
          aria-busy={!datos}
        >
          <div aria-hidden className="relative h-9 border-b">
            {marcas.map((m) => (
              <span key={m} className="absolute bottom-1.5 -translate-x-1/2 text-etiqueta font-normal text-muted-foreground tabular-nums first:translate-x-1" style={{ left: x(m) }}>
                {etiquetaHora(m)}
              </span>
            ))}
          </div>
          {/* Fondo: fuera de jornada, pasado y líneas de hora (cruzan todas las filas). */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-9 bottom-0">
            {jornada && !noLectivo && (
              <>
                <div className="absolute inset-y-0 left-0 bg-muted/70" style={{ width: Math.max(0, x(jornada.desde)) }} />
                <div className="absolute inset-y-0 right-0 bg-muted/70" style={{ left: x(jornada.hasta) }} />
              </>
            )}
            {pasadoHasta !== null && pasadoHasta > rango.desde && <div className="absolute inset-y-0 left-0 bg-background/55" style={{ width: x(Math.min(pasadoHasta, rango.hasta)) }} />}
            {marcas.map((m) => <div key={m} className="absolute inset-y-0 border-l" style={{ left: x(m) }} />)}
            {marcas.slice(0, -1).map((m) => <div key={`m${m}`} className="absolute inset-y-0 border-l border-dashed border-border/60" style={{ left: x(m + 30) }} />)}
          </div>

          {/* Fila «Todos». */}
          <div className={cn(FILA, "relative border-b")}>
            {noLectivo && (
              <span className="absolute top-1/2 left-2 flex -translate-y-1/2 items-center gap-1 rounded-sm bg-card/90 px-1.5 py-0.5 text-etiqueta font-semibold text-muted-foreground">
                <CalendarOff className="size-3.5" strokeWidth={2} aria-hidden />No lectivo
              </span>
            )}
            {libres.map((t) => (
              <span
                key={t.desde}
                className="absolute inset-y-2 flex items-center gap-1 overflow-hidden rounded-md bg-llego-fondo px-1.5 text-etiqueta font-semibold text-llego"
                style={{ left: x(t.desde) + 1, width: Math.max(x(t.hasta) - x(t.desde) - 2, 4) }}
              >
                <Check className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                {t.hasta - t.desde >= 60 && <span className="truncate">Libres</span>}
                <span className="sr-only">Todos libres de {horaTexto(t.desde)} a {horaTexto(t.hasta)}</span>
              </span>
            ))}
          </div>

          {!datos && [0, 1, 2].map((i) => (
            <div key={i} className={cn(FILA, "relative border-b")}>
              <Skeleton className="absolute inset-y-2" style={{ left: x(rango.desde + 60 + i * 90), width: 110 }} />
              <Skeleton className="absolute inset-y-2" style={{ left: x(rango.desde + 300 + i * 30), width: 160 }} />
            </div>
          ))}
          {personas.map((persona) => {
            const tonoP = tonoDe(p.colores.get(persona.membershipId) ?? 0);
            return (
              <div key={persona.membershipId} className={cn(FILA, "relative border-b")}>
                {persona.bloques.filter((b) => b.fecha === fecha).map((b) => {
                  const t = tramoDe(b);
                  const desde = Math.max(t.desde, rango.desde);
                  const hasta = Math.min(t.hasta, rango.hasta);
                  if (hasta <= desde) return null;
                  return (
                    <span
                      key={`${b.desde}-${b.etiqueta}`}
                      title={`${b.etiqueta} (${b.desde}–${b.hasta})`}
                      className={cn("absolute inset-y-2 flex items-center overflow-hidden rounded-md pr-1.5 pl-2.5 before:absolute before:inset-y-0 before:left-0 before:w-[3px]", tonoP.barra)}
                      style={{ left: x(desde) + 1, width: Math.max(x(hasta) - x(desde) - 2, 4) }}
                    >
                      <span className="truncate text-etiqueta font-medium text-foreground">
                        {b.etiqueta}
                        <span className="sr-only">, de {b.desde} a {b.hasta}</span>
                      </span>
                    </span>
                  );
                })}
              </div>
            );
          })}
          {familias && (
            <div className={cn(FILA, "relative flex items-center")}>
              <span className="sticky left-2 ml-2 truncate text-cuerpo-sm text-muted-foreground">Las familias no tienen calendario en Khipu: confirman al recibir la invitación.</span>
            </div>
          )}

          {fantasma !== null && (
            <div
              aria-hidden
              className="pointer-events-none absolute top-9 bottom-0 z-[5] rounded-sm border-x-2 border-dashed border-primary/60 bg-primary/[0.05]"
              style={{ left: x(fantasma), width: p.duracion * PX_MIN }}
            />
          )}

          {sel && (
            <button
              type="button"
              data-testid="banda-nueva-reunion"
              aria-label={`Nueva reunión de ${horaTexto(sel.inicio)} a ${horaTexto(sel.inicio + p.duracion)}${aviso ? `. ${aviso}` : ". Todos libres"}. Usa las flechas izquierda y derecha para moverla y Enter para seguir.`}
              onPointerDown={(e) => {
                const m = minutoEn(e.clientX);
                if (m === null) return;
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                arrastre.current = { desfase: m - sel.inicio };
                setFantasma(null);
              }}
              onPointerUp={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
                setTimeout(() => (arrastre.current = null), 0);
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => teclasBloque(e, { ...p, rango }, "horizontal")}
              className={cn(
                "absolute top-0 bottom-0 z-[6] flex cursor-grab touch-none flex-col items-center rounded-sm border-x-2 transition-[left] duration-150 ease-out active:cursor-grabbing motion-reduce:transition-none",
                tono === "libre" && "border-primary bg-primary/[0.12]",
                tono === "choque" && "border-falta bg-falta/[0.12]",
                tono === "aviso" && "border-tarde bg-tarde/[0.12]",
              )}
              style={{ left: x(sel.inicio), width: p.duracion * PX_MIN }}
            >
              <span
                className={cn(
                  "mt-1 inline-flex items-center gap-1 rounded-sm px-1 text-etiqueta leading-5 font-semibold whitespace-nowrap tabular-nums",
                  tono === "libre" && "bg-primary text-primary-foreground",
                  tono === "choque" && "bg-falta text-background",
                  tono === "aviso" && "bg-tarde text-background",
                )}
              >
                {tono === "choque" && <CircleAlert className="size-3.5" strokeWidth={2} aria-hidden />}
                {tono === "aviso" && <Clock className="size-3.5" strokeWidth={2} aria-hidden />}
                {horaTexto(sel.inicio)}–{horaTexto(sel.inicio + p.duracion)}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
