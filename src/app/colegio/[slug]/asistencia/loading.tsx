import { EsqueletoBarra, EsqueletoFilas, EsqueletoPaginaDia } from "@/components/asistencia/Esqueletos";

export default function Loading() {
  return (
    <EsqueletoPaginaDia>
      <EsqueletoBarra campos={3} />
      <EsqueletoFilas />
    </EsqueletoPaginaDia>
  );
}
