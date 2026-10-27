import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

/** Campo con etiqueta visible, ayuda y error junto al campo. */
export function Campo({
  etiqueta,
  ayuda,
  error,
  id,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: string; error?: string }) {
  const campoId = id ?? props.name;
  return (
    <label htmlFor={campoId} className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-foreground">{etiqueta}</span>
      <Input id={campoId} aria-invalid={error ? true : undefined} className={cn(className)} {...props} />
      {ayuda && !error && <span className="text-muted-foreground">{ayuda}</span>}
      {error && <span className="text-destructive">{error}</span>}
    </label>
  );
}
