import { Lightbulb } from "lucide-react";

/** Pista graduada (1 → 3) que entregó el servidor. */
export function Pista({ nivel, texto, quedan }: { nivel: 1 | 2 | 3; texto: string; quedan: number }) {
  return (
    <div className="flex gap-3 rounded-[var(--radio-lg)] border border-maiz/60 bg-maiz/10 p-3 motion-safe:animate-[nd-entra_320ms_ease-out_both]">
      <Lightbulb className="mt-0.5 size-5 shrink-0 text-tinta" strokeWidth={2} aria-hidden />
      <div className="min-w-0">
        <p className="text-etiqueta">
          Pista {nivel} · {quedan === 0 ? "era la última" : `quedan ${quedan}`}
        </p>
        <p className="font-nudito text-voz-nudito">{texto}</p>
      </div>
    </div>
  );
}
