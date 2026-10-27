import type { InputHTMLAttributes } from "react";

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
      <span className="font-medium text-tinta">{etiqueta}</span>
      <input
        id={campoId}
        aria-invalid={error ? true : undefined}
        className={`rounded-md border border-arena bg-superficie px-3 py-2.5 text-base text-tinta placeholder:text-pizarra ${className}`}
        {...props}
      />
      {ayuda && !error && <span className="text-pizarra">{ayuda}</span>}
      {error && <span className="text-falta">{error}</span>}
    </label>
  );
}
