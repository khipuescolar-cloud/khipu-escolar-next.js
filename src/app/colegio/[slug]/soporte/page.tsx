import { LifeBuoy, MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { InsigniaEstadoTicket, InsigniaPrioridad } from "@/components/soporte/EstadoTicket";
import { Alerta } from "@/components/ui/Alerta";
import { Badge } from "@/components/ui/badge";
import { horarioSoporte, listarTicketsColegio, exigirSoporte, ROLES_SOPORTE } from "@/lib/server/soporte";
import { requireTenantContext } from "@/lib/server/tenant";
import { AVISO_DATOS_PERSONALES, NOMBRE_CATEGORIA } from "@/lib/soporte";
import { cn } from "@/lib/utils";
import { NuevaConversacion } from "./NuevaConversacion";

export const metadata: Metadata = { title: "Soporte Khipu" };

const fecha = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" });

export default async function SoportePage({ params }: PageProps<"/colegio/[slug]/soporte">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, [...ROLES_SOPORTE]);
  exigirSoporte(ctx);
  const [tickets, horario] = await Promise.all([listarTicketsColegio(ctx), horarioSoporte()]);

  return (
    <div className="flex flex-col gap-4">
      <EncabezadoPagina
        titulo="Soporte Khipu"
        descripcion="Escríbele directamente al equipo de Khipu Escolar: dudas, problemas o sugerencias."
        acciones={<NuevaConversacion />}
      />
      <Alerta tipo="info">
        Te respondemos {horario.charAt(0).toLowerCase() + horario.slice(1)}. {AVISO_DATOS_PERSONALES}
      </Alerta>

      {tickets.length === 0 ? (
        <EstadoVacio
          icono={LifeBuoy}
          titulo="Aún no tienes conversaciones"
          descripcion="Cuando necesites ayuda, usa «Nueva conversación» y el equipo de Khipu te responderá aquí."
        />
      ) : (
        <ul className="flex flex-col divide-y overflow-hidden rounded-lg border bg-card" aria-label="Conversaciones con Khipu">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/soporte/${t.id}`}
                className="flex min-h-16 flex-col gap-1.5 px-4 py-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent sm:flex-row sm:items-center sm:gap-4"
                data-testid="fila-ticket"
              >
                <MessagesSquare className="hidden size-5 shrink-0 text-muted-foreground sm:block" strokeWidth={2} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm", t.noLeidos > 0 ? "font-bold" : "font-semibold")}>{t.asunto}</span>
                  <span className="block truncate text-cuerpo-sm text-muted-foreground">
                    {t.ultimo ? `${t.ultimo.autor === "khipu" ? "Khipu: " : ""}${t.ultimo.cuerpo}` : "Sin mensajes"}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-cuerpo-sm text-muted-foreground">
                    <InsigniaPrioridad prioridad={t.prioridad} />
                    <span>{NOMBRE_CATEGORIA[t.categoria]}</span>
                    {ctx.rol === "direccion" && <span>Abrió: {t.creadoPor}</span>}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <InsigniaEstadoTicket estado={t.estado} lado="colegio" />
                  <span className="text-cuerpo-sm text-muted-foreground">{fecha.format(t.ultimoMensajeAt)}</span>
                  {t.noLeidos > 0 && <Badge className="h-6 px-2.5 text-xs">{t.noLeidos === 1 ? "1 respuesta nueva" : `${t.noLeidos} respuestas nuevas`}</Badge>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
