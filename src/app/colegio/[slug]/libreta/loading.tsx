import { EsqueletoPagina } from "@/components/carga/Esqueletos";
import { EsqueletoBarra, EsqueletoDocumento } from "@/components/academico/Esqueletos";

export default function Loading() {
  return (
    <EsqueletoPagina>
      <div data-seccion="academico" className="flex flex-col gap-5">
        <EsqueletoBarra campos={2} />
        <EsqueletoDocumento />
      </div>
    </EsqueletoPagina>
  );
}
