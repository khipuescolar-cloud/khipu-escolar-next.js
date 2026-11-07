import { AlertTriangle, HardDrive } from "lucide-react";

function tamano(bytes: number) {
  const valor = bytes / 1024 ** 3;
  return `${valor < 0.1 ? valor.toFixed(2) : valor.toFixed(1)} GB`;
}

export function IndicadorAlmacenamiento({ usado, limite, titulo }: { usado: number; limite: number; titulo: string }) {
  const porcentaje = limite > 0 ? Math.min(100, Math.round(usado * 100 / limite)) : 0;
  const alerta = porcentaje >= 85;
  return <section aria-label={titulo} className="rounded-xl border border-borde-sutil p-4">
    <div className="flex items-start gap-2"><HardDrive className="mt-0.5 size-4 text-sec-trazo" strokeWidth={2} aria-hidden /><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">{titulo}</h2><p className="mt-1 text-sm text-muted-foreground">Usaste {tamano(usado)} de {tamano(limite)}</p></div><span className="text-sm font-medium tabular-nums">{porcentaje}%</span></div>
    <div role="progressbar" aria-label={titulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje} className="mt-3 h-2 overflow-hidden rounded-full bg-sec-suave"><div className="h-full rounded-full bg-sec-trazo" style={{ width: `${porcentaje}%` }} /></div>
    {alerta && <p className="mt-2 flex gap-2 text-sm text-destructive"><AlertTriangle className="size-4 shrink-0" aria-hidden />{porcentaje >= 95 ? "Casi no queda espacio para borradores." : "Queda poco espacio para borradores."}</p>}
  </section>;
}
