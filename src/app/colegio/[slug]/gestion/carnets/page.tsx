import { CheckCircle2, Download, IdCard, Printer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Badge } from "@/components/ui/badge";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { salonesParaCarnets } from "@/lib/server/porteria";
import { requireTenantContext } from "@/lib/server/tenant";
import { SUPERFICIE_LISTA } from "../_componentes/BarraFiltros";
import { generarCarnetsAction } from "./actions";

export const metadata: Metadata = { title: "Carnets QR" };

export default async function CarnetsPage({ params }: PageProps<"/colegio/[slug]/gestion/carnets">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  const salones = await salonesParaCarnets(ctx);

  return (
    <div>
      <EncabezadoPagina seccion="colegio" titulo="Carnets con QR" descripcion="La portería los escanea para registrar la llegada. Imprime los carnets por salón." />
      {salones.length === 0 ? (
        <EstadoVacio icono={IdCard} titulo="Aún no hay salones con alumnos" descripcion="Crea salones y agrega alumnos para generar sus carnets." />
      ) : (
        <ul className={`${SUPERFICIE_LISTA} divide-y divide-borde-sutil`}>
          {salones.map((s) => {
            const completo = s.alumnos > 0 && s.conCarnet >= s.alumnos;
            return (
              <li key={s.id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:gap-6">
                <div className="flex min-w-0 items-center gap-4 lg:w-1/2">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-heading font-semibold">
                      {s.nombre}
                      {completo && <Badge className="h-6 bg-llego-fondo px-2.5 text-etiqueta text-llego"><CheckCircle2 strokeWidth={2} aria-hidden /> Completo</Badge>}
                    </p>
                    <p className="text-cuerpo-sm text-muted-foreground tabular-nums">{s.conCarnet} de {s.alumnos} alumnos con carnet</p>
                  </div>
                  <Progress className="w-28 shrink-0 sm:w-40" value={s.alumnos > 0 ? Math.round((s.conCarnet / s.alumnos) * 100) : 0} aria-label={`Carnets generados en ${s.nombre}`} />
                </div>
                <div className="flex flex-wrap gap-2 lg:ml-auto lg:justify-end">
                  {s.conCarnet < s.alumnos && (
                    <form action={generarCarnetsAction.bind(null, slug, s.id)}>
                      <Boton type="submit">Generar carnets</Boton>
                    </form>
                  )}
                  {s.conCarnet > 0 && (
                    <Link href={`/gestion/carnets/${s.id}`} className={buttonVariants({ variant: "outline" })}>
                      <Printer strokeWidth={2} aria-hidden /> Ver e imprimir
                    </Link>
                  )}
                  {s.conCarnet > 0 && (
                    <a href={`/api/carnets/${s.id}`} className={buttonVariants({ variant: "outline" })}>
                      <Download strokeWidth={2} aria-hidden /> Descargar PDF
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
