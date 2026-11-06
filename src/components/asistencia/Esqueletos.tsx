import { Skeleton } from "@/components/ui/skeleton";

/** Cabecera de carga de las pantallas de «Día a día»: título, descripción y cuerda. */
export function EsqueletoPaginaDia({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Cargando…</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      {children}
    </div>
  );
}

/** Barra de filtros en una sola superficie. */
export function EsqueletoBarra({ campos = 4 }: { campos?: number }) {
  return (
    <div className="grid gap-3 rounded-[14px] border border-borde-sutil bg-superficie p-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: campos }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Lista con divisores (sin tarjetas por fila): círculo + dos líneas + estado a la derecha. */
export function EsqueletoFilas({ filas = 6 }: { filas?: number }) {
  return (
    <div className="flex flex-col divide-y divide-borde-sutil border-y border-borde-sutil">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3.5">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3 max-w-60" />
            <Skeleton className="h-3 w-1/2 max-w-96" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
