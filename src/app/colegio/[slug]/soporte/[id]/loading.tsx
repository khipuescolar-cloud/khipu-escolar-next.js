import { CargaColegio } from "@/components/carga/EsqueletosGestion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <CargaColegio>
      <Skeleton className="h-4 w-56" />
      <div className="flex flex-col gap-3 rounded-[14px] border border-borde-sutil bg-card p-4">
        <Skeleton className="h-6 w-72 max-w-full" />
        <Skeleton className="h-16 w-3/4 rounded-xl" />
        <Skeleton className="ml-auto h-12 w-2/3 rounded-xl" />
        <Skeleton className="h-16 w-3/4 rounded-xl" />
        <Skeleton className="h-11 w-full rounded-[10px]" />
      </div>
    </CargaColegio>
  );
}
