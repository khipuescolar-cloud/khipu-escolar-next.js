import { ChevronRight, School } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { colegiosDelUsuario } from "@/lib/server/auth";
import { usuarioActual } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Elige el colegio" };

export default async function ElegirColegioPage() {
  const user = await usuarioActual();
  if (!user) redirect("/login");
  const colegios = await colegiosDelUsuario(user.id);
  if (colegios.length === 1) redirect(`/entrando?colegio=${colegios[0].slug}`);

  return (
    <Tarjeta className="p-6 shadow-sm sm:p-8">
      <h1 className="mb-1 text-2xl font-bold">Hola, {user.nombres}</h1>
      <p className="mb-6 text-sm text-muted-foreground">Tienes hijos en más de un colegio. ¿A cuál quieres entrar?</p>
      <ul className="flex flex-col gap-3">
        {colegios.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/entrando?colegio=${c.slug}`}
              className="flex items-center gap-3 min-h-14 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary"><School className="size-5" strokeWidth={2} aria-hidden /></span>
              <span className="flex-1">
                <span className="block font-semibold">{c.nombre}</span>
                {c.ciudad && <span className="text-sm text-muted-foreground">{c.ciudad}</span>}
              </span>
              <ChevronRight className="size-5 text-muted-foreground" strokeWidth={2} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}
