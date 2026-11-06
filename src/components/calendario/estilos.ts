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

/**
 * Cada tipo toma la cuerda de la sección del menú a la que pertenece: clases = Día a día (turquesa), reuniones =
 * Comunicación (cochinilla), evaluaciones y entregas = Académico (ocre), eventos del colegio = índigo.
 */
const DIA = { tinta: "text-[color:var(--dia-tinta)]", borde: "border-[color:var(--dia-trazo)]/60" };
const COMUNICACION = { tinta: "text-[color:var(--comunicacion-tinta)]", borde: "border-[color:var(--comunicacion-trazo)]/60" };
const ACADEMICO = { tinta: "text-[color:var(--academico-tinta)]", borde: "border-[color:var(--academico-trazo)]/60" };
const COLEGIO = { tinta: "text-primary", borde: "border-primary/60" };

export function estiloDe(it: Pick<ItemCalendario, "tipo" | "subtipo">): EstiloTipo {
  switch (it.tipo) {
    case "reunion": return { palabra: "Reunión", Icono: Users, ...COMUNICACION };
    case "evaluacion": return { palabra: "Evaluación", Icono: NotebookPen, ...ACADEMICO };
    case "entrega": return { palabra: "Entrega de tarea", Icono: ListTodo, ...ACADEMICO };
    case "bloqueo": return { palabra: "Ocupado", Icono: Ban, tinta: "text-muted-foreground", borde: "border-border" };
    case "clase": return { palabra: "Clase", Icono: School, ...DIA };
    default: {
      const s = SUBTIPO_EVENTO[it.subtipo ?? "evento"] ?? SUBTIPO_EVENTO.evento;
      return { ...s, ...(it.subtipo === "reunion" ? COMUNICACION : it.subtipo === "examen" ? ACADEMICO : COLEGIO) };
    }
  }
}
