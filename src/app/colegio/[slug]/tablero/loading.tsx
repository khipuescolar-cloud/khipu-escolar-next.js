import { EsqueletoPagina } from "@/components/carga/Esqueletos";
import { EsqueletoCifras, EsqueletoPestanas, EsqueletoTablaDensa } from "@/components/academico/Esqueletos";

export default function Loading() {
  return (
    <EsqueletoPagina>
      <div data-seccion="colegio" className="flex flex-col gap-6">
        <EsqueletoPestanas cantidad={5} />
        <EsqueletoCifras cantidad={4} />
        <EsqueletoTablaDensa filas={6} columnas={5} />
      </div>
    </EsqueletoPagina>
  );
}
