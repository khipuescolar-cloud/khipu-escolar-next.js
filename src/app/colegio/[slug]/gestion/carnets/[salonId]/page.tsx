import { ArrowLeft, Ban, Download, RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { urlLogoColegio } from "@/lib/server/logo";
import { carnetsParaImprimir } from "@/lib/server/porteria";
import { requireTenantContext } from "@/lib/server/tenant";
import { generarCarnetsAction, regenerarCarnetAction, revocarCarnetAction } from "../actions";
import { BotonImprimir } from "./BotonImprimir";

export const metadata: Metadata = { title: "Imprimir carnets" };

export default async function ImprimirCarnetsPage({ params }: PageProps<"/colegio/[slug]/gestion/carnets/[salonId]">) {
  const { slug, salonId } = await params;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  const { salon, carnets } = await carnetsParaImprimir(ctx, salonId);
  const logoUrl = await urlLogoColegio(ctx.tenant);
  const sinCarnet = carnets.filter((c) => !c.qr).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/gestion/carnets" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Carnets
        </Link>
        <div className="flex flex-wrap gap-2">
          {sinCarnet > 0 && (
            <form action={generarCarnetsAction.bind(null, slug, salon.id)}>
              <Boton type="submit" variante="secundario">Generar {sinCarnet} faltantes</Boton>
            </form>
          )}
          {sinCarnet < carnets.length && (
            <>
              <a href={`/api/carnets/${salon.id}?formato=a4`} className={buttonVariants({ variant: "outline" })}>
                <Download strokeWidth={2} aria-hidden /> Descargar PDF (A4, 8 por hoja)
              </a>
              <a href={`/api/carnets/${salon.id}?formato=cr80`} className={buttonVariants({ variant: "outline" })}>
                <Download strokeWidth={2} aria-hidden /> Descargar PDF (tamaño tarjeta)
              </a>
            </>
          )}
          <BotonImprimir />
        </div>
      </div>
      <h1 className="text-2xl font-bold sm:text-3xl print:hidden">Carnets · {salon.nombre}</h1>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2 print:gap-2">
        {carnets
          .filter((c) => c.qr)
          .map((c) => (
            <li key={c.alumnoId} className="flex break-inside-avoid flex-col gap-2">
              <div className="flex items-center gap-4 rounded-lg border-2 border-indigo bg-white p-4 text-neutral-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.qr!} alt={`Código QR del carnet de ${c.nombres} ${c.apellidos}`} className="h-32 w-32" />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo">
                    {logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="" className="h-8 w-8 object-contain" />
                    )}
                    {ctx.tenant.nombre}
                  </p>
                  <p className="font-titulo text-lg font-bold leading-tight">{c.nombres}</p>
                  <p className="leading-tight">{c.apellidos}</p>
                  <p className="text-sm">{salon.nombre}{c.codigo ? ` · ${c.codigo}` : ""}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 print:hidden">
                <BotonConfirmar
                  etiqueta={<><RefreshCw strokeWidth={2} aria-hidden /> Regenerar (carnet perdido)</>}
                  titulo="¿Regenerar este carnet?"
                  descripcion={`El código QR actual de ${c.nombres} dejará de funcionar y se creará uno nuevo.`}
                  confirmar="Regenerar carnet"
                  accion={regenerarCarnetAction.bind(null, slug, c.alumnoId)}
                  variante="outline"
                  tamano="sm"
                />
                <BotonConfirmar
                  etiqueta={<><Ban strokeWidth={2} aria-hidden /> Anular</>}
                  titulo="¿Anular este carnet?"
                  descripcion={`El código QR de ${c.nombres} dejará de funcionar en portería hasta que generes uno nuevo.`}
                  confirmar="Anular carnet"
                  accion={revocarCarnetAction.bind(null, slug, c.alumnoId)}
                  peligro
                  variante="ghost"
                  tamano="sm"
                />
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}
