import { EsqueletoPagina } from "@/components/carga/Esqueletos";
import { EsqueletoFilas } from "@/components/academico/Esqueletos";

export default function Loading() {
  return (
    <EsqueletoPagina>
      <div data-seccion="academico"><EsqueletoFilas filas={5} /></div>
    </EsqueletoPagina>
  );
}
