import { CargaColegio, EsqueletoEncabezado, EsqueletoPestanas } from "@/components/carga/EsqueletosGestion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <CargaColegio>
      <EsqueletoPestanas />
      <EsqueletoEncabezado acciones={3} />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-40 rounded-lg" />)}
      </div>
    </CargaColegio>
  );
}
