import type { SelectHTMLAttributes } from "react";

export const CLASE_CAMPO = "rounded-md border border-arena bg-superficie px-3 py-2.5 text-base text-tinta";

export function Selector({ etiqueta, className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { etiqueta: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-tinta">{etiqueta}</span>
      <select className={`${CLASE_CAMPO} ${className}`} {...props}>
        {children}
      </select>
    </label>
  );
}
