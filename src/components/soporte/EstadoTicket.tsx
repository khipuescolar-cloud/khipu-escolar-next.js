import { Archive, CircleCheck, CircleDot, Hourglass, MessageCircleQuestion, SignalHigh, SignalLow, SignalMedium, Siren, type LucideIcon } from "lucide-react";
import type { EstadoTicket, PrioridadTicket } from "@/generated/prisma/enums";
import { nombreEstado, NOMBRE_PRIORIDAD } from "@/lib/soporte";
import { cn } from "@/lib/utils";

// Estado y prioridad de una conversación de la mesa de ayuda (specs/23): siempre ícono + palabra.

const ESTADO: Record<EstadoTicket, { Icono: LucideIcon; clase: string }> = {
  abierto: { Icono: CircleDot, clase: "bg-primary/10 text-primary" },
  en_progreso: { Icono: Hourglass, clase: "bg-tarde-fondo text-tarde" },
  esperando_colegio: { Icono: MessageCircleQuestion, clase: "bg-muted text-foreground" },
  resuelto: { Icono: CircleCheck, clase: "bg-llego-fondo text-llego" },
  cerrado: { Icono: Archive, clase: "bg-muted text-muted-foreground" },
};

const PRIORIDAD: Record<PrioridadTicket, { Icono: LucideIcon; clase: string }> = {
  baja: { Icono: SignalLow, clase: "text-muted-foreground" },
  normal: { Icono: SignalMedium, clase: "text-muted-foreground" },
  alta: { Icono: SignalHigh, clase: "text-tarde" },
  urgente: { Icono: Siren, clase: "text-falta" },
};

export function InsigniaEstadoTicket({ estado, lado, className }: { estado: EstadoTicket; lado: "colegio" | "khipu"; className?: string }) {
  const { Icono, clase } = ESTADO[estado];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-pildora px-2 py-0.5 text-etiqueta whitespace-nowrap", clase, className)} data-testid="estado-ticket">
      <Icono className="size-3.5" strokeWidth={2} aria-hidden /> {nombreEstado(estado, lado)}
    </span>
  );
}

export function InsigniaPrioridad({ prioridad, className }: { prioridad: PrioridadTicket; className?: string }) {
  const { Icono, clase } = PRIORIDAD[prioridad];
  return (
    <span className={cn("inline-flex items-center gap-1 text-etiqueta whitespace-nowrap", clase, className)}>
      <Icono className="size-3.5" strokeWidth={2} aria-hidden /> {NOMBRE_PRIORIDAD[prioridad]}
    </span>
  );
}
