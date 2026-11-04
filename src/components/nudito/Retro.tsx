import { CircleCheck, CircleDot, HelpCircle, type LucideIcon, Sparkles, TrendingUp } from "lucide-react";
import type { EstadoDominio, Evaluacion } from "@/lib/nudito/contratos";
import { ENTRADA_PASO, EtiquetaEstado, VozNudito } from "./piezas";

const RESULTADO: Record<Evaluacion["resultado"], { icono: LucideIcon; palabra: string; clase: string }> = {
  correcto: { icono: CircleCheck, palabra: "¡Correcto!", clase: "bg-llego-fondo text-llego" },
  parcial: { icono: TrendingUp, palabra: "¡Vas muy bien!", clase: "bg-maiz/20 text-tinta" },
  incorrecto: { icono: CircleDot, palabra: "Casi", clase: "bg-indigo/10 text-indigo dark:text-indigo-cielo" },
  incierto: { icono: HelpCircle, palabra: "Lo revisamos juntos", clase: "bg-superficie-2 text-pizarra" },
};

/** Retroalimentación del intento: siempre con ánimo (Nudito nunca da malas noticias). */
export function Retro({ evaluacion, cambioDominio }: { evaluacion: Evaluacion; cambioDominio?: { estado: EstadoDominio; motivo: string } }) {
  const r = RESULTADO[evaluacion.resultado];
  const Icono = r.icono;
  return (
    <div className={`flex flex-col gap-3 ${ENTRADA_PASO}`}>
      <p className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1 font-semibold ${r.clase}`}>
        <Icono className="size-5" strokeWidth={2} aria-hidden />
        {r.palabra}
      </p>
      <VozNudito estado={evaluacion.resultado === "correcto" ? "celebrando" : "reposo"}>
        <span className="whitespace-pre-line">{evaluacion.retro}</span>
      </VozNudito>
      {evaluacion.criterios && evaluacion.criterios.length > 0 && (
        <ul className="flex flex-col gap-1 pl-14 text-cuerpo-sm">
          {evaluacion.criterios.map((c) => (
            <li key={c.id}>
              <span className="font-semibold">Nivel {c.nivel + 1} de 4:</span> {c.comentario}
            </li>
          ))}
        </ul>
      )}
      {cambioDominio && (
        <div className="ml-14 flex flex-wrap items-center gap-2 rounded-[var(--radio-md)] bg-superficie-2 p-3 text-cuerpo-sm">
          <Sparkles className="size-4" strokeWidth={2} aria-hidden />
          <EtiquetaEstado estado={cambioDominio.estado} />
          <span>{cambioDominio.motivo}</span>
        </div>
      )}
    </div>
  );
}
