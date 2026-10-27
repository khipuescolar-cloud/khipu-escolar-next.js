import { EsqueletoPagina, EsqueletoTarjetas, EsqueletoTabla } from "@/components/carga/Esqueletos";

export default function Loading() {
  return <EsqueletoPagina><><EsqueletoTarjetas cantidad={3} /><EsqueletoTabla filas={5} /></></EsqueletoPagina>;
}
