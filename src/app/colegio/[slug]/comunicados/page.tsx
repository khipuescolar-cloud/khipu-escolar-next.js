import { Clock, Megaphone, Trash2, Users } from "lucide-react";
import type { Metadata } from "next";
import { ListaAdjuntos } from "@/components/adjuntos/ListaAdjuntos";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Notificar } from "@/components/shell/Notificar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const ctx = await requireTenantContext(slug, ["direccion", "profesor", "apoderado", "administrativo"]);
  requireFeature(ctx, "comunicados");
  await requireConsentimiento(ctx);
  const [comunicados, salones] = await Promise.all([listarComunicados(ctx), salonesParaPublicar(ctx)]);
  const puedePublicar = ctx.rol === "direccion" || ctx.rol === "profesor";
  const okTexto = Array.isArray(ok) ? ok[0] : ok;
  const errorTexto = Array.isArray(error) ? error[0] : error;
  // Al cambiar el resultado, los diálogos se remontan y quedan cerrados.
  const clave = `${okTexto ?? ""}|${errorTexto ?? ""}`;
  const publicar = puedePublicar ? <DialogoPublicar key={clave} salones={salones} esDireccion={ctx.rol === "direccion"} /> : undefined;

  return (
    <div className="max-w-3xl">
      <Notificar ok={okTexto} error={errorTexto} />
      <EncabezadoPagina
        titulo="Comunicados"
        descripcion={puedePublicar ? "Publica avisos para todo el colegio o para un salón. Las familias reciben el aviso al instante." : "Los avisos del colegio y de los profesores de tu hijo."}
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
        <ul className="flex flex-col gap-4">
          {comunicados.map((c) => (
            <li key={c.id} id={`comunicado-${c.id}`} className="scroll-mt-20 target:[&>*]:ring-2 target:[&>*]:ring-primary/40">
              <Card>
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-lg">{c.titulo}</CardTitle>
                    <Badge variant="secondary"><Users strokeWidth={2} aria-hidden /> {c.salon ?? "Todo el colegio"}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar size="sm">
                      <AvatarFallback className="bg-maiz text-[10px] font-semibold text-indigo">{iniciales(c.autor)}</AvatarFallback>
                    </Avatar>
                    <span>{c.autor} · {fecha.format(c.publicadoAt)}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="max-w-prose whitespace-pre-wrap text-sm leading-relaxed">{c.cuerpo}</p>
                  <ListaAdjuntos adjuntos={c.adjuntos} />
                  {c.editable && (
                    <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                      <span className="mr-auto flex items-center gap-1.5 text-xs text-muted-foreground">
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
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
