import { Skeleton } from "@/components/ui/skeleton";

/** Contenedor accesible de los estados de carga (`loading.tsx`). Ver specs/18-sistema-de-diseno.md. */
export function EsqueletoPagina({ children, conEncabezado = true }: { children: React.ReactNode; conEncabezado?: boolean }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Cargando…</span>
      {conEncabezado && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      )}
      {children}
    </div>
  );
}

export function EsqueletoTarjetas({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <Skeleton className="size-10 rounded-lg" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

export function EsqueletoTabla({ filas = 6, columnas = 4 }: { filas?: number; columnas?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex gap-4 border-b bg-muted/40 p-3">
        {Array.from({ length: columnas }, (_, i) => <Skeleton key={i} className="h-4 flex-1" />)}
      </div>
      {Array.from({ length: filas }, (_, f) => (
        <div key={f} className="flex gap-4 border-b p-3 last:border-b-0">
          {Array.from({ length: columnas }, (_, c) => <Skeleton key={c} className="h-5 flex-1" />)}
        </div>
      ))}
    </div>
  );
}

export function EsqueletoLista({ items = 5 }: { items?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: items }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EsqueletoFormulario({ campos = 4 }: { campos?: number }) {
  return (
    <div className="flex max-w-xl flex-col gap-4 rounded-xl border bg-card p-4">
      {Array.from({ length: campos }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-32" />
    </div>
  );
}
