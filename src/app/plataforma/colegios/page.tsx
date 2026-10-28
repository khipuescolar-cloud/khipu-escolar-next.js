import { Download, Filter, Plus, School, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { buttonVariants } from "@/components/ui/button";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NOMBRE_PLAN } from "@/lib/planes";
import { esquemaFiltroReporte, reporteColegios, requireAdminPlataforma } from "@/lib/server/plataforma";
import { EstadoColegio, fechaHora, fechaSimple, PlanColegio, porcentaje } from "../EstadoColegio";

export const metadata: Metadata = { title: "Colegios" };

export default async function ReporteColegios({ searchParams }: PageProps<"/plataforma/colegios">) {
  const admin = await requireAdminPlataforma();
  const sp = await searchParams;
  const filtro = esquemaFiltroReporte.parse({ q: sp.q, plan: sp.plan, estado: sp.estado });
  const filas = await reporteColegios(admin, filtro);
  const query = new URLSearchParams(Object.entries(filtro).filter((e): e is [string, string] => !!e[1])).toString();

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Colegios"
        descripcion="Todos los colegios de la plataforma. Asistencia, avisos y apertura de los últimos 7 días."
        acciones={
          <>
            <a href={`/colegios/reporte.csv${query ? `?${query}` : ""}`} className={buttonVariants({ variant: "outline" })}>
              <Download strokeWidth={2} aria-hidden /> Descargar CSV
            </a>
            <Link href="/colegios/nuevo" className={buttonVariants()}>
              <Plus strokeWidth={2} aria-hidden /> Nuevo colegio
            </Link>
          </>
        }
      />

      <Tarjeta className="-mt-2 p-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
          <div className="lg:w-72">
            <Campo etiqueta="Buscar" name="q" defaultValue={filtro.q ?? ""} placeholder="Nombre, dirección o ciudad" />
          </div>
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
          <div className="flex items-center gap-2">
            <Boton type="submit">
              <Filter strokeWidth={2} aria-hidden /> Filtrar
            </Boton>
            {query && (
              <Link href="/colegios" className={buttonVariants({ variant: "ghost" })}>
                <X strokeWidth={2} aria-hidden /> Quitar filtros
              </Link>
            )}
          </div>
        </form>
      </Tarjeta>

      {filas.length === 0 ? (
        <EstadoVacio
          icono={School}
          titulo="Ningún colegio coincide con los filtros."
          descripcion="Prueba con otros filtros o quítalos para ver todos los colegios."
          accion={<Link href="/colegios" className={buttonVariants({ variant: "outline" })}>Quitar filtros</Link>}
        />
      ) : (
        <Tarjeta className="overflow-hidden p-0">
          <Table className="min-w-[1040px]">
            <TableHeader>
              <TableRow>
                <TableHead className="sobretitulo pl-4">Colegio</TableHead>
                <TableHead className="sobretitulo">Plan</TableHead>
                <TableHead className="sobretitulo">Estado</TableHead>
                <TableHead className="sobretitulo text-right">Alumnos</TableHead>
                <TableHead className="sobretitulo text-right">Profesores</TableHead>
                <TableHead className="sobretitulo text-right">Familias</TableHead>
                <TableHead className="sobretitulo">Último ingreso</TableHead>
                <TableHead className="sobretitulo text-right">Asistencia (7 d)</TableHead>
                <TableHead className="sobretitulo text-right">Avisos (7 d)</TableHead>
                <TableHead className="sobretitulo text-right">Apertura</TableHead>
                <TableHead className="sobretitulo text-right">Rebotes</TableHead>
                <TableHead className="sobretitulo pr-4">Alta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="pl-4">
                    <Link href={`/colegios/${f.id}`} className="enlace font-semibold">{f.nombre}</Link>
                    <p className="font-mono text-cuerpo-sm text-muted-foreground">{f.slug}</p>
                  </TableCell>
                  <TableCell><PlanColegio plan={f.plan} /></TableCell>
                  <TableCell><EstadoColegio estado={f.estado} /></TableCell>
                  <TableCell className="text-right tabular-nums">{f.alumnos}</TableCell>
                  <TableCell className="text-right tabular-nums">{f.profesores}</TableCell>
                  <TableCell className="text-right tabular-nums">{f.familias}</TableCell>
                  <TableCell>{fechaHora(f.ultimoIngreso)}</TableCell>
                  <TableCell className="text-right tabular-nums">{f.asistencias7d}</TableCell>
                  <TableCell className="text-right tabular-nums">{f.avisos7d}</TableCell>
                  <TableCell className="text-right tabular-nums">{porcentaje(f.avisos7d ? f.abiertos7d / f.avisos7d : null)}</TableCell>
                  <TableCell className="text-right tabular-nums">{f.rebotes7d}</TableCell>
                  <TableCell className="pr-4">{fechaSimple(f.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Tarjeta>
      )}
    </div>
  );
}
