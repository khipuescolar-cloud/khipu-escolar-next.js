import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { evaluarAccesoNuditoPlus } from "@/lib/server/nudito-plus/acceso";
import { requireFeature } from "@/lib/server/plan";
import { alumnoDeLaCuenta, requireTenantContext } from "@/lib/server/tenant";
import { PantallaNuditoPlus } from "./_componentes/PantallaNuditoPlus";
import { SinAccesoNuditoPlus } from "./_componentes/SinAccesoNuditoPlus";

export const metadata: Metadata = { title: "Nudito+" };

/** Nudito+ del alumno con cuenta propia (specs/29). */
export default async function NuditoPlusChatPage({ params, searchParams }: PageProps<"/colegio/[slug]/nudito-plus/chat">) {
  const { slug } = await params;
  const { c } = await searchParams;
  const ctx = await requireTenantContext(slug, ["alumno"]);
  requireFeature(ctx, "nudito_plus");
  const propio = await alumnoDeLaCuenta(ctx);
  if (!propio) forbidden();
  const acceso = await evaluarAccesoNuditoPlus(ctx, propio.id);
  if (!acceso.ok) {
    if (acceso.motivo === "plan" || acceso.motivo === "rol") forbidden();
    return <SinAccesoNuditoPlus motivo={acceso.motivo} nombre={ctx.user.nombres} vista="alumno" />;
  }
  return (
    <div className="flex flex-col">
      <EncabezadoPagina titulo="Nudito+" descripcion="Tu tutor con IA. Practica paso a paso, a tu ritmo." />
      <PantallaNuditoPlus ctx={ctx} acceso={acceso} rutaBase="/nudito-plus/chat" conversacion={typeof c === "string" ? c : undefined} />
    </div>
  );
}
