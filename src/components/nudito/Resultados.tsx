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
      {resultados.plan && <p className="rounded-[var(--radio-md)] bg-superficie-2 p-3 font-nudito">Temas dominados: {resultados.plan.dominados} de {resultados.plan.total}{resultados.plan.completo ? " · ¡Plan completo! Repasa libremente o profundiza." : ""}</p>}
      <dl className="grid grid-cols-3 gap-2">
        {datos.map((d) => {
          const Icono = d.icono;
          return (
            <div key={d.etiqueta} className="flex flex-col items-center gap-1 rounded-[var(--radio-lg)] border border-borde-sutil bg-superficie p-3 text-center">
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
              <li key={t.clave} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radio-md)] border border-borde-sutil bg-superficie p-3">
                <span className="font-semibold">{t.nombre}</span>
                <EtiquetaEstado estado={t.estado} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radio-lg)] bg-superficie-2 p-3"><h3 className="font-semibold">Habilidades</h3><p className="text-cuerpo-sm">{resultados.habilidades.length ? resultados.habilidades.join(", ") : "Sigues construyendo estas habilidades."}</p></div>
        <div className="rounded-[var(--radio-lg)] bg-superficie-2 p-3"><h3 className="font-semibold">Por reforzar</h3><p className="text-cuerpo-sm">{resultados.dificultades.length ? resultados.dificultades.join(", ") : "Buen avance en esta práctica."}</p></div>
      </div>
      <div className="rounded-[var(--radio-lg)] border border-borde-sutil p-3"><h3 className="font-semibold">Te recomiendo</h3><ul className="list-inside list-disc text-cuerpo-sm">{resultados.recomendaciones.map((r,i) => <li key={i}>{r}</li>)}</ul></div>
      <Button size="lg" className="min-h-11 self-start" onClick={onOtroTema}>
        <RotateCcw strokeWidth={2} aria-hidden />
        Practicar otro tema
      </Button>
    </section>
  );
}
