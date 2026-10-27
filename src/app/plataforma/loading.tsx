import { EsqueletoPagina, EsqueletoTarjetas, EsqueletoTabla } from "@/components/carga/Esqueletos";

export default function Loading() {
  return <EsqueletoPagina><><EsqueletoTarjetas /><EsqueletoTabla filas={4} /></></EsqueletoPagina>;
}
