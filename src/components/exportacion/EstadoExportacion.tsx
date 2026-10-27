import { AlertTriangle, CheckCircle2, Clock, Loader2, TimerOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { VistaExportacion } from "@/lib/server/exportar";

const ESTADOS = {
  pendiente: { icono: Clock, texto: "En cola", variante: "secondary" },
  procesando: { icono: Loader2, texto: "Preparando", variante: "secondary" },
  lista: { icono: CheckCircle2, texto: "Lista", variante: "default" },
  vencida: { icono: TimerOff, texto: "Vencida", variante: "outline" },
  error: { icono: AlertTriangle, texto: "Con error", variante: "destructive" },
} as const;

/** Estado de una exportación: ícono + palabra, nunca solo color. */
export function EstadoExportacion({ estado }: { estado: VistaExportacion["estado"] }) {
  const { icono: Icono, texto, variante } = ESTADOS[estado];
  return (
    <Badge variant={variante} className="h-6 px-2.5">
      <Icono strokeWidth={2} aria-hidden /> {texto}
    </Badge>
  );
}
