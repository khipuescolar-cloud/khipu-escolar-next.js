import { forbidden } from "next/navigation";
import { construirIcs } from "@/lib/ics";
import { itemsDeAgenda } from "@/lib/server/agenda";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";

const MS_DIA = 86_400_000;

// Calendario .ics (specs/12): eventos y entregas visibles para el usuario, de hace 30 días a 1 año.
export async function GET(_request: Request, { params }: RouteContext<"/colegio/[slug]/api/agenda.ics">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "agenda");
  if (!["apoderado", "alumno", "profesor", "direccion", "administrativo"].includes(ctx.rol)) forbidden();
  const ahora = new Date();
  const items = await itemsDeAgenda(ctx, new Date(ahora.getTime() - 30 * MS_DIA), new Date(ahora.getTime() + 365 * MS_DIA));
  const ics = construirIcs({
    nombre: `Agenda · ${ctx.tenant.nombre}`,
    ahora,
    eventos: items.map((it) => ({
      uid: `${it.id}@khipuescolar`,
      titulo: it.titulo,
      descripcion: it.descripcion,
      lugar: it.ambito,
      inicio: it.inicio,
      diaCompleto: it.tipo === "entrega",
    })),
  });
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${ctx.tenant.slug}-agenda.ics"`,
      "cache-control": "private, no-store",
    },
  });
}
