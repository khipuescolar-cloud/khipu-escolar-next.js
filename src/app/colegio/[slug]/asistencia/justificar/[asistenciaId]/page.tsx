import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormJustificar } from "@/components/FormJustificar";
import { Alerta } from "@/components/ui/Alerta";
import { Tarjeta } from "@/components/ui/Tarjeta";
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
    <div className="mx-auto flex max-w-lg flex-col gap-2">
      <Link href="/asistencia" className="inline-flex min-h-10 w-fit items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Volver a asistencia
      </Link>
      <Tarjeta className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">Justificar falta</h1>
          <p className="text-sm text-muted-foreground">
            {falta.alumno} · <span className="first-letter:uppercase">{fechaLarga(falta.fecha)}</span>
          </p>
        </div>
        {!falta.disponible ? (
          <Alerta tipo="info">Esta falta ya tiene una justificación.</Alerta>
        ) : falta.plazoVencido ? (
          <Alerta tipo="aviso">{falta.mensajeVencido}</Alerta>
        ) : (
          <>
            <p className="text-sm font-medium">{falta.textoPlazo}.</p>
            <FormJustificar accion={justificarConSesionAction.bind(null, slug, falta.id)} />
          </>
        )}
      </Tarjeta>
    </div>
  );
}
