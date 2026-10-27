import type { Metadata } from "next";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
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
    <div className="flex flex-col">
      <EncabezadoPagina
        titulo="Portería"
        descripcion={
          <>
            <span className="first-letter:uppercase">{fechaLarga(hoy.isoFecha)}</span> · Tardanza desde las {ctx.tenant.horaLimiteTardanza}
          </>
        }
      />
      <Escaner slug={slug} />
    </div>
  );
}
