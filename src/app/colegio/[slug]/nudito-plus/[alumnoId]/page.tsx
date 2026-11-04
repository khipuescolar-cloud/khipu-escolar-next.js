import { ArrowLeft, Play, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BotonEnvio } from "../BotonEnvio";
import { ProgresoTemas } from "../../nudito/seguimiento/_componentes/ProgresoTemas";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { buttonVariants } from "@/components/ui/button";
import { Flash } from "@/components/ui/Flash";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { formatoDia } from "@/lib/fechas";
import { evaluarAccesoNuditoPlus } from "@/lib/server/nudito-plus/acceso";
import { autorizacionDeHijo } from "@/lib/server/nudito-plus/familia";
import { detalleProgresoAlumno } from "@/lib/server/nudito/progreso";
import { requireTenantContext } from "@/lib/server/tenant";
import { revocarConsentimientoIaAction } from "../actions";

export const metadata: Metadata = { title: "Nudito de tu hijo" };

/** Progreso de práctica de un hijo y la autorización de la familia (specs/44). Sin conversaciones. */
export default async function NuditoHijo({ params, searchParams }: PageProps<"/colegio/[slug]/nudito-plus/[alumnoId]">) {
  const { slug, alumnoId } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["apoderado"]);
  const { alumno, consentimiento } = await autorizacionDeHijo(ctx, alumnoId);
  const [progreso, acceso] = await Promise.all([detalleProgresoAlumno(ctx, alumnoId), evaluarAccesoNuditoPlus(ctx, alumnoId)]);
  const nombre = alumno.nombres.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/nudito-plus" className="enlace inline-flex w-fit items-center gap-1 text-cuerpo-sm">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Nudito
      </Link>
      <EncabezadoPagina
        titulo={`Nudito de ${nombre}`}
        descripcion={`${alumno.nombres} ${alumno.apellidos} · ${alumno.salon}`}
        acciones={acceso.ok ? (
          <Link href={`/nudito?alumno=${alumno.id}`} className={buttonVariants()}>
            <Play strokeWidth={2} aria-hidden /> Usar en modo hijo
          </Link>
        ) : undefined}
      />
      <Flash ok={sp.ok} error={sp.error} />

      <Tarjeta className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Tu autorización</h2>
        {consentimiento ? (
          <>
            <p className="inline-flex items-center gap-1.5 font-medium text-llego"><ShieldCheck className="size-5" strokeWidth={2} aria-hidden /> Autorizado</p>
            <p className="text-cuerpo-sm text-muted-foreground">
              {consentimiento.mio ? "Diste" : "Otro apoderado dio"} la autorización el {formatoDia(consentimiento.aceptadoAt, { day: "numeric", month: "long", year: "numeric" })} (versión {consentimiento.version}).
            </p>
            <form action={revocarConsentimientoIaAction}>
              <input type="hidden" name="alumnoId" value={alumno.id} />
              <BotonEnvio variante="secundario">Retirar autorización</BotonEnvio>
            </form>
          </>
        ) : (
          <>
            <p className="inline-flex items-center gap-1.5 font-medium"><ShieldQuestion className="size-5" strokeWidth={2} aria-hidden /> Falta tu autorización</p>
            <p className="text-cuerpo-sm text-muted-foreground">Antes de que {nombre} practique con Nudito, necesitamos que aceptes cómo funciona.</p>
            <Link href={`/nudito-plus/${alumno.id}/consentimiento`} className={`${buttonVariants()} w-fit`}>Leer y autorizar</Link>
          </>
        )}
      </Tarjeta>

      <ProgresoTemas areas={progreso.areas} temas={progreso.temas} vacio={`Cuando ${nombre} practique con Nudito, aquí verás sus temas y cómo avanza.`} />
    </div>
  );
}
