import { MailOpen, MessageSquarePlus, MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { requireConsentimiento } from "@/lib/server/consentimiento";
import { listarConversaciones } from "@/lib/server/mensajes";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Mensajes" };

export default async function MensajesPage({ params }: PageProps<"/colegio/[slug]/mensajes">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["apoderado", "profesor", "direccion"]);
  requireFeature(ctx, "mensajes");
  await requireConsentimiento(ctx);
  const conversaciones = await listarConversaciones(ctx);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MessagesSquare className="h-6 w-6 text-acento" strokeWidth={2} aria-hidden /> Mensajes
          </h1>
          <p className="text-sm text-pizarra">
            {ctx.rol === "direccion" ? "Solo lectura: cada vez que abres un chat queda registrado." : "Hablas con el colegio sin compartir tu teléfono."}
          </p>
        </div>
        {ctx.rol !== "direccion" && (
          <Link href="/mensajes/nuevo" className="inline-flex items-center gap-2 rounded-md bg-acento px-4 py-2.5 text-sm font-semibold text-sobre-acento hover:opacity-90">
            <MessageSquarePlus className="h-4 w-4" strokeWidth={2} aria-hidden /> Nuevo mensaje
          </Link>
        )}
      </div>

      {conversaciones.length === 0 ? (
        <Tarjeta className="text-center text-pizarra">Aún no hay conversaciones.</Tarjeta>
      ) : (
        <ul className="flex flex-col gap-3">
          {conversaciones.map((c) => (
            <li key={c.id}>
              <Link href={`/mensajes/${c.id}`} className="flex items-start justify-between gap-3 rounded-lg border border-arena bg-superficie p-4 transition hover:border-acento">
                <span className="min-w-0">
                  <span className={`block truncate ${c.noLeidos > 0 ? "font-bold" : "font-semibold"}`}>{c.etiqueta}</span>
                  <span className="block truncate text-sm text-pizarra">
                    {c.ultimoMensaje ? `${c.ultimoMensaje.propio ? "Tú: " : ""}${c.ultimoMensaje.cuerpo}` : "Sin mensajes todavía"}
                  </span>
                </span>
                {c.noLeidos > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-pildora bg-acento px-2.5 py-1 text-xs font-semibold text-sobre-acento">
                    <MailOpen className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> {c.noLeidos} sin leer
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
