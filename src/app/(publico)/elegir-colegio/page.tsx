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
    <Tarjeta className="p-6 sm:p-8">
      <h1 className="mb-1 text-2xl font-bold">Hola, {user.nombres}</h1>
      <p className="mb-6 text-sm text-pizarra">Tienes hijos en más de un colegio. ¿A cuál quieres entrar?</p>
      <ul className="flex flex-col gap-3">
        {colegios.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/entrando?colegio=${c.slug}`}
              className="flex items-center gap-3 rounded-md border border-arena p-4 hover:bg-superficie-2"
            >
              <School className="h-6 w-6 text-acento" aria-hidden />
              <span className="flex-1">
                <span className="block font-semibold">{c.nombre}</span>
                {c.ciudad && <span className="text-sm text-pizarra">{c.ciudad}</span>}
              </span>
              <ChevronRight className="h-5 w-5 text-pizarra" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}
