import type { Metadata } from "next";
import { requireTenantContext } from "@/lib/server/tenant";
import { exigirGestion } from "@/lib/server/gestion";
import { PanelPersonal } from "../_personal/PanelPersonal";

export const metadata: Metadata = { title: "Profesores" };

export default async function ProfesoresPage({ params, searchParams }: PageProps<"/colegio/[slug]/gestion/profesores">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  exigirGestion(ctx);
  return <PanelPersonal ctx={ctx} ambito="profesores" searchParams={await searchParams} />;
}
