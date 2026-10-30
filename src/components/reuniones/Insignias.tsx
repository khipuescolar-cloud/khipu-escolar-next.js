import { CalendarClock, CheckCircle2, Clock, ThumbsDown, ThumbsUp, XCircle, type LucideIcon } from "lucide-react";
import type { EstadoReunion, RespuestaReunion } from "@/generated/prisma/enums";
import { TEXTO_ESTADO, TEXTO_RESPUESTA } from "@/lib/reuniones";

const base = "inline-flex w-fit items-center gap-1.5 rounded-pildora px-2.5 py-1 text-etiqueta";

const ESTADOS: Record<EstadoReunion, { Icono: LucideIcon; clase: string }> = {
  programada: { Icono: CalendarClock, clase: "bg-accent text-accent-foreground" },
  realizada: { Icono: CheckCircle2, clase: "bg-llego-fondo text-llego" },
  cancelada: { Icono: XCircle, clase: "bg-falta-fondo text-falta" },
};

const RESPUESTAS: Record<RespuestaReunion, { Icono: LucideIcon; clase: string }> = {
  pendiente: { Icono: Clock, clase: "bg-tarde-fondo text-tarde" },
  asistire: { Icono: ThumbsUp, clase: "bg-llego-fondo text-llego" },
  no_asistire: { Icono: ThumbsDown, clase: "bg-falta-fondo text-falta" },
};

/** Estado de la reunión con ícono + palabra. `porCerrar`: programada que ya empezó (la persona que convoca debe cerrarla). */
export function InsigniaEstado({ estado, porCerrar = false }: { estado: EstadoReunion; porCerrar?: boolean }) {
  const { Icono, clase } = ESTADOS[estado];
  return (
    <span className={`${base} ${clase}`}>
      <Icono className="size-3.5" strokeWidth={2} aria-hidden />{porCerrar ? "Por cerrar" : TEXTO_ESTADO[estado]}
    </span>
  );
}

export function InsigniaRespuesta({ respuesta }: { respuesta: RespuestaReunion }) {
  const { Icono, clase } = RESPUESTAS[respuesta];
  return (
    <span className={`${base} ${clase}`}>
      <Icono className="size-3.5" strokeWidth={2} aria-hidden />{TEXTO_RESPUESTA[respuesta]}
    </span>
  );
}
