import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alerta } from "@/components/ui/Alerta";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { parrafos } from "@/lib/nudito-plus";
import { datosConsentimiento } from "@/lib/server/nudito-plus/familia";
import { requireTenantContext } from "@/lib/server/tenant";
import { aceptarConsentimientoIaAction } from "../../actions";
import { BotonEnvio } from "../../BotonEnvio";

export const metadata: Metadata = { title: "Autorización de Nudito" };

/** Consentimiento del apoderado para que su hijo menor use el tutor con IA (Ley 29733, specs/28). */
export default async function ConsentimientoNudito({ params }: PageProps<"/colegio/[slug]/nudito-plus/[alumnoId]/consentimiento">) {
  const { slug, alumnoId } = await params;
  const ctx = await requireTenantContext(slug, ["apoderado"]);
  const { alumno, texto, vigente } = await datosConsentimiento(ctx, alumnoId);
  if (vigente) redirect(`/nudito-plus/${alumno.id}`);
  const nombre = alumno.nombres.split(" ")[0];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link href={`/nudito-plus/${alumno.id}`} className="enlace inline-flex w-fit items-center gap-1 text-cuerpo-sm">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Nudito de {nombre}
      </Link>
      <Tarjeta className="flex flex-col gap-4 p-6">
        <h1 className="flex items-start gap-3 text-titulo-2 text-balance sm:text-titulo-1">
          <ShieldCheck className="mt-1 size-6 shrink-0 text-sec-trazo" strokeWidth={2} aria-hidden />
          Autorización para que {nombre} use Nudito
        </h1>
        {parrafos(texto.texto).map((p) => (
          <p key={p} className="max-w-prose leading-relaxed">{p}</p>
        ))}
        <p className="text-cuerpo-sm text-muted-foreground">Versión {texto.version}</p>
        <Alerta tipo="aviso">Al aceptar declaras ser madre, padre o apoderado de {nombre}. Guardamos la fecha, la versión del texto y la dirección IP desde la que aceptas.</Alerta>
        <form action={aceptarConsentimientoIaAction} className="flex flex-col gap-3 border-t border-borde-sutil pt-4 sm:flex-row sm:items-center">
          <input type="hidden" name="alumnoId" value={alumno.id} />
          <BotonEnvio tamano="lg">Acepto y autorizo</BotonEnvio>
          <span className="text-cuerpo-sm text-muted-foreground">Puedes retirar tu autorización cuando quieras.</span>
        </form>
      </Tarjeta>
    </div>
  );
}
