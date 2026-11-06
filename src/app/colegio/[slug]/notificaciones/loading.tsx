import { EsqueletoFilas } from "@/components/comunicacion/EsqueletoFilas";
import { EsqueletoPagina } from "@/components/carga/Esqueletos";

export default function Loading() {
  return <EsqueletoPagina><EsqueletoFilas filas={7} lineas={3} /></EsqueletoPagina>;
}
