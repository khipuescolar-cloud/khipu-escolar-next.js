import { CargaColegio } from "@/components/carga/EsqueletosGestion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <CargaColegio ancho="mx-auto max-w-2xl">
      <div className="flex flex-col gap-5 rounded-[14px] border border-borde-sutil bg-card p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 rounded-full" />
          <Skeleton className="h-8 w-72 max-w-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-12 w-28 rounded-[10px]" />
      </div>
    </CargaColegio>
  );
}
