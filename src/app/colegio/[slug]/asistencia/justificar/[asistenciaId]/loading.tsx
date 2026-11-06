import { EsqueletoPaginaDia } from "@/components/asistencia/Esqueletos";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <EsqueletoPaginaDia>
      <div className="flex max-w-lg flex-col gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-40" />
      </div>
    </EsqueletoPaginaDia>
  );
}
