import type { Metadata } from "next";
import Link from "next/link";
import { Boton } from "@/components/ui/Boton";
import { Selector } from "@/components/ui/Selector";
import { listarAuditoria } from "@/lib/server/exportar";
import { requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Auditoría" };

const ACCIONES = ["ver", "crear", "editar", "borrar", "exportar", "enviar", "login"];
const fecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Lima" });

export default async function AuditoriaPage({ params, searchParams }: PageProps<"/colegio/[slug]/configuracion/auditoria">) {
  const { slug } = await params;
  const { accion } = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  const filtro = typeof accion === "string" && ACCIONES.includes(accion) ? accion : undefined;
  const filas = await listarAuditoria(ctx, { accion: filtro });

  return (
    <div className="flex flex-col gap-4">
      <Link href="/configuracion" className="text-sm font-semibold text-acento">← Configuración</Link>
      <h1 className="text-2xl font-bold">Auditoría</h1>
      <p className="text-sm text-pizarra">Los últimos 200 registros de quién vio o cambió datos.</p>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <Selector etiqueta="Acción" name="accion" defaultValue={filtro ?? ""}>
          <option value="">Todas</option>
          {ACCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
        </Selector>
        <Boton type="submit" variante="secundario">Filtrar</Boton>
      </form>
      <div className="overflow-x-auto rounded-lg border border-arena bg-superficie">
        <table className="w-full text-left text-sm">
          <thead className="bg-superficie-2 text-pizarra">
            <tr><th className="p-3">Fecha</th><th className="p-3">Quién</th><th className="p-3">Acción</th><th className="p-3">Qué</th></tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className="border-t border-arena">
                <td className="whitespace-nowrap p-3">{fecha.format(f.createdAt)}</td>
                <td className="p-3">{f.actor}</td>
                <td className="p-3">{f.accion}</td>
                <td className="p-3">{f.entidad}{f.entidadId ? ` · ${f.entidadId.slice(0, 8)}` : ""}</td>
              </tr>
            ))}
            {filas.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-pizarra">Sin registros.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
