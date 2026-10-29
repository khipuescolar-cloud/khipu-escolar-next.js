"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { TONOS, type Tono } from "./tonos";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// «Cómo funciona» (specs/25 · Movimiento): los cuatro pasos son nudos de una misma cuerda que se va anudando con el
// scroll. Horizontal en escritorio y vertical en el celular. El HTML trae la cuerda completa (sin JS o con «reducir
// movimiento» se ve anudada y quieta).

const PASOS: { titulo: string; texto: string; tono: Tono }[] = [
  { titulo: "El colegio se registra con Khipu", texto: "Creamos su colegio, su dirección web propia y la cuenta de dirección.", tono: "turquesa" },
  { titulo: "Carga profesores y alumnos", texto: "Con un archivo CSV o uno por uno. Las familias reciben su invitación por correo.", tono: "cochinilla" },
  { titulo: "El profesor pasa lista", texto: "Desde el celular o la computadora, con botones grandes y aunque no haya internet.", tono: "maiz" },
  { titulo: "La familia recibe el aviso", texto: "«Mateo llegó al colegio a las 7:52 a. m.» Firmado por el colegio, sin tecnicismos.", tono: "cielo" },
];

export function PasosKhipu({ className }: { className?: string }) {
  const ref = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      const anudar = (eje: "scaleX" | "scaleY") => {
        const tl = gsap.timeline({ defaults: { ease: "none" }, scrollTrigger: { trigger: ref.current, start: "top 75%", end: "bottom 60%", scrub: 0.6 } });
        tl.fromTo("[data-relleno]", { [eje]: 0 }, { [eje]: 1, duration: 1 }, 0);
        gsap.utils.toArray<HTMLElement>("[data-nudo]").forEach((nudo, i) => {
          tl.fromTo(nudo, { scale: 0.55, opacity: 0.35 }, { scale: 1, opacity: 1, duration: 0.06, ease: "back.out(2.5)" }, Math.max(0, i / (PASOS.length - 1) - 0.03));
        });
      };
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => anudar("scaleX"));
      mm.add("(max-width: 1023.98px) and (prefers-reduced-motion: no-preference)", () => anudar("scaleY"));
    },
    { scope: ref },
  );

  return (
    <ol ref={ref} className={cn("relative grid gap-10 lg:grid-cols-4 lg:gap-6", className)}>
      {/* Cuerda: de centro a centro del primer y último nudo (columna: w/2 = 12.5 % − 3·gap/8). */}
      <span className="absolute top-6 bottom-6 left-[22px] w-[3px] rounded-full bg-white/20 lg:top-[22px] lg:right-[calc(12.5%-9px)] lg:bottom-auto lg:left-[calc(12.5%-9px)] lg:h-[3px] lg:w-auto" aria-hidden>
        <span data-relleno className="absolute inset-0 origin-top rounded-full bg-maiz lg:origin-left" />
      </span>
      {PASOS.map((p, i) => (
        <li key={p.titulo} className="relative grid grid-cols-[48px_1fr] gap-x-5 lg:flex lg:flex-col lg:items-center lg:gap-5 lg:text-center">
          <span data-nudo className={cn("flex size-12 items-center justify-center rounded-full font-heading text-titulo-2 tabular-nums ring-[6px] ring-indigo", TONOS[p.tono].solido)} aria-hidden>
            {i + 1}
          </span>
          <div className="flex flex-col gap-2 pt-2 lg:pt-0">
            <h3 className="font-heading text-titulo-2 text-balance">
              <span className="sr-only">Paso {i + 1}: </span>
              {p.titulo}
            </h3>
            <p className="text-cuerpo text-pretty text-white/80">{p.texto}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
