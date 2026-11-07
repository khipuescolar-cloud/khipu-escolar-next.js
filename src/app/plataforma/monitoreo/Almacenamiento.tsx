import { resumenAlmacenamientoPlataforma } from "@/lib/server/almacenamiento";
import { TituloBloque } from "@/components/shell/TituloBloque";
export async function Almacenamiento() {
  const colegios = await resumenAlmacenamientoPlataforma();
  return <section className="flex flex-col gap-3"><TituloBloque>Almacenamiento por colegio</TituloBloque><div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full text-sm"><thead><tr><th className="p-3 text-left">Colegio</th><th className="p-3 text-right">Usado</th><th className="p-3 text-right">Límite</th></tr></thead><tbody>{colegios.map((c) => <tr key={c.tenantId} className="border-t"><td className="p-3">{c.tenant.nombre}</td><td className="p-3 text-right tabular-nums">{(Number(c.usadoBytes) / 1024 ** 3).toFixed(2)} GB</td><td className="p-3 text-right tabular-nums">{c.limiteBytes ? `${(Number(c.limiteBytes) / 1024 ** 3).toFixed(0)} GB` : "Sin límite"}</td></tr>)}</tbody></table></div></section>;
}
