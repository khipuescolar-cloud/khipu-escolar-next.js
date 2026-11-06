import { CargaColegio, EsqueletoEncabezado, EsqueletoFilas, EsqueletoPestanas } from "@/components/carga/EsqueletosGestion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <CargaColegio>
      <EsqueletoPestanas />
      <EsqueletoEncabezado acciones={2} />
      <div className="flex items-center gap-3">
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="h-6 w-56" />
      </div>
      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2"><EsqueletoFilas filas={5} avatar={false} /></div>
        <Skeleton className="h-40 rounded-[14px]" />
      </div>
    </CargaColegio>
  );
}
