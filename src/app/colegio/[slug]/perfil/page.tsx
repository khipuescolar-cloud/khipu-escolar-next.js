import { ShieldCheck, ShieldOff } from "lucide-react";
import type { Metadata } from "next";
import { Boton } from "@/components/ui/Boton";
import { Flash } from "@/components/ui/Flash";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { CONSENTIMIENTO_VERSION } from "@/lib/consentimiento";
import { nombreRol } from "@/lib/roles";
import { estadoConsentimiento } from "@/lib/server/consentimiento";
import { requireTenantContext } from "@/lib/server/tenant";
import { aceptarConsentimientoAction, revocarConsentimientoAction } from "../consentimiento/actions";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function PerfilPage({ params, searchParams }: PageProps<"/colegio/[slug]/perfil">) {
  const { slug } = await params;
  const { ok, error } = await searchParams;
  const ctx = await requireTenantContext(slug);
  const estado = ctx.rol === "apoderado" ? await estadoConsentimiento(ctx) : null;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold">Mi perfil</h1>
      <Flash ok={ok} error={error} />
      <Tarjeta>
        <p className="font-semibold">{ctx.user.nombres} {ctx.user.apellidos}</p>
        <p className="text-sm text-pizarra">{ctx.user.email} · {nombreRol(ctx.rol, ctx.user.genero)}</p>
      </Tarjeta>
      {estado && (
        <Tarjeta className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Privacidad</h2>
          {estado === "vigente" ? (
            <>
              <p className="flex items-center gap-2 text-sm text-llego"><ShieldCheck className="h-4 w-4" strokeWidth={2} aria-hidden /> Autorizaste el uso de tus datos (versión {CONSENTIMIENTO_VERSION}).</p>
              <p className="text-sm text-pizarra">Si retiras tu autorización, dejarás de recibir avisos por correo.</p>
              <form action={revocarConsentimientoAction}>
                <Boton type="submit" variante="peligro">Retirar mi autorización</Boton>
              </form>
            </>
          ) : (
            <>
              <p className="flex items-center gap-2 text-sm text-falta"><ShieldOff className="h-4 w-4" strokeWidth={2} aria-hidden /> No tienes una autorización vigente: no recibes avisos.</p>
              <form action={aceptarConsentimientoAction}>
                <Boton type="submit">Volver a autorizar</Boton>
              </form>
            </>
          )}
        </Tarjeta>
      )}
    </div>
  );
}
