"use client";

import {
  ArrowRight, CalendarDays, CalendarOff, CalendarSearch, Check, ChevronLeft, ChevronRight, CircleAlert, Clock, Loader2, Moon, RotateCw, Rows3, Sparkles, Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { CLASE_CAMPO } from "@/components/ui/Selector";
import { NOMBRE_DIA_SEMANA_CORTO } from "@/lib/agenda-calendario";
import {
  analizar, columnasSemana, horaTexto, iniciales, limitar, nombreCorto, opcionalesOcupados, primerHueco, rangoVisible, requiereConfirmarChoque, semanaDe, textoChoques,
  type Analisis, type Seleccion,
} from "@/lib/asistente-horario";
import { DURACIONES, DURACION_MAX, DURACION_MIN, esDuracionValida } from "@/lib/disponibilidad";
import { lunesDeSemana, sumarDias } from "@/lib/fechas";
import { diaDeSemana, minutos } from "@/lib/horario";
import type { Disponibilidad } from "@/lib/server/disponibilidad";
import { cn } from "@/lib/utils";
import { CalendarioHorario } from "./CalendarioHorario";
import { LineaPersonas } from "./LineaPersonas";
import { tonoDe } from "./paleta-personas";

type Props = {
  consultar: (entrada: unknown) => Promise<Disponibilidad | { error: string }>;
  requeridos: string[];
  opcionales: string[];
  /** Familias invitadas («Familias del salón»…): sin calendario, «Pendiente de confirmar». */
  familias: string | null;
  /** Fecha con la que abre el calendario (mañana en la zona del colegio). */
  fechaInicial: string;
  hoy: string;
  seleccion: Seleccion | null;
  onSeleccion: (s: Seleccion) => void;
  duracion: number;
  onDuracion: (d: number) => void;
  onSeguir: (a: Analisis, confirmado: boolean) => void;
  choqueConfirmado: boolean;
  /** Ranura de la barra superior del asistente: ahí van el estado de la franja y el botón para seguir. */
  ranuraAcciones: HTMLElement | null;
};

const fechaUtc = (iso: string) => new Date(`${iso}T12:00:00Z`);
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", ...o }).format(fechaUtc(iso));
/** «jue 5 nov». */
export const fechaCorta = (iso: string) => fmt(iso, { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "").replace(",", "");

function tituloSemana(dias: string[]): string {
  const a = dias[0];
  const b = dias.at(-1)!;
  const mismoMes = a.slice(0, 7) === b.slice(0, 7);
  return mismoMes ? `${Number(a.slice(8))} – ${fmt(b, { day: "numeric", month: "long", year: "numeric" })}` : `${fmt(a, { day: "numeric", month: "short" })} – ${fmt(b, { day: "numeric", month: "short", year: "numeric" })}`;
}

/** Lunes a viernes: siguiente (o anterior) día lectivo de la semana. */
function otroDiaHabil(fecha: string, delta: number): string {
  let f = sumarDias(fecha, delta);
  while (diaDeSemana(f) >= 6) f = sumarDias(f, delta);
  return f;
}

const consultaMovil = "(max-width: 639px)";
function useEsMovil() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(consultaMovil);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(consultaMovil).matches,
    () => false,
  );
}

type Respuesta = { clave: string; datos: Disponibilidad | null; error: string | null };

/**
 * Paso «Horario» del asistente de reuniones (specs/40): duración, fecha y hora arriba; calendario de la semana (o del
 * día) con la agenda de cada participante a todo el ancho, vista «Por persona» y «Horarios sugeridos» en un modal que
 * recién al abrirse pide las sugerencias al servidor. El estado de la franja y el botón para seguir van en la barra
 * superior del asistente. Los choques se evalúan al instante en el navegador; el servidor revalida al confirmar.
 */
