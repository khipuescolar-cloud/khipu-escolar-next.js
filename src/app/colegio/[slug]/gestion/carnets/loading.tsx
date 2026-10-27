import { EsqueletoPagina, EsqueletoTarjetas } from "@/components/carga/Esqueletos";

export default function Loading() {
  return <EsqueletoPagina><EsqueletoTarjetas cantidad={6} /></EsqueletoPagina>;
}
