import type { Metadata } from "next";
import { momentoEnZona } from "@/lib/fechas";
import {
  alumnosParaPermiso,
  listarPermisos,
} from "@/lib/server/permisos-asistencia";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { PanelPermisos } from "./PanelPermisos";

export const metadata: Metadata = { title: "Permisos" };

export default async function PermisosPage({
  params,
  searchParams,
}: PageProps<"/colegio/[slug]/permisos">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, [
    "direccion",
    "profesor",
    "administrativo",
  ]);
  requireFeature(ctx, "asistencia");
  const [alumnos, permisos] = await Promise.all([
    alumnosParaPermiso(ctx),
    listarPermisos(ctx),
  ]);
  return (
    <div>
      <PanelPermisos
        alumnos={alumnos}
        permisos={permisos.map((p) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          anulado: p.anulado && {
            ...p.anulado,
            at: p.anulado.at.toISOString(),
          },
        }))}
        hoy={momentoEnZona(new Date(), ctx.tenant.zonaHoraria).isoFecha}
        alumnoInicial={typeof sp.alumno === "string" ? sp.alumno : ""}
      />
    </div>
  );
}
