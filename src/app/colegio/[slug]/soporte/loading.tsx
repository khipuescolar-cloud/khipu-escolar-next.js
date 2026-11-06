import { CargaColegio, EsqueletoEncabezado, EsqueletoFilas } from "@/components/carga/EsqueletosGestion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <CargaColegio>
      <EsqueletoEncabezado acciones={1} />
      <Skeleton className="h-12 w-full rounded-lg" />
      <EsqueletoFilas filas={5} avatar={false} />
    </CargaColegio>
  );
}
