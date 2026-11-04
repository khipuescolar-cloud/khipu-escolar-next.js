import { ArrowLeft, Bell, CalendarClock, CheckCheck, CheckCircle2, CircleDashed, ClipboardList, FileText, History, ListPlus, MapPin, NotebookPen, Video, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { DialogoAccion } from "@/components/academico/DialogoAccion";
import { FormularioRespuesta } from "@/components/reuniones/FormularioRespuesta";
import { InsigniaEstado, InsigniaRespuesta } from "@/components/reuniones/Insignias";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Alerta } from "@/components/ui/Alerta";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Textarea } from "@/components/ui/textarea";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { DURACIONES } from "@/lib/disponibilidad";
import { formatoDia, formatoHora, momentoEnZona } from "@/lib/fechas";
import { TEXTO_MODALIDAD, TEXTO_TIPO, puedeResponderReunion } from "@/lib/reuniones";
import { detalleReunion } from "@/lib/server/reuniones";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { actaAction, acuerdoAction, asistenciaAction, cancelarAction, marcarAcuerdoAction, realizadaAction, recordarAction, reprogramarAction, responderAction } from "../actions";

export const metadata: Metadata = { title: "Reunión" };

const TEXTO_CAMBIO: Record<string, string> = {
  creada: "Creada o confirmada", reprogramada: "Reprogramada", cancelada: "Cancelada", participantes: "Participantes", respuesta: "Respuesta",
  realizada: "Realizada", acta: "Acta",
};

