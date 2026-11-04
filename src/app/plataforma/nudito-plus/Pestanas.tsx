import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { licenciasFamiliaresNudito } from "@/lib/planes";
import { cn } from "@/lib/utils";

const PESTANAS = [
  { href: "/nudito-plus", titulo: "Colegios" },
  { href: "/nudito-plus/licencias", titulo: "Licencias (histórico)" },
  { href: "/nudito-plus/configuracion", titulo: "Configuración y sitios" },
] as const;

/**
 * Navegación interna de Nudito en el panel. Nudito es el tutor de Khipu Pro (specs/44): las licencias familiares y los
 * pagos con Yape (specs/28) quedan como HISTÓRICO, sin acciones (`NUDITO_LICENCIAS_FAMILIARES`).
 */
export function Pestanas({ actual }: { actual: (typeof PESTANAS)[number]["href"] }) {
  return (
    <>
      {!licenciasFamiliaresNudito() && (
        <p role="status" data-testid="nudito-licencias-historico" className="flex items-start gap-2 rounded-lg border border-tarde/40 bg-tarde-fondo p-3 text-sm text-tarde">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
          <span>
            <strong>Nudito es parte de Khipu Pro.</strong> Las licencias familiares y los pagos con Yape ya no se usan: se muestran solo como
            histórico, sin acciones. Cada colegio activa Nudito desde su configuración; aquí puedes bloquearlo por colegio.
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
