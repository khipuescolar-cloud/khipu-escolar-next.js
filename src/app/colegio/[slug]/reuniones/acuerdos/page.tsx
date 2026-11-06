import { ListChecks } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MigasReunion } from "@/components/reuniones/MigasReunion";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
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
    <div>
      <EncabezadoPagina titulo="Acuerdos pendientes" seccion="comunicacion" migas={<MigasReunion actual="Acuerdos" />} descripcion="Compromisos de las actas que aún no se cumplen. Márcalos como cumplidos desde la reunión." />
      {acuerdos.length === 0 ? (
        <EstadoVacio icono={ListChecks} titulo="No hay acuerdos pendientes" descripcion="Cuando se registren acuerdos en un acta, los verás aquí." />
      ) : (
        <ul className="flex flex-col divide-y divide-borde-sutil overflow-hidden rounded-[14px] border border-borde-sutil bg-card">
          {acuerdos.map((a) => (
            <li key={a.id} className="flex flex-col gap-1 px-4 py-3.5 text-cuerpo-sm sm:px-5">
              <p className="font-medium">{a.texto}</p>
              <p className="text-muted-foreground tabular-nums">
                <Link href={`/reuniones/${a.reunionId}`} className="text-indigo-cielo hover:underline">{a.reunion}</Link>
                {a.responsable ? ` · ${a.responsable}` : ""}{a.fechaCompromiso ? ` · hasta el ${a.fechaCompromiso}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
