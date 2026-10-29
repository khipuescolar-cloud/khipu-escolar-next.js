"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { TONOS, type Tono } from "./tonos";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Atajos a los grupos de funciones (specs/25): fijos bajo el encabezado y con el grupo que se está leyendo marcado. */
export function NavFunciones({ grupos }: { grupos: { id: string; nombre: string; tono: Tono }[] }) {
  const [activo, setActivo] = useState<string | null>(null);

  useGSAP(() => {
    for (const g of grupos) {
      const el = document.getElementById(g.id);
      if (!el) continue;
      ScrollTrigger.create({
        trigger: el,
        start: "top 55%",
        end: "bottom 55%",
        onToggle: (st) => setActivo((a) => (st.isActive ? g.id : a === g.id ? null : a)),
      });
    }
  });

  return (
    <nav aria-label="Grupos de funciones" className="sticky top-16 z-30 -mx-4 mt-8 bg-superficie/92 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:w-fit sm:max-w-full sm:rounded-pildora sm:p-1.5 sm:shadow-sombra-1 lg:top-[84px]">
      <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {grupos.map((g) => {
          const t = TONOS[g.tono];
          const es = activo === g.id;
          return (
            <li key={g.id} className="shrink-0">
              <a
                href={`#${g.id}`}
                aria-current={es ? "location" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-pildora border-2 px-4 text-cuerpo-sm font-semibold transition-[background-color,color,scale] duration-200 ease-out active:scale-[0.96]",
                  t.borde,
                  es ? t.solido : cn("bg-superficie", g.tono === "maiz" ? "text-tinta" : t.rotulo, "hover:bg-superficie-2"),
                )}
              >
                <span className={cn("size-2 rounded-full transition-colors", es ? (g.tono === "maiz" ? "bg-sobre-maiz" : "bg-white") : t.nudo)} aria-hidden />
                {g.nombre}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
