import { Download } from "lucide-react";
import { IconoAdjunto } from "@/components/adjuntos/IconoAdjunto";
import { formatoTamano, type AdjuntoVista } from "@/lib/adjuntos";

/** Lista de adjuntos con ícono por tipo, nombre, tamaño y descarga. El control de acceso lo hace `/archivos/<id>`. */
export function ListaAdjuntos({ adjuntos, etiqueta = "Adjuntos" }: { adjuntos: AdjuntoVista[]; etiqueta?: string }) {
  if (adjuntos.length === 0) return null;
  return (
    <section aria-label={etiqueta} className="flex flex-col gap-2">
      <h3 className="text-etiqueta uppercase tracking-wide text-muted-foreground">{etiqueta}</h3>
      <ul className="flex flex-col gap-1.5">
        {adjuntos.map((a) => (
          <li key={a.id}>
            <a
              href={`/archivos/${a.id}`}
              download={a.nombre}
              className="flex min-h-11 items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <IconoAdjunto mimeType={a.mimeType} nombre={a.nombre} />
              <span className="min-w-0 flex-1 truncate font-medium">{a.nombre}</span>
              <span className="shrink-0 text-cuerpo-sm text-muted-foreground">{formatoTamano(a.bytes)}</span>
              <Download className="size-4 shrink-0 text-primary" strokeWidth={2} aria-hidden />
              <span className="sr-only">Descargar</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
