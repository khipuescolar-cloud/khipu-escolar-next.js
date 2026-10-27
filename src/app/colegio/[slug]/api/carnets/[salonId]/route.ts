import { renderToBuffer } from "@react-pdf/renderer";
import { forbidden } from "next/navigation";
import { z } from "zod";
import { CarnetsPdf, parseFormatoCarnets } from "@/lib/server/carnets-pdf";
import { auditar } from "@/lib/server/auditoria";
import { logoParaPdf } from "@/lib/server/logo";
import { carnetsParaImprimir } from "@/lib/server/porteria";
import { requireTenantContext } from "@/lib/server/tenant";

export const runtime = "nodejs";

/** GET /api/carnets/<salonId>?formato=a4|cr80 → PDF de los carnets del salón (A4 con 8 por hoja, o CR80). Solo dirección; auditado. */
export async function GET(request: Request, { params }: RouteContext<"/colegio/[slug]/api/carnets/[salonId]">) {
  const { slug, salonId } = await params;
  const ctx = await requireTenantContext(slug);
  if (ctx.rol !== "direccion") forbidden();
  if (!z.uuid().safeParse(salonId).success) return new Response("Salón no válido.", { status: 400 });
  const formato = parseFormatoCarnets(new URL(request.url).searchParams.get("formato"));

  const { salon, carnets } = await carnetsParaImprimir(ctx, salonId);
  const conQr = carnets.flatMap((c) => (c.qr ? [{ alumnoId: c.alumnoId, nombres: c.nombres, apellidos: c.apellidos, codigo: c.codigo, qr: c.qr }] : []));
  if (conQr.length === 0) return new Response("Este salón aún no tiene carnets generados.", { status: 404 });

  const pdf = await renderToBuffer(
    CarnetsPdf({ colegio: ctx.tenant.nombre, salon: salon.nombre, carnets: conQr, formato, logo: await logoParaPdf(ctx.tenant) }),
  );
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "exportar", entidad: "carnet_qr",
    detalle: { salonId: salon.id, formato, carnets: conQr.length },
  });
  const nombre = `carnets-${salon.nombre}-${formato}`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombre}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
