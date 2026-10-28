import { Award, CheckCircle2, Clock, Sprout } from "lucide-react";
import { ETIQUETA_LITERAL, aprobado, etiquetaVigesimal, formatearNumero, type ValorCalificacion } from "@/lib/calificaciones";

const LITERAL = {
  AD: { Icono: Award, clase: "bg-llego-fondo text-llego" },
  A: { Icono: CheckCircle2, clase: "bg-llego-fondo text-llego" },
  B: { Icono: Clock, clase: "bg-tarde-fondo text-tarde" },
  C: { Icono: Sprout, clase: "bg-problema-fondo text-problema" },
} as const;

/** Píldora de calificación: siempre ícono + valor + palabra, nunca solo color. */
export function Calificacion({ valor }: { valor: ValorCalificacion }) {
  if (valor.valorLiteral) {
    const { Icono, clase } = LITERAL[valor.valorLiteral];
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-etiqueta ${clase}`}>
        <Icono className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        {valor.valorLiteral} · {ETIQUETA_LITERAL[valor.valorLiteral]}
      </span>
    );
  }
  if (valor.valorNumerico !== null) {
    const bien = aprobado(valor.valorNumerico);
    const Icono = bien ? CheckCircle2 : Clock;
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-etiqueta ${bien ? "bg-llego-fondo text-llego" : "bg-tarde-fondo text-tarde"}`}>
        <Icono className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        {formatearNumero(valor.valorNumerico)} · {etiquetaVigesimal(valor.valorNumerico)}
      </span>
    );
  }
  return <span className="text-cuerpo-sm text-muted-foreground">Sin calificar</span>;
}
