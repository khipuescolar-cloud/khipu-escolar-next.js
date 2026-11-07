import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { requireTenantContext } from "@/lib/server/tenant";
import { registroDelCurso } from "@/lib/server/registro-notas";
import { puedeGestionarCompetencias } from "@/lib/server/curriculo";
import { BotonCalificacionPeriodo } from "./periodo/BotonCalificacionPeriodo";
import { RegistroCurso } from "./RegistroCurso";

export const metadata: Metadata = { title: "Registro de notas" };
export default async function Page({ params, searchParams }: PageProps<"/colegio/[slug]/notas/[cursoId]">) {
  const { slug, cursoId } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  if (ctx.rol !== "profesor" && ctx.rol !== "direccion") forbidden();
  const datos = await registroDelCurso(ctx, cursoId, typeof sp.periodo === "string" ? sp.periodo : undefined);
  return (
    <RegistroCurso
      datos={datos} slug={slug} gestionar={puedeGestionarCompetencias(ctx)}
      botonPeriodo={datos.periodo ? <BotonCalificacionPeriodo cursoId={cursoId} periodoId={datos.periodo.id} slug={slug} /> : null}
    />
  );
}
