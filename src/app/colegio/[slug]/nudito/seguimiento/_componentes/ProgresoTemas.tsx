import { CheckCircle2, Circle, Lightbulb, RefreshCw, Sprout } from "lucide-react";
import { TituloBloque } from "@/components/academico/TituloBloque";
import { formatoDia } from "@/lib/fechas";
import type { AreaNudito, EstadoDominio } from "@/lib/nudito/contratos";
import { AVISO_FORMATIVO, NOMBRE_AREA_NUDITO, NOMBRE_ESTADO_DOMINIO } from "@/lib/nudito-seguimiento";
import type { TemaProgresoDetalle } from "@/lib/server/nudito/progreso";

const ICONO_ESTADO: Record<EstadoDominio, { Icono: typeof Circle; clase: string }> = {
  no_iniciado: { Icono: Circle, clase: "text-muted-foreground" },
  en_progreso: { Icono: Sprout, clase: "text-primary" },
  en_comprobacion: { Icono: Lightbulb, clase: "text-tarde" },
  dominado: { Icono: CheckCircle2, clase: "text-llego" },
  reforzar: { Icono: RefreshCw, clase: "text-cochinilla" },
};

/** Estado de dominio con ícono + palabra (nunca solo color). */
export function EstadoTema({ estado }: { estado: EstadoDominio }) {
  const { Icono, clase } = ICONO_ESTADO[estado];
  return (
    <span className={`inline-flex items-center gap-1 text-cuerpo-sm font-semibold ${clase}`}>
      <Icono className="size-4 shrink-0" strokeWidth={2} aria-hidden /> {NOMBRE_ESTADO_DOMINIO[estado]}
    </span>
  );
}

/**
 * Progreso de un alumno por área y tema (specs/44): temas practicados, aciertos, pistas, dificultad alcanzada, estado y
 * motivo de la progresión. Sin respuestas ni conversaciones.
 */
export function ProgresoTemas({ areas, temas, vacio }: { areas: AreaNudito[]; temas: TemaProgresoDetalle[]; vacio: string }) {
  if (temas.length === 0) return <p className="text-cuerpo-sm text-muted-foreground" data-testid="progreso-vacio">{vacio}</p>;
  return (
    <div className="flex flex-col gap-6" data-testid="progreso-temas">
      <p className="text-cuerpo-sm text-muted-foreground">{AVISO_FORMATIVO}</p>
      {areas.map((area) => {
        const delArea = temas.filter((t) => t.area === area);
        if (delArea.length === 0) return null;
        return (
          <section key={area} className="flex flex-col gap-3" aria-labelledby={`area-${area}`}>
            <TituloBloque id={`area-${area}`}>{NOMBRE_AREA_NUDITO[area]}</TituloBloque>
            <ul className="divide-y divide-borde-sutil overflow-hidden rounded-[14px] border border-borde-sutil bg-superficie">
              {delArea.map((t) => (
                <li key={t.clave}>
                  <div className="flex flex-col gap-1.5 p-4 sm:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold">{t.nombre}{t.subtema ? <span className="font-normal text-muted-foreground"> · {t.subtema}</span> : null}</p>
                      <EstadoTema estado={t.estado} />
                    </div>
                    <p className="text-cuerpo-sm tabular-nums">
                      {t.aciertos} de {t.intentos} aciertos · {t.aciertosSinPista} sin pista
                      {t.pistasPromedio !== null ? ` · ${t.pistasPromedio} pistas por ejercicio` : ""} · dificultad {t.dificultad} de 5 · {t.grado}.° grado
                    </p>
                    {t.motivo && <p className="text-cuerpo-sm text-muted-foreground">{t.motivo}</p>}
                    {t.ultimaPractica && <p className="text-cuerpo-sm text-muted-foreground">Última práctica: {formatoDia(new Date(t.ultimaPractica), { day: "numeric", month: "long" })}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
