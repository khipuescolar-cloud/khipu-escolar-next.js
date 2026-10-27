import { CheckCircle2, Clock, UserRoundX } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ESTADO = {
  activa: { texto: "Activo", clase: "bg-llego-fondo text-llego", Icono: CheckCircle2 },
  invitada: { texto: "Invitación pendiente", clase: "bg-tarde-fondo text-tarde", Icono: Clock },
  inactiva: { texto: "Inactivo", clase: "bg-muted text-muted-foreground", Icono: UserRoundX },
} as const;

/** Estado de una cuenta (ícono + palabra). */
export function InsigniaEstado({ estado }: { estado: keyof typeof ESTADO }) {
  const { texto, clase, Icono } = ESTADO[estado];
  return (
    <Badge className={`h-6 px-2.5 text-xs font-semibold ${clase}`}>
      <Icono strokeWidth={2} aria-hidden /> {texto}
    </Badge>
  );
}
