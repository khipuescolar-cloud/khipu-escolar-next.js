import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tipo = "info" | "exito" | "aviso" | "error";

const config = {
  info: { Icono: Info, clase: "border-info/20 bg-info-fondo text-info", palabra: "Información" },
  exito: { Icono: CheckCircle2, clase: "border-llego/25 bg-llego-fondo text-llego", palabra: "Listo" },
  aviso: { Icono: AlertTriangle, clase: "border-tarde/25 bg-tarde-fondo text-tarde", palabra: "Atención" },
  error: { Icono: XCircle, clase: "border-falta/25 bg-falta-fondo text-falta", palabra: "Error" },
} satisfies Record<Tipo, unknown>;

/** Mensaje con ícono + palabra: el estado nunca se comunica solo con color. `titulo` es opcional. */
export function Alerta({ tipo = "info", titulo, children, className }: { tipo?: Tipo; titulo?: string; children: ReactNode; className?: string }) {
  const { Icono, clase, palabra } = config[tipo];
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={cn("flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm", clase, className)}>
      <Icono className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
      <div className="min-w-0 space-y-0.5">
        {titulo && <p className="font-semibold">{titulo}</p>}
        <p>
          <span className="sr-only">{palabra}: </span>
          {children}
        </p>
      </div>
    </div>
  );
}
