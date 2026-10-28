import { CheckCircle2, MailPlus, PauseCircle } from "lucide-react";
import type { EstadoMembresia as Estado } from "@/generated/prisma/enums";

const CONFIG = {
  activa: { Icono: CheckCircle2, palabra: "Activa", clase: "bg-llego-fondo text-llego" },
  invitada: { Icono: MailPlus, palabra: "Invitada", clase: "bg-tarde-fondo text-tarde" },
  inactiva: { Icono: PauseCircle, palabra: "Inactiva", clase: "bg-falta-fondo text-falta" },
} satisfies Record<Estado, unknown>;

/** Estado de una membresía con ícono + palabra. */
export function EstadoMembresia({ estado }: { estado: Estado }) {
  const { Icono, palabra, clase } = CONFIG[estado];
  return (
    <span className={`inline-flex items-center gap-1 rounded-pildora px-2 py-0.5 text-etiqueta ${clase}`}>
      <Icono className="size-3.5" strokeWidth={2} aria-hidden /> {palabra}
    </span>
  );
}
