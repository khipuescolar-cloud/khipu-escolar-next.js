import { EsqueletoPagina } from "@/components/carga/Esqueletos";
import { EsqueletoCalendario } from "@/components/comunicacion/EsqueletoFilas";

export default function Loading() {
  return <EsqueletoPagina><EsqueletoCalendario /></EsqueletoPagina>;
}
