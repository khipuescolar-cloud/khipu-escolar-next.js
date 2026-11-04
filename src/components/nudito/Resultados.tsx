import { Clock, Lightbulb, RotateCcw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResultadosSesion } from "@/lib/nudito/contratos";
import { ENTRADA_PASO, EtiquetaEstado, TituloPaso, VozNudito } from "./piezas";

/** Resumen de la sesión: aciertos, pistas, tiempo y cómo va cada tema (formativo, nunca notas). */
export function Resultados({ resultados, onOtroTema }: { resultados: ResultadosSesion; onOtroTema: () => void }) {
  const datos = [
    { icono: Target, valor: `${resultados.aciertos}/${resultados.total}`, etiqueta: "aciertos" },
    { icono: Lightbulb, valor: String(resultados.pistas), etiqueta: resultados.pistas === 1 ? "pista" : "pistas" },
    { icono: Clock, valor: String(resultados.minutos), etiqueta: resultados.minutos === 1 ? "minuto" : "minutos" },
  ];
  return (
    <section aria-labelledby="paso-resultados" className={`flex flex-col gap-4 ${ENTRADA_PASO}`}>
      <TituloPaso id="paso-resultados">¡Terminaste la práctica!</TituloPaso>
      <VozNudito estado="celebrando" tamano={64}>
        {resultados.mensaje}
      </VozNudito>
      <dl className="grid grid-cols-3 gap-2">
        {datos.map((d) => {
          const Icono = d.icono;
          return (
            <div key={d.etiqueta} className="flex flex-col items-center gap-1 rounded-[var(--radio-lg)] border border-border bg-superficie p-3 text-center">
              <Icono className="size-5 text-turquesa" strokeWidth={2} aria-hidden />
              <dd className="font-titulo text-titulo-2 tabular-nums">{d.valor}</dd>
              <dt className="text-etiqueta text-muted-foreground">{d.etiqueta}</dt>
            </div>
          );
        })}
      </dl>
      {resultados.temas.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-titulo font-semibold">Tus temas</h3>
          <ul className="flex flex-col gap-2">
            {resultados.temas.map((t) => (
              <li key={t.clave} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radio-md)] border border-border bg-superficie p-3">
                <span className="font-semibold">{t.nombre}</span>
                <EtiquetaEstado estado={t.estado} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <Button size="lg" className="min-h-11 self-start" onClick={onOtroTema}>
        <RotateCcw strokeWidth={2} aria-hidden />
        Practicar otro tema
      </Button>
    </section>
  );
}
