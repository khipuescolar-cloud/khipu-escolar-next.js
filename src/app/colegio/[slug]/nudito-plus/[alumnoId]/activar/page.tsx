import { ArrowLeft, Smartphone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Alerta } from "@/components/ui/Alerta";
import { Flash } from "@/components/ui/Flash";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { sumarDias } from "@/lib/fechas";
import { formatoMonto } from "@/lib/nudito-plus";
import { datosParaActivar } from "@/lib/server/nudito-plus/familia";
import { requireTenantContext } from "@/lib/server/tenant";
import { reportarPagoAction } from "../../actions";
import { BotonEnvio } from "../../BotonEnvio";
import { CamposPago } from "./CamposPago";

export const metadata: Metadata = { title: "Activar Nudito+" };

/** Pago por Yape (prepago, sin renovación automática) y reporte del número de operación (specs/28). */
export default async function ActivarNudito({ params, searchParams }: PageProps<"/colegio/[slug]/nudito-plus/[alumnoId]/activar">) {
  const { slug, alumnoId } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["apoderado"]);
  const { alumno, precio, yape, hoy } = await datosParaActivar(ctx, alumnoId);
  const nombre = alumno.nombres.split(" ")[0];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link href={`/nudito-plus/${alumno.id}`} className="enlace inline-flex w-fit items-center gap-1 text-cuerpo-sm">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Nudito+ de {nombre}
      </Link>
      <EncabezadoPagina titulo={`Activar Nudito+ para ${nombre}`} descripcion={`${formatoMonto(precio.montoMensual, precio.moneda)} al mes por alumno. Pagas por adelantado los meses que quieras; no hay renovación automática.`} />
      <Flash ok={sp.ok} error={sp.error} />

      {!alumno.activo ? (
        <Alerta tipo="aviso">Este alumno ya no está activo en el colegio.</Alerta>
      ) : !yape ? (
        <Alerta tipo="info">Muy pronto publicaremos el número de Yape para pagar. Vuelve en unos días.</Alerta>
      ) : (
        <>
          <Tarjeta className="flex flex-col gap-3">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
              <Smartphone className="size-5 text-cochinilla" strokeWidth={2} aria-hidden /> 1. Paga con Yape
            </h2>
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-cuerpo-sm text-muted-foreground">Número de Yape</dt>
                <dd className="font-heading text-titulo-2 tabular-nums" data-testid="yape-numero">{yape.numero}</dd>
              </div>
              <div>
                <dt className="text-cuerpo-sm text-muted-foreground">A nombre de</dt>
                <dd className="font-medium">{yape.titular}</dd>
              </div>
            </dl>
            <ol className="list-decimal space-y-1 pl-5 text-cuerpo-sm">
              <li>Abre Yape y yapea al número de arriba.</li>
              <li>Paga {formatoMonto(precio.montoMensual, precio.moneda)} por cada mes (por ejemplo, 3 meses = {formatoMonto(precio.montoMensual * 3, precio.moneda)}).</li>
              <li>En el mensaje del Yape escribe «Nudito {nombre}».</li>
              <li>Guarda el número de operación de la constancia.</li>
            </ol>
          </Tarjeta>

          <Tarjeta>
            <form action={reportarPagoAction} className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">2. Cuéntanos tu pago</h2>
              <input type="hidden" name="alumnoId" value={alumno.id} />
              <CamposPago precioMensual={precio.montoMensual} hoy={hoy} minimo={sumarDias(hoy, -60)} />
              <p className="text-cuerpo-sm text-muted-foreground">El equipo de Khipu Escolar revisa cada pago, por lo general en un día hábil. Te avisaremos cuando Nudito+ esté activo.</p>
              <BotonEnvio className="w-full sm:w-fit">Enviar pago para revisión</BotonEnvio>
            </form>
          </Tarjeta>
        </>
      )}
    </div>
  );
}
