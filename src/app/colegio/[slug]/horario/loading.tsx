import { EsqueletoPagina, EsqueletoTabla } from "@/components/carga/Esqueletos";

export default function Loading() {
  return <EsqueletoPagina><EsqueletoTabla filas={8} columnas={6} /></EsqueletoPagina>;
}
