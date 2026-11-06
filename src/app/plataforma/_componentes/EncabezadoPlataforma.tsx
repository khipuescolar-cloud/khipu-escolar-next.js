import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";

/** Conserva la cuerda Colegio y lleva el inicio al panel del equipo Khipu. */
export function EncabezadoPlataforma(props: ComponentProps<typeof EncabezadoPagina>) {
  return (
    <EncabezadoPagina
      {...props}
      seccion="colegio"
      migas={props.migas ?? (
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link href="/" className="rounded-sm hover:text-foreground hover:underline underline-offset-4">Inicio</Link></li>
          <li aria-hidden><ChevronRight className="size-3.5" strokeWidth={2} /></li>
          <li className="inline-flex items-center gap-1.5 font-semibold text-sec-tinta"><span aria-hidden className="size-2 rounded-full bg-sec-nudo" />Colegio</li>
        </ol>
      )}
    />
  );
}
