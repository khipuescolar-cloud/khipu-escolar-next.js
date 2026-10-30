import { CalendarX2, CheckCircle2, CircleDashed, Hourglass } from "lucide-react";
import { fechaCorta } from "@/lib/fechas";
import type { EstadoFamilia } from "@/lib/nudito-plus";

/** Estado de Nudito+ de un hijo: ícono + palabra, nunca solo color (specs/18). */
export function EstadoLicencia({ estado }: { estado: EstadoFamilia }) {
  const { Icono, clase, texto } =
    estado.tipo === "activa"
      ? { Icono: CheckCircle2, clase: "bg-llego-fondo text-llego", texto: `Activa hasta ${fechaCorta(estado.hasta)}` }
      : estado.tipo === "revision"
        ? { Icono: Hourglass, clase: "bg-tarde-fondo text-tarde", texto: "Pago en revisión" }
        : estado.tipo === "vencida"
          ? { Icono: CalendarX2, clase: "bg-muted text-foreground", texto: `Vencida el ${fechaCorta(estado.hasta)}` }
          : { Icono: CircleDashed, clase: "bg-muted text-foreground", texto: "Sin licencia" };
  return (
    <span data-testid="estado-nudito" className={`inline-flex w-fit items-center gap-1.5 rounded-pildora px-2.5 py-1 text-etiqueta ${clase}`}>
      <Icono className="size-4" strokeWidth={2} aria-hidden /> {texto}
    </span>
  );
}
