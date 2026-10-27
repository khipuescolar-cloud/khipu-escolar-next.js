import { CheckCircle2, IdCard, Printer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Badge } from "@/components/ui/badge";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { salonesParaCarnets } from "@/lib/server/porteria";
import { requireTenantContext } from "@/lib/server/tenant";
import { generarCarnetsAction } from "./actions";

export const metadata: Metadata = { title: "Carnets QR" };

export default async function CarnetsPage({ params }: PageProps<"/colegio/[slug]/gestion/carnets">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  const salones = await salonesParaCarnets(ctx);

  return (
    <div>
      <EncabezadoPagina titulo="Carnets con QR" descripcion="La portería los escanea para registrar la llegada. Imprime los carnets por salón." />
      {salones.length === 0 ? (
        <EstadoVacio icono={IdCard} titulo="Aún no hay salones con alumnos" descripcion="Crea salones y agrega alumnos para generar sus carnets." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {salones.map((s) => {
            const completo = s.alumnos > 0 && s.conCarnet >= s.alumnos;
            return (
              <li key={s.id}>
                <Tarjeta className="flex h-full flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex items-center gap-2 font-heading text-lg font-semibold">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                        <IdCard className="size-5" strokeWidth={2} aria-hidden />
                      </span>
                      {s.nombre}
                    </p>
                    {completo && <Badge className="h-6 bg-llego-fondo px-2.5 text-xs font-semibold text-llego"><CheckCircle2 strokeWidth={2} aria-hidden /> Completo</Badge>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">{s.conCarnet} de {s.alumnos} alumnos con carnet</p>
                    <Progress value={s.alumnos > 0 ? Math.round((s.conCarnet / s.alumnos) * 100) : 0} aria-label={`Carnets generados en ${s.nombre}`} />
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
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
                  </div>
                </Tarjeta>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
