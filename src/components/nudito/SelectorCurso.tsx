"use client";

import { ChevronRight } from "lucide-react";
import type { CursoNuditoVista } from "@/lib/nudito/contratos";
import { AREA_VISUAL, ENTRADA_PASO, TituloPaso, VozNudito, type NivelVista } from "./piezas";

/** Tarjetas de los cursos del alumno con área Nudito (solo las que devuelve el servidor). */
export function SelectorCurso({ cursos, nivel, ocupado, onElegir }: { cursos: CursoNuditoVista[]; nivel: NivelVista; ocupado: boolean; onElegir: (c: CursoNuditoVista) => void }) {
  const primaria = nivel === "primaria";
  return (
    <section aria-labelledby="paso-curso" className={`flex flex-col gap-4 ${ENTRADA_PASO}`}>
      <TituloPaso id="paso-curso">¿Qué curso practicamos?</TituloPaso>
      {cursos.length === 0 ? (
        <VozNudito>Todavía no tengo cursos listos para tu salón. Pronto podremos practicar juntos.</VozNudito>
      ) : (
        <ul className={`grid gap-3 ${primaria ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
          {cursos.map((c) => {
            const v = AREA_VISUAL[c.area];
            const Icono = v.icono;
            return (
              <li key={c.cursoId}>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => onElegir(c)}
                  className={`group flex w-full items-center gap-3 rounded-[var(--radio-lg)] border bg-superficie text-left shadow-sm outline-none transition-[transform,box-shadow] duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 motion-safe:hover:-translate-y-0.5 ${v.borde} ${primaria ? "min-h-24 p-4 sm:flex-col sm:items-start" : "min-h-14 p-3"}`}
                >
                  <span className={`flex shrink-0 items-center justify-center rounded-xl ${v.fondo} ${v.tinta} ${primaria ? "size-14" : "size-10"}`}>
                    <Icono className={primaria ? "size-8" : "size-5"} strokeWidth={2} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-titulo font-semibold ${primaria ? "text-lg" : "text-cuerpo"}`}>{c.nombre}</span>
                    {v.etiqueta !== c.nombre && <span className="block text-cuerpo-sm text-muted-foreground">{v.etiqueta}</span>}
                  </span>
                  <ChevronRight className="size-5 text-muted-foreground sm:hidden" strokeWidth={2} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
