import { CargaColegio, EsqueletoBarraFiltros, EsqueletoEncabezado, EsqueletoFilas, EsqueletoPestanas } from "@/components/carga/EsqueletosGestion";

export default function Loading() {
  return (
    <CargaColegio>
      <EsqueletoPestanas />
      <EsqueletoEncabezado acciones={2} />
      <EsqueletoBarraFiltros />
      <EsqueletoFilas filas={7} />
    </CargaColegio>
  );
}
