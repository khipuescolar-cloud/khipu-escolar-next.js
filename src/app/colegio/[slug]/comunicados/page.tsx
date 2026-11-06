import { CircleAlert, Clock, Megaphone, Trash2, Users } from "lucide-react";
import type { Metadata } from "next";
import { ListaAdjuntos } from "@/components/adjuntos/ListaAdjuntos";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Notificar } from "@/components/shell/Notificar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { listarComunicados, salonesParaPublicar } from "@/lib/server/comunicados";
import { requireConsentimiento } from "@/lib/server/consentimiento";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { borrarComunicadoAction } from "./actions";
import { DialogoEditar, DialogoPublicar } from "./FormularioComunicado";

export const metadata: Metadata = { title: "Comunicados" };

const fecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Lima" });

function iniciales(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export default async function ComunicadosPage({ params, searchParams }: PageProps<"/colegio/[slug]/comunicados">) {
  const { slug } = await params;
  const { ok, error } = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion", "profesor", "apoderado", "administrativo", "alumno"]);
  requireFeature(ctx, "comunicados");
  await requireConsentimiento(ctx);
  const [comunicados, salones] = await Promise.all([listarComunicados(ctx), salonesParaPublicar(ctx)]);
  const puedePublicar = ctx.rol === "direccion" || ctx.rol === "profesor" || ctx.rol === "administrativo";
  const okTexto = Array.isArray(ok) ? ok[0] : ok;
  const errorTexto = Array.isArray(error) ? error[0] : error;
  // Al cambiar el resultado, los diálogos se remontan y quedan cerrados.
  const clave = `${okTexto ?? ""}|${errorTexto ?? ""}`;
  const publicar = puedePublicar ? <DialogoPublicar key={clave} salones={salones} esDireccion={ctx.rol !== "profesor"} /> : undefined;

  return (
    <div>
      <Notificar ok={okTexto} error={errorTexto} />
      <EncabezadoPagina
        titulo="Comunicados"
        seccion="comunicacion"
        descripcion={puedePublicar ? (ctx.rol === "profesor" ? "Publica avisos para tus salones." : "Publica avisos para todo el colegio, un nivel, un grado o un salón.") + " Las familias reciben el aviso al instante." : ctx.rol === "alumno" ? "Los avisos del colegio y de tu salón." : "Los avisos del colegio y de los profesores de tu hijo."}
        acciones={publicar}
      />

      {comunicados.length === 0 ? (
        <EstadoVacio
          icono={Megaphone}
          titulo="Todavía no hay comunicados"
          descripcion={puedePublicar ? "Publica el primero para que las familias lo reciban." : "Cuando el colegio publique un aviso, lo verás aquí."}
          accion={publicar}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-borde-sutil overflow-hidden rounded-[14px] border border-borde-sutil bg-card">
          {comunicados.map((c) => (
            <li key={c.id} id={`comunicado-${c.id}`} className="scroll-mt-20 target:bg-sec-suave/50">
              <article className="flex flex-col gap-3 px-4 py-5 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                  <h2 className="min-w-0 font-heading text-[18px] leading-6 font-semibold text-balance">{c.titulo}</h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-cuerpo-sm">
                    {c.importante && <span className="inline-flex items-center gap-1 font-semibold text-sec-tinta"><CircleAlert className="size-4" strokeWidth={2} aria-hidden /> Importante</span>}
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><Users className="size-4 text-sec-trazo" strokeWidth={2} aria-hidden /> <span className="sr-only">Para: </span>{c.audiencia}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-cuerpo-sm text-muted-foreground">
                  <Avatar size="sm">
                    <AvatarFallback className="bg-sec-suave text-xs font-semibold text-sec-tinta">{iniciales(c.autor)}</AvatarFallback>
                  </Avatar>
                  <span className="tabular-nums">{c.autor} · {fecha.format(c.publicadoAt)}</span>
                </div>
                <p className="max-w-prose whitespace-pre-wrap text-sm leading-relaxed">{c.cuerpo}</p>
                <ListaAdjuntos adjuntos={c.adjuntos} />
                {c.editable && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-borde-sutil pt-4">
                    <span className="mr-auto flex items-center gap-1.5 text-cuerpo-sm text-muted-foreground">
                      <Clock className="size-3.5" strokeWidth={2} aria-hidden /> Editable las primeras 24 h
                    </span>
                    <DialogoEditar id={c.id} titulo={c.titulo} cuerpo={c.cuerpo} adjuntos={c.adjuntos} />
                    <BotonConfirmar
                      etiqueta={<><Trash2 strokeWidth={2} aria-hidden /> Borrar</>}
                      titulo="¿Borrar este comunicado?"
                      descripcion="Las familias dejarán de verlo. Esta acción no se puede deshacer."
                      confirmar="Borrar comunicado"
                      accion={borrarComunicadoAction}
                      campos={{ id: c.id }}
                      peligro
                      variante="outline"
                      className="text-destructive"
                    />
                  </div>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
