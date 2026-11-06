import { Skeleton } from "@/components/ui/skeleton";

/** Esqueletos de carga del módulo académico: imitan la forma final (barra de filtros, tabla densa, documento, lista). */

/** Barra de filtros en una sola superficie (curso, periodo, acción). */
export function EsqueletoBarra({ campos = 2 }: { campos?: number }) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-[14px] border border-borde-sutil bg-superficie p-4">
      {Array.from({ length: campos }, (_, i) => (
        <div key={i} className="flex min-w-40 flex-1 flex-col gap-1.5 sm:max-w-64">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-10 w-full rounded-[10px]" />
        </div>
      ))}
      <Skeleton className="h-10 w-20 rounded-[10px]" />
    </div>
  );
}

/** Pestañas por enlaces. */
export function EsqueletoPestanas({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className="flex gap-6 border-b border-borde-sutil py-3">
      {Array.from({ length: cantidad }, (_, i) => <Skeleton key={i} className="h-4 w-20" />)}
    </div>
  );
}

/** Tabla densa con cabecera y filas finas. */
export function EsqueletoTablaDensa({ filas = 8, columnas = 5 }: { filas?: number; columnas?: number }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-borde-sutil bg-superficie">
      <div className="flex gap-4 border-b border-borde-sutil bg-sec-suave p-3">
        <Skeleton className="h-4 w-40 shrink-0" />
        {Array.from({ length: columnas - 1 }, (_, i) => <Skeleton key={i} className="h-4 flex-1" />)}
      </div>
      {Array.from({ length: filas }, (_, f) => (
        <div key={f} className="flex items-center gap-4 border-b border-borde-sutil p-2.5 last:border-b-0">
          <Skeleton className="h-4 w-40 shrink-0" />
          {Array.from({ length: columnas - 1 }, (_, c) => <Skeleton key={c} className="h-8 flex-1 rounded-[8px]" />)}
        </div>
      ))}
    </div>
  );
}

/** Cifras hermanas en una superficie dividida. */
export function EsqueletoCifras({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-[14px] border border-borde-sutil bg-borde-sutil sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 bg-superficie p-4">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3.5 w-36" />
        </div>
      ))}
    </div>
  );
}

/** Lista con divisores (sin tarjeta por fila). */
export function EsqueletoFilas({ filas = 5 }: { filas?: number }) {
  return (
    <div className="divide-y divide-borde-sutil rounded-[14px] border border-borde-sutil bg-superficie">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 p-4">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
          <Skeleton className="h-8 w-20 rounded-[10px]" />
        </div>
      ))}
    </div>
  );
}

/** Documento (libreta): cabecera, bloques con filas de competencia. */
export function EsqueletoDocumento() {
  return (
    <div className="flex flex-col gap-6 rounded-[14px] border border-borde-sutil bg-superficie p-5 sm:p-6">
      <div className="flex flex-col gap-2 border-b border-borde-sutil pb-4">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 3 }, (_, j) => (
            <div key={j} className="flex items-center justify-between gap-4 border-t border-borde-sutil pt-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
