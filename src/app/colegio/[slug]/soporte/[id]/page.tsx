import { Archive, ArrowLeft, CircleCheck, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { Notificar } from "@/components/shell/Notificar";
import { HiloSoporte } from "@/components/soporte/HiloSoporte";
import { buttonVariants } from "@/components/ui/button";
import { exigirSoporte, obtenerTicketColegio, ROLES_SOPORTE } from "@/lib/server/soporte";
import { requireTenantContext } from "@/lib/server/tenant";
import { AVISO_DATOS_PERSONALES } from "@/lib/soporte";
import { cerrarTicketAction, reabrirTicketAction, refrescarTicketAction, resolverTicketAction, responderTicketAction, valorarTicketAction } from "../actions";
import { Valoracion } from "./Valoracion";

export const metadata: Metadata = { title: "Conversación con Khipu" };

export default async function TicketPage({ params, searchParams }: PageProps<"/colegio/[slug]/soporte/[id]">) {
  const { slug, id } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, [...ROLES_SOPORTE]);
  exigirSoporte(ctx);
  const vista = await obtenerTicketColegio(ctx, id);
  const campos = { id: vista.id };
  const okMsg = typeof sp.ok === "string" ? sp.ok : undefined;

  const acciones = (
    <>
      {(vista.estado === "abierto" || vista.estado === "en_progreso" || vista.estado === "esperando_colegio") && (
        <BotonConfirmar
          tamano="sm"
          etiqueta={<><CircleCheck strokeWidth={2} aria-hidden /> Marcar como resuelto</>}
          titulo="¿Marcar como resuelta?"
          descripcion="Si vuelves a escribir, la conversación se reabre. Se cierra sola tras 7 días sin actividad."
          confirmar="Marcar como resuelta"
          accion={resolverTicketAction}
          campos={campos}
        />
      )}
      {vista.estado === "resuelto" && (
        <BotonConfirmar
          tamano="sm"
          etiqueta={<><RotateCcw strokeWidth={2} aria-hidden /> Reabrir</>}
          titulo="¿Reabrir la conversación?"
          descripcion="El equipo de Khipu la verá de nuevo como pendiente."
          confirmar="Reabrir"
          accion={reabrirTicketAction}
          campos={campos}
        />
      )}
      {vista.estado !== "cerrado" && (
        <BotonConfirmar
          tamano="sm"
          variante="ghost"
          etiqueta={<><Archive strokeWidth={2} aria-hidden /> Cerrar</>}
          titulo="¿Cerrar la conversación?"
          descripcion="Ya no podrás escribir en ella. Si necesitas ayuda otra vez, abre una nueva."
          confirmar="Cerrar conversación"
          accion={cerrarTicketAction}
          campos={campos}
        />
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      <Notificar ok={okMsg} />
      <Link href="/soporte" className={buttonVariants({ variant: "ghost", size: "sm", className: "self-start" })}>
        <ArrowLeft strokeWidth={2} aria-hidden /> Soporte Khipu
      </Link>
      <HiloSoporte
        lado="colegio"
        inicial={vista}
        refrescar={refrescarTicketAction}
        enviar={responderTicketAction}
        puedeEscribir={vista.estado !== "cerrado"}
        motivoCerrado="Esta conversación está cerrada. Si necesitas ayuda, abre una nueva."
        permiteAdjunto
        rutaAdjunto="/archivos/"
        acciones={acciones}
      />
      <p className="text-cuerpo-sm text-muted-foreground">{AVISO_DATOS_PERSONALES}</p>
      {(vista.estado === "resuelto" || vista.estado === "cerrado") && (
        <Valoracion id={vista.id} inicial={vista.valoracion} comentarioInicial={vista.comentarioValoracion} accion={valorarTicketAction} />
      )}
    </div>
  );
}
