import Link from "next/link";
import { cn } from "@/lib/utils";

const PESTANAS = [
  { href: "/nudito-plus", titulo: "Pagos y resumen" },
  { href: "/nudito-plus/licencias", titulo: "Licencias" },
  { href: "/nudito-plus/configuracion", titulo: "Configuración y sitios" },
] as const;

/** Navegación interna del módulo Nudito+ del panel. */
export function Pestanas({ actual }: { actual: (typeof PESTANAS)[number]["href"] }) {
  return (
    <nav aria-label="Secciones de Nudito+" className="-mt-2 flex gap-1 overflow-x-auto border-b">
      {PESTANAS.map((p) => (
        <Link
          key={p.href}
          href={p.href}
          aria-current={p.href === actual ? "page" : undefined}
          className={cn(
            "-mb-px shrink-0 border-b-2 px-3 py-2 text-cuerpo-sm font-medium whitespace-nowrap",
            p.href === actual ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {p.titulo}
        </Link>
      ))}
    </nav>
  );
}
