import { cookies } from "next/headers";
import Link from "next/link";
import { Logo } from "@/components/marca/Logo";
import { BarraLateral } from "@/components/shell/BarraLateral";
import { BarraSuperior } from "@/components/shell/BarraSuperior";
import { MenuUsuario } from "@/components/shell/MenuUsuario";
import type { GrupoNavResuelto } from "@/components/shell/tipos";
import { MarcoPanel } from "@/components/shell/MarcoPanel";
import { ShieldAlert } from "lucide-react";
import { urlPlataforma } from "@/lib/dominio";
import { mosaicosParaRol, NOMBRE_GRUPO, type GrupoNav } from "@/lib/navegacion";
import { nombreRol } from "@/lib/roles";
import { urlLogoColegio } from "@/lib/server/logo";
import { conteoNoLeidos } from "@/lib/server/mensajes";
import { estadoModulo } from "@/lib/server/plan";
import { requireTenantContext, soporteVigenteHasta } from "@/lib/server/tenant";
import { formatoHora } from "@/lib/fechas";
import { AnunciosPlataforma } from "@/components/AnunciosPlataforma";
import { anunciosVigentes } from "@/lib/server/plataforma-anuncios";
import { respuestasNuevasSoporte } from "@/lib/server/soporte";
import { contarNotificacionesSinLeer } from "@/lib/server/notificaciones/bandeja";
import { cambiarRolAction, salirAction } from "./actions";

const ORDEN_GRUPOS: GrupoNav[] = ["dia", "comunicacion", "academico", "colegio"];

export default async function LayoutColegio({ children, params }: LayoutProps<"/colegio/[slug]">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  // Módulos quitados al colegio o al rol (specs/19) y, en modo soporte (specs/16), chats, notas y libreta: no se muestran.
  const mosaicos = mosaicosParaRol(ctx.rol)
    .map((m) => ({ ...m, acceso: estadoModulo(ctx, m.feature) }))
    .filter((m) => m.acceso.estado !== "oculto");
  const tieneMensajes = mosaicos.some((m) => m.contador === "mensajes" && m.acceso.estado === "activo");
  const [logoUrl, sinLeer, estadoBarra, soporteHasta] = await Promise.all([
    urlLogoColegio(ctx.tenant),
    tieneMensajes ? conteoNoLeidos(ctx) : Promise.resolve(0),
    cookies().then((c) => c.get("sidebar_state")?.value),
    // Transparencia (specs/16): la dirección ve un aviso arriba si el equipo Khipu está dentro en modo soporte.
    ctx.rol === "direccion" && !ctx.soporte ? soporteVigenteHasta(ctx.tenant.id) : Promise.resolve(null),
  ]);
  // Mesa de ayuda (specs/23): respuestas nuevas del equipo Khipu como contador de «Soporte Khipu» en el menú.
  const tieneSoporte = mosaicos.some((m) => m.feature === "soporte" && m.acceso.estado === "activo");
  const tieneBandeja = mosaicos.some((m) => m.contador === "notificaciones" && m.acceso.estado === "activo");
  const [anuncios, respuestasSoporte, notificacionesSinLeer] = await Promise.all([
    anunciosVigentes(ctx),
    tieneSoporte ? respuestasNuevasSoporte(ctx) : Promise.resolve(0),
    tieneBandeja ? contarNotificacionesSinLeer(ctx) : Promise.resolve(0),
  ]);

  const grupos: GrupoNavResuelto[] = [
    { items: [{ href: "/inicio", titulo: "Inicio", icono: "House" }] },
    ...ORDEN_GRUPOS.map((g) => ({
      titulo: NOMBRE_GRUPO[g],
      seccion: g,
      items: mosaicos
        .filter((m) => m.grupo === g)
        .map((m) => ({
          href: m.href,
          titulo: m.titulo,
          icono: m.icono,
          bloqueadoPlan: m.acceso.estado === "bloqueado" ? m.acceso.planMinimo : undefined,
          contador: m.contador === "mensajes" ? sinLeer
            : m.contador === "notificaciones" ? (notificacionesSinLeer > 0 ? notificacionesSinLeer : undefined)
            : m.feature === "soporte" && respuestasSoporte > 0 ? respuestasSoporte : undefined,
        })),
    })).filter((g) => g.items.length > 0),
  ];

  const nombre = `${ctx.user.nombres} ${ctx.user.apellidos}`.trim();
  const iniciales = `${ctx.user.nombres[0] ?? ""}${ctx.user.apellidos[0] ?? ""}`.toUpperCase();

  return (
    <MarcoPanel
      abierta={estadoBarra !== "false"}
      secciones={grupos.flatMap((g) => (g.seccion ? g.items.map((i): [string, GrupoNav] => [i.href, g.seccion!]) : []))}
      barraMovil={<BarraSuperior inicioHref="/inicio" />}
      barraLateral={
        <BarraLateral
          grupos={grupos}
          cabecera={
          <Link href="/inicio" className="flex items-center gap-3 rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring" aria-label={`${ctx.tenant.nombre}: ir al inicio`}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={`Logo de ${ctx.tenant.nombre}`} className="size-9 shrink-0 rounded-lg border bg-white object-contain p-0.5" />
            ) : (
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-superficie-2"><Logo variante="isotipo" alto={24} /></span>
            )}
            <span className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-heading text-cuerpo-sm font-semibold text-foreground">{ctx.tenant.nombre}</span>
              <span className="truncate text-xs text-muted-foreground">{ctx.tenant.eslogan ?? "Khipu Escolar"}</span>
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
      }
      avisoSuperior={
        <>
        {ctx.soporte && (
          <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-maiz px-4 py-2 text-cuerpo-sm font-semibold text-sobre-maiz" data-testid="banner-soporte">
            <ShieldAlert className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            <span>
              Modo soporte · solo lectura · vence a las{" "}
              {ctx.soporte.expiraAt.toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false })}
            </span>
            <form method="post" action={urlPlataforma("/soporte/terminar")}>
              <input type="hidden" name="accesoId" value={ctx.soporte.accesoId} />
              <button type="submit" className="min-h-8 rounded-md px-2 underline underline-offset-4 hover:bg-black/5 ">
                Terminar
              </button>
            </form>
          </div>
        )}
        {soporteHasta && (
          <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-maiz px-4 py-2 text-cuerpo-sm font-semibold text-sobre-maiz" data-testid="aviso-soporte-activo">
            <ShieldAlert className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            <span>El equipo de Khipu está dentro del colegio en modo soporte (solo lectura) hasta las {formatoHora(soporteHasta)}.</span>
            <Link href="/configuracion/auditoria" className="min-h-8 rounded-md px-2 underline underline-offset-4 hover:bg-black/5">Ver auditoría</Link>
          </div>
        )}
        <AnunciosPlataforma anuncios={anuncios} />
        </>
      }
    >
      {children}
    </MarcoPanel>
  );
}
