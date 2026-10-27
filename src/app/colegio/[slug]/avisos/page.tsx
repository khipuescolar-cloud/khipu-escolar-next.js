import { CheckCircle2, Clock, MailX, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { panelAvisos } from "@/lib/server/avisos-panel";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import type { EstadoAviso, TipoAviso } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Avisos enviados" };

const ESTADOS: EstadoAviso[] = ["pendiente", "enviando", "enviado", "entregado", "abierto", "rebotado", "queja", "error", "omitido"];
const TIPOS: TipoAviso[] = ["asistencia", "resumen_llegadas", "mensaje", "comunicado", "invitacion", "justificacion", "tarea", "alerta_direccion"];
const fecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" });

export default async function AvisosPage({ params, searchParams }: PageProps<"/colegio/[slug]/avisos">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  requireFeature(ctx, "avisos");
  const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const estado = ESTADOS.find((e) => e === uno(sp.estado));
  const tipo = TIPOS.find((t) => t === uno(sp.tipo));
  const q = uno(sp.q)?.trim() || undefined;
  const { avisos, semana } = await panelAvisos(ctx, { estado, tipo, q });
  const cumple = semana.porcentaje !== null && semana.porcentaje >= semana.meta;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Avisos enviados</h1>
      <Tarjeta className="flex flex-wrap items-center gap-4">
        <TrendingUp className="h-8 w-8 text-acento" strokeWidth={2} aria-hidden />
        <div>
          <p className="text-sm text-pizarra">Apertura de la semana (últimos 7 días)</p>
          <p className="font-titulo text-3xl font-bold">{semana.porcentaje === null ? "Sin envíos" : `${semana.porcentaje} %`}</p>
          <p className="text-sm text-pizarra">{semana.abiertos} abiertos de {semana.enviados} enviados · meta {semana.meta} %</p>
        </div>
        {semana.porcentaje !== null && (
          <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-xs font-semibold ${cumple ? "bg-llego-fondo text-llego" : "bg-tarde-fondo text-tarde"}`}>
            {cumple ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> : <Clock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />}
            {cumple ? "Meta alcanzada" : "Por debajo de la meta"}
          </span>
        )}
      </Tarjeta>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <Selector etiqueta="Estado" name="estado" defaultValue={estado ?? ""}>
          <option value="">Todos</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </Selector>
        <Selector etiqueta="Tipo" name="tipo" defaultValue={tipo ?? ""}>
          <option value="">Todos</option>
          {TIPOS.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
        </Selector>
        <Campo etiqueta="Correo contiene" name="q" defaultValue={q ?? ""} />
        <Boton type="submit" variante="secundario">Filtrar</Boton>
        <Link href="/avisos" className="pb-3 text-sm text-acento">Limpiar</Link>
      </form>

      <div className="overflow-x-auto rounded-lg border border-arena bg-superficie">
        <table className="w-full text-left text-sm">
          <thead className="bg-superficie-2 text-pizarra">
            <tr><th className="p-3">Fecha</th><th className="p-3">Tipo</th><th className="p-3">Para</th><th className="p-3">Asunto</th><th className="p-3">Estado</th></tr>
          </thead>
          <tbody>
            {avisos.map((a) => (
              <tr key={a.id} className="border-t border-arena">
                <td className="whitespace-nowrap p-3">{fecha.format(a.createdAt)}</td>
                <td className="p-3">{a.tipo.replace("_", " ")}</td>
                <td className="p-3">{a.destinatario}</td>
                <td className="p-3">{a.asunto}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    {a.estado === "error" || a.estado === "rebotado" || a.estado === "queja" ? <MailX className="h-3.5 w-3.5 text-falta" strokeWidth={2} aria-hidden /> : a.estado === "abierto" ? <CheckCircle2 className="h-3.5 w-3.5 text-llego" strokeWidth={2} aria-hidden /> : <Clock className="h-3.5 w-3.5 text-pizarra" strokeWidth={2} aria-hidden />}
                    {a.estado}
                  </span>
                </td>
              </tr>
            ))}
            {avisos.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-pizarra">No hay avisos con ese filtro.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
