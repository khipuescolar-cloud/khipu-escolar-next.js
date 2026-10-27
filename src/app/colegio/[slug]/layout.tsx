import { cookies } from "next/headers";
import Link from "next/link";
import { Logo } from "@/components/marca/Logo";
import { NuditoWidget } from "@/components/nudito/NuditoWidget";
import { BarraLateral } from "@/components/shell/BarraLateral";
import { BarraSuperior } from "@/components/shell/BarraSuperior";
import { MenuUsuario } from "@/components/shell/MenuUsuario";
import type { GrupoNavResuelto } from "@/components/shell/tipos";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { mosaicosParaRol, NOMBRE_GRUPO, type GrupoNav } from "@/lib/navegacion";
import { NOMBRE_PLAN, planIncluye, planMinimo } from "@/lib/planes";
import { nombreRol } from "@/lib/roles";
import { urlLogoColegio } from "@/lib/server/logo";
import { conteoNoLeidos } from "@/lib/server/mensajes";
import { requireTenantContext } from "@/lib/server/tenant";
import { cambiarRolAction, salirAction } from "./actions";

const ORDEN_GRUPOS: GrupoNav[] = ["dia", "comunicacion", "academico", "colegio"];

export default async function LayoutColegio({ children, params }: LayoutProps<"/colegio/[slug]">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  const plan = ctx.tenant.plan;
  const mosaicos = mosaicosParaRol(ctx.rol);
  const tieneMensajes = mosaicos.some((m) => m.contador === "mensajes" && planIncluye(plan, m.feature));
  const [logoUrl, sinLeer, estadoBarra] = await Promise.all([
    urlLogoColegio(ctx.tenant),
    tieneMensajes ? conteoNoLeidos(ctx) : Promise.resolve(0),
    cookies().then((c) => c.get("sidebar_state")?.value),
  ]);

  const grupos: GrupoNavResuelto[] = [
    { items: [{ href: "/inicio", titulo: "Inicio", icono: "House" }] },
    ...ORDEN_GRUPOS.map((g) => ({
      titulo: NOMBRE_GRUPO[g],
      items: mosaicos
        .filter((m) => m.grupo === g)
        .map((m) => ({
          href: m.href,
          titulo: m.titulo,
          icono: m.icono,
          bloqueadoPlan: planIncluye(plan, m.feature) ? undefined : NOMBRE_PLAN[planMinimo(m.feature)],
          contador: m.contador === "mensajes" ? sinLeer : undefined,
        })),
    })).filter((g) => g.items.length > 0),
  ];

  const nombre = `${ctx.user.nombres} ${ctx.user.apellidos}`.trim();
  const iniciales = `${ctx.user.nombres[0] ?? ""}${ctx.user.apellidos[0] ?? ""}`.toUpperCase();

  return (
    <SidebarProvider defaultOpen={estadoBarra !== "false"}>
      <BarraLateral
        grupos={grupos}
        cabecera={
          <Link href="/inicio" className="flex items-center gap-3 rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring" aria-label={`${ctx.tenant.nombre}: ir al inicio`}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={`Logo de ${ctx.tenant.nombre}`} className="size-9 shrink-0 rounded-lg bg-white object-contain p-0.5" />
            ) : (
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10"><Logo compacto /></span>
            )}
            <span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-heading text-sm font-semibold text-white">{ctx.tenant.nombre}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">{ctx.tenant.eslogan ?? "Khipu Escolar"}</span>
            </span>
          </Link>
        }
        pie={
          <MenuUsuario
            usuario={{ nombre, correo: ctx.user.email, rolNombre: nombreRol(ctx.rol, ctx.user.genero), iniciales }}
            perfilHref="/perfil"
            salir={salirAction}
            roles={ctx.roles.map((r) => ({ valor: r, nombre: nombreRol(r, ctx.user.genero) }))}
            rolActual={ctx.rol}
            cambiarRol={cambiarRolAction}
          />
        }
      />
      <SidebarInset>
        <BarraSuperior grupos={grupos} notificaciones={tieneMensajes ? [{ titulo: "Mensajes sin leer", href: "/mensajes", cantidad: sinLeer }] : []} />
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </SidebarInset>
      {ctx.rol === "apoderado" && planIncluye(plan, "nudito") && <NuditoWidget slug={slug} />}
    </SidebarProvider>
  );
}
