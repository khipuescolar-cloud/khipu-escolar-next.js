import { Check, CircleAlert, Clock, TriangleAlert } from "lucide-react";
import type { EstadoAsistencia as Estado } from "@/generated/prisma/enums";

/** Estados fijos del manual de marca: siempre ícono + palabra. Falta y problema van en rojo. */
export const ESTADOS_ASISTENCIA: Record<Estado, { palabra: string; Icono: typeof Check; clase: string }> = {
  llego: { palabra: "Llegó", Icono: Check, clase: "bg-llego-fondo text-llego" },
  tarde: { palabra: "Tarde", Icono: Clock, clase: "bg-tarde-fondo text-tarde" },
  falta: { palabra: "No llegó", Icono: CircleAlert, clase: "bg-falta-fondo text-falta" },
  problema: { palabra: "Aviso", Icono: TriangleAlert, clase: "bg-problema-fondo text-problema" },
};

/** Etiqueta de estado: siempre ícono + palabra, nunca solo color. */
export function EstadoAsistencia({ estado, hora }: { estado: Estado; hora?: string }) {
  const { palabra, Icono, clase } = ESTADOS_ASISTENCIA[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-etiqueta whitespace-nowrap ${clase}`}>
      <Icono className="size-3.5" strokeWidth={2} aria-hidden />
      {palabra}
      {hora && <span className="font-normal">· {hora}</span>}
    </span>
  );
}
