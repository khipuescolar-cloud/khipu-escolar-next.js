import { EsqueletoPagina } from "@/components/carga/Esqueletos";
import { Skeleton } from "@/components/ui/skeleton";

// Imita la lista final: barra de filtros y filas con divisores.
export default function Loading() {
  return (
    <EsqueletoPagina>
      <Skeleton className="h-[74px] w-full rounded-xl" />
      <ul className="flex flex-col divide-y divide-borde-sutil border-y border-borde-sutil">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="flex flex-col gap-2 py-5">
            <Skeleton className="h-5 w-64 max-w-full" />
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-1.5 w-full max-w-md" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </li>
        ))}
      </ul>
    </EsqueletoPagina>
  );
}
