import { Check, CircleAlert, Clock } from "lucide-react";
import type { EstadoJustificacion } from "@/generated/prisma/enums";

const ESTADO: Record<EstadoJustificacion, { palabra: string; Icono: typeof Clock; clase: string }> = {
  pendiente: { palabra: "Pendiente", Icono: Clock, clase: "bg-tarde-fondo text-tarde" },
  aceptada: { palabra: "Aceptada", Icono: Check, clase: "bg-llego-fondo text-llego" },
  rechazada: { palabra: "No aceptada", Icono: CircleAlert, clase: "bg-falta-fondo text-falta" },
};

/** Estado de una justificación: ícono + palabra con los colores fijos de asistencia. */
export function EstadoPildora({ estado }: { estado: EstadoJustificacion }) {
  const { palabra, Icono, clase } = ESTADO[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-etiqueta whitespace-nowrap ${clase}`}>
      <Icono className="size-3.5" strokeWidth={2} aria-hidden /> {palabra}
    </span>
  );
}
