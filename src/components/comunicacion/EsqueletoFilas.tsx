import { Skeleton } from "@/components/ui/skeleton";

/** Carga de listas con divisores (conversaciones, notificaciones, comunicados, documentos, reuniones): imita la superficie final. */
export function EsqueletoFilas({ filas = 6, avatar = false, lineas = 2 }: { filas?: number; avatar?: boolean; lineas?: 2 | 3 }) {
  return (
    <div className="flex flex-col divide-y divide-borde-sutil overflow-hidden rounded-[14px] border border-borde-sutil bg-card">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          {avatar && <Skeleton className="size-10 shrink-0 rounded-full" />}
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
            {lineas === 3 && <Skeleton className="h-3 w-3/5" />}
          </div>
        </div>
      ))}
    </div>
  );
}

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
