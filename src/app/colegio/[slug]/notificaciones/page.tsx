import { Bell, BellRing, CheckCheck } from "lucide-react";
import { ListaDividida } from "@/components/ui/Superficies";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Boton } from "@/components/ui/Boton";
import { fechaLima, formatoHora } from "@/lib/fechas";
import { listarNotificaciones, ROLES_BANDEJA } from "@/lib/server/notificaciones/bandeja";
import { requireTenantContext } from "@/lib/server/tenant";
import { cn } from "@/lib/utils";
import { marcarTodasLeidasAction } from "./actions";

export const metadata: Metadata = { title: "Notificaciones" };

/**
 * Bandeja interna (specs/38): notas publicadas, tareas, evaluaciones programadas, mensajes, comunicados y, para el
 * profesor, justificaciones e incidencias de sus clases. Siempre está aquí, llegue o no el push al celular. Al abrir una
 * se marca leída y lleva a lo que avisa.
 */
export default async function NotificacionesPage({ params, searchParams }: PageProps<"/colegio/[slug]/notificaciones">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ROLES_BANDEJA);
  const datos = await listarNotificaciones(ctx, { pagina: Array.isArray(sp.pagina) ? sp.pagina[0] : sp.pagina });
  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        titulo="Notificaciones"
        seccion="comunicacion"
        descripcion={ctx.rol === "alumno" ? "Tareas, evaluaciones y comunicados del colegio." : ctx.rol === "apoderado" ? "Notas, tareas, evaluaciones, mensajes y comunicados del colegio." : "Mensajes de las familias y avisos del colegio sobre tus clases."}
        acciones={
          datos.sinLeer > 0 ? (
            <form action={marcarTodasLeidasAction.bind(null, slug)}>
              <Boton type="submit" variante="secundario"><CheckCheck className="size-4" strokeWidth={2} aria-hidden />Marcar todas como leídas</Boton>
            </form>
          ) : undefined
        }
      />
      {datos.filas.length === 0 ? (
        <EstadoVacio icono={Bell} titulo="No tienes notificaciones" descripcion="Cuando haya algo nuevo para ti en Khipu, aparecerá aquí." />
      ) : (
        <ListaDividida className="bg-card">
          {datos.filas.map((n) => (
            <li key={n.id}>
              {/* Enlace normal (no <Link>): la ruta marca leída y redirige. */}
              <a href={`/notificaciones/${n.id}/abrir`} className={cn("flex min-h-16 items-start gap-3 px-4 py-3.5 outline-none transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset", !n.leidaAt && "bg-sec-suave/50")}>
                {n.leidaAt
                  ? <Bell className="mt-0.5 size-5 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
                  : <BellRing className="mt-0.5 size-5 shrink-0 text-sec-trazo" strokeWidth={2} aria-hidden />}
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className={cn("flex flex-wrap items-center gap-2", n.leidaAt ? "font-medium" : "font-semibold")}>
                    {n.titulo}
                    {!n.leidaAt && <span className="inline-flex items-center gap-1 text-etiqueta font-semibold text-sec-tinta"><span aria-hidden className="size-1.5 rounded-full bg-sec-nudo" />Nueva</span>}
                  </span>
                  <span className="text-sm">{n.cuerpo}</span>
                  <span className="text-cuerpo-sm text-muted-foreground tabular-nums">{fechaLima(n.createdAt)} · {formatoHora(n.createdAt)}</span>
                </span>
              </a>
            </li>
          ))}
        </ListaDividida>
      )}
      {datos.paginas > 1 && (
        <nav aria-label="Páginas" className="flex items-center gap-3 text-sm">
          {datos.pagina > 1 && <Link className="enlace" href={`/notificaciones?pagina=${datos.pagina - 1}`}>Anteriores</Link>}
          <span className="text-muted-foreground">Página {datos.pagina} de {datos.paginas}</span>
          {datos.pagina < datos.paginas && <Link className="enlace" href={`/notificaciones?pagina=${datos.pagina + 1}`}>Siguientes</Link>}
        </nav>
      )}
    </div>
  );
}
