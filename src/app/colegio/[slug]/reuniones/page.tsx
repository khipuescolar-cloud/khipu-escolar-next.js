import { CalendarPlus, CalendarX, MapPin, Plus, Video } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { DialogoAccion } from "@/components/academico/DialogoAccion";
import { CamposConvocatoria } from "@/components/reuniones/CamposConvocatoria";
import { FormularioRespuesta } from "@/components/reuniones/FormularioRespuesta";
import { InsigniaEstado, InsigniaRespuesta } from "@/components/reuniones/Insignias";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { fechaLima, formatoDia, formatoHora } from "@/lib/fechas";
import { puedeResponderReunion } from "@/lib/reuniones";
import { listarReuniones, opcionesParaConvocar, type ReunionVista } from "@/lib/server/reuniones";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { convocarReunionAction, responderAction } from "./actions";

export const metadata: Metadata = { title: "Reuniones" };

function TarjetaReunion({ r, slug, ahora }: { r: ReunionVista; slug: string; ahora: Date }) {
  const puedeResponder = !!r.mia && puedeResponderReunion(r, ahora);
  return (
    <Tarjeta className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap gap-2">
            <InsigniaEstado estado={r.estado} porCerrar={r.gestiona && r.estado === "programada" && r.inicio < ahora} />
            {r.mia && <InsigniaRespuesta respuesta={r.mia.respuesta} />}
          </div>
          <h3 className="font-titulo text-cuerpo font-semibold">
            <Link href={`/reuniones/${r.id}`} className="hover:underline">{r.titulo}</Link>
          </h3>
          <p className="text-cuerpo-sm text-muted-foreground first-letter:uppercase">
            {formatoDia(r.inicio, { weekday: "long", day: "numeric", month: "long" })} · {formatoHora(r.inicio)}{r.fin ? ` a ${formatoHora(r.fin)}` : ""} · {r.ambito}
          </p>
          {(r.lugar || r.enlace) && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-cuerpo-sm text-muted-foreground">
              {r.lugar && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" strokeWidth={2} aria-hidden />{r.lugar}</span>}
              {r.enlace && <span className="inline-flex items-center gap-1"><Video className="size-3.5" strokeWidth={2} aria-hidden />Videollamada</span>}
            </p>
          )}
          {r.mia && r.mia.alumnos.length > 0 && <p className="text-cuerpo-sm text-muted-foreground">Por: {r.mia.alumnos.join(", ")}</p>}
        </div>
        <Link href={`/reuniones/${r.id}`} className="text-sm font-medium text-indigo-cielo hover:underline">Ver detalle</Link>
      </div>
      {r.resumen && r.estado !== "cancelada" && (
        <p className="text-cuerpo-sm text-muted-foreground">
          {r.resumen.asistire} asistirán · {r.resumen.no_asistire} no asistirán · {r.resumen.pendiente} sin respuesta
        </p>
      )}
      {puedeResponder && r.mia && <FormularioRespuesta id={r.id} accion={responderAction.bind(null, slug, r.id)} actual={r.mia.respuesta} comentario={r.mia.comentario} />}
    </Tarjeta>
  );
}

function Grupo({ titulo, reuniones, slug, ahora }: { titulo: string; reuniones: ReunionVista[]; slug: string; ahora: Date }) {
  if (reuniones.length === 0) return null;
  return (
    <section className="flex flex-col gap-3" aria-label={titulo}>
      <h2 className="text-titulo-2">{titulo}</h2>
      <ul className="flex flex-col gap-3">
        {reuniones.map((r) => <li key={r.id}><TarjetaReunion r={r} slug={slug} ahora={ahora} /></li>)}
      </ul>
    </section>
  );
}

export default async function ReunionesPage({ params }: PageProps<"/colegio/[slug]/reuniones">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "reuniones");
  if (!["direccion", "profesor", "apoderado"].includes(ctx.rol)) forbidden();

  const ahora = new Date();
  const puedeConvocar = ctx.rol === "direccion" || ctx.rol === "profesor";
  const [reuniones, opciones] = await Promise.all([listarReuniones(ctx), puedeConvocar ? opcionesParaConvocar(ctx) : null]);
  const proximas = reuniones.filter((r) => r.estado === "programada" && r.inicio >= ahora).sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const porCerrar = reuniones.filter((r) => r.gestiona && r.estado === "programada" && r.inicio < ahora);
  const anteriores = reuniones.filter((r) => !proximas.includes(r) && !porCerrar.includes(r));
  const sinOpciones = !!opciones && !opciones.puedeColegio && opciones.salones.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Reuniones"
        descripcion={puedeConvocar ? "Convoca reuniones, mira quién confirma y publica el acta." : "Las reuniones a las que te invita el colegio. Cuéntanos si podrás asistir."}
        acciones={opciones && !sinOpciones && (
          <DialogoAccion
            disparador={<><Plus strokeWidth={2} aria-hidden />Convocar reunión</>}
            titulo="Convocar reunión"
            descripcion="Las familias invitadas reciben un aviso por correo o en el celular para responder."
            etiqueta="Convocar"
            accion={convocarReunionAction.bind(null, slug)}
          >
            <CamposConvocatoria salones={opciones.salones} alumnos={opciones.alumnos} puedeColegio={opciones.puedeColegio} fechaInicial={fechaLima(new Date(ahora.getTime() + 7 * 86_400_000))} />
          </DialogoAccion>
        )}
      />
      {reuniones.length === 0 ? (
        <EstadoVacio
          icono={puedeConvocar ? CalendarPlus : CalendarX}
          titulo={puedeConvocar ? "Todavía no convocaste reuniones" : "No tienes reuniones por ahora"}
          descripcion={puedeConvocar ? "Cuando convoques una, aquí verás las confirmaciones." : "Cuando el colegio te invite a una, la verás aquí."}
        />
      ) : (
        <>
          <Grupo titulo="Próximas" reuniones={proximas} slug={slug} ahora={ahora} />
          <Grupo titulo="Por cerrar" reuniones={porCerrar} slug={slug} ahora={ahora} />
          <Grupo titulo="Anteriores" reuniones={anteriores} slug={slug} ahora={ahora} />
        </>
      )}
    </div>
  );
}
