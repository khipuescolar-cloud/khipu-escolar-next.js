import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { PestanasPlan } from "@/components/planificacion/PestanasPlan";
import { EstadoPlan } from "@/components/planificacion/EstadoPlan";
import { obtenerPlan } from "@/lib/server/plan-anual";
import { requireTenantContext } from "@/lib/server/tenant";

export default async function LayoutPlan({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string; planId: string }> }) {
  const { slug, planId } = await params;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion"]);
  const plan = await obtenerPlan(ctx, planId);
  return <div className="min-w-0">
    <EncabezadoPagina titulo={plan.nombreCurso + " · " + plan.grado + ".° " + plan.nivel}
      descripcion={"Plan anual " + plan.anio + ". Docentes del mismo grado y curso trabajan juntos."}
      resumen={<EstadoPlan estado={plan.estado} />} seccion="academico"
      migas={<Link href="/planificacion" className="underline underline-offset-4">← Planificación anual</Link>} />
    <PestanasPlan planId={planId} />
    <div className="mt-6 min-w-0">{children}</div>
  </div>;
}
