import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import type { EjercicioPublico } from "@/lib/nudito/contratos";
import { ENTRADA_PASO, TituloPaso } from "./piezas";

/** Tarjeta del ejercicio: progreso (3/5), comprobación y enunciado. El contenido (entrada, pista, retro) va dentro. */
export function TarjetaEjercicio({ ejercicio, numero, total, comprobacion, children }: { ejercicio: EjercicioPublico; numero: number; total: number; comprobacion: boolean; children: ReactNode }) {
  const pct = Math.min(100, Math.round((numero / Math.max(1, total)) * 100));
  return (
    <section aria-labelledby="paso-ejercicio" className={`flex flex-col gap-4 rounded-[var(--radio-lg)] border border-border bg-superficie p-4 shadow-sm sm:p-5 ${ENTRADA_PASO}`}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-etiqueta text-muted-foreground">
            Ejercicio {numero} de {total}
          </span>
          {comprobacion && (
            <span className="inline-flex items-center gap-1 rounded-full bg-turquesa/10 px-2 py-0.5 text-etiqueta text-turquesa">
              <ShieldCheck className="size-3.5" strokeWidth={2} aria-hidden />
              Comprobación
            </span>
          )}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-superficie-2" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={numero} aria-label={`Ejercicio ${numero} de ${total}`}>
          <div className="h-full rounded-full bg-turquesa transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <TituloPaso id="paso-ejercicio">
        <span className="whitespace-pre-line">{ejercicio.enunciado}</span>
      </TituloPaso>
      {ejercicio.imagenAlt && <p className="text-cuerpo-sm text-muted-foreground">Imagen: {ejercicio.imagenAlt}</p>}
      {children}
    </section>
  );
}
