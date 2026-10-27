import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

type Tipo = "info" | "exito" | "aviso" | "error";

const config = {
  info: { Icono: Info, clase: "border-border bg-muted text-foreground", palabra: "Información" },
  exito: { Icono: CheckCircle2, clase: "border-llego/20 bg-llego-fondo text-llego", palabra: "Listo" },
  aviso: { Icono: AlertTriangle, clase: "border-tarde/20 bg-tarde-fondo text-tarde", palabra: "Atención" },
  error: { Icono: XCircle, clase: "border-falta/20 bg-falta-fondo text-falta", palabra: "Error" },
} satisfies Record<Tipo, unknown>;

/** Mensaje con ícono + palabra: el estado nunca se comunica solo con color. */
export function Alerta({ tipo = "info", children }: { tipo?: Tipo; children: ReactNode }) {
  const { Icono, clase, palabra } = config[tipo];
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${clase}`}>
      <Icono className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      <p>
        <span className="sr-only">{palabra}: </span>
        {children}
      </p>
    </div>
  );
}
