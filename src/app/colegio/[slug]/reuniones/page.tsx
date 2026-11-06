import { CalendarClock, CalendarPlus, CalendarX, ListChecks, MapPin, MessageSquarePlus, Plus, Video } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { FormularioRespuesta } from "@/components/reuniones/FormularioRespuesta";
import { InsigniaEstado, InsigniaRespuesta } from "@/components/reuniones/Insignias";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import { formatoDia, formatoHora } from "@/lib/fechas";
import { TEXTO_MODALIDAD, TEXTO_TIPO, esPersonal, puedeResponderReunion } from "@/lib/reuniones";
import { listarReuniones, type ReunionVista } from "@/lib/server/reuniones";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { TituloBloque } from "../inicio/TituloBloque";
import { responderAction } from "./actions";

export const metadata: Metadata = { title: "Reuniones" };

function TarjetaReunion({ r, slug, ahora }: { r: ReunionVista; slug: string; ahora: Date }) {
  const puedeResponder = !!r.mia && puedeResponderReunion(r, ahora);
  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <InsigniaEstado estado={r.estado} porCerrar={r.gestiona && r.estado === "programada" && r.inicio < ahora} />
            {r.mia && <InsigniaRespuesta respuesta={r.mia.respuesta} />}
          </div>
          <h3 className="font-heading text-cuerpo font-semibold">
            <Link href={`/reuniones/${r.id}`} className="hover:underline">{r.titulo}</Link>
          </h3>
          <p className="text-cuerpo-sm text-muted-foreground tabular-nums first-letter:uppercase">
            {formatoDia(r.inicio, { weekday: "long", day: "numeric", month: "long" })} · {formatoHora(r.inicio)} a {formatoHora(r.fin)} · {TEXTO_TIPO[r.tipo]} · {TEXTO_MODALIDAD[r.modalidad]} · {r.ambito}
          </p>
          {(r.lugar || r.enlace) && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-cuerpo-sm text-muted-foreground">
              {r.lugar && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" strokeWidth={2} aria-hidden />{r.lugar}</span>}
              {r.enlace && <span className="inline-flex items-center gap-1"><Video className="size-3.5" strokeWidth={2} aria-hidden />Enlace externo</span>}
            </p>
          )}
          {r.mia && r.mia.alumnos.length > 0 && <p className="text-cuerpo-sm text-muted-foreground">Por: {r.mia.alumnos.join(", ")}</p>}
        </div>
        <Link href={`/reuniones/${r.id}`} className="inline-flex min-h-11 items-center text-sm font-medium text-indigo-cielo hover:underline">Ver detalle</Link>
      </div>
      {r.resumen && r.estado !== "cancelada" && (
        <p className="text-cuerpo-sm text-muted-foreground">
          {r.resumen.asistire} aceptaron · {r.resumen.no_asistire} rechazaron · {r.resumen.propone_otra} proponen otra hora · {r.resumen.pendiente} sin respuesta
        </p>
      )}
      {puedeResponder && r.mia && <FormularioRespuesta id={r.id} accion={responderAction.bind(null, slug, r.id)} actual={r.mia.respuesta} comentario={r.mia.comentario} />}
    </div>
  );
}

function Grupo({ titulo, reuniones, slug, ahora }: { titulo: string; reuniones: ReunionVista[]; slug: string; ahora: Date }) {
  if (reuniones.length === 0) return null;
  return (
    <section className="flex flex-col gap-3" aria-labelledby={`grupo-${titulo}`}>
      <TituloBloque id={`grupo-${titulo}`}>{titulo}</TituloBloque>
      <ul className="flex flex-col divide-y divide-borde-sutil overflow-hidden rounded-[14px] border border-borde-sutil bg-card">
        {reuniones.map((r) => <li key={r.id}><TarjetaReunion r={r} slug={slug} ahora={ahora} /></li>)}
      </ul>
    </section>
  );
}

export default async function ReunionesPage({ params }: PageProps<"/colegio/[slug]/reuniones">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "reuniones");
  if (!["direccion", "profesor", "administrativo", "apoderado"].includes(ctx.rol)) forbidden();

  const ahora = new Date();
  const personal = esPersonal(ctx.rol);
  const reuniones = await listarReuniones(ctx);
  const porConfirmar = reuniones.filter((r) => r.estado === "por_confirmar").sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const proximas = reuniones.filter((r) => r.estado === "programada" && r.inicio >= ahora).sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const porCerrar = reuniones.filter((r) => r.gestiona && r.estado === "programada" && r.inicio < ahora);
  const anteriores = reuniones.filter((r) => !proximas.includes(r) && !porCerrar.includes(r) && !porConfirmar.includes(r));
  const enlace = buttonVariants({ variant: "outline" });

  return (
    <div>
      <EncabezadoPagina
        titulo="Reuniones"
        seccion="comunicacion"
        descripcion={personal ? "Programa reuniones viendo la disponibilidad del personal, mira quién confirma y registra el acta." : "Las reuniones a las que te invita el colegio. Cuéntanos si podrás asistir."}
        acciones={
          <div className="flex flex-wrap gap-2">
            {personal && <Link href="/reuniones/disponibilidad" className={enlace}><CalendarClock strokeWidth={2} aria-hidden />Mi disponibilidad</Link>}
            <Link href="/reuniones/acuerdos" className={enlace}><ListChecks strokeWidth={2} aria-hidden />Acuerdos</Link>
            {personal && <Link href="/reuniones/nueva" className={buttonVariants()}><Plus strokeWidth={2} aria-hidden />Nueva reunión</Link>}
            {ctx.rol === "apoderado" && ctx.tenant.familiasSolicitanReuniones && (
              <Link href="/reuniones/solicitar" className={buttonVariants()}><MessageSquarePlus strokeWidth={2} aria-hidden />Solicitar reunión</Link>
            )}
          </div>
        }
      />
      {reuniones.length === 0 ? (
        <EstadoVacio
          icono={personal ? CalendarPlus : CalendarX}
          titulo={personal ? "Todavía no tienes reuniones" : "No tienes reuniones por ahora"}
          descripcion={personal ? "Cuando programes una o te inviten, aquí verás las confirmaciones." : "Cuando el colegio te invite a una, la verás aquí."}
        />
      ) : (
        <div className="flex flex-col gap-10">
          <Grupo titulo={personal ? "Solicitudes por confirmar" : "Solicitudes enviadas"} reuniones={porConfirmar} slug={slug} ahora={ahora} />
          <Grupo titulo="Próximas" reuniones={proximas} slug={slug} ahora={ahora} />
          <Grupo titulo="Por cerrar" reuniones={porCerrar} slug={slug} ahora={ahora} />
          <Grupo titulo="Anteriores" reuniones={anteriores} slug={slug} ahora={ahora} />
        </div>
      )}
    </div>
  );
}
