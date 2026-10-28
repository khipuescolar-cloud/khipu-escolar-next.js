import { Check, Clock, FileText, Paperclip, CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Card, CardContent } from "@/components/ui/card";
import type { EstadoJustificacion } from "@/generated/prisma/enums";
import { fechaLarga } from "@/lib/fechas";
import { listarJustificaciones } from "@/lib/server/justificaciones";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { revisarJustificacionAction } from "./actions";
import { RevisionJustificacion } from "./RevisionJustificacion";

export const metadata: Metadata = { title: "Justificaciones" };

const ESTADO: Record<EstadoJustificacion, { palabra: string; Icono: typeof Clock; clase: string }> = {
  pendiente: { palabra: "Pendiente", Icono: Clock, clase: "bg-tarde-fondo text-tarde" },
  aceptada: { palabra: "Aceptada", Icono: Check, clase: "bg-llego-fondo text-llego" },
  rechazada: { palabra: "No aceptada", Icono: CircleAlert, clase: "bg-falta-fondo text-falta" },
};

export default async function JustificacionesPage({ params }: PageProps<"/colegio/[slug]/justificaciones">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion", "apoderado"]);
  requireFeature(ctx, "justificaciones");
  const lista = await listarJustificaciones(ctx);
  const revisa = ctx.rol !== "apoderado";

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Justificaciones"
        descripcion={revisa ? "Faltas justificadas por las familias. Acepta o rechaza las pendientes." : "Las justificaciones que enviaste y su estado."}
      />
      {lista.length === 0 && (
        <EstadoVacio
          icono={FileText}
          titulo={revisa ? "No hay justificaciones por revisar" : "Todavía no enviaste justificaciones"}
          descripcion={revisa ? "Cuando una familia justifique una falta, la verás aquí." : "Si tu hijo falta, podrás justificarlo desde el aviso o desde Asistencia."}
        />
      )}
      <ul className="-mt-2 flex flex-col gap-4">
        {lista.map((j) => {
          const { palabra, Icono, clase } = ESTADO[j.estado];
          return (
            <li key={j.id}>
              <Card>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-cuerpo font-semibold">
                        {j.alumno} <span className="font-sans font-normal text-muted-foreground">· {j.salon}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Falta del <span>{fechaLarga(j.fecha)}</span>
                        {revisa && ` · enviada por ${j.apoderado}`}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-etiqueta ${clase}`}>
                      <Icono className="size-3.5" strokeWidth={2} aria-hidden /> {palabra}
                    </span>
                  </div>
                  <p className="text-base whitespace-pre-line">{j.motivo}</p>
                  {j.adjuntoUrl && (
                    <a href={j.adjuntoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 w-fit items-center gap-1.5 text-cuerpo-sm enlace">
                      <Paperclip className="size-4" strokeWidth={2} aria-hidden /> Ver adjunto ({j.adjuntoMime === "application/pdf" ? "PDF" : "imagen"})
                    </a>
                  )}
                  {j.revisadoPor && <p className="text-sm text-muted-foreground">Revisada por {j.revisadoPor}</p>}
                  {j.comentarioRevision && (
                    <p className="rounded-md bg-muted px-3 py-2 text-sm">
                      <span className="font-medium">Comentario del colegio:</span> {j.comentarioRevision}
                    </p>
                  )}
                  {revisa && j.estado === "pendiente" && (
                    <RevisionJustificacion revisar={revisarJustificacionAction.bind(null, slug, j.id)} alumno={j.alumno} />
                  )}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
