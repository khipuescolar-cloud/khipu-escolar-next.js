import { CargaColegio, EsqueletoBarraFiltros, EsqueletoEncabezado, EsqueletoFilas } from "@/components/carga/EsqueletosGestion";

export default function Loading() {
  return (
    <CargaColegio>
      <EsqueletoEncabezado acciones={0} />
      <EsqueletoBarraFiltros campos={1} />
      <EsqueletoFilas filas={8} avatar={false} />
    </CargaColegio>
  );
}
