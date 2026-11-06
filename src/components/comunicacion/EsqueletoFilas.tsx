import { Skeleton } from "@/components/ui/skeleton";

export { EsqueletoFilas } from "@/components/carga/Esqueletos";

/** Carga del calendario de la agenda: barra de vistas, cabecera del periodo y cuadrícula. */
export function EsqueletoCalendario() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-12 w-72 max-w-full rounded-[10px]" />
      <div className="overflow-hidden rounded-[14px] border border-borde-sutil bg-card">
        <div className="flex items-center justify-between border-b border-borde-sutil px-4 py-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="grid grid-cols-5 gap-px bg-borde-sutil">
          {Array.from({ length: 15 }, (_, i) => <div key={i} className="h-24 bg-card p-2"><Skeleton className="h-4 w-1/2" /></div>)}
        </div>
      </div>
    </div>
  );
}
