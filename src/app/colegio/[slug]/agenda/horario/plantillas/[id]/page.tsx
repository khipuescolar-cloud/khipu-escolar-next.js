import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormPlantilla } from "@/components/horario/FormPlantilla";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Alerta } from "@/components/ui/Alerta";
import { requireFeature } from "@/lib/server/plan";
import { detallePlantilla, listarPlantillas, salonesParaPlantillas } from "@/lib/server/plantillas-horario";
import { requireTenantContext } from "@/lib/server/tenant";
import { guardarPlantillaAction } from "../actions";
import { opcionesDeSalones } from "../componentes";

export const metadata: Metadata = { title: "Plantilla de horario" };

export default async function EditarPlantillaPage({ params }: PageProps<"/colegio/[slug]/agenda/horario/plantillas/[id]">) {
  const { slug, id } = await params;
  const ctx = await requireTenantContext(slug, ["direccion", "administrativo"]);
  requireFeature(ctx, "horario");
  const [p, plantillas, salones] = await Promise.all([detallePlantilla(ctx, id), listarPlantillas(ctx), salonesParaPlantillas(ctx)]);
  if (!p) notFound();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/agenda/horario/plantillas" className="inline-flex min-h-10 w-fit items-center gap-1 text-cuerpo-sm enlace"><ArrowLeft className="size-4" strokeWidth={2} aria-hidden />Plantillas de horario</Link>
      <EncabezadoPagina seccion="academico" titulo={p.nombre} descripcion="Al guardar, Khipu vuelve a calcular las horas del día. Las clases ya puestas en el horario se mantienen (la 1.ª hora sigue siendo la 1.ª)." />
      {p.salones.length > 0 && <Alerta tipo="info">La usan {p.salones.length === 1 ? "1 salón" : `${p.salones.length} salones`}: {p.salones.map((s) => s.nombre).join(", ")}. Los cambios valen para todos.</Alerta>}
      <FormPlantilla
        esNueva={false}
        inicial={{ nombre: p.nombre, horaEntrada: p.horaEntrada, horaSalida: p.horaSalida, duracionClase: p.duracionClase, horaLimiteFalta: p.horaLimiteFalta, recreos: p.recreos }}
        salones={opcionesDeSalones(salones, plantillas, p.id)}
        accion={guardarPlantillaAction.bind(null, slug, p.id)}
      />
    </div>
  );
}
