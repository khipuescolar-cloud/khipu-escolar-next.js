import { Download, NotebookText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Boton } from "@/components/ui/Boton";
import { Selector } from "@/components/ui/Selector";
import { buttonVariants } from "@/components/ui/button";
import { libretaVisibleParaFamilia } from "@/lib/libreta-publicacion";
import { datosLibreta, requireLibretaVisible, resumenLibretasSalon, salonIdsLibreta } from "@/lib/server/libreta";
import { alumnosVisibles, listarPeriodos, periodoParaLibreta } from "@/lib/server/notas";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { DocumentoLibreta } from "./DocumentoLibreta";
import { TablaLibretas } from "./TablaLibretas";

export const metadata: Metadata = { title: "Libreta" };
const uno = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;

export default async function LibretaPage({ params, searchParams }: PageProps<"/colegio/[slug]/libreta">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "libreta");
  if (!["apoderado", "profesor", "direccion"].includes(ctx.rol)) forbidden();
  const pedido = uno(sp.alumno);
  if (pedido) await requireLibretaVisible(ctx, pedido);
  const todos = await listarPeriodos(ctx);
  const descripcion = "Calificaciones por competencia y conclusiones de cada periodo.";

  if (ctx.rol === "apoderado") {
    const alumnos = await alumnosVisibles(ctx);
    const alumno = alumnos.find((a) => a.id === pedido) ?? alumnos[0];
    const periodos = alumno ? todos.filter((p) => p.niveles.includes(alumno.salon.nivel) && libretaVisibleParaFamilia(p)) : [];
    const periodo = periodos.find((p) => p.id === uno(sp.periodo)) ?? periodoParaLibreta(periodos);
    if (!alumno || !periodo) return <><EncabezadoPagina titulo="Libreta" seccion="academico" descripcion={descripcion} /><EstadoVacio icono={NotebookText} titulo="Todavía no hay una libreta para mostrar" descripcion="Cuando el colegio publique la libreta de un periodo, la verás aquí y te avisaremos." /></>;
    const datos = await datosLibreta(ctx, alumno.id, periodo.id, "ver");
    return <div className="flex flex-col gap-5">
      <EncabezadoPagina titulo="Libreta" seccion="academico" descripcion={descripcion} acciones={<a href={"/api/libreta/" + alumno.id + "?periodo=" + periodo.id} className={buttonVariants()}><Download strokeWidth={2} aria-hidden />Descargar PDF</a>} />
      <section aria-label="Alumno y periodo" className="rounded-[14px] border border-borde-sutil bg-superficie p-4">
        <form method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          {alumnos.length > 1 ? <Selector etiqueta="Alumno" name="alumno" defaultValue={alumno.id}>{alumnos.map((x) => <option key={x.id} value={x.id}>{x.apellidos}, {x.nombres} · {x.salon.nombre}</option>)}</Selector> : <input type="hidden" name="alumno" value={alumno.id} />}
          <Selector etiqueta="Periodo" name="periodo" defaultValue={periodo.id}>{periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.anio}</option>)}</Selector>
          <Boton type="submit" variante="secundario">Ver</Boton>
        </form>
      </section>
      <DocumentoLibreta datos={datos} slug={slug} />
      <p className="text-sm"><Link href={"/notas?alumno=" + alumno.id + "&periodo=" + periodo.id} className="enlace">Ver el detalle de notas</Link></p>
    </div>;
  }

  const salonIds = await salonIdsLibreta(ctx);
  const salonPedido = uno(sp.salon);
  if (salonPedido && !salonIds.includes(salonPedido)) forbidden();
  const salones = await ctx.db.salon.findMany({ where: { id: { in: salonIds }, archivadoAt: null }, select: { id: true, nombre: true, nivel: true }, orderBy: { nombre: "asc" } });
  const alumnoPedido = pedido ? await ctx.db.alumno.findFirst({ where: { id: pedido }, select: { salonId: true } }) : null;
  const salon = salones.find((s) => s.id === alumnoPedido?.salonId) ?? salones.find((s) => s.id === uno(sp.salon)) ?? salones[0];
  const periodos = salon ? todos.filter((p) => p.niveles.includes(salon.nivel)) : [];
  const periodo = periodos.find((p) => p.id === uno(sp.periodo)) ?? periodoParaLibreta(periodos);
  if (!salon || !periodo) return <><EncabezadoPagina titulo="Libreta" seccion="academico" descripcion={descripcion} /><EstadoVacio icono={NotebookText} titulo="Todavía no hay una libreta para mostrar" descripcion={ctx.rol === "profesor" && salones.length === 0 ? "La libreta la ven el tutor del salón y la dirección." : "Cuando el colegio cree un periodo con notas, la verás aquí."} /></>;
  const resumen = await resumenLibretasSalon(ctx, salon.id, periodo.id);
  return <div className="flex flex-col gap-5">
    <EncabezadoPagina titulo="Libreta" seccion="academico" descripcion={descripcion} />
    <section aria-label="Salón y periodo" className="rounded-[14px] border border-borde-sutil bg-superficie p-4">
      <form method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Selector etiqueta="Salón" name="salon" defaultValue={salon.id}>{salones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</Selector>
        <Selector etiqueta="Periodo" name="periodo" defaultValue={periodo.id}>{periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.anio}{p.cerrado ? "" : " (en curso)"}</option>)}</Selector>
        <Boton type="submit" variante="secundario">Ver</Boton>
      </form>
    </section>
    <p className="text-cuerpo-sm text-muted-foreground">{resumen.alumnos.length} alumnos · Desliza la tabla para ver todas las competencias.</p>
    <TablaLibretas resumen={resumen} slug={slug} alumnoInicial={pedido} />
  </div>;
}
