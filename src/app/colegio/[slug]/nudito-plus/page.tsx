import { ChevronRight, ShieldCheck, ShieldQuestion, Sparkles, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import { Flash } from "@/components/ui/Flash";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { formatoMonto } from "@/lib/nudito-plus";
import { hijosConNudito } from "@/lib/server/nudito-plus/familia";
import { precioNudito } from "@/lib/server/nudito-plus/licencias";
import { requireTenantContext } from "@/lib/server/tenant";
import { EstadoLicencia } from "./EstadoLicencia";

export const metadata: Metadata = { title: "Nudito+" };

/** Nudito+ para la familia (specs/28): estado de la licencia de cada hijo. */
export default async function NuditoPlusPage({ params, searchParams }: PageProps<"/colegio/[slug]/nudito-plus">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["apoderado"]);
  const [hijos, precio] = await Promise.all([hijosConNudito(ctx), precioNudito()]);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Nudito+"
        descripcion={`Un tutor con inteligencia artificial que ayuda a tu hijo a repasar lo que aprende. Se activa por alumno: ${formatoMonto(precio.montoMensual, precio.moneda)} al mes, pagado por adelantado con Yape.`}
      />
      <Flash ok={sp.ok} error={sp.error} />

      {hijos.length === 0 ? (
        <EstadoVacio icono={Users} titulo="Aún no tienes hijos vinculados en este colegio." descripcion="Pide al colegio que te vincule con tu hijo para activar Nudito+." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {hijos.map((h) => (
            <li key={h.id}>
              <Tarjeta className="flex h-full flex-col gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-superficie-2 text-cochinilla">
                    <Sparkles className="size-6" strokeWidth={2} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-heading text-lg font-semibold">{h.nombres} {h.apellidos}</h2>
                    <p className="text-cuerpo-sm text-muted-foreground">{h.salon}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <EstadoLicencia estado={h.estado} />
                  {h.consentimiento.vigente ? (
                    <span className="inline-flex items-center gap-1.5 text-cuerpo-sm text-muted-foreground">
                      <ShieldCheck className="size-4 text-llego" strokeWidth={2} aria-hidden /> Autorización dada
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-cuerpo-sm text-muted-foreground">
                      <ShieldQuestion className="size-4" strokeWidth={2} aria-hidden /> Falta tu autorización
                    </span>
                  )}
                </div>
                {h.estado.tipo === "activa" && h.estado.pagoEnRevision && (
                  <p className="text-cuerpo-sm text-muted-foreground">Tienes un pago en revisión: al confirmarlo, sumaremos los meses.</p>
                )}
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link href={`/nudito-plus/${h.id}`} className={buttonVariants({ variant: "outline" })}>
                    Ver reportes <ChevronRight strokeWidth={2} aria-hidden />
                  </Link>
                  {h.activo && h.estado.tipo !== "revision" && (
                    <Link href={`/nudito-plus/${h.id}/activar`} className={buttonVariants()}>
                      {h.estado.tipo === "activa" ? "Renovar" : "Activar Nudito+"}
                    </Link>
                  )}
                </div>
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}

      <p className="max-w-prose text-cuerpo-sm text-muted-foreground">
        Tú ves reportes, alertas y resúmenes del avance de tu hijo, nunca sus conversaciones. El colegio tampoco las ve.
      </p>
    </div>
  );
}
