/* eslint-disable @next/next/no-img-element -- SVG de la marca nueva (docs/13-branding), sin optimización de imagen */
import { cn } from "@/lib/utils";

// Logotipo «Khipu escolar» con la K «Amarre» (public/landing/logo/*.svg). Proporción fija del SVG: 309 × 166.
const ANCHO = 309;
const ALTO = 166;

type Props = {
  /** `auto`: color en tema claro y blanco en oscuro · `blanco`: sobre índigo o fotos oscuras. */
  tono?: "auto" | "blanco";
  /** Alto en px (el ancho sale de la proporción del SVG). */
  alto?: number;
  className?: string;
};

/** Logotipo público de Khipu Escolar (landing y login). Accesible como «Khipu Escolar». */
export function LogoKhipu({ tono = "auto", alto = 56, className }: Props) {
  const w = Math.round((ANCHO / ALTO) * alto);
  const img = (archivo: string, extra?: string) => (
    <img src={`/landing/logo/${archivo}.svg`} alt="Khipu Escolar" width={w} height={alto} className={cn("block select-none", extra)} draggable={false} />
  );

  if (tono === "blanco") return <span className={cn("inline-flex shrink-0", className)}>{img("logotipo-blanco")}</span>;
  return (
    <span className={cn("inline-flex shrink-0", className)}>
      {img("logotipo", "dark:hidden")}
      {img("logotipo-blanco", "hidden dark:block")}
    </span>
  );
}
