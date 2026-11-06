import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormJustificar } from "@/components/FormJustificar";
import { Alerta } from "@/components/ui/Alerta";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { fechaLarga } from "@/lib/fechas";
import { faltaParaJustificar } from "@/lib/server/justificaciones";
import { requireTenantContext } from "@/lib/server/tenant";
import { justificarConSesionAction } from "../../actions";

export const metadata: Metadata = { title: "Justificar falta" };

export default async function JustificarConSesionPage({ params }: PageProps<"/colegio/[slug]/asistencia/justificar/[asistenciaId]">) {
  const { slug, asistenciaId } = await params;
  const ctx = await requireTenantContext(slug, ["apoderado"]);
  const falta = await faltaParaJustificar(ctx, asistenciaId);

  return (
    <div className="mx-auto flex max-w-xl flex-col">
      <EncabezadoPagina
        titulo="Justificar falta"
        seccion="dia"
        migas={
          <Link href="/asistencia" className="inline-flex min-h-10 items-center gap-1 enlace">
            <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Volver a asistencia
          </Link>
        }
        descripcion={<>{falta.alumno} · <span className="first-letter:uppercase">{fechaLarga(falta.fecha)}</span></>}
      />
      {!falta.disponible ? (
        <Alerta tipo="info">Esta falta ya tiene una justificación.</Alerta>
      ) : falta.plazoVencido ? (
        <Alerta tipo="aviso">{falta.mensajeVencido}</Alerta>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-cuerpo-sm font-medium">{falta.textoPlazo}.</p>
          <FormJustificar accion={justificarConSesionAction.bind(null, slug, falta.id)} />
        </div>
      )}
    </div>
  );
}
