import type { Metadata } from "next";
import { reporteSalonPeriodo } from "@/lib/server/calificacion-periodo";
import { requireTenantContext } from "@/lib/server/tenant";
import { ReporteSalon } from "./ReporteSalon";

export const metadata: Metadata = { title: "Reporte del periodo" };

export default async function Page({ params, searchParams }: PageProps<"/colegio/[slug]/notas/salon/[salonId]/periodo">) {
  const { slug, salonId } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  const reporte = await reporteSalonPeriodo(ctx, salonId, typeof sp.periodo === "string" ? sp.periodo : undefined);
  return <ReporteSalon reporte={reporte} />;
}
