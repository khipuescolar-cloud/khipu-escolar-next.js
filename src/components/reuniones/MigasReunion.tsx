import { ChevronRight } from "lucide-react";
import Link from "next/link";

/** Migas de las páginas internas de reuniones: «Inicio › Reuniones › página», con el nudo de la sección Comunicación. */
export function MigasReunion({ actual }: { actual: string }) {
  return (
    <ol className="flex flex-wrap items-center gap-1">
      <li><Link href="/inicio" className="rounded-sm underline-offset-4 hover:text-foreground hover:underline">Inicio</Link></li>
      <li aria-hidden><ChevronRight className="size-3.5" strokeWidth={2} /></li>
      <li>
        <Link href="/reuniones" className="inline-flex items-center gap-1.5 rounded-sm font-semibold text-sec-tinta underline-offset-4 hover:underline">
          <span aria-hidden className="size-2 rounded-full bg-sec-nudo" />
          Reuniones
        </Link>
      </li>
      <li aria-hidden><ChevronRight className="size-3.5" strokeWidth={2} /></li>
      <li aria-current="page" className="max-w-[40ch] truncate">{actual}</li>
    </ol>
  );
}
