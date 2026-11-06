import { Skeleton } from "@/components/ui/skeleton";

// Esqueletos que imitan la forma final de las pantallas de gestión, configuración, perfil y soporte
// (encabezado con cuerda, barra de filtros, filas con divisores). Ver DESIGN.md · Composición.

/** Contenedor accesible de la carga (`loading.tsx`). */
export function CargaColegio({ children, ancho }: { children: React.ReactNode; ancho?: string }) {
  return (
    <div className={`flex flex-col gap-6 ${ancho ?? ""}`} aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Cargando…</span>
      {children}
    </div>
  );
}

/** Migas, título, descripción, acciones y cuerda del encabezado de página. */
export function EsqueletoEncabezado({ acciones = 1 }: { acciones?: number }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: acciones }, (_, i) => <Skeleton key={i} className="h-10 w-32 rounded-[10px]" />)}
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

export function EsqueletoPestanas({ cantidad = 7 }: { cantidad?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden border-b pb-3">
      {Array.from({ length: cantidad }, (_, i) => <Skeleton key={i} className="h-5 w-20 shrink-0" />)}
    </div>
  );
}

export function EsqueletoBarraFiltros({ campos = 2 }: { campos?: number }) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-[14px] bg-superficie-2/60 px-4 py-3">
      {Array.from({ length: campos }, (_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-24 bg-borde-sutil" />
          <Skeleton className="h-10 w-44 rounded-[10px] bg-borde-sutil" />
        </div>
      ))}
      <Skeleton className="h-10 w-24 rounded-[10px] bg-borde-sutil" />
    </div>
  );
}

/** Lista con divisores dentro de una sola superficie; cada fila con avatar o ícono, dos líneas y un extremo. */
export function EsqueletoFilas({ filas = 6, avatar = true }: { filas?: number; avatar?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-borde-sutil bg-card">
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-borde-sutil px-4 py-3.5 last:border-b-0">
          {avatar && <Skeleton className="size-8 shrink-0 rounded-full" />}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
          <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
          <Skeleton className="size-9 rounded-[10px]" />
        </div>
      ))}
    </div>
  );
}

/** Secciones de formulario: título con nudo, campos y botón, separadas por divisores (sin tarjetas). */
export function EsqueletoSecciones({ secciones = 3, campos = 2 }: { secciones?: number; campos?: number }) {
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      {Array.from({ length: secciones }, (_, s) => (
        <div key={s} className="flex flex-col gap-4 border-t border-borde-sutil pt-8 first:border-t-0 first:pt-0">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: campos }, (_, c) => (
              <div key={c} className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full rounded-[10px]" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-28 rounded-[10px]" />
        </div>
      ))}
    </div>
  );
}
