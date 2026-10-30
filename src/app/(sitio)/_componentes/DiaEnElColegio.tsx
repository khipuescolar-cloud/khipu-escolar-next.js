"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BookOpen, Check, ListTodo, Megaphone, NotebookPen, Smartphone, type LucideIcon } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// «Un día en el colegio» (specs/25 · Movimiento): el scroll corre el reloj de 7:00 a. m. a 9:00 p. m. y cada aviso
// se enciende cuando el reloj lo alcanza. Con Khipu llegan en el momento (asistencia, tarea, reunión, libreta);
// sin Khipu llegan en la tarde, en la noche o días después. Ejemplo ilustrativo con datos ficticios.
// El HTML ya trae el estado final (todo encendido; la marca de la hora oculta): sin JS o con «reducir movimiento» se ve quieto.

const INICIO = 7 * 60;
const FIN = 21 * 60;
const posicion = (min: number) => (min - INICIO) / (FIN - INICIO);
const MARCAS = [7, 9, 11, 13, 15, 17, 19, 21];

type Evento = { min: number; momento?: string; Icono: LucideIcon; etiqueta: string; texto: string; nudo: string; icono: string };

const CON_KHIPU: Evento[] = [
  { min: 7 * 60 + 52, Icono: Check, etiqueta: "Llegó", texto: "Mateo llegó al colegio.", nudo: "bg-turquesa", icono: "bg-llego-fondo text-llego" },
  { min: 10 * 60 + 15, Icono: ListTodo, etiqueta: "Tarea nueva", texto: "Matemática: fracciones, para el jueves.", nudo: "bg-indigo-cielo", icono: "bg-indigo-cielo/12 text-indigo-cielo" },
  { min: 12 * 60 + 40, Icono: Megaphone, etiqueta: "Reunión", texto: "Reunión de familias el viernes a las 6:00 p. m.", nudo: "bg-cochinilla", icono: "bg-cochinilla/10 text-cochinilla" },
  { min: 15 * 60 + 5, Icono: BookOpen, etiqueta: "Libreta", texto: "La libreta del I bimestre ya está publicada.", nudo: "bg-maiz", icono: "bg-maiz/30 text-tinta" },
];

const SIN_KHIPU: Evento[] = [
  { min: 16 * 60 + 30, Icono: NotebookPen, etiqueta: "Llegada y tarea", texto: "La familia las ve al revisar el cuaderno de control.", nudo: "bg-pizarra", icono: "bg-superficie-2 text-pizarra" },
  { min: 20 * 60 + 40, Icono: Smartphone, etiqueta: "Reunión", texto: "El aviso queda perdido entre los mensajes del grupo de WhatsApp.", nudo: "bg-pizarra", icono: "bg-superficie-2 text-pizarra" },
  { min: FIN, momento: "Días después", Icono: BookOpen, etiqueta: "Libreta", texto: "Recién en la reunión de fin de bimestre.", nudo: "bg-pizarra", icono: "bg-superficie-2 text-pizarra" },
];

function hora(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
}

const pct = (p: number) => `${(p * 100).toFixed(2)}%`;

function Fila({ nombre, resumen, eventos, base, relleno, destacada }: { nombre: string; resumen: string; eventos: Evento[]; base: string; relleno: string; destacada?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className={cn("font-heading text-cuerpo font-semibold", destacada && "text-turquesa")}>{nombre}</h4>
        <p className="text-cuerpo-sm text-muted-foreground">{resumen}</p>
      </div>
      <div className="relative h-7">
        <span className={cn("absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full", base)} />
        <span data-relleno className={cn("absolute inset-x-0 top-1/2 h-[3px] origin-left -translate-y-1/2 rounded-full", relleno)} />
        {/* La marca recorre el ancho moviendo una capa del mismo ancho: la recorta su contenedor para no ensanchar la página. */}
        <span className="pointer-events-none absolute inset-0 overflow-x-clip">
          <span data-ahora className="absolute inset-0 opacity-0">
            <span className="absolute -top-1.5 -bottom-1.5 left-0 w-0.5 -translate-x-1/2 rounded-full bg-indigo" />
          </span>
        </span>
        {eventos.map((e) => (
          <span
            key={e.etiqueta}
            data-pos={posicion(e.min)}
            data-nudo
            className={cn("absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-superficie", e.nudo)}
            style={{ left: pct(Math.min(posicion(e.min), 0.985)) }}
          />
        ))}
      </div>
      <ul className={cn("grid gap-3", eventos.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3")}>
        {eventos.map((e) => (
          <li key={e.etiqueta} data-pos={posicion(e.min)} className="flex items-start gap-3 rounded-md border border-arena bg-fondo p-3">
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", e.icono)} aria-hidden>
              <e.Icono className="size-4" strokeWidth={2.5} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-etiqueta">{e.etiqueta}</span>
                <span className="text-[12px] leading-4 text-pizarra tabular-nums">{e.momento ?? hora(e.min)}</span>
              </span>
              <span className="text-cuerpo-sm text-pretty text-muted-foreground">{e.texto}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DiaEnElColegio({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reloj = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: ref.current,
            start: "top 70%",
            end: "bottom 45%",
            scrub: 0.6,
            onUpdate: (st) => {
              if (reloj.current) reloj.current.textContent = hora(INICIO + st.progress * (FIN - INICIO));
            },
          },
        });
        tl.fromTo("[data-relleno]", { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0).fromTo("[data-ahora]", { xPercent: 0, opacity: 1 }, { xPercent: 100, opacity: 1, duration: 1 }, 0);
        for (const el of gsap.utils.toArray<HTMLElement>("[data-pos]")) {
          const p = Math.max(0, Math.min(Number(el.dataset.pos), 0.99) - 0.015);
          if ("nudo" in el.dataset) tl.fromTo(el, { scale: 0 }, { scale: 1, duration: 0.02, ease: "back.out(3)" }, p);
          else tl.fromTo(el, { opacity: 0.3, filter: "grayscale(1)" }, { opacity: 1, filter: "grayscale(0)", duration: 0.03 }, p);
        }
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={cn("flex flex-col gap-8 rounded-lg border border-arena bg-superficie p-5 sm:p-8", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-heading text-titulo-2 text-balance">Un martes cualquiera en el colegio de Mateo</h3>
        <span className="flex items-baseline gap-2 text-cuerpo-sm text-muted-foreground" aria-hidden>
          Hora
          <span ref={reloj} className="min-w-[10ch] font-heading text-titulo-2 text-indigo tabular-nums">
            {hora(FIN)}
          </span>
        </span>
      </div>
      <div className="relative hidden h-4 text-[12px] leading-4 text-pizarra tabular-nums sm:block" aria-hidden>
        {MARCAS.map((h, i) => (
          <span key={h} className={cn("absolute whitespace-nowrap", i === 0 ? "" : i === MARCAS.length - 1 ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: pct(posicion(h * 60)) }}>
            {h > 12 ? `${h - 12} p. m.` : h === 12 ? "12 m." : `${h} a. m.`}
          </span>
        ))}
      </div>
      <Fila nombre="Con Khipu Escolar" resumen="Cada aviso llega en el momento en que pasa." eventos={CON_KHIPU} base="bg-turquesa/15" relleno="bg-turquesa" destacada />
      <Fila nombre="Sin Khipu" resumen="La familia se entera en la tarde, en la noche o días después." eventos={SIN_KHIPU} base="bg-arena" relleno="bg-pizarra/70" />
    </div>
  );
}
