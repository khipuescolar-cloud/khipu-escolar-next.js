import { PestanasSegmento } from "@/components/shell/PestanasPagina";
import type { PeriodoAsistencia } from "@/lib/periodos-asistencia";

/** Periodo del reporte: bimestres (o trimestres) ya empezados y «Año». En celular se desplaza en horizontal. */
export function SelectorPeriodo({ periodos, actual, href }: { periodos: PeriodoAsistencia[]; actual: string; href: (clave: string) => string }) {
  return (
    <div className="max-w-full">
      <PestanasSegmento
        etiqueta="Periodo"
        scroll={false}
        className="flex-wrap"
        items={periodos.map((p) => ({ href: href(p.clave), texto: p.nombre, activo: p.clave === actual }))}
      />
    </div>
  );
}
