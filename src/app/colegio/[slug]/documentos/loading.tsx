import { EsqueletoPagina } from "@/components/carga/Esqueletos";

export default function Loading() {
  return <EsqueletoPagina>
    <div className="grid gap-6 md:grid-cols-[230px_minmax(0,1fr)]" aria-label="Cargando documentos">
      <div className="space-y-3"><div className="h-11 w-28 motion-safe:animate-pulse rounded-lg bg-sec-suave" />{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-11 motion-safe:animate-pulse rounded-lg bg-sec-suave" />)}</div>
      <div className="min-w-0 space-y-4"><div className="h-8 w-40 motion-safe:animate-pulse rounded-lg bg-sec-suave" /><div className="h-11 motion-safe:animate-pulse rounded-lg bg-sec-suave" /><div className="overflow-hidden rounded-xl border border-borde-sutil bg-card"><div className="h-12 bg-sec-suave" />{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-16 border-t border-borde-sutil px-4 py-4"><div className="h-7 w-2/3 motion-safe:animate-pulse rounded-lg bg-sec-suave" /></div>)}</div></div>
    </div>
  </EsqueletoPagina>;
}
