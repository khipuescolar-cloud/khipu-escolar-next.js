import { EsqueletoFilas, EsqueletoPaginaDia } from "@/components/asistencia/Esqueletos";

export default function Loading() {
  return (
    <EsqueletoPaginaDia>
      <EsqueletoFilas filas={7} />
    </EsqueletoPaginaDia>
  );
}
