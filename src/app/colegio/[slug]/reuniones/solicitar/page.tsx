import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormularioSolicitud } from "@/components/reuniones/FormularioSolicitud";
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
    <div className="flex flex-col gap-6">
      <Link href="/reuniones" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-indigo-cielo hover:underline">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />Reuniones
      </Link>
      <EncabezadoPagina titulo="Solicitar reunión" descripcion="Pide una reunión al tutor o a un profesor de tu hijo. Te avisaremos cuando la confirme." />
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
