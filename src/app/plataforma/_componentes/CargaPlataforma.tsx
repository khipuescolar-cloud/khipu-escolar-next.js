import { Skeleton } from "@/components/ui/skeleton";

export function CargaPlataforma({ variante = "tabla" }: { variante?: "inicio" | "tabla" | "ficha" | "formulario" }) {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only" role="status">Cargando…</span>
      <div className="flex flex-col gap-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-9 w-64 max-w-full" /><Skeleton className="h-4 w-96 max-w-full" /><Skeleton className="mt-2 h-1 w-full" /></div>
      {variante === "inicio" && <><Skeleton className="h-6 w-48" /><div className="overflow-hidden rounded-xl border bg-card"><Skeleton className="h-14 w-full rounded-none" /><Skeleton className="h-14 w-full rounded-none" /></div></>}
      {(variante === "inicio" || variante === "ficha") && <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3"><Skeleton className="h-28 rounded-none" /><Skeleton className="h-28 rounded-none" /><Skeleton className="h-28 rounded-none" /></div>}
      {variante === "formulario" ? <div className="max-w-2xl space-y-5 rounded-xl border bg-card p-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-11 w-full" /></div>)}</div> : <div className="overflow-hidden rounded-xl border bg-card"><Skeleton className="h-12 w-full rounded-none" />{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 w-full rounded-none border-t" />)}</div>}
    </div>
  );
}
