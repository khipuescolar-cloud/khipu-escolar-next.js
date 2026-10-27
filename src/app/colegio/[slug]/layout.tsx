import { cookies } from "next/headers";
import Link from "next/link";
import { Logo } from "@/components/marca/Logo";
import { NuditoWidget } from "@/components/nudito/NuditoWidget";
import { BarraLateral } from "@/components/shell/BarraLateral";
import { BarraSuperior } from "@/components/shell/BarraSuperior";
import { MenuUsuario } from "@/components/shell/MenuUsuario";
import type { GrupoNavResuelto } from "@/components/shell/tipos";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ShieldAlert } from "lucide-react";
import { urlPlataforma } from "@/lib/dominio";
import { mosaicosParaRol, NOMBRE_GRUPO, type GrupoNav } from "@/lib/navegacion";
import { NOMBRE_PLAN, planIncluye, planMinimo } from "@/lib/planes";
import { nombreRol } from "@/lib/roles";
import { urlLogoColegio } from "@/lib/server/logo";
import { conteoNoLeidos } from "@/lib/server/mensajes";
import { FEATURES_PRIVADAS_SOPORTE } from "@/lib/server/plan";
import { requireTenantContext, soporteVigenteHasta } from "@/lib/server/tenant";
import { formatoHora } from "@/lib/fechas";
import { cambiarRolAction, salirAction } from "./actions";

const ORDEN_GRUPOS: GrupoNav[] = ["dia", "comunicacion", "academico", "colegio"];

export default async function LayoutColegio({ children, params }: LayoutProps<"/colegio/[slug]">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  const plan = ctx.tenant.plan;
  // Modo soporte (specs/16): sin chats, notas, libreta ni Nudito en la navegación.
  const mosaicos = mosaicosParaRol(ctx.rol).filter((m) => !(ctx.soporte && FEATURES_PRIVADAS_SOPORTE.has(m.feature)));
  const tieneMensajes = mosaicos.some((m) => m.contador === "mensajes" && planIncluye(plan, m.feature));
  const [logoUrl, sinLeer, estadoBarra, soporteHasta] = await Promise.all([
    urlLogoColegio(ctx.tenant),
    tieneMensajes ? conteoNoLeidos(ctx) : Promise.resolve(0),
    cookies().then((c) => c.get("sidebar_state")?.value),
    // Transparencia (specs/16): la dirección ve en la campana si el equipo Khipu está dentro en modo soporte.
    ctx.rol === "direccion" && !ctx.soporte ? soporteVigenteHasta(ctx.tenant.id) : Promise.resolve(null),
  ]);
  const notificaciones = [
    ...(tieneMensajes ? [{ titulo: "Mensajes sin leer", href: "/mensajes", cantidad: sinLeer }] : []),
    ...(soporteHasta ? [{ titulo: `Soporte de Khipu activo hasta ${formatoHora(soporteHasta)}`, href: "/configuracion/auditoria", cantidad: 1 }] : []),
  ];

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
        {ctx.soporte && (
          <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-maiz px-4 py-2 text-sm font-semibold text-indigo" data-testid="banner-soporte">
            <ShieldAlert className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            <span>
              Modo soporte · solo lectura · vence a las{" "}
              {ctx.soporte.expiraAt.toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false })}
            </span>
            <form method="post" action={urlPlataforma("/soporte/terminar")}>
              <input type="hidden" name="accesoId" value={ctx.soporte.accesoId} />
              <button type="submit" className="min-h-8 rounded-md px-2 underline underline-offset-4 hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-indigo focus-visible:outline-none">
                Terminar
              </button>
            </form>
          </div>
        )}
        <BarraSuperior grupos={grupos} notificaciones={notificaciones} />
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</div>
      </SidebarInset>
      {ctx.rol === "apoderado" && planIncluye(plan, "nudito") && <NuditoWidget slug={slug} />}
    </SidebarProvider>
  );
}
