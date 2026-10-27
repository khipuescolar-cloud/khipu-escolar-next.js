import { ChevronRight, MailWarning, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PlanLock } from "@/components/PlanLock";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { ICONOS_NAV } from "@/components/shell/iconos";
import { Badge } from "@/components/ui/badge";
import { mosaicosParaRol } from "@/lib/navegacion";
import { NOMBRE_PLAN, planIncluye, planMinimo } from "@/lib/planes";
import { requireConsentimiento } from "@/lib/server/consentimiento";
import { conteoNoLeidos } from "@/lib/server/mensajes";
import { requireTenantContext } from "@/lib/server/tenant";
import { ResumenDireccion } from "./ResumenDireccion";

export const metadata: Metadata = { title: "Inicio" };

export default async function InicioPage({ params }: PageProps<"/colegio/[slug]/inicio">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  await requireConsentimiento(ctx);
  const mosaicos = mosaicosParaRol(ctx.rol);
  const mensajesSinLeer = mosaicos.some((m) => m.contador === "mensajes" && planIncluye(ctx.tenant.plan, m.feature)) ? await conteoNoLeidos(ctx) : 0;

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina
        titulo={`Hola, ${ctx.user.nombres}`}
        descripcion={
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            Plan {NOMBRE_PLAN[ctx.tenant.plan]}
          </span>
        }
      />
      <ul className="-mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mosaicos.map((m) => {
          const Icono = ICONOS_NAV[m.icono];
          const incluido = planIncluye(ctx.tenant.plan, m.feature);
          const contenido = (
            <>
              <span className="flex items-start justify-between gap-2">
                <span className={`flex size-10 items-center justify-center rounded-lg ${incluido ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <Icono className="size-5" strokeWidth={2} aria-hidden />
                </span>
                {!incluido && <PlanLock planMinimo={planMinimo(m.feature)} />}
                {incluido && m.contador === "mensajes" && mensajesSinLeer > 0 && (
                  <Badge className="h-6 gap-1 bg-cochinilla px-2 text-white" data-testid="contador-mensajes">
                    <MailWarning strokeWidth={2} aria-hidden />
                    <span aria-hidden>{mensajesSinLeer}</span>
                    <span className="sr-only">{mensajesSinLeer === 1 ? "1 mensaje sin leer" : `${mensajesSinLeer} mensajes sin leer`}</span>
                  </Badge>
                )}
              </span>
              <span className="font-heading text-lg font-semibold tracking-tight">{m.titulo}</span>
              <span className="text-sm text-muted-foreground">{m.descripcion}</span>
              {incluido && (
                <ChevronRight
                  className="absolute right-4 bottom-4 size-4 text-muted-foreground transition-transform group-hover/mosaico:translate-x-0.5 group-hover/mosaico:text-primary"
                  strokeWidth={2}
                  aria-hidden
                />
              )}
            </>
          );
          const clase = "group/mosaico relative flex h-full flex-col gap-2 rounded-xl border bg-card p-5 pr-10 shadow-xs";
          return (
            <li key={m.titulo}>
              {incluido ? (
                <Link
                  href={m.href}
                  className={`${clase} transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none`}
                >
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
      {ctx.rol === "direccion" && <ResumenDireccion ctx={ctx} />}
      <p className="text-sm">
        <Link href="/perfil" className="font-semibold text-primary underline-offset-4 hover:underline">
          Mi perfil y privacidad
        </Link>
      </p>
    </div>
  );
}
