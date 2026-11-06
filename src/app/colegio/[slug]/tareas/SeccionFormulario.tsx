import { useId, type ReactNode } from "react";

/** Sección de un formulario largo: título claro, ayuda opcional y campos en dos columnas (specs/18). */
export function SeccionFormulario({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="flex min-w-0 flex-col gap-3 border-t border-borde-sutil pt-4 first:border-t-0 first:pt-0 sm:col-span-2">
      <div>
        <h3 id={id} className="font-heading text-[15px] leading-5 font-semibold">{titulo}</h3>
        {ayuda && <p className="mt-0.5 text-cuerpo-sm text-muted-foreground">{ayuda}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">{children}</div>
    </div>
  );
}
