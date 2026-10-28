import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FilaConversacion = {
  id: string;
  etiqueta: string;
  noLeidos: number;
  ultimoMensaje: { propio: boolean; cuerpo: string } | null;
};

/** Iniciales (máx. 2) del nombre que precede al « · » de la etiqueta. */
export function iniciales(etiqueta: string): string {
  const nombre = etiqueta.split(" · ")[0] ?? etiqueta;
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

/** Lista de conversaciones. `compacta` (junto a un hilo abierto) omite la vista previa del último mensaje. */
export function ListaConversaciones({ filas, activa, compacta = false }: { filas: FilaConversacion[]; activa?: string; compacta?: boolean }) {
  return (
    <ul className="flex flex-col divide-y" aria-label="Conversaciones">
      {filas.map((c) => (
        <li key={c.id}>
          <Link
            href={`/mensajes/${c.id}`}
            aria-current={c.id === activa ? "page" : undefined}
            className={cn("flex min-h-16 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset", c.id === activa && "bg-accent")}
          >
            <Avatar size="lg">
              <AvatarFallback className="bg-maiz text-sm font-semibold text-sobre-maiz">{iniciales(c.etiqueta)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate text-sm", c.noLeidos > 0 ? "font-bold" : "font-semibold")}>{c.etiqueta}</span>
              {!compacta && (
                <span className="block truncate text-sm text-muted-foreground">
                  {c.ultimoMensaje ? `${c.ultimoMensaje.propio ? "Tú: " : ""}${c.ultimoMensaje.cuerpo}` : "Sin mensajes todavía"}
                </span>
              )}
            </span>
            {c.noLeidos > 0 && <Badge className="h-6 px-2.5 text-xs">{c.noLeidos} sin leer</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
