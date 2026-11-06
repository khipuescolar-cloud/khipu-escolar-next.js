import { CargaColegio, EsqueletoEncabezado } from "@/components/carga/EsqueletosGestion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <CargaColegio ancho="max-w-2xl">
      <EsqueletoEncabezado acciones={0} />
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-60" />
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-borde-sutil pt-10">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-11 w-full rounded-[10px]" />
        <Skeleton className="h-11 w-full rounded-[10px]" />
        <Skeleton className="h-10 w-28 rounded-[10px]" />
      </div>
    </CargaColegio>
  );
}
