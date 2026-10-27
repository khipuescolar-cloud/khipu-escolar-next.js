import { IdCard, Printer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Boton } from "@/components/ui/Boton";
import { salonesParaCarnets } from "@/lib/server/porteria";
import { requireTenantContext } from "@/lib/server/tenant";
import { generarCarnetsAction } from "./actions";

export const metadata: Metadata = { title: "Carnets QR" };

export default async function CarnetsPage({ params }: PageProps<"/colegio/[slug]/gestion/carnets">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  const salones = await salonesParaCarnets(ctx);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Carnets con QR</h1>
        <p className="text-sm text-pizarra">La portería los escanea para registrar la llegada. Imprime los carnets por salón.</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {salones.map((s) => (
          <li key={s.id} className="flex flex-col gap-3 rounded-lg border border-arena bg-superficie p-5">
            <p className="flex items-center gap-2 font-titulo text-lg font-semibold">
              <IdCard className="h-5 w-5 text-acento" strokeWidth={2} aria-hidden /> {s.nombre}
            </p>
            <p className="text-sm text-pizarra">
              {s.conCarnet} de {s.alumnos} alumnos con carnet
            </p>
            <div className="flex flex-wrap gap-2">
              {s.conCarnet < s.alumnos && (
                <form action={generarCarnetsAction.bind(null, slug, s.id)}>
                  <Boton type="submit">Generar carnets</Boton>
                </form>
              )}
              {s.conCarnet > 0 && (
                <Link
                  href={`/gestion/carnets/${s.id}`}
                  className="inline-flex items-center gap-2 rounded-md border border-arena px-4 py-2.5 text-sm font-semibold hover:bg-superficie-2"
                >
                  <Printer className="h-4 w-4" strokeWidth={2} aria-hidden /> Ver e imprimir
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
