import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { BarraLateral } from "@/components/shell/BarraLateral";
import { BarraSuperior } from "@/components/shell/BarraSuperior";
import { MenuUsuario } from "@/components/shell/MenuUsuario";
import type { GrupoNavResuelto } from "@/components/shell/tipos";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { salirPlataformaAction } from "./actions";

export const metadata: Metadata = { title: { default: "Plataforma", template: "%s · Plataforma Khipu" } };

const GRUPOS: GrupoNavResuelto[] = [
  { items: [{ href: "/", titulo: "Vista principal", icono: "House" }] },
  {
    titulo: "Colegios",
    items: [
      { href: "/colegios", titulo: "Colegios", icono: "School" },
      { href: "/colegios/nuevo", titulo: "Nuevo colegio", icono: "PlusCircle" },
    ],
  },
];

/** Panel del super administrador (specs/16): admin.<dominio> → /plataforma/… */
export default async function LayoutPlataforma({ children }: LayoutProps<"/plataforma">) {
  const { user } = await requireAdminPlataforma();
  const estadoBarra = (await cookies()).get("sidebar_state")?.value;
  const nombre = `${user.nombres} ${user.apellidos}`.trim();
  const iniciales = `${user.nombres[0] ?? ""}${user.apellidos[0] ?? ""}`.toUpperCase();

  return (
    <SidebarProvider defaultOpen={estadoBarra !== "false"}>
      <BarraLateral
        grupos={GRUPOS}
        cabecera={
          <Link href="/" className="flex items-center gap-3 rounded-md p-1" aria-label="Plataforma Khipu: vista principal">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <ShieldCheck className="size-5" strokeWidth={2} aria-hidden />
            </span>
            <span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-heading text-sm font-semibold text-white">Khipu Escolar</span>
              <span className="truncate text-xs text-sidebar-foreground/70">Plataforma · super administración</span>
            </span>
          </Link>
        }
        pie={
          <MenuUsuario usuario={{ nombre, correo: user.email, rolNombre: "Super administrador", iniciales }} salir={salirPlataformaAction} />
        }
      />
      <SidebarInset>
        <BarraSuperior grupos={GRUPOS} />
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
