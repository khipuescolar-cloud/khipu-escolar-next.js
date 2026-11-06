import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { NuditoMascota } from "@/components/nudito/NuditoMascota";

/** Estado vacío: ícono + frase en positivo + acción siguiente. Nunca una tabla vacía sin explicación. */
export function EstadoVacio({ icono: Icono, titulo, descripcion, accion, nudito = false }: { icono: LucideIcon; titulo: string; descripcion?: ReactNode; accion?: ReactNode; nudito?: boolean }) {
  return (
    <Empty className="rounded-xl bg-superficie-2/70 py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {nudito ? <NuditoMascota tamano={44} /> : <Icono strokeWidth={2} aria-hidden />}
        </EmptyMedia>
        <EmptyTitle>{titulo}</EmptyTitle>
        {descripcion && <EmptyDescription>{descripcion}</EmptyDescription>}
      </EmptyHeader>
      {accion && <EmptyContent>{accion}</EmptyContent>}
    </Empty>
  );
}
