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
    <div className="mx-auto max-w-2xl">
      <Tarjeta className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
            <ShieldCheck className="size-6" strokeWidth={2} aria-hidden />
          </span>
          <h1 className="text-2xl font-bold text-balance">{CONSENTIMIENTO_TITULO}</h1>
        </div>
        {CONSENTIMIENTO_PARRAFOS.map((p) => (
          <p key={p} className="max-w-prose leading-relaxed">{p}</p>
        ))}
        <p className="text-xs text-muted-foreground">Versión {CONSENTIMIENTO_VERSION}</p>
        <Alerta tipo="aviso">{CONSENTIMIENTO_NOTA_LEGAL}</Alerta>
        <form action={aceptarConsentimientoAction} className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center">
          <Boton type="submit" tamano="lg">Acepto</Boton>
          <span className="text-sm text-muted-foreground">Sin tu autorización no podremos enviarte avisos por correo.</span>
        </form>
      </Tarjeta>
    </div>
  );
}
