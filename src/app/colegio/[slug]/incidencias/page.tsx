import type { Metadata } from "next";
import { momentoEnZona } from "@/lib/fechas";
import {
  alumnosParaIncidencia,
  listarIncidencias,
} from "@/lib/server/incidencias";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { PanelIncidencias } from "./PanelIncidencias";

export const metadata: Metadata = { title: "Incidencias" };

export default async function IncidenciasPage({
  params,
  searchParams,
}: PageProps<"/colegio/[slug]/incidencias">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, [
    "direccion",
    "profesor",
    "administrativo",
  ]);
  requireFeature(ctx, "asistencia");
  const [alumnos, incidencias] = await Promise.all([
    alumnosParaIncidencia(ctx),
    listarIncidencias(ctx),
  ]);
  const ahora = momentoEnZona(new Date(), ctx.tenant.zonaHoraria);
  return (
    <PanelIncidencias
      alumnos={alumnos}
      incidencias={incidencias}
      fechaInicial={typeof sp.fecha === "string" ? sp.fecha : ahora.isoFecha}
      horaInicial={typeof sp.hora === "string" ? sp.hora : ahora.hora}
      alumnoInicial={typeof sp.alumno === "string" ? sp.alumno : ""}
      hoy={ahora.isoFecha}
    />
  );
}