export default async function ReunionPage({ params }: PageProps<"/colegio/[slug]/reuniones/[id]">) {
  const { slug, id } = await params;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "reuniones");
  if (!["direccion", "profesor", "administrativo", "apoderado"].includes(ctx.rol)) forbidden();
  const r = await detalleReunion(ctx, id);
  if (!r) notFound();

  const ahora = new Date();
  const empezo = r.inicio <= ahora;
  const puedeResponder = !!r.mia && puedeResponderReunion(r, ahora);
  const personas = r.personas ?? [];
  const grupos = [
    { titulo: "Aceptaron", clave: "asistire" as const },
    { titulo: "Rechazaron", clave: "no_asistire" as const },
    { titulo: "Proponen otra hora", clave: "propone_otra" as const },
    { titulo: "Sin respuesta", clave: "pendiente" as const },
  ];
  const local = momentoEnZona(r.inicio, ctx.tenant.zonaHoraria);
  const duracion = Math.round((r.fin.getTime() - r.inicio.getTime()) / 60_000);
  const porConfirmar = r.estado === "por_confirmar";
  const activa = r.estado === "programada" || porConfirmar;
  const responsables = [{ id: r.organizadorId, nombre: `${r.organizador} (organiza)` }, ...personas.map((p) => ({ id: p.membershipId, nombre: p.nombre }))];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/reuniones" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-indigo-cielo hover:underline">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />Todas las reuniones
      </Link>
      <EncabezadoPagina
        titulo={r.titulo}
        descripcion={<span className="first-letter:uppercase">{formatoDia(r.inicio, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {formatoHora(r.inicio)} a {formatoHora(r.fin)} ({duracion} min)</span>}
        acciones={<InsigniaEstado estado={r.estado} porCerrar={r.gestiona && r.estado === "programada" && empezo} />}
      />

      {r.estado === "cancelada" && <Alerta tipo="aviso">{porConfirmar ? "" : "Esta reunión se canceló."}{r.motivoCancelacion ? ` Motivo: ${r.motivoCancelacion}` : ""}</Alerta>}
      {porConfirmar && (
        <Alerta tipo="aviso">
          {r.gestiona ? "Una familia solicitó esta reunión. Confírmala (a esta u otra hora) o recházala con un motivo." : "Tu solicitud está por confirmar. Te avisaremos cuando el docente responda."}
        </Alerta>
      )}
      {r.reprogramadaAt && r.estado === "programada" && <Alerta tipo="info">Esta reunión se reprogramó. Revisa la nueva fecha y hora.</Alerta>}

      <Tarjeta className="flex flex-col gap-2 text-cuerpo-sm">
        <p><span className="font-medium">Para:</span> {r.ambito}</p>
        <p><span className="font-medium">Tipo:</span> {TEXTO_TIPO[r.tipo]} · {TEXTO_MODALIDAD[r.modalidad]}</p>
        <p><span className="font-medium">Organiza:</span> {r.organizador}{r.convocadaPor !== r.organizador ? ` · solicitada por ${r.convocadaPor}` : ""}</p>
        {r.motivo && <p><span className="font-medium">Motivo:</span> {r.motivo}</p>}
        {r.observaciones && <p className="whitespace-pre-line"><span className="font-medium">Observaciones:</span> {r.observaciones}</p>}
        {r.lugar && <p className="flex items-center gap-1.5"><MapPin className="size-4" strokeWidth={2} aria-hidden /><span className="font-medium">Lugar:</span> {r.lugar}</p>}
        {r.enlace && (
          <p className="flex items-center gap-1.5">
            <Video className="size-4" strokeWidth={2} aria-hidden /><span className="font-medium">Enlace:</span>{" "}
            <a href={r.enlace} target="_blank" rel="noopener noreferrer" className="break-all text-indigo-cielo underline-offset-2 hover:underline">{r.enlace}</a>
          </p>
        )}
        {r.descripcion && <p className="whitespace-pre-line text-muted-foreground">{r.descripcion}</p>}
      </Tarjeta>

      {r.mia && (
        <section aria-labelledby="mi-respuesta" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="mi-respuesta" className="text-titulo-2">Tu respuesta</h2>
            <InsigniaRespuesta respuesta={r.mia.respuesta} />
          </div>
          {r.mia.alumnos.length > 0 && <p className="text-cuerpo-sm text-muted-foreground">Te citamos por: {r.mia.alumnos.join(", ")}.</p>}
          {porConfirmar ? null : puedeResponder ? (
            <Tarjeta><FormularioRespuesta id={r.id} accion={responderAction.bind(null, slug, r.id)} actual={r.mia.respuesta} comentario={r.mia.comentario} /></Tarjeta>
          ) : (
            r.estado !== "cancelada" && <p className="text-cuerpo-sm text-muted-foreground">La reunión ya empezó: no se puede cambiar la respuesta.</p>
          )}
          {r.mia.asistio !== null && r.estado === "realizada" && (
            <p className="text-cuerpo-sm text-muted-foreground">Asistencia registrada: {r.mia.asistio ? "asististe" : "no asististe"}.</p>
          )}
        </section>
      )}

      {r.gestiona && r.resumen && (
        <section aria-labelledby="confirmaciones" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="confirmaciones" className="text-titulo-2">Confirmaciones</h2>
            <div className="flex flex-wrap gap-2">
              {puedeResponderReunion(r, ahora) && r.resumen.pendiente > 0 && (
                <BotonConfirmar
                  etiqueta={<><Bell strokeWidth={2} aria-hidden />Recordar a quienes no respondieron</>}
                  titulo="¿Enviar recordatorio?"
                  descripcion={`Avisaremos a las familias que todavía no responden (${r.resumen.pendiente} personas sin respuesta).`}
                  confirmar="Enviar recordatorio"
                  accion={recordarAction.bind(null, slug, r.id)}
                />
              )}
            </div>
          </div>
          <p className="text-cuerpo-sm text-muted-foreground">
            {r.resumen.asistire} aceptaron · {r.resumen.no_asistire} rechazaron · {r.resumen.propone_otra} proponen otra hora · {r.resumen.pendiente} sin respuesta
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {grupos.map((g) => {
              const lista = personas.filter((p) => p.respuesta === g.clave);
              return (
                <Tarjeta key={g.clave} className="flex flex-col gap-2">
                  <h3 className="flex items-center justify-between gap-2 font-titulo text-cuerpo font-semibold">
                    {g.titulo}<InsigniaRespuesta respuesta={g.clave} />
                  </h3>
                  {lista.length === 0 ? <p className="text-cuerpo-sm text-muted-foreground">Nadie por ahora.</p> : (
                    <ul className="flex flex-col gap-2 text-cuerpo-sm">
                      {lista.map((p) => (
                        <li key={p.membershipId}>
                          <p className="font-medium">{p.nombre}{!p.esFamilia && <span className="font-normal text-muted-foreground"> · {p.rol === "opcional" ? "Opcional" : "Personal"}</span>}</p>
                          {p.propuestaInicio && <p className="text-muted-foreground">Propone: {formatoDia(p.propuestaInicio, { weekday: "short", day: "numeric", month: "short" })} {formatoHora(p.propuestaInicio)}</p>}
                          {p.alumnos.length > 0 && <p className="text-muted-foreground">Por: {p.alumnos.join(", ")}</p>}
                          {p.comentario && <p className="text-muted-foreground">«{p.comentario}»</p>}
                          {r.estado === "realizada" && p.asistio !== null && <p className="text-muted-foreground">{p.asistio ? "Asistió" : "No asistió"}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </Tarjeta>
              );
            })}
          </div>
        </section>
      )}

      {r.gestiona && r.estado !== "cancelada" && (
        <section aria-labelledby="gestion" className="flex flex-col gap-3">
          <h2 id="gestion" className="text-titulo-2">Después de la reunión</h2>
          {porConfirmar ? null : !empezo ? (
            <p className="text-cuerpo-sm text-muted-foreground">Cuando empiece la reunión podrás marcar la asistencia y escribir el acta.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <DialogoAccion
                variante="outline"
                disparador={<><ClipboardList strokeWidth={2} aria-hidden />Marcar asistencia</>}
                titulo="Marcar asistencia"
                descripcion="Marca a quienes asistieron."
                etiqueta="Guardar asistencia"
                accion={asistenciaAction.bind(null, slug, r.id)}
              >
                <ul className="flex flex-col gap-2 sm:col-span-2">
                  {personas.map((p) => (
                    <li key={p.membershipId}>
                      <label className="flex min-h-10 items-center gap-2 text-sm">
                        <input type="checkbox" name="asistio" value={p.membershipId} defaultChecked={p.asistio ?? p.respuesta === "asistire"} className="size-4" />
                        <span>{p.nombre}{p.alumnos.length > 0 ? ` · ${p.alumnos.join(", ")}` : ""}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </DialogoAccion>
              <DialogoAccion
                variante="outline"
                disparador={<><NotebookPen strokeWidth={2} aria-hidden />{r.acta ? "Editar acta" : "Escribir acta"}</>}
                titulo="Acta de la reunión"
                descripcion="Texto simple: acuerdos, responsables y fechas. Las familias invitadas la leen solo si la publicas."
                etiqueta="Guardar acta"
                accion={actaAction.bind(null, slug, r.id)}
              >
                <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                  <span className="font-medium">Acta</span>
                  <Textarea name="acta" rows={10} maxLength={20000} required defaultValue={r.acta ?? ""} />
                </label>
                <label className="flex min-h-10 items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" name="publicar" className="size-4" defaultChecked={r.actaPublicadaAt !== null} />
                  <span>Publicar a las familias invitadas (se les avisa la primera vez)</span>
                </label>
              </DialogoAccion>
              {r.estado === "programada" && (
                <BotonConfirmar
                  etiqueta={<><CheckCheck strokeWidth={2} aria-hidden />Marcar como realizada</>}
                  titulo="¿Marcar como realizada?"
                  descripcion="La reunión pasará a «Realizada»."
                  confirmar="Marcar como realizada"
                  accion={realizadaAction.bind(null, slug, r.id)}
                />
              )}
            </div>
          )}
          {activa && (
            <div className="flex flex-wrap gap-2">
              <DialogoAccion
                variante={porConfirmar ? "default" : "outline"}
                disparador={<><CalendarClock strokeWidth={2} aria-hidden />{porConfirmar ? "Confirmar solicitud" : "Reprogramar"}</>}
                titulo={porConfirmar ? "Confirmar solicitud" : "Reprogramar reunión"}
                descripcion="Revisamos de nuevo la agenda del personal. Si cambias la hora, las respuestas vuelven a «Sin respuesta» y avisamos a los invitados."
                etiqueta={porConfirmar ? "Confirmar" : "Reprogramar"}
                accion={reprogramarAction.bind(null, slug, r.id)}
              >
                <Campo etiqueta="Fecha" name="fecha" type="date" required defaultValue={local.isoFecha} />
                <Campo etiqueta="Hora" name="hora" type="time" step={900} required defaultValue={local.hora} />
                <Selector etiqueta="Duración" name="duracion" defaultValue={String((DURACIONES as readonly number[]).includes(duracion) ? duracion : 60)}>
                  {DURACIONES.map((d) => <option key={d} value={d}>{d} minutos</option>)}
                </Selector>
                <Campo etiqueta="Motivo (opcional)" name="motivo" maxLength={300} />
                <label className="flex min-h-10 items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" name="fueraDeHorario" className="size-4" />
                  <span>Permitir fuera de la jornada laboral o en día no lectivo</span>
                </label>
              </DialogoAccion>
              <DialogoAccion
                variante="ghost"
                disparador={<><XCircle strokeWidth={2} aria-hidden />{porConfirmar ? "Rechazar solicitud" : "Cancelar reunión"}</>}
                titulo={porConfirmar ? "¿Rechazar la solicitud?" : "¿Cancelar esta reunión?"}
                descripcion={porConfirmar ? "Avisaremos a la familia con tu motivo." : "Liberamos la agenda y avisamos a todos los invitados. No se puede deshacer."}
                etiqueta={porConfirmar ? "Rechazar" : "Cancelar reunión"}
                accion={cancelarAction.bind(null, slug, r.id)}
              >
                <div className="sm:col-span-2"><Campo etiqueta="Motivo" name="motivo" required minLength={3} maxLength={300} /></div>
              </DialogoAccion>
            </div>
          )}
        </section>
      )}

      {r.acta && (
        <section aria-labelledby="acta" className="flex flex-col gap-3">
          <h2 id="acta" className="flex items-center gap-2 text-titulo-2"><FileText className="size-5" strokeWidth={2} aria-hidden />Acta</h2>
          {r.gestiona && !r.actaPublicadaAt && <Alerta tipo="aviso">Borrador: las familias todavía no ven esta acta.</Alerta>}
          <Tarjeta><p className="whitespace-pre-line text-cuerpo">{r.acta}</p></Tarjeta>
        </section>
      )}

      {(r.acuerdos.length > 0 || (r.gestiona && r.estado !== "cancelada" && !porConfirmar && empezo)) && (
        <section aria-labelledby="acuerdos" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="acuerdos" className="text-titulo-2">Acuerdos</h2>
            {r.gestiona && r.estado !== "cancelada" && !porConfirmar && empezo && (
              <DialogoAccion
                variante="outline"
                disparador={<><ListPlus strokeWidth={2} aria-hidden />Agregar acuerdo</>}
                titulo="Nuevo acuerdo"
                descripcion="El responsable recibe un aviso en Khipu."
                etiqueta="Agregar"
                accion={acuerdoAction.bind(null, slug, r.id)}
              >
                <div className="sm:col-span-2"><Campo etiqueta="Acuerdo" name="texto" required minLength={3} maxLength={500} /></div>
                <Selector etiqueta="Responsable" name="responsableId" defaultValue="">
                  <option value="">Sin responsable</option>
                  {responsables.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </Selector>
                <Campo etiqueta="Fecha de compromiso" name="fechaCompromiso" type="date" />
              </DialogoAccion>
            )}
          </div>
          {r.acuerdos.length === 0 ? <p className="text-cuerpo-sm text-muted-foreground">Todavía no hay acuerdos.</p> : (
            <ul className="flex flex-col gap-2">
              {r.acuerdos.map((a) => (
                <li key={a.id}>
                  <Tarjeta className="flex flex-wrap items-center justify-between gap-2 text-cuerpo-sm">
                    <div>
                      <p className="flex items-center gap-1.5 font-medium">
                        {a.estado === "cumplido" ? <CheckCircle2 className="size-4 text-llego" strokeWidth={2} aria-hidden /> : <CircleDashed className="size-4 text-tarde" strokeWidth={2} aria-hidden />}
                        {a.texto}
                      </p>
                      <p className="text-muted-foreground">
                        {a.estado === "cumplido" ? "Cumplido" : "Pendiente"}{a.responsable ? ` · ${a.responsable}` : ""}{a.fechaCompromiso ? ` · hasta el ${a.fechaCompromiso}` : ""}
                      </p>
                    </div>
                    {a.puedeMarcar && (
                      <BotonConfirmar
                        variante="outline" tamano="sm"
                        etiqueta={a.estado === "cumplido" ? "Reabrir" : "Marcar cumplido"}
                        titulo={a.estado === "cumplido" ? "¿Reabrir el acuerdo?" : "¿Marcar como cumplido?"}
                        descripcion={a.texto}
                        confirmar={a.estado === "cumplido" ? "Reabrir" : "Marcar cumplido"}
                        accion={marcarAcuerdoAction.bind(null, slug, a.id, a.estado !== "cumplido")}
                      />
                    )}
                  </Tarjeta>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {r.historial && r.historial.length > 0 && (
        <section aria-labelledby="historial" className="flex flex-col gap-2">
          <h2 id="historial" className="flex items-center gap-2 text-titulo-2"><History className="size-5" strokeWidth={2} aria-hidden />Historial</h2>
          <ul className="flex flex-col gap-1 text-cuerpo-sm text-muted-foreground">
            {r.historial.map((c, i) => (
              <li key={i}>{formatoDia(c.fecha, { day: "numeric", month: "short" })} {formatoHora(c.fecha)} · {TEXTO_CAMBIO[c.tipo] ?? c.tipo}{c.actor ? ` · ${c.actor}` : ""}{c.motivo ? ` · «${c.motivo}»` : ""}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
