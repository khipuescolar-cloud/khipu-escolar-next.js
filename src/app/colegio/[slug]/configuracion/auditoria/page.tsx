import { ArrowLeft, Download, Eye, FilePlus2, LogIn, Pencil, ScrollText, Send, Trash2, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Badge } from "@/components/ui/badge";
import { Boton } from "@/components/ui/Boton";
import { Selector } from "@/components/ui/Selector";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { listarAuditoria } from "@/lib/server/exportar";
import { requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Auditoría" };

const ACCIONES = ["ver", "crear", "editar", "borrar", "exportar", "enviar", "login"];
const ICONO_ACCION: Record<string, LucideIcon> = { ver: Eye, crear: FilePlus2, editar: Pencil, borrar: Trash2, exportar: Download, enviar: Send, login: LogIn };
const fecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Lima" });

export default async function AuditoriaPage({ params, searchParams }: PageProps<"/colegio/[slug]/configuracion/auditoria">) {
  const { slug } = await params;
  const { accion } = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  const filtro = typeof accion === "string" && ACCIONES.includes(accion) ? accion : undefined;
  const filas = await listarAuditoria(ctx, { accion: filtro });

  return (
    <div className="flex flex-col gap-6">
      <Link href="/configuracion" className="inline-flex w-fit items-center gap-1.5 enlace">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Configuración
      </Link>
      <EncabezadoPagina titulo="Auditoría" descripcion="Los últimos 200 registros de quién vio o cambió datos." />
      <Tarjeta className="-mt-2 p-4">
        <form method="get" className="flex flex-wrap items-end gap-3" role="search">
          <Selector etiqueta="Acción" name="accion" defaultValue={filtro ?? ""}>
            <option value="">Todas</option>
            {ACCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
          </Selector>
          <Boton type="submit" variante="secundario">Filtrar</Boton>
          {filtro && <Link href="/configuracion/auditoria" className="inline-flex h-10 items-center px-2 enlace">Limpiar</Link>}
        </form>
      </Tarjeta>
      {filas.length === 0 ? (
        <EstadoVacio icono={ScrollText} titulo="Sin registros" descripcion="Cuando alguien vea o cambie datos de alumnos, aparecerá aquí." />
      ) : (
        <Tarjeta className="overflow-hidden p-0">
          <Table>
            <caption className="sr-only">Registro de auditoría</caption>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="h-11 px-4">Fecha</TableHead>
                <TableHead className="h-11 px-4">Quién</TableHead>
                <TableHead className="h-11 px-4">Acción</TableHead>
                <TableHead className="h-11 px-4">Qué</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((f) => {
                const Icono = ICONO_ACCION[f.accion] ?? ScrollText;
                return (
                  <TableRow key={f.id}>
                    <TableCell className="px-4 py-3 whitespace-nowrap">{fecha.format(f.createdAt)}</TableCell>
                    <TableCell className="px-4 py-3">{f.actor}</TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge variant="secondary" className="h-6 px-2.5"><Icono strokeWidth={2} aria-hidden /> {f.accion}</Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">{f.entidad}{f.entidadId ? ` · ${f.entidadId.slice(0, 8)}` : ""}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Tarjeta>
      )}
    </div>
  );
}
