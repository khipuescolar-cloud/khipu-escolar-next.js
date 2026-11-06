import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { NuditoMascota } from "@/components/nudito/NuditoMascota";

/** Estado vacío: ícono + frase en positivo + acción siguiente. Nunca una tabla vacía sin explicación. */
export function EstadoVacio({ icono: Icono, titulo, descripcion, accion, nudito = false }: { icono: LucideIcon; titulo: string; descripcion?: ReactNode; accion?: ReactNode; nudito?: boolean }) {
  return (
    <Empty className="rounded-xl border border-dashed border-borde-sutil bg-transparent py-10">
      <EmptyHeader>
        <EmptyMedia variant="default">
          {nudito ? <NuditoMascota tamano={44} /> : <Icono className="size-8 text-sec-trazo" strokeWidth={1.75} aria-hidden />}
        </EmptyMedia>
        <EmptyTitle className="text-base font-semibold">{titulo}</EmptyTitle>
        {descripcion && <EmptyDescription className="text-cuerpo-sm text-muted-foreground">{descripcion}</EmptyDescription>}
      </EmptyHeader>
      {accion && <EmptyContent>{accion}</EmptyContent>}
    </Empty>
  );
}
