import type { HTMLAttributes } from "react";

export function Tarjeta({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-lg border border-arena bg-superficie p-5 shadow-sm ${className}`} {...props} />;
}
