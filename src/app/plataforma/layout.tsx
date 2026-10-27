import { LogOut, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/marca/Logo";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { salirPlataformaAction } from "./actions";

export const metadata: Metadata = { title: { default: "Plataforma", template: "%s · Plataforma Khipu" } };

/** Panel del super administrador (specs/16): admin.<dominio> → /plataforma/… */
export default async function LayoutPlataforma({ children }: LayoutProps<"/plataforma">) {
  const { user } = await requireAdminPlataforma();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-arena bg-superficie">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/" aria-label="Ir a la vista principal" className="flex items-center gap-3">
            <Logo />
            <span className="inline-flex items-center gap-1 rounded-pildora bg-indigo px-2.5 py-1 text-xs font-semibold text-white">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> Plataforma Khipu
            </span>
          </Link>
          <nav aria-label="Plataforma" className="flex flex-1 items-center gap-1 text-sm font-semibold">
            <Link href="/" className="rounded-md px-2 py-1.5 hover:bg-superficie-2">Inicio</Link>
            <Link href="/colegios" className="rounded-md px-2 py-1.5 hover:bg-superficie-2">Colegios</Link>
            <Link href="/colegios/nuevo" className="rounded-md px-2 py-1.5 hover:bg-superficie-2">Nuevo colegio</Link>
          </nav>
          <p className="truncate text-sm text-pizarra">{user.nombres} {user.apellidos}</p>
          <form action={salirPlataformaAction}>
            <button className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-pizarra hover:bg-superficie-2">
              <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden /> Salir
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
