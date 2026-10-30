"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { moverAction } from "./cneb-actions";

/** Subir y bajar un elemento (competencia, capacidad o desempeño) en su lista. */
export function BotonesOrden({
  slug, tipo, id, nombre, primero, ultimo,
}: { slug: string; tipo: "competencia" | "capacidad" | "desempeno"; id: string; nombre: string; primero: boolean; ultimo: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const mover = (direccion: "arriba" | "abajo") =>
    iniciar(async () => {
      const r = await moverAction(slug, tipo, id, direccion);
      if (!r.ok) toast.error(r.error);
    });
  const clase = buttonVariants({ variant: "ghost", size: "icon-sm" });
  return (
    <span className="inline-flex shrink-0">
      <button type="button" className={clase} disabled={pendiente || primero} onClick={() => mover("arriba")} aria-label={`Subir ${nombre}`}>
        <ArrowUp strokeWidth={2} aria-hidden />
      </button>
      <button type="button" className={clase} disabled={pendiente || ultimo} onClick={() => mover("abajo")} aria-label={`Bajar ${nombre}`}>
        <ArrowDown strokeWidth={2} aria-hidden />
      </button>
    </span>
  );
}
