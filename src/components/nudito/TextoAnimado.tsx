"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(useGSAP, SplitText);

/** Revela el texto inicial con SplitText y anima cada fragmento incremental sin reconstruir lo ya leído. */
export function TextoAnimado({ texto, className = "", delay = 35, duration = 0.42, distancia = 10, animar = true, incremental = false }: { texto: string; className?: string; delay?: number; duration?: number; distancia?: number; animar?: boolean; incremental?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const elemento = ref.current;
    if (!elemento) return;
    if (incremental || !animar || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const division = new SplitText(elemento, { type: "words,chars", aria: "auto" });
    const animacion = gsap.from(division.chars, {
      opacity: 0,
      y: distancia,
      duration,
      ease: "power2.out",
      stagger: delay / 1000,
    });
    return () => {
      animacion.kill();
      division.revert();
    };
  }, { dependencies: [texto, delay, duration, distancia, animar, incremental], scope: ref, revertOnUpdate: !incremental });

  return <span ref={ref} className={className} aria-hidden={incremental || undefined}>{incremental ? (texto.match(/\S+\s*/gu) ?? []).map((palabra, indice) => <span key={indice} className="inline-block whitespace-nowrap">{Array.from(palabra.trimEnd()).map((letra, posicion) => <span key={posicion} className="inline-block motion-safe:animate-[nd-palabra_0.42s_ease-out_both]" style={{ animationDelay: `${posicion * 35}ms` }}>{letra}</span>)}<span className="whitespace-pre">{palabra.slice(palabra.trimEnd().length)}</span></span>) : texto}</span>;
}
