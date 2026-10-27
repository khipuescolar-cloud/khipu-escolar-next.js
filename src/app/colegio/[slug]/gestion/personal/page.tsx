import type { Metadata } from "next";
import { requireTenantContext } from "@/lib/server/tenant";
import { exigirGestion } from "@/lib/server/gestion";
import { PanelPersonal } from "../_personal/PanelPersonal";

export const metadata: Metadata = { title: "Personal" };

export default async function PersonalPage({ params, searchParams }: PageProps<"/colegio/[slug]/gestion/personal">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  exigirGestion(ctx);
  return <PanelPersonal ctx={ctx} ambito="personal" searchParams={await searchParams} />;
}
