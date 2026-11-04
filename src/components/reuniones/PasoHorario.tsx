"use client";

import {
  ArrowRight, CalendarDays, CalendarOff, CalendarSearch, Check, ChevronLeft, ChevronRight, CircleAlert, Clock, Loader2, Moon, RotateCw, Rows3, Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { CLASE_CAMPO } from "@/components/ui/Selector";
import { NOMBRE_DIA_SEMANA_CORTO } from "@/lib/agenda-calendario";
import {
  analizar, columnasSemana, encajar, horaTexto, iniciales, nombreCorto, opcionalesOcupados, rangoVisible, semanaDe, textoChoques,
  type Analisis, type Seleccion,
} from "@/lib/asistente-horario";
import { DURACIONES } from "@/lib/disponibilidad";
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
  puedeForzarClase: boolean;
  seleccion: Seleccion | null;
  onSeleccion: (s: Seleccion) => void;
  duracion: number;
  onDuracion: (d: number) => void;
  forzarClase: boolean;
  onForzarClase: (v: boolean) => void;
  onSeguir: (a: Analisis) => void;
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
 * Paso «Horario» del asistente de reuniones (specs/40): duración, calendario de la semana (o del día) con la agenda de
 * cada participante, vista «Por persona», horarios sugeridos y la franja elegida. Se recalcula al cambiar de semana o de
 * duración; los choques de la franja se evalúan al instante en el navegador y el servidor revalida al confirmar.
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
    const s = seleccionRef.current;
    const hora = s && lunesDeSemana(s.fecha) === semana ? horaTexto(s.inicio) : "10:00";
    p.consultar({ requeridos: p.requeridos, opcionales: p.opcionales, fecha: semana, hora, duracion, dias: 7, separar: true })
      .then((r) => {
        if (!vigente) return;
        if ("error" in r) return setRespuesta({ clave, datos: null, error: r.error });
        setRespuesta({ clave, datos: r, error: null });
        const primera = r.alternativas[0];
        if (!seleccionRef.current && primera) {
          onSeleccionRef.current({ fecha: primera.fecha, inicio: minutos(primera.hora) });
          setDiaSel(primera.fecha);
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
  const conocida = !!analisis?.conocida;
  const evaluable = conocida ? analisis : null;
  const dias = vistaReal === "semana" ? columnasSemana(semana, seleccion) : [diaSel];
  const jornada = datos?.jornada ?? { desde: "07:30", hasta: "16:30" };
  const rango = rangoVisible(jornada, seleccion && dias.includes(seleccion.fecha) ? { desde: seleccion.inicio, hasta: seleccion.inicio + duracion } : null);
  const semanaHoy = semanaDe(p.hoy);
  const bloqueado = !!evaluable && evaluable.choquesRequeridos.length > 0 && !(p.puedeForzarClase && evaluable.soloClases && p.forzarClase);
  const puedeSeguir = !cargando && !!evaluable && !evaluable.pasada && !bloqueado;

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

  const seguir = () => evaluable && puedeSeguir && p.onSeguir(evaluable);
  const vistaProps = {
    datos, rango, colores, seleccion, duracion, analisis: evaluable,
    onElegir: elegir, moverDia, onSeguir: seguir, puedeSeguir,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Duración */}
      <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <legend className="sr-only">Duración</legend>
        <span aria-hidden className="text-sm font-medium">Duración</span>
        <div className="grid w-full grid-cols-5 rounded-lg border bg-card p-1 sm:inline-flex sm:w-auto">
          {DURACIONES.map((d) => (
            <label key={d} className="relative">
              <input type="radio" name="duracion" value={d} checked={duracion === d} onChange={() => p.onDuracion(d)} className="peer sr-only" />
              <span className="inline-flex min-h-9 w-full items-center justify-center rounded-md px-2 text-sm whitespace-nowrap sm:px-3 font-medium tabular-nums transition-colors peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:bg-accent peer-checked:hover:bg-primary">
                {d} min
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section aria-labelledby="titulo-horario" className="min-w-0 overflow-hidden rounded-lg border bg-card">
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
                    d === diaSel ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:bg-accent",
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

        <aside className="flex flex-col gap-4">
          <Sugerencias datos={datos} cargando={cargando} seleccion={seleccion} duracion={duracion} onElegir={elegir} onSemanaSiguiente={() => irASemana(sumarDias(semana, 7))} />
          <section aria-labelledby="titulo-seleccion" className="flex flex-col gap-3 rounded-lg border bg-card p-4">
            <h3 id="titulo-seleccion" className="font-heading text-cuerpo font-semibold">Tu selección</h3>
            <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Fecha</span>
                <input
                  type="date"
                  min={p.hoy}
                  value={seleccion?.fecha ?? ""}
                  onChange={(e) => e.target.value && elegir({ fecha: e.target.value, inicio: seleccion?.inicio ?? 600 })}
                  className={cn(CLASE_CAMPO, "px-2 tabular-nums")}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Hora de inicio</span>
                <input
                  type="time"
                  step={900}
                  value={seleccion ? horaTexto(seleccion.inicio) : ""}
                  onChange={(e) => e.target.value && elegir({ fecha: seleccion?.fecha ?? diaSel, inicio: encajar(minutos(e.target.value), duracion, { desde: 0, hasta: 24 * 60 }) })}
                  className={cn(CLASE_CAMPO, "px-2 tabular-nums")}
                />
              </label>
            </div>
            <EstadoSeleccion analisis={evaluable} seleccion={seleccion} cargando={cargando} jornada={jornada} />
            {p.puedeForzarClase && evaluable?.soloClases && (
              <label className="flex items-start gap-2 text-cuerpo-sm">
                <input type="checkbox" checked={p.forzarClase} onChange={(e) => p.onForzarClase(e.target.checked)} className="mt-0.5 size-4 accent-[var(--acento)]" />
                Programar sobre la clase (indicarás el motivo en el siguiente paso; queda registrado).
              </label>
            )}
            <button type="button" disabled={!puedeSeguir} onClick={seguir} className={cn(buttonVariants(), "h-auto min-h-10 w-full py-2 whitespace-normal")}>
              {cargando ? <Loader2 className="animate-spin" strokeWidth={2} aria-hidden /> : null}
              <span className="tabular-nums">
                {seleccion ? (
                  <>Usar {fechaCorta(seleccion.fecha)} · <span className="whitespace-nowrap">{horaTexto(seleccion.inicio)}–{horaTexto(seleccion.inicio + duracion)}</span> y seguir</>
                ) : "Elige una franja"}
              </span>
              {!cargando && <ArrowRight strokeWidth={2} aria-hidden />}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Segmentado({ etiqueta, opciones, valor, onCambio, className }: {
  etiqueta: string; opciones: [string, string, ReactNode?][]; valor: string; onCambio: (v: string) => void; className?: string;
}) {
  return (
    <div role="group" aria-label={etiqueta} className={cn("inline-flex rounded-lg border bg-background p-0.5", className)}>
      {opciones.map(([v, texto, icono]) => (
        <button
          key={v}
          type="button"
          aria-pressed={v === valor}
          onClick={() => onCambio(v)}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
            v === valor ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent",
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

function Sugerencias({ datos, cargando, seleccion, duracion, onElegir, onSemanaSiguiente }: {
  datos: Disponibilidad | null; cargando: boolean; seleccion: Seleccion | null; duracion: number; onElegir: (s: Seleccion) => void; onSemanaSiguiente: () => void;
}) {
  return (
    <section aria-labelledby="titulo-sugeridos" className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <h3 id="titulo-sugeridos" className="font-heading text-cuerpo font-semibold">Horarios sugeridos</h3>
      {!datos || (cargando && datos.alternativas.length === 0) ? (
        <ul aria-hidden className="flex flex-col gap-2">{[0, 1, 2].map((i) => <li key={i}><Skeleton className="h-14 w-full" /></li>)}</ul>
      ) : datos.alternativas.length === 0 ? (
        <div className="flex flex-col items-start gap-2 text-cuerpo-sm">
          <p className="flex items-start gap-2 text-muted-foreground"><CalendarSearch className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />No hay franjas comunes esta semana.</p>
          <button type="button" onClick={onSemanaSiguiente} className={buttonVariants({ variant: "outline", size: "sm" })}>Ver la semana siguiente<ArrowRight strokeWidth={2} aria-hidden /></button>
        </div>
      ) : (
        <ul className={cn("flex flex-col gap-2 transition-opacity duration-150", cargando && "opacity-60")}>
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
                    "flex w-full flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent",
                    activa && "border-primary bg-primary/[0.06] hover:bg-primary/[0.08]",
                  )}
                >
                  <span className="flex w-full items-baseline justify-between gap-2">
                    <span className="text-cuerpo-sm font-semibold first-letter:uppercase">{fechaCorta(a.fecha)}</span>
                    <span className="text-cuerpo-sm font-medium tabular-nums">{a.hora}–{a.horaFin}</span>
                  </span>
                  {ocupados.length === 0 ? (
                    <span className="inline-flex items-center gap-1 text-etiqueta text-llego"><Check className="size-3.5" strokeWidth={2} aria-hidden />Todos libres</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-etiqueta text-tarde"><Clock className="size-3.5" strokeWidth={2} aria-hidden />Libre salvo opcional {ocupados.map((n) => n.split(" ")[0]).join(", ")}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function EstadoSeleccion({ analisis: a, seleccion, cargando, jornada }: { analisis: Analisis | null; seleccion: Seleccion | null; cargando: boolean; jornada: { desde: string; hasta: string } }) {
  if (!seleccion) return <p className="text-cuerpo-sm text-muted-foreground">Haz clic en un espacio del calendario o elige un horario sugerido.</p>;
  if (!a) return <p className="flex items-center gap-2 text-cuerpo-sm text-muted-foreground" role="status">{cargando && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}Revisando la agenda de esa semana…</p>;
  const lineas: { tipo: "ok" | "choque" | "aviso"; Icono: typeof Check; texto: string }[] = [];
  if (a.pasada) lineas.push({ tipo: "choque", Icono: CircleAlert, texto: "Esa hora ya pasó. Elige otra." });
  if (a.choquesRequeridos.length > 0) lineas.push({ tipo: "choque", Icono: CircleAlert, texto: textoChoques(a.choquesRequeridos) });
  const opcionales = a.choques.filter((c) => !c.requerido);
  if (opcionales.length > 0) lineas.push({ tipo: "aviso", Icono: Clock, texto: `Opcional ocupado: ${opcionales.map(nombreCorto).join(", ")} (quedará invitado)` });
  if (a.noLectivo) lineas.push({ tipo: "aviso", Icono: CalendarOff, texto: "Día no lectivo: lo confirmarás en el siguiente paso." });
  else if (a.fueraDeHorario) lineas.push({ tipo: "aviso", Icono: Moon, texto: `Fuera de la jornada (${jornada.desde}–${jornada.hasta}): lo confirmarás en el siguiente paso.` });
  if (lineas.length === 0) lineas.push({ tipo: "ok", Icono: Check, texto: "Todos los requeridos están libres." });
  return (
    <ul className="flex flex-col gap-1.5 text-cuerpo-sm" role="status">
      {lineas.map(({ tipo, Icono, texto }) => (
        <li key={texto} className={cn("flex items-start gap-2 rounded-md px-2.5 py-1.5", tipo === "ok" && "bg-llego-fondo text-llego", tipo === "choque" && "bg-falta-fondo text-falta", tipo === "aviso" && "bg-tarde-fondo text-tarde")}>
          <Icono className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />{texto}
        </li>
      ))}
    </ul>
  );
}
