import { Loader2 } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { urlColegio } from "@/lib/dominio";
import { db } from "@/lib/server/db";
import { usuarioActual } from "@/lib/server/tenant";
import { Redireccion } from "./Redireccion";

export const metadata: Metadata = { title: "Entrando…" };

/** Pantalla «Entrando a…» con la dirección del colegio antes de saltar al subdominio. */
export default async function EntrandoPage({ searchParams }: PageProps<"/entrando">) {
  const { colegio } = await searchParams;
  const user = await usuarioActual();
  if (!user || typeof colegio !== "string") redirect("/login");

  const tenant = await db.tenant.findFirst({
    where: { slug: colegio, memberships: { some: { userId: user.id, estado: "activa" } } },
    select: { slug: true, nombre: true },
  });
  if (!tenant) redirect("/elegir-colegio");

  const url = urlColegio(tenant.slug);
  return (
    <Tarjeta className="flex flex-col items-center gap-3 p-8 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-acento" aria-hidden />
      <h1 className="text-xl font-bold">Entrando a {tenant.nombre}</h1>
      <p className="font-mono text-sm text-pizarra">{url.replace(/^https?:\/\//, "").replace(/\/inicio$/, "")}</p>
      <Redireccion url={url} />
      <noscript>
        <a href={url}>Continuar</a>
      </noscript>
    </Tarjeta>
  );
}
