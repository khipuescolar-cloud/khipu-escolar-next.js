import { AlertTriangle, CheckCircle2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Tarjeta } from "@/components/ui/Tarjeta";

/** Tarjeta de métrica: ícono + título, valor grande y nota opcional. */
export function StatTile({ titulo, valor, Icono, children }: { titulo: string; valor: string; Icono: LucideIcon; children?: ReactNode }) {
  return (
    <Tarjeta className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
          <Icono className="size-5" strokeWidth={2} aria-hidden />
        </span>
        <p className="text-sm font-medium text-muted-foreground">{titulo}</p>
      </div>
      <p className="font-heading text-3xl font-bold tracking-tight">{valor}</p>
      {children && <div className="text-xs text-muted-foreground">{children}</div>}
    </Tarjeta>
  );
}

/** Indicador con ícono + palabra: «Bien» o «Revisar». */
export function Semaforo({ bien, texto }: { bien: boolean; texto: string }) {
  const Icono = bien ? CheckCircle2 : AlertTriangle;
  return (
    <span className={`inline-flex items-start gap-1 font-semibold ${bien ? "text-llego" : "text-tarde"}`}>
      <Icono className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden />
      <span>{bien ? "Bien" : "Revisar"} · {texto}</span>
    </span>
  );
}
