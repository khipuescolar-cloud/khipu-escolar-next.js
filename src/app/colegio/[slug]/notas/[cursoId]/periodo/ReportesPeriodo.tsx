import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { salonesParaReporte } from "@/lib/server/calificacion-periodo";
import type { TenantContext } from "@/lib/server/tenant";

/** «Reporte del periodo» por salón: el tutor ve el suyo; dirección, todos. Entrada desde Mis cursos. */
export async function ReportesPeriodo({ ctx }: { ctx: TenantContext }) {
  const salones = await salonesParaReporte(ctx);
  if (salones.length === 0) return null;
  const direccion = ctx.rol === "direccion";
  return (
    <section aria-labelledby="reporte-periodo" className="space-y-2">
      <h2 id="reporte-periodo" className="font-heading text-lg font-semibold">Reporte del periodo</h2>
      <p className="text-sm text-muted-foreground">{direccion ? "Calificaciones del periodo que cada profesor envió, por salón." : "Calificaciones del periodo de los cursos de tu salón que su profesor ya envió."}</p>
      <ul className="flex flex-wrap gap-2">
        {salones.map((s) => (
          <li key={s.id}>
            <Link href={`/notas/salon/${s.id}/periodo`} className={buttonVariants({ variant: "outline" })}>
              <ClipboardCheck aria-hidden />Reporte del periodo · {s.nombre}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
