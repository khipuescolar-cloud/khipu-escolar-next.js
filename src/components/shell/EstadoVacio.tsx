import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

/** Estado vacío: ícono + frase en positivo + acción siguiente. Nunca una tabla vacía sin explicación. */
export function EstadoVacio({ icono: Icono, titulo, descripcion, accion }: { icono: LucideIcon; titulo: string; descripcion?: ReactNode; accion?: ReactNode }) {
  return (
    <Empty className="rounded-xl border border-dashed bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icono strokeWidth={2} aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{titulo}</EmptyTitle>
        {descripcion && <EmptyDescription>{descripcion}</EmptyDescription>}
      </EmptyHeader>
      {accion && <EmptyContent>{accion}</EmptyContent>}
    </Empty>
  );
}
