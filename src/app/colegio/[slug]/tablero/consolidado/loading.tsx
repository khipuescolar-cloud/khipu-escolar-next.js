import { EsqueletoPagina } from "@/components/carga/Esqueletos";
import { EsqueletoBarra, EsqueletoTablaDensa } from "@/components/academico/Esqueletos";

export default function Loading() {
  return (
    <EsqueletoPagina>
      <div data-seccion="colegio" className="flex flex-col gap-5">
        <EsqueletoBarra campos={2} />
        <EsqueletoTablaDensa filas={8} columnas={6} />
      </div>
    </EsqueletoPagina>
  );
}
