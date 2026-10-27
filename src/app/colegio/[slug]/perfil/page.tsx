import { ShieldCheck, ShieldOff } from "lucide-react";
import type { Metadata } from "next";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Notificar } from "@/components/shell/Notificar";
import { Boton } from "@/components/ui/Boton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CONSENTIMIENTO_VERSION } from "@/lib/consentimiento";
import { nombreRol } from "@/lib/roles";
import { obtenerPreferencias } from "@/lib/server/notificaciones/preferencias";
import { estadoConsentimiento } from "@/lib/server/consentimiento";
import { requireTenantContext } from "@/lib/server/tenant";
import { PreferenciasPersonal } from "./PreferenciasPersonal";
import { aceptarConsentimientoAction, revocarConsentimientoAction } from "../consentimiento/actions";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function PerfilPage({ params, searchParams }: PageProps<"/colegio/[slug]/perfil">) {
  const { slug } = await params;
  const { ok, error } = await searchParams;
  const ctx = await requireTenantContext(slug);
  const estado = ctx.rol === "apoderado" ? await estadoConsentimiento(ctx) : null;
  const esPersonal = ctx.rol === "profesor" || ctx.rol === "direccion" || ctx.rol === "administrativo";
  const preferencias = esPersonal ? await obtenerPreferencias(ctx) : null;
  const descripcionAvisos =
    ctx.rol === "profesor"
      ? "Elige cómo quieres enterarte cuando una familia te escriba por el chat."
      : ctx.rol === "direccion"
        ? "Elige cómo quieres recibir las alertas del colegio, como un correo de familia que dejó de recibir avisos."
        : "Elige cómo quieres recibir los avisos del colegio.";
  const iniciales = `${ctx.user.nombres[0] ?? ""}${ctx.user.apellidos[0] ?? ""}`.toUpperCase();

  return (
    <div className="max-w-2xl">
      <Notificar ok={Array.isArray(ok) ? ok[0] : ok} error={Array.isArray(error) ? error[0] : error} />
      <EncabezadoPagina titulo="Mi perfil" descripcion="Tus datos en este colegio y tu privacidad." />
      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <Avatar size="lg" className="size-14">
              <AvatarFallback className="bg-maiz text-lg font-semibold text-indigo">{iniciales}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-lg font-semibold">{ctx.user.nombres} {ctx.user.apellidos}</p>
              <p className="truncate text-sm text-muted-foreground">{ctx.user.email}</p>
              <Badge variant="secondary" className="mt-1.5">{nombreRol(ctx.rol, ctx.user.genero)}</Badge>
            </div>
          </CardContent>
        </Card>

        {preferencias && (
          <PreferenciasPersonal
            slug={slug}
            correo={preferencias.correo}
            push={preferencias.push}
            vapidPublica={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
            descripcion={descripcionAvisos}
          />
        )}

        {estado && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Privacidad</CardTitle>
              <CardDescription>Tu autorización para recibir avisos del colegio.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {estado === "vigente" ? (
                <>
                  <p className="flex items-center gap-2 text-sm font-medium text-llego"><ShieldCheck className="size-4" strokeWidth={2} aria-hidden /> Autorizaste el uso de tus datos (versión {CONSENTIMIENTO_VERSION}).</p>
                  <p className="text-sm text-muted-foreground">Si retiras tu autorización, dejarás de recibir avisos por correo.</p>
                  <form action={revocarConsentimientoAction}>
                    <Boton type="submit" variante="peligro">Retirar mi autorización</Boton>
                  </form>
                </>
              ) : (
                <>
                  <p className="flex items-center gap-2 text-sm font-medium text-falta"><ShieldOff className="size-4" strokeWidth={2} aria-hidden /> No tienes una autorización vigente: no recibes avisos.</p>
                  <form action={aceptarConsentimientoAction}>
                    <Boton type="submit">Volver a autorizar</Boton>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
