import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { AsistenteReunion } from "@/components/reuniones/AsistenteReunion";
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
  const manana = sumarDias(momentoEnZona(new Date(), ctx.tenant.zonaHoraria).isoFecha, 1);
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Link href="/reuniones" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-indigo-cielo hover:underline">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />Reuniones
      </Link>
      <EncabezadoPagina
        titulo="Nueva reunión"
        descripcion={`Elige a los participantes y mira cuándo están libres (jornada ${opciones.horaInicioLaboral}–${opciones.horaFinLaboral}). Solo ves «Ocupado» en la agenda de otras personas.`}
      />
      <AsistenteReunion
        opciones={opciones}
        fechaInicial={manana}
        consultar={disponibilidadAction.bind(null, slug)}
        confirmar={confirmarReunionAction.bind(null, slug)}
      />
    </div>
  );
}
