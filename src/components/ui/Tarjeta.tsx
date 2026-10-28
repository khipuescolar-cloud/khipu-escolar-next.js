import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Contenedor base (equivale a shadcn `Card` sin subcomponentes). */
export function Tarjeta({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border bg-card p-4 text-card-foreground sm:p-5", className)} {...props} />;
}
