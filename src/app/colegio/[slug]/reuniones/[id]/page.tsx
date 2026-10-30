import { ArrowLeft, Bell, CheckCheck, ClipboardList, FileText, MapPin, NotebookPen, Video, XCircle } from "lucide-react";
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
import { formatoDia, formatoHora } from "@/lib/fechas";
import { puedeResponderReunion } from "@/lib/reuniones";
import { detalleReunion } from "@/lib/server/reuniones";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { actaAction, asistenciaAction, cancelarAction, realizadaAction, recordarAction, responderAction } from "../actions";

export const metadata: Metadata = { title: "Reunión" };

export default async function ReunionPage({ params }: PageProps<"/colegio/[slug]/reuniones/[id]">) {
  const { slug, id } = await params;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "reuniones");
  if (!["direccion", "profesor", "apoderado"].includes(ctx.rol)) forbidden();
  const r = await detalleReunion(ctx, id);
  if (!r) notFound();

  const ahora = new Date();
  const empezo = r.inicio <= ahora;
  const puedeResponder = !!r.mia && puedeResponderReunion(r, ahora);
  const personas = r.personas ?? [];
  const grupos = [
    { titulo: "Asistirán", clave: "asistire" as const },
    { titulo: "No asistirán", clave: "no_asistire" as const },
    { titulo: "Sin respuesta", clave: "pendiente" as const },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/reuniones" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-indigo-cielo hover:underline">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />Todas las reuniones
      </Link>
      <EncabezadoPagina
        titulo={r.titulo}
        descripcion={<span className="first-letter:uppercase">{formatoDia(r.inicio, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {formatoHora(r.inicio)}{r.fin ? ` a ${formatoHora(r.fin)}` : ""}</span>}
        acciones={<InsigniaEstado estado={r.estado} porCerrar={r.gestiona && r.estado === "programada" && empezo} />}
      />

      {r.estado === "cancelada" && <Alerta tipo="aviso">Esta reunión se canceló.</Alerta>}

      <Tarjeta className="flex flex-col gap-2 text-cuerpo-sm">
        <p><span className="font-medium">Para:</span> {r.ambito}</p>
        <p><span className="font-medium">Convoca:</span> {r.convocadaPor}</p>
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
          {puedeResponder ? (
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
                  descripcion={`Avisaremos a las ${r.resumen.pendiente} familias que todavía no responden.`}
                  confirmar="Enviar recordatorio"
                  accion={recordarAction.bind(null, slug, r.id)}
                />
              )}
            </div>
          </div>
          <p className="text-cuerpo-sm text-muted-foreground">
            {r.resumen.asistire} asistirán · {r.resumen.no_asistire} no asistirán · {r.resumen.pendiente} sin respuesta
          </p>
          <div className="grid gap-3 md:grid-cols-3">
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
                          <p className="font-medium">{p.nombre}</p>
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
          {!empezo ? (
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
          {r.estado === "programada" && (
            <div>
              <BotonConfirmar
                peligro variante="ghost"
                etiqueta={<><XCircle strokeWidth={2} aria-hidden />Cancelar reunión</>}
                titulo="¿Cancelar esta reunión?"
                descripcion="Avisaremos a todas las familias invitadas. No se puede deshacer."
                confirmar="Cancelar reunión"
                accion={cancelarAction.bind(null, slug, r.id)}
              />
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
    </div>
  );
}
