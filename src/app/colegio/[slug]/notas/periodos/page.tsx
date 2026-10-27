import { ArrowLeft, CalendarDays, CheckCircle2, Lock, Plus } from "lucide-react";
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
import { formatoDia, fechaDeColumnaDate } from "@/lib/fechas";
import { listarPeriodos } from "@/lib/server/notas";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { cambiarEstadoPeriodoAction, crearPeriodoAction } from "../actions";

export const metadata: Metadata = { title: "Periodos" };

export default async function PeriodosPage({ params }: PageProps<"/colegio/[slug]/notas/periodos">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  requireFeature(ctx, "notas");
  const periodos = await listarPeriodos(ctx);
  const anio = new Date().getFullYear();

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        titulo="Periodos"
        descripcion="Al cerrar un periodo, los profesores ya no pueden cambiar sus notas."
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
