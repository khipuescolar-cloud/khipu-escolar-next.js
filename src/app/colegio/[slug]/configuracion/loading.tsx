import { CargaColegio, EsqueletoEncabezado, EsqueletoSecciones } from "@/components/carga/EsqueletosGestion";

export default function Loading() {
  return (
    <CargaColegio>
      <EsqueletoEncabezado acciones={0} />
      <EsqueletoSecciones secciones={3} />
    </CargaColegio>
  );
}
