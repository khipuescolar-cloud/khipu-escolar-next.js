import { CalendarClock, CheckCircle2, Clock, Hourglass, Repeat, ThumbsDown, ThumbsUp, XCircle, type LucideIcon } from "lucide-react";
import type { EstadoReunion, RespuestaReunion } from "@/generated/prisma/enums";
import { TEXTO_ESTADO, TEXTO_RESPUESTA } from "@/lib/reuniones";

/** Estado plano: ícono + palabra con el color del estado, sin píldora de fondo. */
const base = "inline-flex w-fit items-center gap-1.5 text-etiqueta font-semibold";

const ESTADOS: Record<EstadoReunion, { Icono: LucideIcon; clase: string }> = {
  por_confirmar: { Icono: Hourglass, clase: "text-tarde" },
  programada: { Icono: CalendarClock, clase: "text-sec-tinta" },
  realizada: { Icono: CheckCircle2, clase: "text-llego" },
  cancelada: { Icono: XCircle, clase: "text-falta" },
};

const RESPUESTAS: Record<RespuestaReunion, { Icono: LucideIcon; clase: string }> = {
  pendiente: { Icono: Clock, clase: "text-tarde" },
  asistire: { Icono: ThumbsUp, clase: "text-llego" },
  no_asistire: { Icono: ThumbsDown, clase: "text-falta" },
  propone_otra: { Icono: Repeat, clase: "text-sec-tinta" },
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
