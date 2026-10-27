import type { Metadata } from "next";
import { exigirGestion } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";
import { FichaPersona } from "../../_personal/FichaPersona";

export const metadata: Metadata = { title: "Ficha del personal" };

export default async function FichaPersonalPage({ params, searchParams }: PageProps<"/colegio/[slug]/gestion/personal/[id]">) {
  const { slug, id } = await params;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  exigirGestion(ctx);
  return <FichaPersona ctx={ctx} ambito="personal" id={id} searchParams={await searchParams} />;
}
