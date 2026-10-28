import { ChevronRight, Download, Filter, History, X } from "lucide-react";
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
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { esquemaFiltroAuditoria, listarAuditoria, opcionesFiltroAuditoria } from "@/lib/server/plataforma-auditoria";
import { fechaHora } from "../EstadoColegio";

export const metadata: Metadata = { title: "Auditoría" };

export default async function Auditoria({ searchParams }: PageProps<"/plataforma/auditoria">) {
  const admin = await requireAdminPlataforma();
  const sp = await searchParams;
  const filtro = esquemaFiltroAuditoria.parse({ tenantId: sp.colegio, accion: sp.accion, actor: sp.actor, desde: sp.desde, hasta: sp.hasta, cursor: sp.cursor });
  const [{ filas, siguienteCursor }, opciones] = await Promise.all([listarAuditoria(admin, filtro), opcionesFiltroAuditoria(admin)]);
  const base = Object.entries({ colegio: filtro.tenantId, accion: filtro.accion, actor: filtro.actor, desde: filtro.desde, hasta: filtro.hasta }).filter((e): e is [string, string] => !!e[1]);
  const query = new URLSearchParams(base).toString();
  const siguiente = siguienteCursor ? `/auditoria?${new URLSearchParams([...base, ["cursor", siguienteCursor]])}` : null;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Auditoría"
        descripcion="Todo lo que hizo el equipo Khipu en la plataforma. Del más reciente al más antiguo."
        acciones={
          <a href={`/auditoria/auditoria.csv${query ? `?${query}` : ""}`} className={buttonVariants({ variant: "outline" })}>
            <Download strokeWidth={2} aria-hidden /> Descargar CSV
          </a>
        }
      />

      <Tarjeta className="-mt-2 p-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
          <Selector etiqueta="Colegio" name="colegio" defaultValue={filtro.tenantId ?? ""}>
            <option value="">Todos</option>
            {opciones.colegios.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Selector>
          <Selector etiqueta="Acción" name="accion" defaultValue={filtro.accion ?? ""}>
            <option value="">Todas</option>
            {opciones.acciones.map((a) => <option key={a.valor} value={a.valor}>{a.texto}</option>)}
          </Selector>
          <div className="lg:w-56"><Campo etiqueta="Quién" name="actor" defaultValue={filtro.actor ?? ""} placeholder="Nombre o correo" /></div>
          <Campo etiqueta="Desde" name="desde" type="date" defaultValue={filtro.desde ?? ""} />
          <Campo etiqueta="Hasta" name="hasta" type="date" defaultValue={filtro.hasta ?? ""} />
          <div className="flex items-center gap-2">
            <Boton type="submit"><Filter strokeWidth={2} aria-hidden /> Filtrar</Boton>
            {(query || filtro.cursor) && (
              <Link href="/auditoria" className={buttonVariants({ variant: "ghost" })}><X strokeWidth={2} aria-hidden /> Quitar filtros</Link>
            )}
          </div>
        </form>
      </Tarjeta>

      {filas.length === 0 ? (
        <EstadoVacio icono={History} titulo="No hay registros con esos filtros." descripcion="Prueba con otro rango de fechas o quita los filtros." />
      ) : (
        <>
          <Tarjeta className="overflow-hidden p-0">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="sobretitulo pl-4">Fecha</TableHead>
                  <TableHead className="sobretitulo">Acción</TableHead>
                  <TableHead className="sobretitulo">Quién</TableHead>
                  <TableHead className="sobretitulo">Colegio</TableHead>
                  <TableHead className="sobretitulo pr-4">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="pl-4 align-top">{fechaHora(f.fecha)}</TableCell>
                    <TableCell className="align-top font-medium">{f.texto}</TableCell>
                    <TableCell className="align-top">
                      {f.actor ? <>{f.actor.nombre}<p className="text-cuerpo-sm text-muted-foreground">{f.actor.email}</p></> : <span className="text-muted-foreground">Cuenta eliminada</span>}
                    </TableCell>
                    <TableCell className="align-top">
                      {f.colegio ? <Link href={`/colegios/${f.colegio.id}`} className="enlace">{f.colegio.nombre}</Link> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="pr-4 align-top">
                      {f.detalle === null ? (
                        <span className="text-muted-foreground">Sin detalle</span>
                      ) : (
                        <details className="group">
                          <summary className="enlace inline-flex cursor-pointer items-center gap-1 text-cuerpo-sm">
                            <ChevronRight className="size-4 transition-transform group-open:rotate-90" strokeWidth={2} aria-hidden /> Ver detalle
                          </summary>
                          <pre className="mt-2 max-w-md overflow-x-auto rounded-md bg-superficie-2 p-2 font-mono text-xs">{JSON.stringify(f.detalle, null, 2)}</pre>
                        </details>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Tarjeta>
          <nav aria-label="Paginación" className="flex items-center justify-between gap-2">
            {filtro.cursor ? <Link href={query ? `/auditoria?${query}` : "/auditoria"} className={buttonVariants({ variant: "outline" })}>Volver al inicio</Link> : <span />}
            {siguiente && <Link href={siguiente} className={buttonVariants({ variant: "outline" })}>Más antiguos <ChevronRight strokeWidth={2} aria-hidden /></Link>}
          </nav>
        </>
      )}
    </div>
  );
}
