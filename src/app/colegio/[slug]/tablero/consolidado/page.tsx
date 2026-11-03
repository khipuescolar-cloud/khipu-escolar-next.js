import { ArrowLeft, FileSpreadsheet, FileText, GraduationCap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ZodError } from "zod";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Selector } from "@/components/ui/Selector";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hoyDelColegio } from "@/lib/server/asistencia";
import { salonesActivos } from "@/lib/server/salones-activos";
import { requireTablero, opcionesDePeriodo } from "@/lib/server/tablero";
import { consolidadoNotas, filtrosConsolidado } from "@/lib/server/tablero-consolidado";
import { requireTenantContext } from "@/lib/server/tenant";
import { periodoVigente } from "@/lib/tablero";
import { tablaDeConsolidado, textoCeldaConsolidado } from "@/lib/tablero-consolidado";

export const metadata: Metadata = { title: "Consolidado de notas" };

export default async function ConsolidadoPage({ params, searchParams }: PageProps<"/colegio/[slug]/tablero/consolidado">) {
  const { slug } = await params;
  const sp = await searchParams;
  const uno = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);
  const ctx = await requireTenantContext(slug, ["direccion"]);
  requireTablero(ctx);
  const [salones, periodos] = await Promise.all([salonesActivos(ctx, { id: true, nombre: true }), opcionesDePeriodo(ctx)]);
  const vigente = periodoVigente(periodos, hoyDelColegio(ctx).isoFecha);
  const hayFiltros = uno("salon") && uno("periodo");

  let error: string | null = null;
  let consolidado: Awaited<ReturnType<typeof consolidadoNotas>> | null = null;
  if (hayFiltros) {
    try {
      consolidado = await consolidadoNotas(ctx, filtrosConsolidado(uno));
    } catch (e) {
      if (!(e instanceof ZodError)) throw e;
      error = "Elige un salón y un periodo válidos.";
    }
  }
  const tabla = consolidado ? tablaDeConsolidado(consolidado) : null;
  const consulta = new URLSearchParams({ salon: uno("salon") ?? "", periodo: uno("periodo") ?? "" }).toString();

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Consolidado de notas"
        descripcion="Notas de todo un salón en un periodo: alumnos por competencia, con descarga en Excel y PDF."
        acciones={
          <Link href="/tablero" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Tablero
          </Link>
        }
      />
      <form method="get" className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
        <Selector etiqueta="Salón" name="salon" defaultValue={uno("salon") ?? ""} required>
          <option value="" disabled>Elige un salón</option>
          {salones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </Selector>
        <Selector etiqueta="Periodo" name="periodo" defaultValue={uno("periodo") ?? vigente?.id ?? ""} required>
          <option value="" disabled>Elige un periodo</option>
          {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </Selector>
        <Boton type="submit" variante="secundario">Ver consolidado</Boton>
      </form>
      {error && <Alerta tipo="error">{error}</Alerta>}
      {!hayFiltros && !error && <EstadoVacio icono={GraduationCap} titulo="Elige un salón y un periodo" descripcion="Verás las calificaciones de cada alumno por competencia y podrás descargarlas." />}
      {consolidado && tabla && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-cuerpo-sm text-muted-foreground">{tabla.subtitulo}</p>
            <div className="flex flex-wrap gap-2">
              <a href={`/api/tablero/consolidado/excel?${consulta}`} className={buttonVariants({ variant: "outline" })}>
                <FileSpreadsheet className="size-4" strokeWidth={2} aria-hidden /> Descargar Excel
              </a>
              <a href={`/api/tablero/consolidado/pdf?${consulta}`} className={buttonVariants({ variant: "outline" })}>
                <FileText className="size-4" strokeWidth={2} aria-hidden /> Descargar PDF
              </a>
            </div>
          </div>
          {consolidado.columnas.length === 0 ? (
            <EstadoVacio icono={GraduationCap} titulo="Este salón aún no tiene competencias" descripcion="Los profesores las crean en Notas. Cuando existan, aparecerán aquí." />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead rowSpan={2}>Alumno</TableHead>
                      {tabla.grupos.map((g) => <TableHead key={g.texto} colSpan={g.columnas} className="text-center">{g.texto}</TableHead>)}
                      <TableHead rowSpan={2} className="text-center">En riesgo</TableHead>
                    </TableRow>
                    <TableRow>
                      {consolidado.columnas.map((c) => <TableHead key={c.competenciaId} className="min-w-28 text-center whitespace-normal">{c.competencia}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tabla.filas.map((f) => (
                      <TableRow key={String(f[0])}>
                        {f.map((c, i) => <TableCell key={i} className={i === 0 ? "font-medium" : "text-center tabular-nums"}>{textoCeldaConsolidado(c, i, "dato")}</TableCell>)}
                      </TableRow>
                    ))}
                    <TableRow>
                      {tabla.pie.map((c, i) => <TableCell key={i} className={i === 0 ? "font-semibold" : "text-center font-semibold tabular-nums"}>{i === 0 ? String(c) : c === null ? "" : textoCeldaConsolidado(c, i, "pie")}</TableCell>)}
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          <p className="text-sm text-muted-foreground">{tabla.nota}</p>
        </>
      )}
    </div>
  );
}
