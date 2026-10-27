import { EsqueletoPagina, EsqueletoTarjetas, EsqueletoFormulario } from "@/components/carga/Esqueletos";

export default function Loading() {
  return <EsqueletoPagina><><EsqueletoTarjetas cantidad={3} /><EsqueletoFormulario /></></EsqueletoPagina>;
}
