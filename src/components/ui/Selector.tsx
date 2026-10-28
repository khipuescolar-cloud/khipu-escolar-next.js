import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Clase de campo nativo (select, textarea, date) alineada con shadcn `Input`. */
export const CLASE_CAMPO =
  "min-h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-base text-foreground shadow-xs transition-colors outline-none focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30";

export function Selector({ etiqueta, className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { etiqueta: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-foreground">{etiqueta}</span>
      <select className={cn(CLASE_CAMPO, "cursor-pointer", className)} {...props}>
        {children}
      </select>
    </label>
  );
}
