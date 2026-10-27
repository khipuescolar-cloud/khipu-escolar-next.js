import type { Metadata } from "next";
import { fechaLarga } from "@/lib/fechas";
import { hoyDelColegio } from "@/lib/server/asistencia";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { Escaner } from "./Escaner";

export const metadata: Metadata = { title: "Portería" };

export default async function PorteriaPage({ params }: PageProps<"/colegio/[slug]/porteria">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["porteria", "direccion"]);
  requireFeature(ctx, "porteria");
  const hoy = hoyDelColegio(ctx);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Portería</h1>
        <p className="text-sm text-pizarra first-letter:uppercase">
          {fechaLarga(hoy.isoFecha)} · Tardanza desde las {ctx.tenant.horaLimiteTardanza}
        </p>
      </div>
      <Escaner slug={slug} />
    </div>
  );
}
