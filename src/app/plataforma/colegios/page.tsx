import { Download, Filter } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { NOMBRE_PLAN } from "@/lib/planes";
import { esquemaFiltroReporte, reporteColegios, requireAdminPlataforma } from "@/lib/server/plataforma";
import { EstadoColegio, fechaHora, fechaSimple, porcentaje } from "../EstadoColegio";

export const metadata: Metadata = { title: "Reporte de colegios" };

export default async function ReporteColegios({ searchParams }: PageProps<"/plataforma/colegios">) {
  const admin = await requireAdminPlataforma();
  const sp = await searchParams;
  const filtro = esquemaFiltroReporte.parse({ q: sp.q, plan: sp.plan, estado: sp.estado });
  const filas = await reporteColegios(admin, filtro);
  const query = new URLSearchParams(Object.entries(filtro).filter((e): e is [string, string] => !!e[1])).toString();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reporte de colegios</h1>
          <p className="text-sm text-pizarra">Conteos agregados. Asistencia, avisos y apertura de los últimos 7 días.</p>
        </div>
        <a href={`/colegios/reporte.csv${query ? `?${query}` : ""}`} className="inline-flex items-center gap-2 rounded-md border border-arena bg-superficie px-4 py-2.5 text-sm font-semibold hover:bg-superficie-2">
          <Download className="h-4 w-4" strokeWidth={2} aria-hidden /> Descargar CSV
        </a>
      </div>

      <Tarjeta className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Buscar</span>
            <input name="q" defaultValue={filtro.q ?? ""} placeholder="Nombre, dirección o ciudad" className="rounded-md border border-arena bg-superficie px-3 py-2.5 text-base" />
          </label>
          <Selector etiqueta="Plan" name="plan" defaultValue={filtro.plan ?? ""}>
            <option value="">Todos</option>
            <option value="basico">{NOMBRE_PLAN.basico}</option>
            <option value="fase2">{NOMBRE_PLAN.fase2}</option>
            <option value="promax">{NOMBRE_PLAN.promax}</option>
          </Selector>
          <Selector etiqueta="Estado" name="estado" defaultValue={filtro.estado ?? ""}>
            <option value="">Todos</option>
            <option value="activo">Activo</option>
            <option value="piloto">Piloto</option>
            <option value="suspendido">Suspendido</option>
          </Selector>
          <button className="inline-flex items-center gap-1.5 rounded-md bg-acento px-4 py-2.5 text-sm font-semibold text-sobre-acento">
            <Filter className="h-4 w-4" strokeWidth={2} aria-hidden /> Filtrar
          </button>
          {query && <Link href="/colegios" className="py-2.5 text-sm font-semibold text-acento">Quitar filtros</Link>}
        </form>
      </Tarjeta>

      {filas.length === 0 ? (
        <Tarjeta className="text-sm text-pizarra">Ningún colegio coincide con los filtros.</Tarjeta>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-arena bg-superficie">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-superficie-2 text-left text-xs uppercase tracking-wide text-pizarra">
              <tr>
                <th scope="col" className="px-3 py-2">Colegio</th>
                <th scope="col" className="px-3 py-2">Plan</th>
                <th scope="col" className="px-3 py-2">Estado</th>
                <th scope="col" className="px-3 py-2 text-right">Alumnos</th>
                <th scope="col" className="px-3 py-2 text-right">Profesores</th>
                <th scope="col" className="px-3 py-2 text-right">Familias</th>
                <th scope="col" className="px-3 py-2">Último ingreso</th>
                <th scope="col" className="px-3 py-2 text-right">Asistencia (7 d)</th>
                <th scope="col" className="px-3 py-2 text-right">Avisos (7 d)</th>
                <th scope="col" className="px-3 py-2 text-right">Apertura</th>
                <th scope="col" className="px-3 py-2 text-right">Rebotes</th>
                <th scope="col" className="px-3 py-2">Alta</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.id} className="border-t border-arena">
                  <td className="px-3 py-2">
                    <Link href={`/colegios/${f.id}`} className="font-semibold text-acento">{f.nombre}</Link>
                    <p className="font-mono text-xs text-pizarra">{f.slug}</p>
                  </td>
                  <td className="px-3 py-2">{NOMBRE_PLAN[f.plan]}</td>
                  <td className="px-3 py-2"><EstadoColegio estado={f.estado} /></td>
                  <td className="px-3 py-2 text-right">{f.alumnos}</td>
                  <td className="px-3 py-2 text-right">{f.profesores}</td>
                  <td className="px-3 py-2 text-right">{f.familias}</td>
                  <td className="px-3 py-2">{fechaHora(f.ultimoIngreso)}</td>
                  <td className="px-3 py-2 text-right">{f.asistencias7d}</td>
                  <td className="px-3 py-2 text-right">{f.avisos7d}</td>
                  <td className="px-3 py-2 text-right">{porcentaje(f.avisos7d ? f.abiertos7d / f.avisos7d : null)}</td>
                  <td className="px-3 py-2 text-right">{f.rebotes7d}</td>
                  <td className="px-3 py-2">{fechaSimple(f.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
