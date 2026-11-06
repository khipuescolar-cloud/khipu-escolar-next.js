import { AlertTriangle, CheckCircle2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Celda de métrica para una superficie compartida. */
export function StatTile({ titulo, valor, Icono, children }: { titulo: string; valor: string; Icono: LucideIcon; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 bg-card p-4">
      <div className="flex items-center gap-2">
        <Icono className="size-4 shrink-0 text-sec-trazo" strokeWidth={2} aria-hidden />
        <p className="text-cuerpo-sm font-medium text-muted-foreground">{titulo}</p>
      </div>
      <p className="font-heading text-titulo-2 font-semibold tabular-nums">{valor}</p>
      {children && <div className="text-cuerpo-sm text-muted-foreground">{children}</div>}
    </div>
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
