import { Archive, CalendarCheck, CircleDot, MessageCircleReply, School, type LucideIcon } from "lucide-react";
import type { EstadoSolicitud } from "@/generated/prisma/enums";
import { NOMBRE_ESTADO_SOLICITUD } from "@/lib/solicitudes";
import { cn } from "@/lib/utils";

// Estado de una solicitud de demo: siempre ícono + palabra.
const ESTADO: Record<EstadoSolicitud, { Icono: LucideIcon; clase: string }> = {
  nueva: { Icono: CircleDot, clase: "bg-primary/10 text-primary" },
  contactada: { Icono: MessageCircleReply, clase: "bg-tarde-fondo text-tarde" },
  demo_agendada: { Icono: CalendarCheck, clase: "bg-muted text-foreground" },
  convertida: { Icono: School, clase: "bg-llego-fondo text-llego" },
  descartada: { Icono: Archive, clase: "bg-muted text-muted-foreground" },
};

export function InsigniaEstadoSolicitud({ estado, className }: { estado: EstadoSolicitud; className?: string }) {
  const { Icono, clase } = ESTADO[estado];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-pildora px-2 py-0.5 text-etiqueta whitespace-nowrap", clase, className)} data-testid="estado-solicitud">
      <Icono className="size-3.5" strokeWidth={2} aria-hidden /> {NOMBRE_ESTADO_SOLICITUD[estado]}
    </span>
  );
}
