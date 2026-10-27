import * as Iconos from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PlanLock } from "@/components/PlanLock";
import { mosaicosParaRol } from "@/lib/navegacion";
import { NOMBRE_PLAN, planIncluye, planMinimo } from "@/lib/planes";
import { requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Inicio" };

export default async function InicioPage({ params }: PageProps<"/colegio/[slug]/inicio">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  const mosaicos = mosaicosParaRol(ctx.rol);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Hola, {ctx.user.nombres}</h1>
        <p className="text-sm text-pizarra">Plan {NOMBRE_PLAN[ctx.tenant.plan]}</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mosaicos.map((m) => {
          const Icono = Iconos[m.icono];
          const incluido = planIncluye(ctx.tenant.plan, m.feature);
          const contenido = (
            <>
              <span className="flex items-start justify-between gap-2">
                <Icono className={`h-7 w-7 ${incluido ? "text-acento" : "text-pizarra"}`} strokeWidth={2} aria-hidden />
                {!incluido && <PlanLock planMinimo={planMinimo(m.feature)} />}
              </span>
              <span className="font-titulo text-lg font-semibold">{m.titulo}</span>
              <span className="text-sm text-pizarra">{m.descripcion}</span>
            </>
          );
          const clase = "flex h-full flex-col gap-2 rounded-lg border border-arena bg-superficie p-5";
          return (
            <li key={m.titulo}>
              {incluido ? (
                <Link href={m.href} className={`${clase} transition hover:border-acento hover:shadow-sm`}>
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
    </div>
  );
}
