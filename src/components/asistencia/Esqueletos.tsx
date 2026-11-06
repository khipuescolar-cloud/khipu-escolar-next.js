import { Skeleton } from "@/components/ui/skeleton";
import { EsqueletoFilas as EsqueletoFilasBase, EsqueletoPagina } from "@/components/carga/Esqueletos";

/** Cabecera de carga de las pantallas de «Día a día»: migas, título y descripción. */
export function EsqueletoPaginaDia({ children }: { children: React.ReactNode }) {
  return <EsqueletoPagina migas>{children}</EsqueletoPagina>;
}

/** Barra de filtros en una sola superficie. */
export function EsqueletoBarra({ campos = 4 }: { campos?: number }) {
  return (
    <div className="grid gap-3 rounded-[14px] border border-borde-sutil bg-superficie p-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: campos }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Lista con divisores (sin tarjetas por fila): círculo + dos líneas + estado a la derecha. */
export function EsqueletoFilas({ filas = 6 }: { filas?: number }) {
  return <EsqueletoFilasBase filas={filas} avatar extremo="pildora" superficie="abierta" />;
}
