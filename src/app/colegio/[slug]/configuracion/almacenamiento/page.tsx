import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { requireTenantContext } from "@/lib/server/tenant";
import { requireFeature } from "@/lib/server/plan";
import { resumenAlmacenamiento } from "@/lib/server/almacenamiento";
export default async function Almacenamiento({ params }: PageProps<"/colegio/[slug]/configuracion/almacenamiento">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  requireFeature(ctx, "documentos");
  const r = await resumenAlmacenamiento(ctx);
  const formato = (b: bigint) => `${(Number(b) / 1024 ** 3).toFixed(2)} GB`;
  const porcentaje = r.limiteBytes ? Math.min(100, Number(r.usadoBytes * BigInt(100) / r.limiteBytes)) : null;
  return <main className="flex flex-col gap-8"><EncabezadoPagina seccion="colegio" titulo="Almacenamiento" descripcion="Espacio usado por los archivos del colegio." />
    <section className="max-w-3xl rounded-xl border bg-card p-6"><h2 className="font-heading text-lg">Uso del colegio</h2><p className="mt-3 text-2xl font-semibold tabular-nums">{formato(r.usadoBytes)}{r.limiteBytes ? ` de ${formato(r.limiteBytes)}` : " · solo medición"}</p>{porcentaje !== null && <div role="progressbar" aria-label="Espacio usado" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100} className="mt-4 h-3 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${porcentaje}%` }} /></div>}</section>
    <section className="max-w-3xl"><h2 className="font-heading text-lg">Por categoría</h2><ul className="mt-3 divide-y rounded-xl border bg-card">{r.categorias.map((c) => <li key={c.categoria} className="flex justify-between gap-4 p-4"><span>{c.categoria.replaceAll("_", " ")} · {c.archivos} archivos</span><span className="tabular-nums">{formato(c.bytes)}</span></li>)}</ul></section>
  </main>;
}
