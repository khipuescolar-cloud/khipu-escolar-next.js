"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// «Un día en el colegio» (specs/25 · Movimiento): el scroll hace correr el reloj de 7:00 a. m. a 5:00 p. m. y muestra
// cuándo se entera la familia con Khipu (7:52 a. m.) y sin Khipu (4:30 p. m.). Ejemplo ilustrativo con datos ficticios.
// El HTML ya trae el estado final (día completo, dos nudos y textos; la marca de la hora oculta): sin JS o con «reducir movimiento» se ve así, quieto.

const INICIO = 7 * 60;
const FIN = 17 * 60;
const posicion = (min: number) => (min - INICIO) / (FIN - INICIO);
const CON = posicion(7 * 60 + 52);
const SIN = posicion(16 * 60 + 30);
const MARCAS = [7, 9, 11, 13, 15, 17];

function hora(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`;
}

const pct = (p: number) => `${(p * 100).toFixed(2)}%`;

function Fila({ nombre, momento, texto, punto, relleno, base, nudo, aclaracion }: { nombre: string; momento: string; texto: string; punto: number; relleno: string; base: string; nudo: string; aclaracion?: string }) {
  return (
    <div className="grid gap-x-6 gap-y-3 sm:grid-cols-[148px_1fr] sm:items-center">
      <p className="text-cuerpo-sm font-semibold">{nombre}</p>
      <div className="flex flex-col gap-3">
        <div className="relative h-7">
          <span className={cn("absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full", base)} />
          <span data-relleno className={cn("absolute inset-x-0 top-1/2 h-[3px] origin-left -translate-y-1/2 rounded-full", relleno)} />
          <span data-ahora className="pointer-events-none absolute inset-0 opacity-0">
            <span className="absolute -top-1.5 -bottom-1.5 left-0 w-0.5 -translate-x-1/2 rounded-full bg-indigo" />
          </span>
          <span data-nudo className={cn("absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-superficie", nudo)} style={{ left: pct(punto) }} />
        </div>
        <p data-nota className="text-cuerpo-sm text-pretty text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{momento}</span> · {texto}
          {aclaracion && <span data-brecha className="ml-2 inline-flex rounded-pildora bg-maiz/30 px-2 py-0.5 text-etiqueta text-tinta tabular-nums">{aclaracion}</span>}
        </p>
      </div>
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
        const [nudoCon, nudoSin] = gsap.utils.toArray<HTMLElement>("[data-nudo]");
        const [notaCon, notaSin] = gsap.utils.toArray<HTMLElement>("[data-nota]");
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: ref.current,
            start: "top 72%",
            end: "bottom 35%",
            scrub: 0.6,
            onUpdate: (st) => {
              if (reloj.current) reloj.current.textContent = hora(INICIO + st.progress * (FIN - INICIO));
            },
          },
        });
        tl.fromTo("[data-relleno]", { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0)
          .fromTo("[data-ahora]", { xPercent: 0, opacity: 1 }, { xPercent: 100, opacity: 1, duration: 1 }, 0)
          .fromTo(nudoCon, { scale: 0 }, { scale: 1, duration: 0.03, ease: "back.out(3)" }, CON)
          .fromTo(notaCon, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.05 }, CON)
          .fromTo(nudoSin, { scale: 0 }, { scale: 1, duration: 0.03, ease: "back.out(3)" }, SIN - 0.03)
          .fromTo(notaSin, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.04 }, SIN - 0.03);
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={cn("flex flex-col gap-6 rounded-lg border border-arena bg-superficie p-5 sm:p-8", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-heading text-titulo-2">Un martes cualquiera, Mateo llega al colegio</h3>
        <span className="flex items-baseline gap-2 text-cuerpo-sm text-muted-foreground" aria-hidden>
          Hora
          <span ref={reloj} className="min-w-[10ch] font-heading text-titulo-2 text-indigo tabular-nums">
            {hora(FIN)}
          </span>
        </span>
      </div>
      <div className="flex flex-col gap-6">
        <div className="hidden grid-cols-[148px_1fr] gap-x-6 sm:grid" aria-hidden>
          <span />
          <div className="relative h-4 text-[12px] leading-4 text-pizarra tabular-nums">
            {MARCAS.map((h, i) => (
              <span key={h} className={cn("absolute whitespace-nowrap", i === 0 ? "" : i === MARCAS.length - 1 ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: pct(posicion(h * 60)) }}>
                {h > 12 ? `${h - 12} p. m.` : h === 12 ? "12 m." : `${h} a. m.`}
              </span>
            ))}
          </div>
        </div>
        <Fila
          nombre="Con Khipu Escolar"
          momento="7:52 a. m."
          texto="La familia recibe el aviso: «Mateo llegó al colegio»."
          punto={CON}
          base="bg-turquesa/15"
          relleno="bg-turquesa"
          nudo="bg-turquesa"
        />
        <Fila
          nombre="Sin Khipu"
          momento="4:30 p. m."
          texto="La familia se entera al revisar el cuaderno de control."
          aclaracion="8 h 38 min después"
          punto={SIN}
          base="bg-arena"
          relleno="bg-pizarra/45"
          nudo="bg-pizarra"
        />
      </div>
    </div>
  );
}
