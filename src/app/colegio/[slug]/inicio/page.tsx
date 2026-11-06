import { ChevronRight, MailWarning, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TarjetaInstalarApp } from "@/components/app/InstalarApp";
import { PlanLock } from "@/components/PlanLock";
import { NuditoMascota } from "@/components/nudito/NuditoMascota";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { ICONOS_NAV } from "@/components/shell/iconos";
import { Badge } from "@/components/ui/badge";
import { type GrupoNav, mosaicosParaRol, NOMBRE_GRUPO } from "@/lib/navegacion";
import { requireConsentimiento } from "@/lib/server/consentimiento";
import { conteoNoLeidos } from "@/lib/server/mensajes";
import { estadoModulo } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { ResumenDireccion } from "./ResumenDireccion";
import { TarjetaHoy } from "./TarjetaHoy";

const GRUPOS: GrupoNav[] = ["dia", "comunicacion", "academico", "colegio"];

export const metadata: Metadata = { title: "Inicio" };

export default async function InicioPage({ params }: PageProps<"/colegio/[slug]/inicio">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  await requireConsentimiento(ctx);
  // Ocultos: quitados al colegio o al rol, o privados en modo soporte (specs/19, specs/16). Bloqueados: candado.
  const mosaicos = mosaicosParaRol(ctx.rol)
    .map((m) => ({ ...m, acceso: estadoModulo(ctx, m.feature) }))
    .filter((m) => m.acceso.estado !== "oculto");
  const mensajesSinLeer = mosaicos.some((m) => m.contador === "mensajes" && m.acceso.estado === "activo") ? await conteoNoLeidos(ctx) : 0;

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina
        titulo={`Hola, ${ctx.user.nombres}`}
        descripcion={
          <span>Este es tu espacio para empezar el día.</span>
        }
        acciones={<span className="inline-flex items-center gap-1.5 text-cuerpo-sm text-muted-foreground"><ShieldCheck className="size-4" strokeWidth={2} aria-hidden />Plan {ctx.accesoModulos.nombrePlan}</span>}
      />
      <div className="flex flex-col items-start gap-4">
        <TarjetaHoy ctx={ctx} />
        <aside className="flex max-w-sm items-center gap-3 rounded-xl bg-acento-suave p-4" aria-label="Saludo de Nudito">
          <NuditoMascota tamano={48} estado="saludo" />
          <p className="font-nudito text-cuerpo text-primary">{ctx.rol === "alumno" ? "¡Vamos con lo que toca hoy!" : ctx.rol === "apoderado" ? "Qué bueno verte por aquí." : "Un paso a la vez. ¡Buen día!"}</p>
        </aside>
      </div>
      {mensajesSinLeer > 0 && <Link href="/mensajes" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-md bg-tarde-fondo px-4 font-medium text-tarde hover:underline"><MailWarning className="size-4" strokeWidth={2} aria-hidden />Tienes mensajes por leer · {mensajesSinLeer}</Link>}
      {ctx.rol === "direccion" && <ResumenDireccion ctx={ctx} />}
      <div>
        <h2 className="font-heading text-titulo-2">Ir a una sección</h2>
        <p className="mt-1 text-cuerpo-sm text-muted-foreground">Accesos a las herramientas de tu colegio.</p>
      </div>
      {GRUPOS.map((grupo) => {
        const delGrupo = mosaicos.filter((m) => m.grupo === grupo);
        if (delGrupo.length === 0) return null;
        return (
          <section key={grupo} aria-labelledby={`grupo-${grupo}`} className="-mt-4 flex flex-col gap-2">
            <h3 id={`grupo-${grupo}`} className="text-cuerpo-sm font-semibold text-muted-foreground">{NOMBRE_GRUPO[grupo]}</h3>
            <ul className="grid gap-x-5 sm:grid-cols-2 xl:grid-cols-3">
              {delGrupo.map((m) => {
                const Icono = ICONOS_NAV[m.icono];
                const incluido = m.acceso.estado === "activo";
                const contenido = (
                  <>
                    <Icono className="size-5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
                    <span className="min-w-0 flex-1 font-medium">{m.titulo}</span>
                    {m.acceso.estado === "bloqueado" && <PlanLock nombrePlan={m.acceso.planMinimo} />}
                    {incluido && m.contador === "mensajes" && mensajesSinLeer > 0 && (
                        <Badge className="h-6 gap-1 bg-tarde-fondo px-2 text-tarde" data-testid="contador-mensajes">
                          <MailWarning strokeWidth={2} aria-hidden />
                          <span aria-hidden>{mensajesSinLeer}</span>
                          <span className="sr-only">{mensajesSinLeer === 1 ? "1 mensaje sin leer" : `${mensajesSinLeer} mensajes sin leer`}</span>
                        </Badge>
                    )}
                    {incluido && (
                      <ChevronRight
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/mosaico:translate-x-0.5 group-hover/mosaico:text-primary"
                        strokeWidth={2}
                        aria-hidden
                      />
                    )}
                  </>
                );
                const clase = "group/mosaico flex min-h-12 items-center gap-3 rounded-md border-b border-borde-sutil px-2 py-2 text-cuerpo-sm hover:bg-superficie-2";
                return (
                  <li key={m.titulo}>
                    {incluido ? (
                      <Link href={m.href} className={clase} title={m.descripcion}>
                        {contenido}
                      </Link>
                    ) : (
                      <div className={`${clase} opacity-75`} aria-disabled="true" title={m.descripcion}>
                        {contenido}
                        <span className="sr-only">No incluido en tu plan.</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <TarjetaInstalarApp />
      <p className="text-cuerpo-sm">
        <Link href="/perfil" className="enlace">
          Mi perfil y privacidad
        </Link>
      </p>
    </div>
  );
}
