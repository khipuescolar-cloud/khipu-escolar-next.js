import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { NuditoMascota } from "@/components/nudito/NuditoMascota";
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
      <div className="flex flex-col gap-6 rounded-[14px] border border-borde-sutil bg-card p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <NuditoMascota tamano={56} estado="saludo" />
          <h1 className="font-heading text-titulo-2 text-balance sm:text-titulo-1">{CONSENTIMIENTO_TITULO}</h1>
        </div>
        <div className="flex flex-col gap-4">
          {CONSENTIMIENTO_PARRAFOS.map((p) => (
            <p key={p} className="max-w-prose leading-relaxed text-pretty">{p}</p>
          ))}
        </div>
        <p className="text-cuerpo-sm text-muted-foreground">Versión {CONSENTIMIENTO_VERSION}</p>
        <Alerta tipo="aviso">{CONSENTIMIENTO_NOTA_LEGAL}</Alerta>
        <form action={aceptarConsentimientoAction} className="flex flex-col gap-3 border-t border-borde-sutil pt-5 sm:flex-row sm:items-center">
          <Boton type="submit" tamano="lg">Acepto</Boton>
          <span className="text-cuerpo-sm text-muted-foreground">Sin tu autorización no podremos enviarte avisos por correo.</span>
        </form>
      </div>
    </div>
  );
}
