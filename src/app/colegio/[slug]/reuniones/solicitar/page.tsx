import type { Metadata } from "next";
import { FormularioSolicitud } from "@/components/reuniones/FormularioSolicitud";
import { MigasReunion } from "@/components/reuniones/MigasReunion";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Alerta } from "@/components/ui/Alerta";
import { momentoEnZona, sumarDias } from "@/lib/fechas";
import { requireFeature } from "@/lib/server/plan";
import { opcionesSolicitud } from "@/lib/server/reuniones";
import { requireTenantContext } from "@/lib/server/tenant";
import { franjasSolicitudAction, solicitarAction } from "../actions";

export const metadata: Metadata = { title: "Solicitar reunión" };

export default async function SolicitarReunionPage({ params }: PageProps<"/colegio/[slug]/reuniones/solicitar">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "reuniones");
  const opciones = await opcionesSolicitud(ctx);
  return (
    <div>
      <EncabezadoPagina titulo="Solicitar reunión" seccion="comunicacion" migas={<MigasReunion actual="Solicitar" />} descripcion="Pide una reunión al tutor o a un profesor de tu hijo. Te avisaremos cuando la confirme." />
      {opciones.habilitado ? (
        <FormularioSolicitud
          hijos={opciones.hijos}
          fechaMinima={sumarDias(momentoEnZona(new Date(), ctx.tenant.zonaHoraria).isoFecha, 1)}
          franjas={franjasSolicitudAction.bind(null, slug)}
          solicitar={solicitarAction.bind(null, slug)}
        />
      ) : (
        <Alerta tipo="info">Tu colegio no recibe solicitudes de reunión por Khipu. Comunícate por mensajes con el tutor.</Alerta>
      )}
    </div>
  );
}
