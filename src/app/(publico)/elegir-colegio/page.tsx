import { ChevronRight, School } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TarjetaPublica } from "../_componentes/TarjetaPublica";
import { colegiosDelUsuario } from "@/lib/server/auth";
import { usuarioActual } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Elige el colegio" };

export default async function ElegirColegioPage() {
  const user = await usuarioActual();
  if (!user) redirect("/login");
  const colegios = await colegiosDelUsuario(user.id);
  if (colegios.length === 1) redirect(`/entrando?colegio=${colegios[0].slug}`);

  return (
    <TarjetaPublica className="p-6 sm:p-8">
      <h1 className="mb-1 font-heading text-titulo-2">Hola, {user.nombres}</h1>
      <p className="mb-6 text-cuerpo-sm text-muted-foreground">Tienes hijos en más de un colegio. ¿A cuál quieres entrar?</p>
      <ul className="flex flex-col gap-3">
        {colegios.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/entrando?colegio=${c.slug}`}
              className="flex min-h-14 items-center gap-3 rounded-[10px] border border-borde-sutil bg-card p-4 transition-colors duration-150 hover:border-primary/40 hover:bg-superficie-2/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <School className="size-5 shrink-0 text-sec-trazo" strokeWidth={2} aria-hidden />
              <span className="flex-1">
                <span className="block font-semibold">{c.nombre}</span>
                {c.ciudad && <span className="text-cuerpo-sm text-muted-foreground">{c.ciudad}</span>}
              </span>
              <ChevronRight className="size-5 text-muted-foreground" strokeWidth={2} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </TarjetaPublica>
  );
}
