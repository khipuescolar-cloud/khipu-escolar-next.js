import type { Metadata } from "next";
import { exigirGestion } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";
import { FichaPersona } from "../../_personal/FichaPersona";

export const metadata: Metadata = { title: "Ficha del profesor" };

export default async function FichaProfesorPage({ params, searchParams }: PageProps<"/colegio/[slug]/gestion/profesores/[id]">) {
  const { slug, id } = await params;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  exigirGestion(ctx);
  return <FichaPersona ctx={ctx} ambito="profesores" id={id} searchParams={await searchParams} />;
}
