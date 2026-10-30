import { LogOut, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { auditar } from "@/lib/server/auditoria";
import { requireConsentimiento } from "@/lib/server/consentimiento";
import { evaluarAccesoNuditoPlus } from "@/lib/server/nudito-plus/acceso";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { PantallaNuditoPlus } from "../../chat/_componentes/PantallaNuditoPlus";
import { SinAccesoNuditoPlus } from "../../chat/_componentes/SinAccesoNuditoPlus";

export const metadata: Metadata = { title: "Nudito+ · modo hijo" };

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** «Modo hijo» (specs/29): el hijo sin cuenta propia usa Nudito+ dentro de la cuenta del apoderado. */
export default async function NuditoPlusModoHijoPage({ params, searchParams }: PageProps<"/colegio/[slug]/nudito-plus/hijo/[alumnoId]">) {
  const { slug, alumnoId } = await params;
  const { c } = await searchParams;
  if (!RE_UUID.test(alumnoId)) notFound();
  const ctx = await requireTenantContext(slug, ["apoderado"]);
  requireFeature(ctx, "nudito_plus");
  await requireConsentimiento(ctx);
  const acceso = await evaluarAccesoNuditoPlus(ctx, alumnoId);
  if (!acceso.ok) {
    if (acceso.motivo === "plan" || acceso.motivo === "rol" || !acceso.alumno) forbidden();
    return <SinAccesoNuditoPlus motivo={acceso.motivo} nombre={acceso.alumno.nombres.split(" ")[0] ?? acceso.alumno.nombres} vista="familia" />;
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "nudito_modo_hijo", entidadId: alumnoId });
  const nombre = acceso.alumno.nombres.split(" ")[0] ?? acceso.alumno.nombres;
  return (
    <div className="flex flex-col gap-4">
      <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-maiz px-4 py-3 text-sobre-maiz" data-testid="banner-modo-hijo">
        <p className="flex items-center gap-2 font-semibold">
          <Users className="size-5 shrink-0" strokeWidth={2} aria-hidden />
          Modo hijo: está usando Nudito+ {nombre}
        </p>
        <Link href="/inicio" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <LogOut strokeWidth={2} aria-hidden />
          Salir del modo hijo
        </Link>
      </div>
      <PantallaNuditoPlus ctx={ctx} acceso={acceso} rutaBase={`/nudito-plus/hijo/${alumnoId}`} conversacion={typeof c === "string" ? c : undefined} />
    </div>
  );
}
