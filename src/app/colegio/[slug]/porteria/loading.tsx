import { Skeleton } from "@/components/ui/skeleton";

/** Portería: imita la pantalla final (modo, cámara, resultado grande y búsqueda manual). */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Cargando…</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="aspect-[4/3] w-full rounded-[14px]" />
          <Skeleton className="h-11 w-56" />
        </div>
        <div className="flex flex-col gap-8">
          <Skeleton className="h-52 w-full rounded-[14px]" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
