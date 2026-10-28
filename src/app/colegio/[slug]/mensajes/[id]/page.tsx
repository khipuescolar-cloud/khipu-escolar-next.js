import { ArrowLeft, Eye } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import { requireConsentimiento } from "@/lib/server/consentimiento";
import { listarConversaciones, obtenerHilo } from "@/lib/server/mensajes";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { ListaConversaciones } from "../ListaConversaciones";
import { Hilo } from "./Hilo";

export const metadata: Metadata = { title: "Conversación" };

export default async function HiloPage({ params }: PageProps<"/colegio/[slug]/mensajes/[id]">) {
  const { slug, id } = await params;
  const ctx = await requireTenantContext(slug, ["apoderado", "profesor", "direccion"]);
  requireFeature(ctx, "mensajes");
  await requireConsentimiento(ctx);
  // Primero el hilo (marca como leídos), luego la lista: así los contadores salen al día.
  const hilo = await obtenerHilo(ctx, id);
  const conversaciones = await listarConversaciones(ctx);

  return (
    <div className="lg:grid lg:grid-cols-[22rem_1fr] lg:gap-6">
      <aside className="hidden self-start overflow-hidden rounded-lg border bg-card lg:block">
        <h2 className="border-b px-4 py-3 text-base font-semibold">Mensajes</h2>
        <ListaConversaciones filas={conversaciones} activa={id} compacta />
      </aside>

      <section className="flex min-w-0 flex-col gap-3">
        <Link href="/mensajes" className={buttonVariants({ variant: "ghost", size: "sm", className: "self-start lg:hidden" })}>
          <ArrowLeft strokeWidth={2} aria-hidden /> Mensajes
        </Link>
        {!hilo.puedeEscribir && (
          <Alerta tipo="info">
            <Eye className="mr-1 inline h-4 w-4" strokeWidth={2} aria-hidden /> Estás leyendo como Dirección. No puedes escribir en esta conversación y tu lectura queda registrada.
          </Alerta>
        )}
        <Hilo inicial={hilo} />
      </section>
    </div>
  );
}
