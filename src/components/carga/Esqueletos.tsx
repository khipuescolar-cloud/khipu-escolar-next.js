import { Skeleton } from "@/components/ui/skeleton";

/**
 * Contenedor accesible de los estados de carga (`loading.tsx`). Ver specs/18-sistema-de-diseno.md.
 * `migas` añade la línea de migas sobre el título (pantallas con `EncabezadoPagina`).
 */
export function EsqueletoPagina({ children, conEncabezado = true, migas = false }: { children: React.ReactNode; conEncabezado?: boolean; migas?: boolean }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Cargando…</span>
      {conEncabezado && (
        <div className="flex flex-col gap-2">
          {migas && <Skeleton className="h-3.5 w-40" />}
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Lista con divisores en una sola superficie (sin tarjeta por fila): avatar opcional, dos o tres líneas y un extremo
 * opcional (`pildora` = estado, `boton` = acción). `superficie="abierta"` la deja sin caja (solo líneas arriba y abajo).
 */
export function EsqueletoFilas({
  filas = 6, avatar = false, lineas = 2, extremo, superficie = "caja",
}: { filas?: number; avatar?: boolean; lineas?: 2 | 3; extremo?: "pildora" | "boton"; superficie?: "caja" | "abierta" }) {
  return (
    <div className={superficie === "caja"
      ? "flex flex-col divide-y divide-borde-sutil overflow-hidden rounded-[14px] border border-borde-sutil bg-card"
      : "flex flex-col divide-y divide-borde-sutil border-y border-borde-sutil"}>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} className={`flex items-center gap-3 py-3.5 ${superficie === "caja" ? "px-4" : ""}`}>
          {avatar && <Skeleton className="size-9 shrink-0 rounded-full" />}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-4/5" />
            {lineas === 3 && <Skeleton className="h-3 w-3/5" />}
          </div>
          {extremo === "pildora" && <Skeleton className="h-7 w-20 rounded-full" />}
          {extremo === "boton" && <Skeleton className="h-8 w-20 rounded-[10px]" />}
        </div>
      ))}
    </div>
  );
}

/** Pestañas por enlaces (línea inferior). */
export function EsqueletoPestanas({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className="flex gap-6 overflow-hidden border-b border-borde-sutil py-3">
      {Array.from({ length: cantidad }, (_, i) => <Skeleton key={i} className="h-4 w-20 shrink-0" />)}
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
