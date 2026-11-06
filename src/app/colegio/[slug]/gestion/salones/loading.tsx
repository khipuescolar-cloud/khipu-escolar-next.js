import { CargaColegio, EsqueletoEncabezado, EsqueletoFilas, EsqueletoPestanas } from "@/components/carga/EsqueletosGestion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <CargaColegio>
      <EsqueletoPestanas />
      <EsqueletoEncabezado acciones={2} />
      <Skeleton className="h-6 w-28" />
      <EsqueletoFilas filas={4} avatar={false} />
      <Skeleton className="h-6 w-36" />
      <EsqueletoFilas filas={3} avatar={false} />
    </CargaColegio>
  );
}
