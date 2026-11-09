import { Award, CheckCircle2, CircleSlash, Clock, Sprout } from "lucide-react";
import { ETIQUETA_LITERAL, NOMBRE_MARCA, SIGLA_MARCA, aprobado, etiquetaVigesimal, formatearNumero, type Marca, type ValorCalificacion } from "@/lib/calificaciones";

const LITERAL = {
  AD: { Icono: Award, clase: "bg-llego-fondo text-llego" },
  A: { Icono: CheckCircle2, clase: "bg-llego-fondo text-llego" },
  B: { Icono: Clock, clase: "bg-tarde-fondo text-tarde" },
  C: { Icono: Sprout, clase: "bg-problema-fondo text-problema" },
} as const;

/** Píldora de calificación: ícono y valor; la variante compacta conserva la etiqueta accesible. */
export function Calificacion({ valor, compacta = false }: { valor: ValorCalificacion & { marca?: Marca | null }; compacta?: boolean }) {
  if (valor.valorLiteral) {
    const { Icono, clase } = LITERAL[valor.valorLiteral];
    const etiqueta = valor.valorLiteral + " · " + ETIQUETA_LITERAL[valor.valorLiteral];
    return (
      <span title={etiqueta} aria-label={etiqueta} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-pildora px-2.5 py-1 text-etiqueta ${clase}`}>
        <Icono className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        {compacta ? valor.valorLiteral : etiqueta}
      </span>
    );
  }
  if (valor.valorNumerico !== null) {
    const bien = aprobado(valor.valorNumerico);
    const Icono = bien ? CheckCircle2 : Clock;
    const etiqueta = formatearNumero(valor.valorNumerico) + " · " + etiquetaVigesimal(valor.valorNumerico);
    return (
      <span title={etiqueta} aria-label={etiqueta} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-pildora px-2.5 py-1 text-etiqueta ${bien ? "bg-llego-fondo text-llego" : "bg-tarde-fondo text-tarde"}`}>
        <Icono className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        {compacta ? formatearNumero(valor.valorNumerico) : etiqueta}
      </span>
    );
  }
  // NSP / NE: estado académico, no una nota (specs/37).
  if (valor.marca) {
    const etiqueta = SIGLA_MARCA[valor.marca] + " · " + NOMBRE_MARCA[valor.marca];
    return (
      <span title={etiqueta} aria-label={etiqueta} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-pildora bg-muted px-2.5 py-1 text-etiqueta text-foreground">
        <CircleSlash className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        {compacta ? SIGLA_MARCA[valor.marca] : etiqueta}
      </span>
    );
  }
  return <span className="text-cuerpo-sm text-muted-foreground">Sin calificar</span>;
}
