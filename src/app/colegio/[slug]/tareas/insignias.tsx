import { Archive, CalendarDays, CheckCheck, CheckCircle2, Circle, Clock, FileEdit, Lock, PencilLine, RotateCcw, Timer, XCircle } from "lucide-react";
import { fechaLima, formatoDia, formatoHora, sumarDias } from "@/lib/fechas";
import { ETIQUETA_ESTADO_ENTREGA, ETIQUETA_ESTADO_TAREA, type EstadoEntregaT, type EstadoTareaT } from "@/lib/tareas";

// Insignias de tareas (specs/39, specs/18): siempre ícono + palabra, nunca solo color.

const PILDORA = "inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-etiqueta";
// Estados neutros: ícono + palabra sin relleno (el relleno se reserva para lo que pide atención).
const NEUTRO = "inline-flex items-center gap-1.5 text-etiqueta text-muted-foreground";

/** Fecha límite: «Entrega mañana», «Venció…», «Sin fecha límite». */
export function FechaEntrega({ fecha, conHora = false, vencida = false }: { fecha: Date | null; conHora?: boolean; vencida?: boolean }) {
  if (!fecha) {
    return <span className={NEUTRO}><CalendarDays className="size-3.5" strokeWidth={2} aria-hidden />Sin fecha límite</span>;
  }
  const hoy = fechaLima(new Date());
  const dia = fechaLima(fecha);
  const hora = conHora ? ` · ${formatoHora(fecha)}` : "";
  let Icono = CalendarDays;
  let clase = "";
  let texto = `Entrega ${formatoDia(fecha)}${hora}`;
  if (vencida || dia < hoy) {
    Icono = XCircle; clase = "bg-falta-fondo text-falta"; texto = `Venció ${formatoDia(fecha)}${hora}`;
  } else if (dia === hoy) {
    Icono = Clock; clase = "bg-tarde-fondo text-tarde"; texto = `Entrega hoy${hora}`;
  } else if (dia === sumarDias(hoy, 1)) {
    Icono = Clock; clase = "bg-tarde-fondo text-tarde"; texto = `Entrega mañana${hora}`;
  }
  return <span className={clase ? `${PILDORA} ${clase}` : NEUTRO}><Icono className="size-3.5" strokeWidth={2} aria-hidden />{texto}</span>;
}

const ENTREGA = {
  asignada: { Icono: Circle, clase: "" },
  en_proceso: { Icono: PencilLine, clase: "" },
  entregada: { Icono: CheckCircle2, clase: "bg-llego-fondo text-llego" },
  devuelta: { Icono: RotateCcw, clase: "bg-tarde-fondo text-tarde" },
  revisada: { Icono: CheckCheck, clase: "bg-llego-fondo text-llego" },
} as const;

/** Estado de la entrega de un alumno (+ «con retraso» / «en físico»). */
export function EstadoEntrega({ estado, tarde = false, enFisico = false, vencida = false }: { estado: EstadoEntregaT; tarde?: boolean; enFisico?: boolean; vencida?: boolean }) {
  const pendienteVencida = vencida && (estado === "asignada" || estado === "en_proceso");
  const { Icono, clase } = pendienteVencida ? { Icono: XCircle, clase: "bg-falta-fondo text-falta" } : ENTREGA[estado];
  const palabra = pendienteVencida ? "No entregada" : ETIQUETA_ESTADO_ENTREGA[estado];
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={clase ? `${PILDORA} ${clase}` : NEUTRO}><Icono className="size-3.5" strokeWidth={2} aria-hidden />{palabra}</span>
      {tarde && (estado === "entregada" || estado === "revisada") && <span className={`${PILDORA} bg-tarde-fondo text-tarde`}><Timer className="size-3.5" strokeWidth={2} aria-hidden />Con retraso</span>}
      {enFisico && <span className={NEUTRO}>En físico</span>}
    </span>
  );
}

const TAREA = { borrador: FileEdit, publicada: CheckCircle2, cerrada: Lock, archivada: Archive } as const;

/** Estado de la tarea para el docente (borrador, programada, publicada, cerrada, archivada). */
export function EstadoTarea({ estado, programada = false }: { estado: EstadoTareaT; programada?: boolean }) {
  const Icono = programada ? Clock : TAREA[estado];
  return <span className={NEUTRO}><Icono className="size-3.5" strokeWidth={2} aria-hidden />{programada ? "Programada" : ETIQUETA_ESTADO_TAREA[estado]}</span>;
}
