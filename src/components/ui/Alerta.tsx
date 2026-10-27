import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

type Tipo = "info" | "exito" | "aviso" | "error";

const config = {
  info: { Icono: Info, clase: "bg-superficie-2 text-tinta", palabra: "Información" },
  exito: { Icono: CheckCircle2, clase: "bg-llego-fondo text-llego", palabra: "Listo" },
  aviso: { Icono: AlertTriangle, clase: "bg-tarde-fondo text-tarde", palabra: "Atención" },
  error: { Icono: XCircle, clase: "bg-falta-fondo text-falta", palabra: "Error" },
} satisfies Record<Tipo, unknown>;

/** Mensaje con ícono + palabra: el estado nunca se comunica solo con color. */
export function Alerta({ tipo = "info", children }: { tipo?: Tipo; children: ReactNode }) {
  const { Icono, clase, palabra } = config[tipo];
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-md px-3 py-2.5 text-sm ${clase}`}>
      <Icono className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      <p>
        <span className="sr-only">{palabra}: </span>
        {children}
      </p>
    </div>
  );
}
