import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Contenedor base (equivale a shadcn `Card` sin subcomponentes). */
export function Tarjeta({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border bg-card p-5 text-card-foreground shadow-xs", className)} {...props} />;
}
