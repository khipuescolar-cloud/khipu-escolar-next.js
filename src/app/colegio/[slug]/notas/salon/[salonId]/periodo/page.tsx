import type { Metadata } from "next";
import { destinatariosReportesPeriodo, reporteSalonPeriodo } from "@/lib/server/calificacion-periodo";
import { requireTenantContext } from "@/lib/server/tenant";
import { ReporteSalon } from "./ReporteSalon";

export const metadata: Metadata = { title: "Reporte del periodo" };

export default async function Page({ params, searchParams }: PageProps<"/colegio/[slug]/notas/salon/[salonId]/periodo">) {
  const { slug, salonId } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  const reporte = await reporteSalonPeriodo(ctx, salonId, typeof sp.periodo === "string" ? sp.periodo : undefined);
  const destinos = reporte.periodo ? await destinatariosReportesPeriodo(ctx, salonId, reporte.periodo.id) : null;
  return <ReporteSalon reporte={reporte} slug={slug} puedeSolicitar={ctx.rol === "direccion" || ctx.membership.id === (await ctx.db.salon.findFirst({ where: { id: salonId }, select: { tutorId: true } }))?.tutorId} destinatarios={destinos?.destinatarios.map(d => ({ profesor: [d.miembro.user.nombres, d.miembro.user.apellidos].join(" "), cursos: d.cursos.map(c => c.nombre) })) ?? []} />;
}
