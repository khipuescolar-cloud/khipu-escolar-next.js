import { EsqueletoPagina } from "@/components/carga/Esqueletos";
import { Skeleton } from "@/components/ui/skeleton";

// Imita la vista de horario: barra de elección y cuadrícula de horas por días.
export default function Loading() {
  return (
    <EsqueletoPagina>
      <Skeleton className="h-[74px] w-full rounded-xl" />
      <div className="overflow-hidden rounded-xl border border-borde-sutil bg-card">
        <div className="grid grid-cols-[6rem_repeat(5,minmax(0,1fr))] gap-3 border-b border-borde-sutil p-3">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-4" />)}
        </div>
        {Array.from({ length: 7 }, (_, f) => (
          <div key={f} className="grid grid-cols-[6rem_repeat(5,minmax(0,1fr))] gap-3 border-b border-borde-sutil p-3 last:border-b-0">
            {Array.from({ length: 6 }, (_, c) => <Skeleton key={c} className="h-10" />)}
          </div>
        ))}
      </div>
    </EsqueletoPagina>
  );
}
