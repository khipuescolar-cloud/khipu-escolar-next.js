import { CircleAlert } from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

/** Patrón de campo: etiqueta arriba, ayuda gris debajo del control y error (ícono + texto) en su lugar. */
export function AyudaCampo({ id, children }: { id?: string; children: ReactNode }) {
  return <span id={id} className="text-cuerpo-sm text-muted-foreground">{children}</span>;
}

export function ErrorCampo({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <span id={id} role="alert" className="flex items-start gap-1.5 text-cuerpo-sm font-medium text-destructive">
      <CircleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
      <span>{children}</span>
    </span>
  );
}

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
  const descripcion = error ? `${campoId}-error` : ayuda ? `${campoId}-ayuda` : undefined;
  return (
    <label htmlFor={campoId} className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-foreground">{etiqueta}</span>
      <Input id={campoId} aria-invalid={error ? true : undefined} aria-describedby={descripcion} className={cn(className)} {...props} />
      {ayuda && !error && <AyudaCampo id={`${campoId}-ayuda`}>{ayuda}</AyudaCampo>}
      {error && <ErrorCampo id={`${campoId}-error`}>{error}</ErrorCampo>}
    </label>
  );
}
