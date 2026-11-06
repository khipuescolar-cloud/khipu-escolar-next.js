import { Download, FileArchive, PackagePlus } from "lucide-react";
import type { Metadata } from "next";
import { TituloBloque } from "@/components/shell/TituloBloque";
import { MigasSeccion } from "@/components/colegio/MigasSeccion";
import { forbidden } from "next/navigation";
import { EstadoExportacion } from "@/components/exportacion/EstadoExportacion";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Flash } from "@/components/ui/Flash";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EXPORTACION_VENCE_DIAS, listarExportaciones } from "@/lib/server/exportar";
import { requireTenantContext } from "@/lib/server/tenant";
import { prepararExportacionAction } from "./actions";

export const metadata: Metadata = { title: "Exportar datos" };

const fecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" });
const tamanio = (b: number | null) => (b == null ? "—" : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

export default async function ExportarPage({ params, searchParams }: PageProps<"/colegio/[slug]/configuracion/exportar">) {
  const { slug } = await params;
  const { ok, error } = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  if (ctx.soporte) forbidden(); // el ZIP incluye chats y notas: nunca en modo soporte
  const filas = await listarExportaciones(ctx.tenant.id);
  const enCurso = filas.some((f) => f.estado === "pendiente" || f.estado === "procesando");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <EncabezadoPagina
          titulo="Exportar datos"
          descripcion="Una copia de todo lo del colegio: tablas en JSON y los archivos subidos, en un ZIP."
          migas={<MigasSeccion ruta={[{ href: "/configuracion", texto: "Configuración" }]} actual="Exportar datos" />}
        />
        <Flash ok={ok} error={error} />
      </div>

      <section aria-labelledby="exportar-nueva" className="flex max-w-3xl flex-col gap-3">
        <TituloBloque id="exportar-nueva">Preparar una copia</TituloBloque>
        <p className="text-cuerpo-sm text-pretty text-muted-foreground">
          Preparar la copia puede tardar unos minutos. Cuando esté lista, aparecerá abajo y podrás descargarla durante {EXPORTACION_VENCE_DIAS} días.
          El archivo contiene datos personales de menores y familias: guárdalo con cuidado.
        </p>
        <form action={prepararExportacionAction}>
          <Boton type="submit" disabled={enCurso}>
            <PackagePlus strokeWidth={2} aria-hidden /> Preparar exportación
          </Boton>
        </form>
        {enCurso && <p className="text-cuerpo-sm text-muted-foreground">Ya hay una exportación en preparación. Actualiza esta página en unos minutos.</p>}
      </section>

      {filas.length === 0 ? (
        <EstadoVacio icono={FileArchive} titulo="Aún no pediste exportaciones" descripcion="Cuando prepares una, aparecerá aquí con su estado." />
      ) : (
        <section aria-labelledby="exportar-historial" className="flex flex-col gap-3">
        <TituloBloque id="exportar-historial">Exportaciones anteriores</TituloBloque>
        <div className="overflow-hidden rounded-[14px] border border-borde-sutil bg-card">
          <Table>
            <caption className="sr-only">Exportaciones del colegio</caption>
            <TableHeader>
              <TableRow className="bg-superficie-2/60 hover:bg-superficie-2/60">
                <TableHead>Pedida</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Tamaño</TableHead>
                <TableHead className="text-right">Descarga</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{fecha.format(f.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <EstadoExportacion estado={f.estado} />
                      {f.error && <span className="text-cuerpo-sm text-muted-foreground">No se pudo preparar. Inténtalo de nuevo o escríbenos.</span>}
                      {f.estado === "vencida" && <span className="text-cuerpo-sm text-muted-foreground">Pasaron {EXPORTACION_VENCE_DIAS} días: prepara una nueva.</span>}
                    </div>
                  </TableCell>
                  <TableCell>{tamanio(f.bytes)}</TableCell>
                  <TableCell className="text-right">
                    {f.descargable ? (
                      <div className="flex flex-col items-end gap-1">
                        <a href={`/api/exportar/${f.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                          <Download strokeWidth={2} aria-hidden /> Descargar
                        </a>
                        {f.venceAt && <span className="text-cuerpo-sm text-muted-foreground">Vence el {fecha.format(f.venceAt)}</span>}
                      </div>
                    ) : (
                      <span className="text-cuerpo-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </section>
      )}
    </div>
  );
}
