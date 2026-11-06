import type { HTMLAttributes } from "react";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { cn } from "@/lib/utils";

/** Superficie de las páginas públicas (formularios cortos centrados): radio 14, borde sutil, sin sombra. */
export function TarjetaPublica({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <Tarjeta className={cn("rounded-[14px] p-6 sm:p-8", className)} {...props} />;
}
