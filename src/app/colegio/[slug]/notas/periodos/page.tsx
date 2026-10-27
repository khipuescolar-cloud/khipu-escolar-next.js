import { ArrowLeft, CalendarDays, CheckCircle2, Lock, Megaphone, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DialogoAccion } from "@/components/academico/DialogoAccion";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fechaLima, formatoDia, fechaDeColumnaDate } from "@/lib/fechas";
import { estadoPublicacionLibreta, listarPeriodos } from "@/lib/server/notas";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { cambiarEstadoPeriodoAction, crearPeriodoAction, publicarLibretaAction } from "../actions";

export const metadata: Metadata = { title: "Periodos" };

export default async function PeriodosPage({ params }: PageProps<"/colegio/[slug]/notas/periodos">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  requireFeature(ctx, "notas");
  const periodos = await listarPeriodos(ctx);
  const anio = new Date().getFullYear();
  const publicacion = new Map(await Promise.all(periodos.map(async (p) => [p.id, await estadoPublicacionLibreta(ctx, p.id)] as const)));

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        titulo="Periodos"
        descripcion="Al cerrar un periodo, los profesores ya no pueden cambiar sus notas. Cuando todo esté listo, publica la libreta para avisar a las familias."
        acciones={
          <>
            <Link href="/notas" className={buttonVariants({ variant: "outline" })}><ArrowLeft strokeWidth={2} aria-hidden />Volver a notas</Link>
            <DialogoAccion
              disparador={<><Plus strokeWidth={2} aria-hidden />Nuevo periodo</>}
              titulo="Nuevo periodo"
              descripcion="Define las fechas en que los profesores podrán registrar notas."
              etiqueta="Crear periodo"
              accion={crearPeriodoAction.bind(null, slug)}
            >
              <Campo etiqueta="Nombre" name="nombre" required placeholder="I Bimestre" />
              <Campo etiqueta="Año" name="anio" type="number" required defaultValue={anio} />
              <Selector etiqueta="Tipo" name="tipo">
                <option value="bimestre">Bimestre</option>
                <option value="trimestre">Trimestre</option>
                <option value="semestre">Semestre</option>
              </Selector>
              <Campo etiqueta="Número" name="numero" type="number" min={1} max={6} required defaultValue={1} />
              <Campo etiqueta="Inicio" name="inicio" type="date" required />
              <Campo etiqueta="Fin" name="fin" type="date" required />
            </DialogoAccion>
          </>
        }
      />
      {periodos.length === 0 ? (
        <EstadoVacio icono={CalendarDays} titulo="Aún no hay periodos" descripcion="Crea el primero para que los profesores puedan registrar notas." />
      ) : (
        <Card>
          <CardContent>
            <ul className="divide-y">
              {periodos.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium">{p.nombre} {p.anio}</p>
                    <p className="text-sm text-muted-foreground">{formatoDia(fechaDeColumnaDate(p.inicio), { day: "numeric", month: "short" })} al {formatoDia(fechaDeColumnaDate(p.fin), { day: "numeric", month: "short" })}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {(() => {
                      const pub = publicacion.get(p.id)!;
                      return (
                        <>
                          <span className="text-xs text-muted-foreground">{pub.cursosCerrados} de {pub.totalCursos} cursos cerrados</span>
                          {pub.publicadaAt && (
                            <span className="inline-flex items-center gap-1.5 rounded-pildora bg-llego-fondo px-2.5 py-1 text-xs font-semibold text-llego">
                              <Megaphone className="size-3.5" strokeWidth={2} aria-hidden />Libreta publicada el {fechaLima(pub.publicadaAt)}
                            </span>
                          )}
                          {pub.publicadaAt ? (
                            <BotonConfirmar
                              etiqueta="Reenviar aviso"
                              titulo={`¿Reenviar el aviso de ${p.nombre} ${p.anio}?`}
                              descripcion="Las familias volverán a recibir el aviso de que la libreta está disponible."
                              confirmar="Reenviar aviso"
                              accion={publicarLibretaAction.bind(null, slug, p.id, true)}
                            />
                          ) : pub.puedePublicar ? (
                            <BotonConfirmar
                              etiqueta="Publicar libreta y avisar a las familias"
                              titulo={`¿Publicar la libreta de ${p.nombre} ${p.anio}?`}
                              descripcion="Las familias podrán ver y descargar la libreta, y recibirán un aviso por correo o push según sus preferencias."
                              confirmar="Publicar y avisar"
                              variante="default"
                              accion={publicarLibretaAction.bind(null, slug, p.id, false)}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">Para publicar la libreta, cierra el periodo o las notas de todos los cursos.</span>
                          )}
                        </>
                      );
                    })()}
                    <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-xs font-semibold ${p.cerrado ? "bg-muted text-muted-foreground" : "bg-llego-fondo text-llego"}`}>
                      {p.cerrado ? <Lock className="size-3.5" strokeWidth={2} aria-hidden /> : <CheckCircle2 className="size-3.5" strokeWidth={2} aria-hidden />}
                      {p.cerrado ? "Cerrado" : "Abierto"}
                    </span>
                    <BotonConfirmar
                      etiqueta={p.cerrado ? "Abrir de nuevo" : "Cerrar periodo"}
                      titulo={p.cerrado ? `¿Abrir de nuevo ${p.nombre} ${p.anio}?` : `¿Cerrar ${p.nombre} ${p.anio}?`}
                      descripcion={p.cerrado ? "Los profesores podrán volver a cambiar sus notas." : "Los profesores ya no podrán cambiar sus notas de este periodo."}
                      confirmar={p.cerrado ? "Abrir periodo" : "Cerrar periodo"}
                      peligro={!p.cerrado}
                      accion={cambiarEstadoPeriodoAction.bind(null, slug, p.id, !p.cerrado)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
