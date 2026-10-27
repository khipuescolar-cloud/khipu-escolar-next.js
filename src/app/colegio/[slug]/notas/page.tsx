import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { esVistaFamilia } from "@/lib/roles";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { VistaDocente } from "./VistaDocente";
import { VistaFamilia } from "./VistaFamilia";

export const metadata: Metadata = { title: "Notas" };

export default async function NotasPage({ params, searchParams }: PageProps<"/colegio/[slug]/notas">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "notas");
  // Apoderado (sus hijos) y alumno con cuenta propia (solo él): misma vista de solo lectura.
  if (esVistaFamilia(ctx.rol)) return <VistaFamilia ctx={ctx} sp={sp} />;
  if (ctx.rol === "profesor" || ctx.rol === "direccion") return <VistaDocente ctx={ctx} slug={slug} sp={sp} />;
  forbidden();
}
