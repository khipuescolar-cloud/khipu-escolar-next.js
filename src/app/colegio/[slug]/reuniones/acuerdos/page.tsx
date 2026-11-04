import { ArrowLeft, ListChecks } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { requireFeature } from "@/lib/server/plan";
import { acuerdosPendientes } from "@/lib/server/reuniones";
import { requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Acuerdos pendientes" };

export default async function AcuerdosPage({ params }: PageProps<"/colegio/[slug]/reuniones/acuerdos">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "reuniones");
  const acuerdos = await acuerdosPendientes(ctx);
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/reuniones" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-indigo-cielo hover:underline">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />Reuniones
      </Link>
      <EncabezadoPagina titulo="Acuerdos pendientes" descripcion="Compromisos de las actas que aún no se cumplen. Márcalos como cumplidos desde la reunión." />
      {acuerdos.length === 0 ? (
        <EstadoVacio icono={ListChecks} titulo="No hay acuerdos pendientes" descripcion="Cuando se registren acuerdos en un acta, los verás aquí." />
      ) : (
        <ul className="flex flex-col gap-2">
          {acuerdos.map((a) => (
            <li key={a.id}>
              <Tarjeta className="flex flex-col gap-1 text-cuerpo-sm">
                <p className="font-medium">{a.texto}</p>
                <p className="text-muted-foreground">
                  <Link href={`/reuniones/${a.reunionId}`} className="text-indigo-cielo hover:underline">{a.reunion}</Link>
                  {a.responsable ? ` · ${a.responsable}` : ""}{a.fechaCompromiso ? ` · hasta el ${a.fechaCompromiso}` : ""}
                </p>
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
