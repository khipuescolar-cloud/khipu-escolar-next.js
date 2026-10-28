/* eslint-disable @next/next/no-img-element -- SVG oficiales del manual de marca (docs/marca), sin optimización de imagen */
import { cn } from "@/lib/utils";

// Piezas oficiales del manual de marca (docs/marca/MANUAL-DE-MARCA.md · public/marca/*.svg).
// No se recolorean, estiran ni giran. Tamaños mínimos: horizontal 96 px de ancho, isotipo 24 px.
const PIEZAS = {
  horizontal: { color: "logotipo-horizontal", blanco: "logotipo-horizontal-blanco", ancho: 190, alto: 56 },
  escolar: { color: "logotipo-escolar", blanco: "logotipo-horizontal-blanco", ancho: 190, alto: 72 },
  isotipo: { color: "isotipo", blanco: "isotipo-blanco", ancho: 40, alto: 40 },
} as const;

type Props = {
  /** `horizontal`: barra del panel y correos · `escolar`: versión pública (web, login) · `isotipo`: la K sola. */
  variante?: keyof typeof PIEZAS;
  /** `auto`: índigo en tema claro y blanco en oscuro · `blanco`: sobre índigo o fotos oscuras · `una-tinta`: impresión. */
  tono?: "auto" | "blanco" | "una-tinta";
  /** Alto en px (el ancho sale de la proporción del SVG). */
  alto?: number;
  className?: string;
};

/** Logotipo de Khipu Escolar. Accesible como «Khipu Escolar». */
export function Logo({ variante = "horizontal", tono = "auto", alto, className }: Props) {
  const pieza = PIEZAS[variante];
  const h = alto ?? 32;
  const w = Math.round((pieza.ancho / pieza.alto) * h);
  const img = (archivo: string, extra?: string) => (
    <img src={`/marca/${archivo}.svg`} alt="Khipu Escolar" width={w} height={h} className={cn("block select-none", extra)} draggable={false} />
  );

  if (tono === "blanco") return <span className={cn("inline-flex shrink-0", className)}>{img(pieza.blanco)}</span>;
  if (tono === "una-tinta" && variante !== "isotipo") return <span className={cn("inline-flex shrink-0", className)}>{img("logotipo-una-tinta")}</span>;
  // `escolar` no tiene versión blanca con «ESCOLAR»: en oscuro se usa la horizontal blanca.
  return (
    <span className={cn("inline-flex shrink-0", className)}>
      {img(pieza.color, "dark:hidden")}
      {img(pieza.blanco, "hidden dark:block")}
    </span>
  );
}
