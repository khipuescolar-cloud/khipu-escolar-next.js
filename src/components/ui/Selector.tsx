import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Clase de campo nativo (select, textarea, date) alineada con shadcn `Input`. */
export const CLASE_CAMPO =
  "min-h-11 w-full min-w-0 rounded-md border border-input bg-superficie-elevada px-3 py-2 text-base text-foreground transition-[border-color,box-shadow,background-color] duration-150 outline-none placeholder:text-texto-terciario hover:border-input-hover focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:border-border disabled:bg-superficie-2 disabled:text-muted-foreground disabled:hover:border-border aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:focus-visible:border-destructive md:text-sm";

export function Selector({ etiqueta, className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { etiqueta: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-foreground">{etiqueta}</span>
      <span className="relative block">
        <select className={cn(CLASE_CAMPO, "cursor-pointer appearance-none pr-9", className)} {...props}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} aria-hidden />
      </span>
    </label>
  );
}
