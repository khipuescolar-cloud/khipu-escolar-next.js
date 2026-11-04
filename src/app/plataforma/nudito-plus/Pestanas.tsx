import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { nuditoPlusDisponible } from "@/lib/planes";
import { cn } from "@/lib/utils";

const PESTANAS = [
  { href: "/nudito-plus", titulo: "Pagos y resumen" },
  { href: "/nudito-plus/licencias", titulo: "Licencias" },
  { href: "/nudito-plus/configuracion", titulo: "Configuración y sitios" },
] as const;

/**
 * Navegación interna del módulo Nudito+ del panel, con el aviso de producto desactivado (NUDITO_PLUS_DISPONIBLE).
 * El panel sigue accesible (uso interno) para consultar los datos existentes.
 */
export function Pestanas({ actual }: { actual: (typeof PESTANAS)[number]["href"] }) {
  return (
    <>
      {!nuditoPlusDisponible() && (
        <p role="status" data-testid="nudito-plus-desactivado" className="flex items-start gap-2 rounded-lg border border-tarde/40 bg-tarde-fondo p-3 text-sm text-tarde">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
          <span>
            <strong>Nudito+ está desactivado: producto en estudio.</strong> Ningún colegio lo tiene activo, las familias y los alumnos no lo ven
            y los procesos automáticos (vencimientos y resúmenes) no corren. Este panel queda solo para consulta interna.
          </span>
        </p>
      )}
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
    </>
  );
}
