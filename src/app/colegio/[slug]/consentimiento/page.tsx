import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { CONSENTIMIENTO_NOTA_LEGAL, CONSENTIMIENTO_PARRAFOS, CONSENTIMIENTO_TITULO, CONSENTIMIENTO_VERSION } from "@/lib/consentimiento";
import { estadoConsentimiento } from "@/lib/server/consentimiento";
import { requireTenantContext } from "@/lib/server/tenant";
import { aceptarConsentimientoAction } from "./actions";

export const metadata: Metadata = { title: "Tu autorización" };

/** Primer ingreso de un apoderado: debe aceptar el consentimiento versionado para recibir avisos. */
export default async function ConsentimientoPage({ params }: PageProps<"/colegio/[slug]/consentimiento">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["apoderado"]);
  if ((await estadoConsentimiento(ctx)) === "vigente") redirect("/inicio");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Tarjeta className="flex flex-col gap-4 p-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-6 w-6 text-acento" strokeWidth={2} aria-hidden /> {CONSENTIMIENTO_TITULO}
        </h1>
        {CONSENTIMIENTO_PARRAFOS.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <p className="text-xs text-pizarra">Versión {CONSENTIMIENTO_VERSION}</p>
        <Alerta tipo="aviso">{CONSENTIMIENTO_NOTA_LEGAL}</Alerta>
        <form action={aceptarConsentimientoAction} className="flex flex-wrap items-center gap-3">
          <Boton type="submit">Acepto</Boton>
          <span className="text-sm text-pizarra">Sin tu autorización no podremos enviarte avisos por correo.</span>
        </form>
      </Tarjeta>
    </div>
  );
}
