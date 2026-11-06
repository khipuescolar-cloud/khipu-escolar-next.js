import { CargaColegio, EsqueletoEncabezado, EsqueletoFilas } from "@/components/carga/EsqueletosGestion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <CargaColegio>
      <EsqueletoEncabezado acciones={0} />
      <div className="flex max-w-3xl flex-col gap-3">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-10 w-44 rounded-[10px]" />
      </div>
      <EsqueletoFilas filas={3} avatar={false} />
    </CargaColegio>
  );
}
