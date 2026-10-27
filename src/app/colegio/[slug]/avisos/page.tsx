import { Bell, Mail } from "lucide-react";
import type { Metadata } from "next";
import { Tarjeta } from "@/components/ui/Tarjeta";
import type { EstadoAviso } from "@/generated/prisma/enums";
import { panelAvisos } from "@/lib/server/avisos";
import { requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Avisos enviados" };

const PALABRA: Record<EstadoAviso, string> = {
  pendiente: "En cola", enviado: "Enviado", entregado: "Entregado", abierto: "Abierto",
  rebotado: "Rebotó", queja: "Marcado como spam", error: "Error", omitido: "Omitido",
};

export default async function AvisosPage({ params }: PageProps<"/colegio/[slug]/avisos">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  const panel = await panelAvisos(ctx);
  const formato = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: ctx.tenant.zonaHoraria });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Avisos enviados</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Tarjeta>
          <p className="text-sm text-pizarra">Correos enviados (30 días)</p>
          <p className="font-titulo text-3xl font-bold">{panel.enviados}</p>
        </Tarjeta>
        <Tarjeta>
          <p className="text-sm text-pizarra">Apertura (meta 70 %)</p>
          <p className="font-titulo text-3xl font-bold">{panel.apertura === null ? "—" : `${panel.apertura} %`}</p>
        </Tarjeta>
        <Tarjeta>
          <p className="text-sm text-pizarra">En cola · rebotes · errores</p>
          <p className="font-titulo text-3xl font-bold">
            {panel.conteo.pendiente ?? 0} · {(panel.conteo.rebotado ?? 0) + (panel.conteo.queja ?? 0)} · {panel.conteo.error ?? 0}
          </p>
        </Tarjeta>
      </div>
      <div className="overflow-x-auto rounded-lg border border-arena bg-superficie">
        <table className="w-full text-left text-sm">
          <thead className="bg-superficie-2 text-pizarra">
            <tr>
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Canal</th>
              <th className="px-3 py-2 font-medium">Asunto</th>
              <th className="px-3 py-2 font-medium">Destinatario</th>
              <th className="px-3 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-arena">
            {panel.recientes.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap px-3 py-2">{formato.format(a.createdAt)}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1">
                    {a.canal === "correo" ? <Mail className="h-4 w-4" strokeWidth={2} aria-hidden /> : <Bell className="h-4 w-4" strokeWidth={2} aria-hidden />}
                    {a.canal === "correo" ? "Correo" : "Push"}
                  </span>
                </td>
                <td className="px-3 py-2">{a.asunto}</td>
                <td className="max-w-48 truncate px-3 py-2">{a.canal === "correo" ? a.destinatario : "Dispositivo"}</td>
                <td className="px-3 py-2" title={a.error ?? undefined}>{PALABRA[a.estado]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
