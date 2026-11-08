import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { PeriodoAsistencia } from "@/lib/periodos-asistencia";
import { cn } from "@/lib/utils";

/** Periodo del reporte: botones compactos con los bimestres (o trimestres) ya empezados y «Año». */
export function SelectorPeriodo({ periodos, actual, href }: { periodos: PeriodoAsistencia[]; actual: string; href: (clave: string) => string }) {
  return (
    <nav aria-label="Periodo" className="flex flex-wrap items-center gap-2">
      <span className="text-cuerpo-sm text-muted-foreground">Periodo:</span>
      {periodos.map((p) => {
        const activo = p.clave === actual;
        return (
          <Link
            key={p.clave}
            href={href(p.clave)}
            scroll={false}
            aria-current={activo ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              activo && "border-sec-trazo/40 bg-sec-suave text-sec-tinta hover:bg-sec-suave",
            )}
          >
            {p.nombre}
          </Link>
        );
      })}
    </nav>
  );
}
