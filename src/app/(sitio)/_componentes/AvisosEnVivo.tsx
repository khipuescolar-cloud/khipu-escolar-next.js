"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Check, GraduationCap, ListTodo, Megaphone, type LucideIcon } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

// Momento principal de la landing (specs/25 · Movimiento): los avisos que recibe una familia llegan uno tras otro
// en la tarjeta del hero, y cada aviso ata un nudo en la cuerda del khipu. Datos ficticios. Es decorativo (aria-hidden):
// el texto del hero ya dice lo mismo. Sin JS o con «reducir movimiento» queda quieto: primer aviso y cuerda anudada.

type Aviso = { Icono: LucideIcon; etiqueta: string; texto: string; hora: string; icono: string; nudo: string };

const AVISOS: Aviso[] = [
  { Icono: Check, etiqueta: "Llegó", texto: "Mateo llegó al colegio a las 7:52 a. m.", hora: "7:52 a. m.", icono: "bg-llego-fondo text-llego", nudo: "bg-turquesa" },
  { Icono: ListTodo, etiqueta: "Tarea nueva", texto: "Matemática: fracciones, para el jueves.", hora: "10:15 a. m.", icono: "bg-indigo-cielo/12 text-indigo-cielo", nudo: "bg-maiz" },
  { Icono: Megaphone, etiqueta: "Comunicado", texto: "Reunión de familias el viernes a las 6:00 p. m.", hora: "12:40 p. m.", icono: "bg-cochinilla/10 text-cochinilla", nudo: "bg-cochinilla" },
  { Icono: GraduationCap, etiqueta: "Libreta publicada", texto: "Ya puedes ver la libreta del I bimestre.", hora: "3:05 p. m.", icono: "bg-maiz/30 text-tinta", nudo: "bg-white" },
];

const NUDOS = 9;
const CADA_MS = 3400;

type Estado = { indice: number; anterior: number | null; atados: number; enMovimiento: boolean };
const QUIETO: Estado = { indice: 0, anterior: null, atados: NUDOS, enMovimiento: false };
const Escena = createContext<Estado>(QUIETO);

/** Hero que reparte el aviso actual a la tarjeta y a la cuerda. Pausa el ciclo fuera de la pantalla o en otra pestaña. */
export function EscenaAvisos({ className, children, ...props }: ComponentProps<"section">) {
  const ref = useRef<HTMLElement>(null);
  const [estado, setEstado] = useState<Estado>(QUIETO);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = true;
    let temporizador: number | undefined;
    const pasar = () => {
      if (!visible || document.hidden) return;
      setEstado((e) => ({ indice: (e.indice + 1) % AVISOS.length, anterior: e.indice, atados: e.atados >= NUDOS ? 1 : e.atados + 1, enMovimiento: true }));
    };
    const arrancar = () => {
      window.clearInterval(temporizador);
      temporizador = window.setInterval(pasar, CADA_MS);
    };
    // Poco después de cargar: la cuerda se desata y el primer nudo se ata con el primer aviso.
    const inicio = window.setTimeout(() => {
      setEstado({ indice: 0, anterior: null, atados: 1, enMovimiento: true });
      arrancar();
    }, 700);
    const observador = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    if (ref.current) observador.observe(ref.current);
    return () => {
      window.clearTimeout(inicio);
      window.clearInterval(temporizador);
      observador.disconnect();
    };
  }, []);

  return (
    <section ref={ref} className={className} {...props}>
      <Escena.Provider value={estado}>{children}</Escena.Provider>
    </section>
  );
}

function ContenidoAviso({ aviso }: { aviso: Aviso }) {
  return (
    <>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", aviso.icono)}>
        <aviso.Icono className="size-5" strokeWidth={2.5} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-3">
          <span className={cn("text-etiqueta", aviso.etiqueta === "Llegó" ? "text-llego" : "text-tinta")}>{aviso.etiqueta}</span>
          <span className="text-[12px] leading-4 text-pizarra tabular-nums">{aviso.hora}</span>
        </span>
        <span className="text-cuerpo-sm text-pretty">{aviso.texto}</span>
      </span>
    </>
  );
}

/** Tarjeta de aviso: el nuevo sube con un desenfoque que se aclara; el anterior se hunde detrás y se apaga. */
export function TarjetaAviso({ className }: { className?: string }) {
  const { indice, anterior: previo, enMovimiento } = useContext(Escena);
  const contenedor = useRef<HTMLDivElement>(null);
  const actual = useRef<HTMLDivElement>(null);
  const anterior = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!enMovimiento) return;
      gsap.fromTo(
        actual.current,
        { y: 18, opacity: 0, scale: 0.97, filter: "blur(4px)" },
        { y: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.7, ease: "expo.out", clearProps: "filter" },
      );
      if (anterior.current) gsap.fromTo(anterior.current, { y: 0, opacity: 1, scale: 1 }, { y: -12, opacity: 0, scale: 0.94, duration: 0.45, ease: "power2.out" });
    },
    { dependencies: [indice, enMovimiento], scope: contenedor },
  );

  const base = "flex w-full items-start gap-3 rounded-lg bg-superficie p-3 text-tinta shadow-[0_1px_2px_rgba(27,31,42,0.08),0_12px_32px_-8px_rgba(14,20,60,0.45)]";
  return (
    <div ref={contenedor} className={cn("grid", className)} aria-hidden>
      {previo !== null && (
        <div ref={anterior} className={cn(base, "[grid-area:1/1] origin-top")}>
          <ContenidoAviso aviso={AVISOS[previo]} />
        </div>
      )}
      <div ref={actual} className={cn(base, "relative [grid-area:1/1]")}>
        <ContenidoAviso aviso={AVISOS[indice]} />
      </div>
    </div>
  );
}

/** Cuerda del khipu bajo el hero: cada aviso que llega ata el siguiente nudo, con el color de ese aviso. */
export function CuerdaAvisos({ className }: { className?: string }) {
  const { atados } = useContext(Escena);
  return (
    <div className={cn("relative flex h-6 items-center justify-around", className)} aria-hidden>
      <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-white/35" />
      {Array.from({ length: NUDOS }, (_, n) => {
        const atado = n < atados;
        const ultimo = n === atados - 1;
        return (
          <span key={n} className="relative flex size-6 items-center justify-center">
            {ultimo && <span className="nudo-onda absolute inset-0 rounded-full border-2 border-maiz" />}
            <span
              className={cn(
                "size-3.5 rounded-full transition-[scale,opacity] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                AVISOS[n % AVISOS.length].nudo,
                atado ? "scale-100 opacity-100" : "scale-0 opacity-0",
              )}
            />
          </span>
        );
      })}
    </div>
  );
}