export function PasoHorario(p: Props) {
  const { seleccion, duracion } = p;
  const esMovil = useEsMovil();
  const fechaBase = seleccion?.fecha ?? p.fechaInicial;
  const [semana, setSemana] = useState(() => (diaDeSemana(fechaBase) >= 6 && seleccion ? lunesDeSemana(fechaBase) : semanaDe(fechaBase)));
  const [diaSel, setDiaSel] = useState(() => (diaDeSemana(fechaBase) >= 6 && !seleccion ? semanaDe(fechaBase) : fechaBase));
  const [modo, setModo] = useState<"calendario" | "persona">("calendario");
  const [vista, setVista] = useState<"semana" | "dia">("semana");
  const [intento, setIntento] = useState(0);
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null);
  const [verSugerencias, setVerSugerencias] = useState(false);
  const [verChoque, setVerChoque] = useState(false);
  const vistaReal = esMovil || modo === "persona" ? "dia" : vista;
  // La consulta lee la selección y el callback del último render sin volver a dispararse por ellos.
  const seleccionRef = useRef(seleccion);
  const onSeleccionRef = useRef(p.onSeleccion);
  useEffect(() => {
    seleccionRef.current = seleccion;
    onSeleccionRef.current = p.onSeleccion;
  });

  const clave = JSON.stringify({ semana, duracion, r: p.requeridos, o: p.opcionales, intento });
  const cargando = respuesta?.clave !== clave;
  // Mientras se recalcula (otra duración), se sigue viendo la semana anterior si es la misma.
  const datos = respuesta?.datos && respuesta.datos.dias[0]?.fecha === semana ? respuesta.datos : null;
  const error = !cargando ? respuesta?.error ?? null : null;

  useEffect(() => {
    let vigente = true;
    // Solo la agenda: las sugerencias se calculan al abrir el modal.
    p.consultar({ requeridos: p.requeridos, opcionales: p.opcionales, fecha: semana, hora: "10:00", duracion, dias: 7, alternativas: false })
      .then((r) => {
        if (!vigente) return;
        if ("error" in r) return setRespuesta({ clave, datos: null, error: r.error });
        setRespuesta({ clave, datos: r, error: null });
        const hueco = seleccionRef.current ? null : primerHueco(r, p.fechaInicial, duracion);
        if (hueco) {
          onSeleccionRef.current(hueco);
          setDiaSel(hueco.fecha);
        }
      })
      .catch(() => vigente && setRespuesta({ clave, datos: null, error: "No pudimos cargar la disponibilidad. Revisa tu conexión e inténtalo otra vez." }));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la clave resume semana, duración, participantes e intento
  }, [clave]);

  const colores = useMemo(() => new Map((datos?.personas ?? []).map((x, i) => [x.membershipId, i])), [datos]);
  const analisis = datos && seleccion ? analizar(datos, seleccion, duracion) : null;
  const evaluable = analisis?.conocida ? analisis : null;
  const dias = vistaReal === "semana" ? columnasSemana(semana, seleccion) : [diaSel];
  const jornada = datos?.jornada ?? { desde: "07:30", hasta: "16:30" };
  const rango = rangoVisible(jornada, seleccion && dias.includes(seleccion.fecha) ? { desde: seleccion.inicio, hasta: seleccion.inicio + duracion } : null);
  const semanaHoy = semanaDe(p.hoy);
  const puedeSeguir = !cargando && !!evaluable && !evaluable.pasada;

  function irASemana(lunes: string, dia?: string) {
    setSemana(lunes);
    setDiaSel(dia ?? (lunes === semanaHoy && diaDeSemana(p.hoy) <= 5 ? p.hoy : lunes));
  }

  function elegir(s: Seleccion) {
    p.onSeleccion(s);
    if (s.fecha !== diaSel) setDiaSel(s.fecha);
    if (lunesDeSemana(s.fecha) !== semana && semanaDe(s.fecha) !== semana) setSemana(diaDeSemana(s.fecha) >= 6 ? lunesDeSemana(s.fecha) : semanaDe(s.fecha));
  }

  function moverDia(delta: number) {
    if (!seleccion) return;
    const f = otroDiaHabil(seleccion.fecha, delta);
    if (f < p.hoy) return;
    elegir({ fecha: f, inicio: seleccion.inicio });
  }

  function navegar(delta: number) {
    if (vistaReal === "semana") return irASemana(sumarDias(semana, 7 * delta));
    const f = otroDiaHabil(diaSel, delta);
    setDiaSel(f);
    if (semanaDe(f) !== semana) setSemana(semanaDe(f));
  }

  const puedeAtras = vistaReal === "semana" ? semana > semanaHoy : diaSel > p.hoy;
  const titulo = vistaReal === "semana" ? tituloSemana(columnasSemana(semana, null)) : esMovil ? fechaCorta(diaSel) : fmt(diaSel, { weekday: "long", day: "numeric", month: "long" });
  const etiquetaNav = vistaReal === "semana" ? "Semana" : "Día";

  const seguir = () => {
    if (!evaluable || !puedeSeguir) return;
    if (requiereConfirmarChoque(evaluable, p.choqueConfirmado)) setVerChoque(true);
    else p.onSeguir(evaluable, p.choqueConfirmado);
  };
  const vistaProps = {
    datos, rango, colores, seleccion, duracion, analisis: evaluable,
    onElegir: elegir, moverDia, onSeguir: seguir, puedeSeguir,
  };
  const rangoTexto = seleccion ? `${horaTexto(seleccion.inicio)}–${horaTexto(seleccion.inicio + duracion)}` : "";

  return (
    <div className="flex flex-col gap-4">
      <AlertDialog open={verChoque} onOpenChange={setVerChoque}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-falta-fondo text-falta"><CircleAlert strokeWidth={2} aria-hidden /></AlertDialogMedia>
            <AlertDialogTitle>Ese horario está ocupado</AlertDialogTitle>
            <AlertDialogDescription>
              {seleccion && `${fechaCorta(seleccion.fecha)} · ${horaTexto(seleccion.inicio)}–${horaTexto(seleccion.inicio + duracion)}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="min-w-0 space-y-2 text-sm" aria-label="Choques de horario">
            {evaluable?.choques.map((c) => <li key={c.membershipId} className="flex items-start gap-2 break-words"><CircleAlert className="mt-0.5 size-4 shrink-0 text-falta" strokeWidth={2} aria-hidden /><span>{nombreCorto(c)}: {c.etiqueta}</span></li>)}
          </ul>
          {evaluable?.choques.some((c) => c.etiqueta.startsWith("Clase")) && <p className="text-sm text-muted-foreground">La clase no se cancela.</p>}
          {evaluable?.fueraDeHorario && <p className="flex items-start gap-2 text-sm text-muted-foreground"><Moon className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />También está fuera de la jornada laboral o en día no lectivo.</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Elegir otro horario</AlertDialogCancel>
            <button type="button" className={buttonVariants()} onClick={() => { if (evaluable) p.onSeguir(evaluable, true); setVerChoque(false); }}>Sí, estoy seguro</button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {p.ranuraAcciones && createPortal(
        <>
          <EstadoSeleccion analisis={evaluable} seleccion={seleccion} cargando={cargando} jornada={jornada} />
          <button
            type="button"
            disabled={!puedeSeguir}
            onClick={seguir}
            aria-label={seleccion ? `Usar ${fechaCorta(seleccion.fecha)} · ${rangoTexto} y seguir` : "Elige una franja"}
            className={cn(buttonVariants(), "shrink-0")}
          >
            {cargando && <Loader2 className="animate-spin" strokeWidth={2} aria-hidden />}
            {seleccion ? (
              <span className="tabular-nums">
                Usar<span className="max-sm:hidden"> {fechaCorta(seleccion.fecha)} ·</span> {rangoTexto}<span className="max-sm:hidden"> y seguir</span>
              </span>
            ) : "Elige una franja"}
            {!cargando && <ArrowRight strokeWidth={2} aria-hidden />}
          </button>
        </>,
        p.ranuraAcciones,
      )}

      {/* Duración, fecha y hora: la franja elegida, compacta y siempre a la vista. */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <ControlDuracion duracion={duracion} onDuracion={p.onDuracion} />
        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Fecha</span>
            <input
              type="date"
              min={p.hoy}
              value={seleccion?.fecha ?? ""}
              onChange={(e) => e.target.value && elegir({ fecha: e.target.value, inicio: seleccion?.inicio ?? 600 })}
              className={cn(CLASE_CAMPO, "w-[9.75rem] px-2 tabular-nums")}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Hora de inicio</span>
            <input
              type="time"
              step={60}
              value={seleccion ? horaTexto(seleccion.inicio) : ""}
              onChange={(e) => e.target.value && elegir({ fecha: seleccion?.fecha ?? diaSel, inicio: limitar(minutos(e.target.value), duracion, { desde: 0, hasta: 24 * 60 }) })}
              className={cn(CLASE_CAMPO, "w-[7.25rem] px-2 tabular-nums")}
            />
          </label>
        </div>
      </div>
      <section aria-labelledby="titulo-horario" className="min-w-0 overflow-hidden rounded-[14px] border border-borde-sutil bg-card">
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-1">
            <button type="button" onClick={() => navegar(-1)} disabled={!puedeAtras} aria-label={`${etiquetaNav} anterior`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
              <ChevronLeft strokeWidth={2} aria-hidden />
            </button>
            <button type="button" onClick={() => irASemana(semanaHoy)} className={buttonVariants({ variant: "outline", size: "sm" })}>Hoy</button>
            <button type="button" onClick={() => navegar(1)} aria-label={`${etiquetaNav} siguiente`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
              <ChevronRight strokeWidth={2} aria-hidden />
            </button>
            <h2 id="titulo-horario" aria-live="polite" className="ml-1 truncate font-heading text-cuerpo font-semibold first-letter:uppercase sm:text-lg">{titulo}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setVerSugerencias(true)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Sparkles strokeWidth={2} aria-hidden />Horarios sugeridos
            </button>
            {modo === "calendario" && (
              <Segmentado etiqueta="Vista" className="max-sm:hidden" opciones={[["semana", "Semana"], ["dia", "Día"]]} valor={vista} onCambio={(v) => setVista(v as "semana" | "dia")} />
            )}
            <Segmentado
              etiqueta="Mostrar"
              opciones={[["calendario", "Calendario", <CalendarDays key="i" className="size-4" strokeWidth={2} aria-hidden />], ["persona", "Por persona", <Rows3 key="i" className="size-4" strokeWidth={2} aria-hidden />]]}
              valor={modo}
              onCambio={(v) => setModo(v as "calendario" | "persona")}
            />
          </div>
        </header>

        {vistaReal === "dia" && (
          <nav aria-label="Días de la semana" className="grid grid-cols-5 border-b">
            {columnasSemana(semana, null).map((d) => (
              <button
                key={d}
                type="button"
                aria-current={d === diaSel ? "date" : undefined}
                onClick={() => setDiaSel(d)}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 border-b-2 text-etiqueta font-medium transition-colors",
                  d === diaSel ? "border-sec-trazo font-semibold text-sec-tinta" : "border-transparent text-muted-foreground hover:bg-accent",
                )}
              >
                <span className="uppercase">{NOMBRE_DIA_SEMANA_CORTO[diaDeSemana(d)]}</span>
                <span className="text-cuerpo-sm font-semibold tabular-nums">{Number(d.slice(8))}</span>
                {datos?.dias.find((x) => x.fecha === d)?.lectivo === false && <span className="sr-only">(no lectivo)</span>}
              </button>
            ))}
          </nav>
        )}

        <Leyenda datos={datos} colores={colores} familias={p.familias} />

        {error ? (
          <div className="flex flex-col items-start gap-3 p-4" role="alert">
            <p className="flex items-start gap-2 text-cuerpo-sm text-falta"><CircleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />{error}</p>
            <button type="button" onClick={() => setIntento((n) => n + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <RotateCw strokeWidth={2} aria-hidden />Reintentar
            </button>
          </div>
        ) : (
          <div className={cn("transition-opacity duration-150", cargando && datos && "opacity-60")} aria-busy={cargando}>
            {cargando && <span className="sr-only" role="status">Cargando la disponibilidad…</span>}
            {modo === "calendario" ? (
              <CalendarioHorario dias={dias} sinEncabezado={vistaReal === "dia"} {...vistaProps} />
            ) : (
              <LineaPersonas fecha={diaSel} familias={p.familias} {...vistaProps} />
            )}
          </div>
        )}
      </section>

      <ModalSugerencias
        abierto={verSugerencias}
        onAbierto={setVerSugerencias}
        consultar={p.consultar}
        requeridos={p.requeridos}
        opcionales={p.opcionales}
        semana={semana}
        duracion={duracion}
        hora={seleccion && lunesDeSemana(seleccion.fecha) === semana ? horaTexto(seleccion.inicio) : "10:00"}
        seleccion={seleccion}
        onElegir={(s) => {
          elegir(s);
          setVerSugerencias(false);
        }}
        onSemanaSiguiente={() => irASemana(sumarDias(semana, 7))}
        titulo={tituloSemana(columnasSemana(semana, null))}
      />
    </div>
  );
}

/** Duración: opciones rápidas o «Otra» con minutos (5–240). */
function ControlDuracion({ duracion, onDuracion }: { duracion: number; onDuracion: (d: number) => void }) {
  const rapida = (DURACIONES as readonly number[]).includes(duracion);
  const [otra, setOtra] = useState(!rapida);
  const [texto, setTexto] = useState(String(duracion));
  const valido = esDuracionValida(Number(texto));
  return (
    <fieldset className="flex min-w-0 flex-col gap-1">
      <legend className="mb-1 text-sm font-medium">Duración</legend>
      <div className="flex flex-wrap items-center gap-2">
        <div className="grid grid-cols-6 rounded-[10px] border border-borde-sutil bg-card p-1 sm:inline-flex">
          {DURACIONES.map((d) => (
            <label key={d} className="relative">
              <input
                type="radio"
                name="duracion"
                value={d}
                checked={!otra && duracion === d}
                onChange={() => {
                  setOtra(false);
                  setTexto(String(d));
                  onDuracion(d);
                }}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-8 w-full items-center justify-center rounded-md px-2 text-sm font-medium whitespace-nowrap tabular-nums transition-colors peer-checked:bg-sec-suave peer-checked:text-sec-tinta peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:bg-accent peer-checked:hover:bg-sec-suave sm:px-2.5">
                {d}<span className="max-sm:sr-only">&nbsp;min</span>
              </span>
            </label>
          ))}
          <label className="relative">
            <input type="radio" name="duracion" value="otra" checked={otra} onChange={() => setOtra(true)} className="peer sr-only" />
            <span className="inline-flex min-h-8 w-full items-center justify-center rounded-md px-2 text-sm font-medium transition-colors peer-checked:bg-sec-suave peer-checked:text-sec-tinta peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:bg-accent peer-checked:hover:bg-sec-suave sm:px-2.5">
              Otra
            </span>
          </label>
        </div>
        {otra && (
          <label className="flex items-center gap-1.5 text-sm">
            <span className="sr-only">Minutos de la reunión</span>
            <input
              type="number"
              inputMode="numeric"
              min={DURACION_MIN}
              max={DURACION_MAX}
              step={1}
              value={texto}
              autoFocus
              aria-invalid={!valido}
              aria-describedby="ayuda-duracion"
              onChange={(e) => {
                setTexto(e.target.value);
                const n = Number(e.target.value);
                if (esDuracionValida(n)) onDuracion(n);
              }}
              className={cn(CLASE_CAMPO, "min-h-10 w-20 px-2 tabular-nums aria-invalid:border-falta")}
            />
            <span id="ayuda-duracion" className={cn("text-etiqueta font-normal", valido ? "text-muted-foreground" : "text-falta")}>
              min{!valido && ` (de ${DURACION_MIN} a ${DURACION_MAX})`}
            </span>
          </label>
        )}
      </div>
    </fieldset>
  );
}

function Segmentado({ etiqueta, opciones, valor, onCambio, className }: {
  etiqueta: string; opciones: [string, string, ReactNode?][]; valor: string; onCambio: (v: string) => void; className?: string;
}) {
  return (
    <div role="group" aria-label={etiqueta} className={cn("inline-flex rounded-[10px] border border-borde-sutil bg-background p-0.5", className)}>
      {opciones.map(([v, texto, icono]) => (
        <button
          key={v}
          type="button"
          aria-pressed={v === valor}
          onClick={() => onCambio(v)}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
            v === valor ? "bg-sec-suave font-semibold text-sec-tinta" : "text-foreground hover:bg-accent",
          )}
        >
          {icono}{texto}
        </button>
      ))}
    </div>
  );
}

function Leyenda({ datos, colores, familias }: { datos: Disponibilidad | null; colores: Map<string, number>; familias: string | null }) {
  return (
    <div className="flex flex-col gap-2 border-b px-3 py-2.5 sm:px-4">
      <ul aria-label="Participantes" className="flex flex-wrap gap-x-4 gap-y-2">
        {!datos && [0, 1, 2].map((i) => <li key={i}><Skeleton className="h-7 w-32 rounded-pildora" /></li>)}
        {datos?.personas.map((x) => (
          <li key={x.membershipId} className="flex min-w-0 items-center gap-2">
            <span aria-hidden className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-foreground ring-2 ring-inset", tonoDe(colores.get(x.membershipId) ?? 0).avatar)}>
              {iniciales(x.nombre)}
            </span>
            <span className="min-w-0 text-cuerpo-sm leading-tight">
              <span className="font-medium">{x.propia ? "Tú" : x.nombre}</span>
              <span className="text-muted-foreground"> · {x.requerido ? "Requerido" : "Opcional"}</span>
            </span>
          </li>
        ))}
        {familias && (
          <li className="flex items-center gap-2">
            <span aria-hidden className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground"><Users className="size-3.5" strokeWidth={2} /></span>
            <span className="text-cuerpo-sm leading-tight"><span className="font-medium">{familias}</span><span className="text-muted-foreground"> · Pendiente de confirmar</span></span>
          </li>
        )}
      </ul>
      <ul aria-label="Claves del calendario" className="flex flex-wrap gap-x-4 gap-y-1 text-etiqueta font-normal text-muted-foreground">
        <li className="inline-flex items-center gap-1.5"><span aria-hidden className="size-3 rounded-[3px] border border-llego/30 bg-llego-fondo" />Libre para todos los requeridos</li>
        <li className="inline-flex items-center gap-1.5"><span aria-hidden className="size-3 rounded-[3px] bg-muted" />Fuera de la jornada</li>
        <li className="inline-flex items-center gap-1.5"><CalendarOff className="size-3.5" strokeWidth={2} aria-hidden />No lectivo</li>
      </ul>
    </div>
  );
}


type RespuestaSugerencias = { clave: string; datos: Disponibilidad | null; error: string | null };

/**
 * «Horarios sugeridos» (specs/40): recién al abrir se piden al servidor las alternativas de la semana visible (franjas
 * libres para todos los requeridos que no se cruzan, primero una por día). Al elegir una se cierra y el calendario salta
 * a esa fecha con el bloque puesto.
 */
function ModalSugerencias({ abierto, onAbierto, consultar, requeridos, opcionales, semana, duracion, hora, seleccion, onElegir, onSemanaSiguiente, titulo }: {
  abierto: boolean; onAbierto: (v: boolean) => void; consultar: Props["consultar"]; requeridos: string[]; opcionales: string[];
  semana: string; duracion: number; hora: string; seleccion: Seleccion | null; onElegir: (s: Seleccion) => void; onSemanaSiguiente: () => void; titulo: string;
}) {
  const [respuesta, setRespuesta] = useState<RespuestaSugerencias | null>(null);
  const [intento, setIntento] = useState(0);
  const clave = JSON.stringify({ semana, duracion, requeridos, opcionales, intento });
  const cargando = respuesta?.clave !== clave;

  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    consultar({ requeridos, opcionales, fecha: semana, hora, duracion, dias: 7, separar: true, alternativas: true })
      .then((r) => vigente && setRespuesta("error" in r ? { clave, datos: null, error: r.error } : { clave, datos: r, error: null }))
      .catch(() => vigente && setRespuesta({ clave, datos: null, error: "No pudimos calcular los horarios. Inténtalo otra vez." }));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se pide al abrir y al cambiar la clave
  }, [abierto, clave]);

  const datos = !cargando ? respuesta?.datos ?? null : null;
  const error = !cargando ? respuesta?.error ?? null : null;

  return (
    <Dialog open={abierto} onOpenChange={onAbierto}>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-3 overflow-y-auto p-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg font-semibold"><Sparkles className="size-5 text-sec-trazo" strokeWidth={2} aria-hidden />Horarios sugeridos</DialogTitle>
          <DialogDescription>
            Franjas de {duracion} min en que todos los requeridos están libres · <span className="first-letter:uppercase">{titulo}</span>
          </DialogDescription>
        </DialogHeader>
        <section aria-label="Horarios sugeridos" aria-busy={cargando}>
          {cargando ? (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-cuerpo-sm text-muted-foreground" role="status"><Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />Buscando horarios…</p>
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-start gap-3" role="alert">
              <p className="flex items-start gap-2 text-cuerpo-sm text-falta"><CircleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />{error}</p>
              <button type="button" onClick={() => setIntento((n) => n + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}><RotateCw strokeWidth={2} aria-hidden />Reintentar</button>
            </div>
          ) : !datos || datos.alternativas.length === 0 ? (
            <div className="flex flex-col items-start gap-3 text-cuerpo-sm">
              <p className="flex items-start gap-2 text-muted-foreground"><CalendarSearch className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />No hay franjas comunes esta semana.</p>
              <button type="button" onClick={onSemanaSiguiente} className={buttonVariants({ variant: "outline", size: "sm" })}>Ver la semana siguiente<ArrowRight strokeWidth={2} aria-hidden /></button>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {datos.alternativas.map((a) => {
                const inicio = minutos(a.hora);
                const ocupados = opcionalesOcupados(datos, a.fecha, inicio, inicio + duracion);
                const activa = seleccion?.fecha === a.fecha && seleccion.inicio === inicio;
                return (
                  <li key={a.inicio}>
                    <button
                      type="button"
                      aria-pressed={activa}
                      onClick={() => onElegir({ fecha: a.fecha, inicio })}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors hover:bg-accent",
                        activa && "border-primary bg-primary/[0.06] hover:bg-primary/[0.08]",
                      )}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-cuerpo-sm font-semibold first-letter:uppercase">{fechaCorta(a.fecha)} · <span className="tabular-nums">{a.hora}–{a.horaFin}</span></span>
                        {ocupados.length === 0 ? (
                          <span className="inline-flex items-center gap-1 text-etiqueta text-llego"><Check className="size-3.5" strokeWidth={2} aria-hidden />Todos libres</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-etiqueta text-tarde"><Clock className="size-3.5" strokeWidth={2} aria-hidden />Libre salvo opcional {ocupados.map((n) => n.split(" ")[0]).join(", ")}</span>
                        )}
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}

/** Estado de la franja elegida en la barra superior: ícono + palabra (nunca solo color). */
function EstadoSeleccion({ analisis: a, seleccion, cargando, jornada }: { analisis: Analisis | null; seleccion: Seleccion | null; cargando: boolean; jornada: { desde: string; hasta: string } }) {
  let tipo: "ok" | "choque" | "aviso" | "neutro" = "neutro";
  let Icono: typeof Check = Clock;
  let texto = "Elige una franja en el calendario";
  if (seleccion && !a) {
    texto = cargando ? "Revisando agendas…" : "Revisando la agenda de esa semana…";
  } else if (a) {
    const opcionales = a.choques.filter((c) => !c.requerido);
    if (a.pasada) [tipo, Icono, texto] = ["choque", CircleAlert, "Esa hora ya pasó"];
    else if (a.choquesRequeridos.length > 0) [tipo, Icono, texto] = ["choque", CircleAlert, textoChoques(a.choquesRequeridos)];
    else if (a.noLectivo) [tipo, Icono, texto] = ["aviso", CalendarOff, "Día no lectivo (lo confirmas al final)"];
    else if (a.fueraDeHorario) [tipo, Icono, texto] = ["aviso", Moon, `Fuera de la jornada ${jornada.desde}–${jornada.hasta}`];
    else if (opcionales.length > 0) [tipo, Icono, texto] = ["aviso", Clock, `Opcional ocupado: ${opcionales.map(nombreCorto).join(", ")}`];
    else [tipo, Icono, texto] = ["ok", Check, "Todos libres"];
  }
  return (
    <p
      role="status"
      title={texto}
      className={cn(
        "inline-flex min-h-9 min-w-0 items-center gap-1.5 rounded-pildora px-3 text-cuerpo-sm font-medium max-md:order-first max-md:basis-full md:max-w-[22rem] md:min-w-[10rem]",
        tipo === "ok" && "bg-llego-fondo text-llego",
        tipo === "choque" && "bg-falta-fondo text-falta",
        tipo === "aviso" && "bg-tarde-fondo text-tarde",
        tipo === "neutro" && "bg-muted text-muted-foreground",
      )}
    >
      {cargando && seleccion && !a ? <Loader2 className="size-4 shrink-0 animate-spin" strokeWidth={2} aria-hidden /> : <Icono className="size-4 shrink-0" strokeWidth={2} aria-hidden />}
      <span className="truncate">{texto}</span>
    </p>
  );
}
