import { Download, Eye, FilePlus2, LogIn, Pencil, ScrollText, Send, Trash2, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MigasSeccion } from "@/components/colegio/MigasSeccion";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Badge } from "@/components/ui/badge";
import { Boton } from "@/components/ui/Boton";
import { Selector } from "@/components/ui/Selector";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      <EncabezadoPagina
        titulo="Auditoría"
        descripcion="Los últimos 200 registros de quién vio o cambió datos."
        migas={<MigasSeccion ruta={[{ href: "/configuracion", texto: "Configuración" }]} actual="Auditoría" />}
      />
      <form method="get" role="search" aria-label="Filtros de auditoría" className="-mt-2 flex flex-wrap items-end gap-3 rounded-[14px] bg-superficie-2/60 px-4 py-3">
          <Selector etiqueta="Acción" name="accion" defaultValue={filtro ?? ""}>
            <option value="">Todas</option>
            {ACCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
          </Selector>
          <Boton type="submit" variante="secundario">Filtrar</Boton>
          {filtro && <Link href="/configuracion/auditoria" className="inline-flex min-h-10 items-center px-2 enlace">Limpiar</Link>}
      </form>
      {filas.length === 0 ? (
        <EstadoVacio icono={ScrollText} titulo="Sin registros" descripcion="Cuando alguien vea o cambie datos de alumnos, aparecerá aquí." />
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-borde-sutil bg-card">
          <Table>
            <caption className="sr-only">Registro de auditoría</caption>
            <TableHeader>
              <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
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
                    <TableCell className="px-4 py-3 whitespace-nowrap tabular-nums">{fecha.format(f.createdAt)}</TableCell>
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
        </div>
      )}
    </div>
  );
}
