import { CheckCircle2, Clock, Paperclip, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { Boton } from "@/components/ui/Boton";
import type { EstadoJustificacion } from "@/generated/prisma/enums";
import { fechaLarga } from "@/lib/fechas";
import { listarJustificaciones } from "@/lib/server/justificaciones";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { revisarJustificacionAction } from "./actions";

export const metadata: Metadata = { title: "Justificaciones" };

const ESTADO: Record<EstadoJustificacion, { palabra: string; Icono: typeof Clock; clase: string }> = {
  pendiente: { palabra: "Pendiente", Icono: Clock, clase: "bg-tarde-fondo text-tarde" },
  aceptada: { palabra: "Aceptada", Icono: CheckCircle2, clase: "bg-llego-fondo text-llego" },
  rechazada: { palabra: "No aceptada", Icono: XCircle, clase: "bg-falta-fondo text-falta" },
};

export default async function JustificacionesPage({ params }: PageProps<"/colegio/[slug]/justificaciones">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion", "apoderado"]);
  requireFeature(ctx, "justificaciones");
  const lista = await listarJustificaciones(ctx);
  const revisa = ctx.rol !== "apoderado";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Justificaciones</h1>
        <p className="text-sm text-pizarra">
          {revisa ? "Faltas justificadas por las familias. Acepta o rechaza las pendientes." : "Las justificaciones que enviaste y su estado."}
        </p>
      </div>
      {lista.length === 0 && <p className="text-pizarra">{revisa ? "No hay justificaciones por revisar." : "Todavía no enviaste justificaciones."}</p>}
      <ul className="flex flex-col gap-4">
        {lista.map((j) => {
          const { palabra, Icono, clase } = ESTADO[j.estado];
          return (
            <li key={j.id} className="flex flex-col gap-3 rounded-lg border border-arena bg-superficie p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {j.alumno} <span className="font-normal text-pizarra">· {j.salon}</span>
                  </p>
                  <p className="text-sm text-pizarra">
                    Falta del <span>{fechaLarga(j.fecha)}</span>
                    {revisa && ` · enviada por ${j.apoderado}`}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-xs font-semibold ${clase}`}>
                  <Icono className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> {palabra}
                </span>
              </div>
              <p className="whitespace-pre-line">{j.motivo}</p>
              {j.adjuntoUrl && (
                <a href={j.adjuntoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-acento hover:underline">
                  <Paperclip className="h-4 w-4" strokeWidth={2} aria-hidden /> Ver adjunto ({j.adjuntoMime === "application/pdf" ? "PDF" : "imagen"})
                </a>
              )}
              {j.revisadoPor && <p className="text-sm text-pizarra">Revisada por {j.revisadoPor}</p>}
              {revisa && j.estado === "pendiente" && (
                <form action={revisarJustificacionAction.bind(null, slug, j.id)} className="flex flex-col gap-2 border-t border-arena pt-3">
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium">Comentario para la familia (opcional)</span>
                    <input name="comentario" maxLength={500} className="rounded-md border border-arena bg-superficie px-3 py-2 text-base" />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Boton type="submit" name="decision" value="aceptada">
                      <CheckCircle2 className="h-4 w-4" strokeWidth={2} aria-hidden /> Aceptar
                    </Boton>
                    <Boton type="submit" name="decision" value="rechazada" variante="secundario">
                      <XCircle className="h-4 w-4" strokeWidth={2} aria-hidden /> Rechazar
                    </Boton>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
