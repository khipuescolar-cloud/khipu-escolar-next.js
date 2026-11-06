import { CargaColegio, EsqueletoEncabezado, EsqueletoFilas, EsqueletoPestanas } from "@/components/carga/EsqueletosGestion";

export default function Loading() {
  return (
    <CargaColegio>
      <EsqueletoPestanas />
      <EsqueletoEncabezado acciones={0} />
      <EsqueletoFilas filas={5} avatar={false} />
    </CargaColegio>
  );
}
