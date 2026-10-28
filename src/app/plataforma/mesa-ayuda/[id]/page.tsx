import { ArrowLeft, ExternalLink, School, ShieldCheck, UserPlus, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { HiloSoporte } from "@/components/soporte/HiloSoporte";
import { buttonVariants } from "@/components/ui/button";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { obtenerTicketKhipu } from "@/lib/server/plataforma-mesa-ayuda";
import { ESTADOS_TICKET, nombreEstado, NOMBRE_PRIORIDAD, PRIORIDADES_TICKET } from "@/lib/soporte";
import { EstadoColegio } from "../../EstadoColegio";
import { asignarAction, cambiarEstadoAction, cambiarPrioridadAction, refrescarHiloKhipuAction, responderKhipuAction } from "../actions";
import { BotonAccionCampo, FormularioCampo } from "./FormularioCampo";

export const metadata: Metadata = { title: "Conversación · Mesa de ayuda" };

export default async function DetalleTicket({ params }: PageProps<"/plataforma/mesa-ayuda/[id]">) {
  const admin = await requireAdminPlataforma();
  const { id } = await params;
  const d = await obtenerTicketKhipu(admin, id);
  const v = d.vista;

  return (
    <div className="flex flex-col gap-3">
      <Link href="/mesa-ayuda" className={buttonVariants({ variant: "ghost", size: "sm", className: "self-start" })}>
        <ArrowLeft strokeWidth={2} aria-hidden /> Mesa de ayuda
      </Link>
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <HiloSoporte
          lado="khipu"
          inicial={v}
          refrescar={refrescarHiloKhipuAction}
          enviar={responderKhipuAction}
          puedeEscribir
          permiteNotas
          rutaAdjunto="/mesa-ayuda/archivos/"
        />

        <aside className="flex flex-col gap-4" aria-label="Datos de la conversación">
          <Tarjeta className="flex flex-col gap-3 p-4">
            <h2 className="sobretitulo">Gestión</h2>
            <FormularioCampo id={v.id} nombre="estado" etiqueta="Estado" valor={v.estado} accion={cambiarEstadoAction}>
              {ESTADOS_TICKET.map((e) => <option key={e} value={e}>{nombreEstado(e, "khipu")}</option>)}
            </FormularioCampo>
            <FormularioCampo id={v.id} nombre="prioridad" etiqueta="Prioridad" valor={v.prioridad} accion={cambiarPrioridadAction}>
              {PRIORIDADES_TICKET.map((p) => <option key={p} value={p}>{NOMBRE_PRIORIDAD[p]}</option>)}
            </FormularioCampo>
            <FormularioCampo id={v.id} nombre="asignado" etiqueta="Asignada a" valor={d.asignadoAId ?? ""} accion={asignarAction}>
              <option value="">Sin asignar</option>
              {d.equipo.map((e) => <option key={e.userId} value={e.userId}>{e.nombre}</option>)}
            </FormularioCampo>
            {d.asignadoAId !== admin.user.id && (
              <BotonAccionCampo id={v.id} campos={{ asignado: "yo" }} accion={asignarAction}>
                <UserPlus strokeWidth={2} aria-hidden /> Asignármela
              </BotonAccionCampo>
            )}
          </Tarjeta>

          <Tarjeta className="flex flex-col gap-2 p-4" data-testid="abierta-por">
            <h2 className="sobretitulo">Abierta por</h2>
            <p className="flex items-center gap-2 font-medium"><UserRound className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden /> {d.abiertoPor.nombre}</p>
            {d.abiertoPor.cargo && <p className="text-cuerpo-sm text-muted-foreground">{d.abiertoPor.cargo}</p>}
            {d.abiertoPor.email && <a href={`mailto:${d.abiertoPor.email}`} className="enlace break-all text-cuerpo-sm">{d.abiertoPor.email}</a>}
          </Tarjeta>

          <Tarjeta className="flex flex-col gap-3 p-4">
            <h2 className="sobretitulo">Colegio</h2>
            <p className="flex items-center gap-2 font-medium"><School className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden /> {d.colegio.nombre}</p>
            <div className="flex flex-wrap items-center gap-2 text-cuerpo-sm">
              <span className="rounded-pildora border px-2 py-0.5 text-etiqueta">{d.colegio.plan}</span>
              <EstadoColegio estado={d.colegio.estado as "activo"} />
            </div>
            {d.responsables.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-cuerpo-sm font-medium">Responsables</p>
                <ul className="flex flex-col gap-1.5 text-cuerpo-sm">
                  {d.responsables.map((r) => (
                    <li key={r.id}>
                      {r.nombre}{r.principal ? " · principal" : ""}
                      {r.cargo && <span className="text-muted-foreground"> · {r.cargo}</span>}
                      <br />
                      <a href={`mailto:${r.email}`} className="enlace break-all">{r.email}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Link href={`/colegios/${d.colegio.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <ExternalLink strokeWidth={2} aria-hidden /> Ver ficha
              </Link>
              <Link href={`/colegios/${d.colegio.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                <ShieldCheck strokeWidth={2} aria-hidden /> Entrar como soporte
              </Link>
            </div>
            <p className="text-cuerpo-sm text-muted-foreground">El acceso de soporte se pide desde la ficha (motivo y duración) y queda auditado.</p>
          </Tarjeta>
        </aside>
      </div>
    </div>
  );
}
