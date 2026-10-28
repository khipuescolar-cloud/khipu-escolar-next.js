import { ChevronRight, MailWarning, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PlanLock } from "@/components/PlanLock";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { ICONOS_NAV } from "@/components/shell/iconos";
import { Badge } from "@/components/ui/badge";
import { type GrupoNav, mosaicosParaRol, NOMBRE_GRUPO } from "@/lib/navegacion";
import { requireConsentimiento } from "@/lib/server/consentimiento";
import { conteoNoLeidos } from "@/lib/server/mensajes";
import { estadoModulo } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { ResumenDireccion } from "./ResumenDireccion";

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
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            Plan {ctx.accesoModulos.nombrePlan}
          </span>
        }
      />
      {GRUPOS.map((grupo) => {
        const delGrupo = mosaicos.filter((m) => m.grupo === grupo);
        if (delGrupo.length === 0) return null;
        return (
          <section key={grupo} aria-labelledby={`grupo-${grupo}`} className="flex flex-col gap-3">
            <h2 id={`grupo-${grupo}`} className="sobretitulo">{NOMBRE_GRUPO[grupo]}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {delGrupo.map((m) => {
                const Icono = ICONOS_NAV[m.icono];
                const incluido = m.acceso.estado === "activo";
                const contenido = (
                  <>
                    <span className="flex items-start justify-between gap-2">
                      <span className={`flex size-10 items-center justify-center rounded-md ${incluido ? "bg-superficie-2 text-primary" : "bg-superficie-2 text-muted-foreground"}`}>
                        <Icono className="size-5" strokeWidth={2} aria-hidden />
                      </span>
                      {m.acceso.estado === "bloqueado" && <PlanLock nombrePlan={m.acceso.planMinimo} />}
                      {incluido && m.contador === "mensajes" && mensajesSinLeer > 0 && (
                        <Badge className="h-6 gap-1 bg-maiz px-2 text-sobre-maiz" data-testid="contador-mensajes">
                          <MailWarning strokeWidth={2} aria-hidden />
                          <span aria-hidden>{mensajesSinLeer}</span>
                          <span className="sr-only">{mensajesSinLeer === 1 ? "1 mensaje sin leer" : `${mensajesSinLeer} mensajes sin leer`}</span>
                        </Badge>
                      )}
                    </span>
                    <span className="text-cuerpo font-semibold">{m.titulo}</span>
                    <span className="text-cuerpo-sm text-muted-foreground">{m.descripcion}</span>
                    {incluido && (
                      <ChevronRight
                        className="absolute right-4 bottom-4 size-4 text-muted-foreground transition-transform group-hover/mosaico:translate-x-0.5 group-hover/mosaico:text-primary"
                        strokeWidth={2}
                        aria-hidden
                      />
                    )}
                  </>
                );
                const clase = "group/mosaico relative flex h-full flex-col gap-2 rounded-lg border border-arena bg-superficie p-4 pr-10";
                return (
                  <li key={m.titulo}>
                    {incluido ? (
                      <Link href={m.href} className={`${clase} transition-shadow hover:shadow-sombra-1`}>
                        {contenido}
                      </Link>
                    ) : (
                      <div className={`${clase} opacity-75`} aria-disabled="true">
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
      {ctx.rol === "direccion" && <ResumenDireccion ctx={ctx} />}
      <p className="text-cuerpo-sm">
        <Link href="/perfil" className="enlace">
          Mi perfil y privacidad
        </Link>
      </p>
    </div>
  );
}
