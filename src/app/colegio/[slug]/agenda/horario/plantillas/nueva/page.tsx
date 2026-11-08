import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormPlantilla } from "@/components/horario/FormPlantilla";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { requireFeature } from "@/lib/server/plan";
import { listarPlantillas, salonesParaPlantillas } from "@/lib/server/plantillas-horario";
import { requireTenantContext } from "@/lib/server/tenant";
import { guardarPlantillaAction } from "../actions";
import { opcionesDeSalones } from "../componentes";

export const metadata: Metadata = { title: "Nueva plantilla de horario" };

export default async function NuevaPlantillaPage({ params }: PageProps<"/colegio/[slug]/agenda/horario/plantillas/nueva">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["direccion", "administrativo"]);
  requireFeature(ctx, "horario");
  const [plantillas, salones] = await Promise.all([listarPlantillas(ctx), salonesParaPlantillas(ctx)]);
  return (
    <div className="flex flex-col gap-4">
      <Link href="/agenda/horario/plantillas" className="inline-flex min-h-10 w-fit items-center gap-1 text-cuerpo-sm enlace"><ArrowLeft className="size-4" strokeWidth={2} aria-hidden />Plantillas de horario</Link>
      <EncabezadoPagina seccion="academico" titulo="Nueva plantilla de horario" descripcion="Indica la entrada, la duración de cada hora de clase, los recreos y la salida. Khipu arma las horas del día." />
      <FormPlantilla
        esNueva
        inicial={{ nombre: "", horaEntrada: "08:00", horaSalida: "13:00", duracionClase: 45, horaLimiteFalta: "09:00", recreos: [{ horaInicio: "10:15", horaFin: "10:45" }] }}
        salones={opcionesDeSalones(salones, plantillas, null)}
        accion={guardarPlantillaAction.bind(null, slug, null)}
      />
    </div>
  );
}
