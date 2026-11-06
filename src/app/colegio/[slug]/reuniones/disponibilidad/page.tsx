import { CalendarOff, Trash2, UserX } from "lucide-react";
import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { DialogoAccion } from "@/components/academico/DialogoAccion";
import { EditorHorarioAtencion } from "@/components/reuniones/EditorHorarioAtencion";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { MigasReunion } from "@/components/reuniones/MigasReunion";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { formatoDia, formatoHora, momentoEnZona, sumarDias } from "@/lib/fechas";
import { esPersonal } from "@/lib/reuniones";
import { TituloBloque } from "../../inicio/TituloBloque";
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
    <div>
      <EncabezadoPagina titulo="Mi disponibilidad" seccion="comunicacion" migas={<MigasReunion actual="Disponibilidad" />} descripcion="Tu horario de atención a familias y los tiempos que bloqueas. Los demás solo ven «Ocupado»." />

      <div className="flex flex-col gap-10">
      <section aria-labelledby="bloque-horario" className="flex flex-col gap-3">
        <TituloBloque id="bloque-horario">Horario de atención a familias</TituloBloque>
        <p className="text-cuerpo-sm text-muted-foreground">Las familias solo podrán pedir reuniones en estas franjas cuando estés libre.</p>
        <EditorHorarioAtencion inicial={d.horario.map((h) => ({ dia: h.dia, horaDesde: h.horaDesde, horaHasta: h.horaHasta }))} guardar={horarioAtencionAction.bind(null, slug)} />
      </section>

      <section aria-labelledby="bloque-bloqueos" className="flex flex-col gap-3">
        <TituloBloque id="bloque-bloqueos" accion={
          <DialogoAccion variante="outline" disparador={<><CalendarOff strokeWidth={2} aria-hidden />Bloquear tiempo</>} titulo="Bloquear tiempo" descripcion="El motivo es privado: los demás solo verán «Ocupado»." etiqueta="Bloquear" accion={bloqueoAction.bind(null, slug)}>
            {camposFecha}
            <div className="sm:col-span-2"><Campo etiqueta="Motivo (privado, opcional)" name="motivo" maxLength={200} /></div>
          </DialogoAccion>
        } >Mis bloqueos</TituloBloque>
        {d.bloqueos.length === 0 ? <p className="text-cuerpo-sm text-muted-foreground">No tienes bloqueos próximos.</p> : (
          <ul className="flex flex-col divide-y divide-borde-sutil overflow-hidden rounded-[14px] border border-borde-sutil bg-card text-cuerpo-sm">
            {d.bloqueos.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 tabular-nums">
                <span>{rango(b.inicio, b.fin)} · {b.tipo === "ausencia" ? "Ausencia" : "Bloqueo"}{b.motivo ? ` · ${b.motivo}` : ""}</span>
                {b.tipo === "bloqueo" && (
                  <BotonConfirmar variante="ghost" tamano="sm" etiqueta={<><Trash2 strokeWidth={2} aria-hidden />Quitar</>} titulo="¿Quitar el bloqueo?" descripcion="Tu agenda volverá a mostrarse libre en ese tiempo." confirmar="Quitar" accion={quitarBloqueoAction.bind(null, slug, b.id)} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {d.registraAusencias && (
        <section aria-labelledby="bloque-ausencias" className="flex flex-col gap-3">
          <TituloBloque id="bloque-ausencias" accion={
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
          } >Ausencias del personal</TituloBloque>
          {d.ausencias.length === 0 ? <p className="text-cuerpo-sm text-muted-foreground">No hay ausencias próximas.</p> : (
            <ul className="flex flex-col divide-y divide-borde-sutil overflow-hidden rounded-[14px] border border-borde-sutil bg-card text-cuerpo-sm">
              {d.ausencias.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 tabular-nums">
                  <span><span className="font-medium">{a.persona}</span> · {rango(a.inicio, a.fin)}{a.motivo ? ` · ${a.motivo}` : ""}</span>
                  <BotonConfirmar variante="ghost" tamano="sm" etiqueta={<><Trash2 strokeWidth={2} aria-hidden />Quitar</>} titulo="¿Quitar la ausencia?" descripcion="La agenda de esa persona volverá a mostrarse libre." confirmar="Quitar" accion={quitarBloqueoAction.bind(null, slug, a.id)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      </div>
    </div>
  );
}
