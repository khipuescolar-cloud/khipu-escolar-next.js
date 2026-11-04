// Estilo por tipo de ítem del calendario (specs/12): ícono + palabra (nunca solo color). Sin "use client" para que lo
// usen tanto la grilla (cliente) como las vistas Mes y Lista (servidor).
import { Ban, CalendarDays, CalendarOff, ListTodo, NotebookPen, PartyPopper, School, Users, type LucideIcon } from "lucide-react";
import type { ItemCalendario } from "@/lib/agenda-calendario";

export type EstiloTipo = { palabra: string; Icono: LucideIcon; tinta: string; borde: string };

/** Ícono + palabra por tipo (nunca solo color). Los eventos de la agenda conservan el estilo de «Mi horario». */
const SUBTIPO_EVENTO: Record<string, { palabra: string; Icono: LucideIcon }> = {
  reunion: { palabra: "Reunión", Icono: Users },
  examen: { palabra: "Examen", Icono: NotebookPen },
  feriado: { palabra: "Feriado", Icono: CalendarOff },
  actividad: { palabra: "Actividad", Icono: PartyPopper },
  evento: { palabra: "Evento", Icono: CalendarDays },
};

export function estiloDe(it: Pick<ItemCalendario, "tipo" | "subtipo">): EstiloTipo {
  const primario = { tinta: "text-primary", borde: "border-primary/60" };
  switch (it.tipo) {
    case "reunion": return { palabra: "Reunión", Icono: Users, ...primario };
    case "evaluacion": return { palabra: "Evaluación", Icono: NotebookPen, tinta: "text-falta", borde: "border-falta/60" };
    case "entrega": return { palabra: "Entrega de tarea", Icono: ListTodo, tinta: "text-tarde", borde: "border-tarde/60" };
    case "bloqueo": return { palabra: "Ocupado", Icono: Ban, tinta: "text-muted-foreground", borde: "border-border" };
    case "clase": return { palabra: "Clase", Icono: School, ...primario };
    default: {
      const s = SUBTIPO_EVENTO[it.subtipo ?? "evento"] ?? SUBTIPO_EVENTO.evento;
      return { ...s, ...primario };
    }
  }
}

