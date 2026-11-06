import { CargaColegio, EsqueletoEncabezado, EsqueletoFilas } from "@/components/carga/EsqueletosGestion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <CargaColegio>
      <EsqueletoEncabezado acciones={0} />
      <Skeleton className="h-6 w-32" />
      <EsqueletoFilas filas={4} avatar={false} />
      <Skeleton className="h-6 w-48" />
      <EsqueletoFilas filas={3} avatar={false} />
    </CargaColegio>
  );
}
