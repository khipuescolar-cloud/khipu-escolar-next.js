import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { AsistenteReunion } from "@/components/reuniones/AsistenteReunion";
import { MigasReunion } from "@/components/reuniones/MigasReunion";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { momentoEnZona, sumarDias } from "@/lib/fechas";
import { esPersonal } from "@/lib/reuniones";
import { requireFeature } from "@/lib/server/plan";
import { opcionesParaConvocar } from "@/lib/server/reuniones";
import { requireTenantContext } from "@/lib/server/tenant";
import { confirmarReunionAction, disponibilidadAction } from "../actions";

export const metadata: Metadata = { title: "Nueva reunión" };

export default async function NuevaReunionPage({ params }: PageProps<"/colegio/[slug]/reuniones/nueva">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "reuniones");
  if (!esPersonal(ctx.rol)) forbidden();
  const opciones = await opcionesParaConvocar(ctx);
  const hoy = momentoEnZona(new Date(), ctx.tenant.zonaHoraria).isoFecha;
  const manana = sumarDias(hoy, 1);
  return (
    <div className="flex flex-col gap-4">
      <EncabezadoPagina
        titulo="Nueva reunión"
        seccion="comunicacion"
        migas={<MigasReunion actual="Nueva" />}
        descripcion={`Elige a los participantes y busca en el calendario una hora en que todos estén libres (jornada ${opciones.horaInicioLaboral}–${opciones.horaFinLaboral}). De otras personas solo ves «Ocupado».`}
      />
      <AsistenteReunion
        opciones={opciones}
        fechaInicial={manana}
        hoy={hoy}
        consultar={disponibilidadAction.bind(null, slug)}
        confirmar={confirmarReunionAction.bind(null, slug)}
      />
    </div>
  );
}
