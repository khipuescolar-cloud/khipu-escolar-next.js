import { EsqueletoPagina } from "@/components/carga/Esqueletos";
import { EsqueletoBarra, EsqueletoPestanas, EsqueletoTablaDensa } from "@/components/academico/Esqueletos";

export default function Loading() {
  return (
    <EsqueletoPagina>
      <div data-seccion="academico" className="flex flex-col gap-5">
        <EsqueletoBarra campos={2} />
        <EsqueletoPestanas cantidad={6} />
        <EsqueletoTablaDensa filas={9} columnas={5} />
      </div>
    </EsqueletoPagina>
  );
}
