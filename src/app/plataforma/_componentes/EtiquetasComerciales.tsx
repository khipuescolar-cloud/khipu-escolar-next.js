import { Ban, CalendarCheck, CalendarClock, CalendarX2, CheckCircle2, FlaskConical, PauseCircle } from "lucide-react";
import { NOMBRE_ESTADO_SUSCRIPCION, textoRenovacion, type EstadoRenovacion } from "@/lib/comercial";
import type { EstadoSuscripcion } from "@/generated/prisma/enums";

const ESTADOS = {
  prueba: { Icono: FlaskConical, clase: "bg-tarde-fondo text-tarde" },
  activa: { Icono: CheckCircle2, clase: "bg-llego-fondo text-llego" },
  suspendida: { Icono: PauseCircle, clase: "bg-tarde-fondo text-tarde" },
  cancelada: { Icono: Ban, clase: "bg-falta-fondo text-falta" },
} satisfies Record<EstadoSuscripcion, unknown>;

/** Estado de la suscripción con ícono + palabra. */
export function EstadoDeSuscripcion({ estado }: { estado: EstadoSuscripcion }) {
  const { Icono, clase } = ESTADOS[estado];
  return (
    <span className={`inline-flex items-center gap-1 rounded-pildora px-2 py-0.5 text-etiqueta ${clase}`}>
      <Icono className="size-3.5" strokeWidth={2} aria-hidden /> {NOMBRE_ESTADO_SUSCRIPCION[estado]}
    </span>
  );
}

/** «Vence en N días» / «Vencida hace N días»: ícono + palabra, nunca solo color. */
export function EtiquetaRenovacion({ renovacion }: { renovacion: EstadoRenovacion }) {
  const { Icono, clase } =
    renovacion.tipo === "vencida"
      ? { Icono: CalendarX2, clase: "bg-falta-fondo text-falta" }
      : renovacion.tipo === "por_vencer"
        ? { Icono: CalendarClock, clase: "bg-tarde-fondo text-tarde" }
        : { Icono: CalendarCheck, clase: "bg-muted text-foreground" };
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-pildora px-2 py-0.5 text-etiqueta ${clase}`}>
      <Icono className="size-3.5" strokeWidth={2} aria-hidden /> {textoRenovacion(renovacion)}
    </span>
  );
}
