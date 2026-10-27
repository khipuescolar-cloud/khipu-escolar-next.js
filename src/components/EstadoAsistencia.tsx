import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { EstadoAsistencia as Estado } from "@/generated/prisma/enums";

export const ESTADOS_ASISTENCIA: Record<Estado, { palabra: string; Icono: typeof CheckCircle2; clase: string }> = {
  llego: { palabra: "Llegó", Icono: CheckCircle2, clase: "bg-llego-fondo text-llego" },
  tarde: { palabra: "Tarde", Icono: Clock, clase: "bg-tarde-fondo text-tarde" },
  falta: { palabra: "Falta", Icono: XCircle, clase: "bg-falta-fondo text-falta" },
  problema: { palabra: "Problema", Icono: AlertTriangle, clase: "bg-problema-fondo text-problema" },
};

/** Píldora de estado: siempre ícono + palabra, nunca solo color. */
export function EstadoAsistencia({ estado, hora }: { estado: Estado; hora?: string }) {
  const { palabra, Icono, clase } = ESTADOS_ASISTENCIA[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${clase}`}>
      <Icono className="size-3.5" strokeWidth={2} aria-hidden />
      {palabra}
      {hora && <span className="font-normal">· {hora}</span>}
    </span>
  );
}
