import { CheckCircle2, Lock, LockOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormAccion } from "@/components/FormAccion";
import { Campo } from "@/components/ui/Campo";
import { Tarjeta } from "@/components/ui/Tarjeta";
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
      <div>
        <Link href="/notas" className="text-sm font-semibold text-acento underline-offset-4 hover:underline">← Volver a notas</Link>
        <h1 className="mt-1 text-2xl font-bold">Periodos</h1>
        <p className="text-sm text-pizarra">Al cerrar un periodo, los profesores ya no pueden cambiar sus notas.</p>
      </div>
      <Tarjeta>
        <ul className="flex flex-col gap-3">
          {periodos.length === 0 && <li className="text-sm text-pizarra">Aún no hay periodos.</li>}
          {periodos.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-arena pb-3 last:border-0 last:pb-0">
              <div>
                <p className="font-medium">{p.nombre} {p.anio}</p>
                <p className="text-sm text-pizarra">{formatoDia(fechaDeColumnaDate(p.inicio), { day: "numeric", month: "short" })} al {formatoDia(fechaDeColumnaDate(p.fin), { day: "numeric", month: "short" })}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-xs font-semibold ${p.cerrado ? "bg-superficie-2 text-pizarra" : "bg-llego-fondo text-llego"}`}>
                  {p.cerrado ? <Lock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> : <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />}
                  {p.cerrado ? "Cerrado" : "Abierto"}
                </span>
                <FormAccion accion={cambiarEstadoPeriodoAction.bind(null, slug, p.id, !p.cerrado)} etiqueta={p.cerrado ? "Abrir de nuevo" : "Cerrar periodo"} variante="secundario" className="contents" />
              </div>
            </li>
          ))}
        </ul>
      </Tarjeta>
      <Tarjeta>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><LockOpen className="h-5 w-5" strokeWidth={2} aria-hidden />Nuevo periodo</h2>
        <FormAccion accion={crearPeriodoAction.bind(null, slug)} etiqueta="Crear periodo" className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Nombre" name="nombre" required placeholder="I Bimestre" />
          <Campo etiqueta="Año" name="anio" type="number" required defaultValue={anio} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Tipo</span>
            <select name="tipo" className="rounded-md border border-arena bg-superficie px-3 py-2.5">
              <option value="bimestre">Bimestre</option>
              <option value="trimestre">Trimestre</option>
              <option value="semestre">Semestre</option>
            </select>
          </label>
          <Campo etiqueta="Número" name="numero" type="number" min={1} max={6} required defaultValue={1} />
          <Campo etiqueta="Inicio" name="inicio" type="date" required />
          <Campo etiqueta="Fin" name="fin" type="date" required />
        </FormAccion>
      </Tarjeta>
    </div>
  );
}
