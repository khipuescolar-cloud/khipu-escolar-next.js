import { ArrowLeft, CalendarOff, Clock, Lock, Trash2, UserX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { DialogoAccion } from "@/components/academico/DialogoAccion";
import { EditorHorarioAtencion } from "@/components/reuniones/EditorHorarioAtencion";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { formatoDia, formatoHora, momentoEnZona, sumarDias } from "@/lib/fechas";
import { esPersonal } from "@/lib/reuniones";
import { requireFeature } from "@/lib/server/plan";
import { miDisponibilidad } from "@/lib/server/reuniones";
import { requireTenantContext } from "@/lib/server/tenant";
import { bloqueoAction, horarioAtencionAction, quitarBloqueoAction } from "../actions";

export const metadata: Metadata = { title: "Mi disponibilidad" };

const rango = (inicio: Date, fin: Date) => `${formatoDia(inicio, { weekday: "short", day: "numeric", month: "short" })} ${formatoHora(inicio)} – ${formatoDia(fin, { weekday: "short", day: "numeric", month: "short" })} ${formatoHora(fin)}`;

export default async function DisponibilidadPage({ params }: PageProps<"/colegio/[slug]/reuniones/disponibilidad">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "reuniones");
  if (!esPersonal(ctx.rol)) forbidden();
  const d = await miDisponibilidad(ctx);
  const manana = sumarDias(momentoEnZona(new Date(), ctx.tenant.zonaHoraria).isoFecha, 1);
  const camposFecha = (
    <>
      <Campo etiqueta="Desde el día" name="fecha" type="date" required defaultValue={manana} />
      <Campo etiqueta="Hasta el día (opcional)" name="fechaFin" type="date" />
      <Campo etiqueta="Hora de inicio" name="horaDesde" type="time" step={900} required defaultValue={ctx.tenant.horaInicioLaboral} />
      <Campo etiqueta="Hora de fin" name="horaHasta" type="time" step={900} required defaultValue={ctx.tenant.horaFinLaboral} />
    </>
  );
  return (
    <div className="flex flex-col gap-6">
      <Link href="/reuniones" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-indigo-cielo hover:underline">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />Reuniones
      </Link>
      <EncabezadoPagina titulo="Mi disponibilidad" descripcion="Tu horario de atención a familias y los tiempos que bloqueas. Los demás solo ven «Ocupado»." />

      <Tarjeta className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-titulo-2"><Clock className="size-5" strokeWidth={2} aria-hidden />Horario de atención a familias</h2>
        <p className="text-cuerpo-sm text-muted-foreground">Las familias solo podrán pedir reuniones en estas franjas cuando estés libre.</p>
        <EditorHorarioAtencion inicial={d.horario.map((h) => ({ dia: h.dia, horaDesde: h.horaDesde, horaHasta: h.horaHasta }))} guardar={horarioAtencionAction.bind(null, slug)} />
      </Tarjeta>

      <Tarjeta className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-titulo-2"><Lock className="size-5" strokeWidth={2} aria-hidden />Mis bloqueos</h2>
          <DialogoAccion variante="outline" disparador={<><CalendarOff strokeWidth={2} aria-hidden />Bloquear tiempo</>} titulo="Bloquear tiempo" descripcion="El motivo es privado: los demás solo verán «Ocupado»." etiqueta="Bloquear" accion={bloqueoAction.bind(null, slug)}>
            {camposFecha}
            <div className="sm:col-span-2"><Campo etiqueta="Motivo (privado, opcional)" name="motivo" maxLength={200} /></div>
          </DialogoAccion>
        </div>
        {d.bloqueos.length === 0 ? <p className="text-cuerpo-sm text-muted-foreground">No tienes bloqueos próximos.</p> : (
          <ul className="flex flex-col gap-2 text-cuerpo-sm">
            {d.bloqueos.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{rango(b.inicio, b.fin)} · {b.tipo === "ausencia" ? "Ausencia" : "Bloqueo"}{b.motivo ? ` · ${b.motivo}` : ""}</span>
                {b.tipo === "bloqueo" && (
                  <BotonConfirmar variante="ghost" tamano="sm" etiqueta={<><Trash2 strokeWidth={2} aria-hidden />Quitar</>} titulo="¿Quitar el bloqueo?" descripcion="Tu agenda volverá a mostrarse libre en ese tiempo." confirmar="Quitar" accion={quitarBloqueoAction.bind(null, slug, b.id)} />
                )}
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {d.registraAusencias && (
        <Tarjeta className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-titulo-2"><UserX className="size-5" strokeWidth={2} aria-hidden />Ausencias del personal</h2>
            <DialogoAccion variante="outline" disparador={<><UserX strokeWidth={2} aria-hidden />Registrar ausencia</>} titulo="Registrar ausencia" descripcion="Nadie podrá programar reuniones con esa persona en ese tiempo." etiqueta="Registrar" accion={bloqueoAction.bind(null, slug)}>
              <input type="hidden" name="tipo" value="ausencia" />
              <div className="sm:col-span-2">
                <Selector etiqueta="Persona" name="membershipId" required>
                  {d.personal.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </Selector>
              </div>
              {camposFecha}
              <div className="sm:col-span-2"><Campo etiqueta="Motivo (privado, opcional)" name="motivo" maxLength={200} /></div>
            </DialogoAccion>
          </div>
          {d.ausencias.length === 0 ? <p className="text-cuerpo-sm text-muted-foreground">No hay ausencias próximas.</p> : (
            <ul className="flex flex-col gap-2 text-cuerpo-sm">
              {d.ausencias.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span><span className="font-medium">{a.persona}</span> · {rango(a.inicio, a.fin)}{a.motivo ? ` · ${a.motivo}` : ""}</span>
                  <BotonConfirmar variante="ghost" tamano="sm" etiqueta={<><Trash2 strokeWidth={2} aria-hidden />Quitar</>} titulo="¿Quitar la ausencia?" descripcion="La agenda de esa persona volverá a mostrarse libre." confirmar="Quitar" accion={quitarBloqueoAction.bind(null, slug, a.id)} />
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      )}
    </div>
  );
}
