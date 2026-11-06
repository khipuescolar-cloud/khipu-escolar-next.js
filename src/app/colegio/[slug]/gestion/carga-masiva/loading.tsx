import { CargaColegio, EsqueletoEncabezado, EsqueletoPestanas } from "@/components/carga/EsqueletosGestion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <CargaColegio>
      <EsqueletoPestanas />
      <EsqueletoEncabezado acciones={0} />
      <Skeleton className="h-10 w-56 rounded-[10px]" />
      <div className="flex max-w-3xl flex-col gap-10">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-6 w-64 max-w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-48 rounded-[10px]" />
            </div>
          </div>
        ))}
      </div>
    </CargaColegio>
  );
}
