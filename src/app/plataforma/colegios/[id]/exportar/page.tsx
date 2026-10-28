import { ArrowLeft, Download, FileArchive, PackagePlus } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { EstadoExportacion } from "@/components/exportacion/EstadoExportacion";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Flash } from "@/components/ui/Flash";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/server/db";
import { EXPORTACION_VENCE_DIAS, listarExportaciones } from "@/lib/server/exportar";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { fechaHora } from "../../../EstadoColegio";
import { prepararExportacionPlataformaAction } from "./actions";

export const metadata: Metadata = { title: "Exportar colegio" };

// Garantía de salida (specs/15 y 16): el super administrador pide el ZIP de un colegio y lo descarga cuando está listo.
export default async function ExportarColegioPage({ params, searchParams }: PageProps<"/plataforma/colegios/[id]/exportar">) {
  await requireAdminPlataforma();
  const { id } = await params;
  const { ok, error } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const tenant = await db.tenant.findUnique({ where: { id }, select: { id: true, nombre: true } });
  if (!tenant) notFound();
  const filas = await listarExportaciones(tenant.id);
  const enCurso = filas.some((f) => f.estado === "pendiente" || f.estado === "procesando");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href={`/colegios/${tenant.id}`} className="inline-flex min-h-10 w-fit items-center gap-1 text-cuerpo-sm enlace font-semibold">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> {tenant.nombre}
      </Link>
      <div className="-mt-2">
        <EncabezadoPagina titulo="Exportar datos del colegio" descripcion={`ZIP con todas las tablas y archivos de ${tenant.nombre}. Disponible ${EXPORTACION_VENCE_DIAS} días.`} />
        <Flash ok={ok} error={error} />
      </div>
      <Tarjeta className="flex flex-col gap-3">
        <form action={prepararExportacionPlataformaAction}>
          <input type="hidden" name="tenantId" value={tenant.id} />
          <Boton type="submit" disabled={enCurso}>
            <PackagePlus strokeWidth={2} aria-hidden /> Preparar exportación
          </Boton>
        </form>
        {enCurso && <p className="text-cuerpo-sm text-muted-foreground">Ya hay una exportación en preparación. Actualiza esta página en unos minutos.</p>}
      </Tarjeta>
      {filas.length === 0 ? (
        <EstadoVacio icono={FileArchive} titulo="Sin exportaciones" descripcion="Cuando prepares una, aparecerá aquí con su estado." />
      ) : (
        <Tarjeta className="overflow-hidden p-0">
          <Table>
            <caption className="sr-only">Exportaciones del colegio</caption>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Pedida</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Descarga</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{fechaHora(f.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <EstadoExportacion estado={f.estado} />
                      {f.error && <span className="text-cuerpo-sm text-muted-foreground">{f.error}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {f.descargable ? (
                      <a href={`/colegios/${tenant.id}/exportar/descargar/${f.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        <Download strokeWidth={2} aria-hidden /> Descargar
                      </a>
                    ) : (
                      <span className="text-cuerpo-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Tarjeta>
      )}
    </div>
  );
}
