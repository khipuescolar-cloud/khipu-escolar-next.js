import { PestanasLinea } from "@/components/shell/PestanasPagina";

/** Pestañas por enlaces (secciones, periodos, hijos): el activo lleva `aria-current` y la línea del color de su sección. */
export function NavegacionPildoras({ etiqueta, items }: { etiqueta: string; items: { href: string; texto: string; activo: boolean }[] }) {
  return <PestanasLinea etiqueta={etiqueta} items={items} />;
}
