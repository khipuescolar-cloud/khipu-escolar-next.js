import { CheckCircle2, ChevronRight, Play, RefreshCw, ShieldCheck, ShieldQuestion, Sprout, Users } from "lucide-react";
import { ListaDividida } from "@/components/ui/Superficies";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import { Flash } from "@/components/ui/Flash";
import { AVISO_FORMATIVO } from "@/lib/nudito-seguimiento";
import { configNudito } from "@/lib/server/nudito/config-colegio";
import { hijosParaNudito } from "@/lib/server/nudito-plus/familia";
import { requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Nudito" };

/** Nudito para la familia (specs/44): progreso de práctica de cada hijo, autorización y modo hijo. Sin conversaciones. */
export default async function NuditoFamiliaPage({ params, searchParams }: PageProps<"/colegio/[slug]/nudito-plus">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["apoderado"]);
  const [hijos, estado] = await Promise.all([hijosParaNudito(ctx), configNudito(ctx)]);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Nudito"
        seccion="academico"
        descripcion={`El tutor de práctica de tu colegio: ayuda a tu hijo a repasar y practicar los temas de sus cursos. ${AVISO_FORMATIVO}`}
      />
      <Flash ok={sp.ok} error={sp.error} />
      {!estado.activo && <p className="text-cuerpo-sm text-muted-foreground">Tu colegio aún no activó Nudito. Puedes dejar tu autorización lista desde ahora.</p>}

      {hijos.length === 0 ? (
        <EstadoVacio icono={Users} titulo="Aún no tienes hijos vinculados en este colegio." descripcion="Pide al colegio que te vincule con tu hijo." />
      ) : (
        <ListaDividida>
          {hijos.map((h) => (
            <li key={h.id}>
              <div className="flex flex-col gap-4 p-5 sm:p-6">
                <div>
                  <h2 className="inline-flex items-center gap-2.5 font-heading text-[18px] leading-6 font-semibold"><span aria-hidden className="size-2.5 rounded-full bg-sec-nudo" />{h.nombres} {h.apellidos}</h2>
                  <p className="mt-1 text-cuerpo-sm text-muted-foreground">{h.salon}</p>
                </div>
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-cuerpo-sm">
                  <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-4 text-llego" strokeWidth={2} aria-hidden /> {h.dominados} dominados</span>
                  <span className="inline-flex items-center gap-1"><Sprout className="size-4 text-primary" strokeWidth={2} aria-hidden /> {h.practicando} practicando</span>
                  <span className="inline-flex items-center gap-1"><RefreshCw className="size-4 text-cochinilla" strokeWidth={2} aria-hidden /> {h.reforzar} para reforzar</span>
                </p>
                {h.consentimiento.vigente ? (
                  <span className="inline-flex items-center gap-1.5 text-cuerpo-sm text-muted-foreground"><ShieldCheck className="size-4 text-llego" strokeWidth={2} aria-hidden /> Autorización dada</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-cuerpo-sm text-muted-foreground"><ShieldQuestion className="size-4" strokeWidth={2} aria-hidden /> Falta tu autorización</span>
                )}
                <div className="flex flex-wrap gap-2">
                  <Link href={`/nudito-plus/${h.id}`} className={buttonVariants({ variant: "outline" })}>
                    Ver progreso <ChevronRight strokeWidth={2} aria-hidden />
                  </Link>
                  {!h.consentimiento.vigente && h.activo && (
                    <Link href={`/nudito-plus/${h.id}/consentimiento`} className={buttonVariants()}>Leer y autorizar</Link>
                  )}
                  {estado.activo && estado.config.permitirModoHijo && h.consentimiento.vigente && !h.cuentaPropia && h.activo && (
                    <Link href={`/nudito?alumno=${h.id}`} className={buttonVariants()}>
                      <Play strokeWidth={2} aria-hidden /> Usar en modo hijo
                    </Link>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ListaDividida>
      )}

      <p className="max-w-prose text-cuerpo-sm text-muted-foreground">
        Tú y sus profesores ven el progreso de práctica, nunca sus conversaciones con Nudito.
      </p>
    </div>
  );
}
