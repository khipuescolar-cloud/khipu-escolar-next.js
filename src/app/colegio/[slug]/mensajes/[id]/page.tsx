import { ArrowLeft, Eye } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Alerta } from "@/components/ui/Alerta";
import { requireConsentimiento } from "@/lib/server/consentimiento";
import { obtenerHilo } from "@/lib/server/mensajes";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { Hilo } from "./Hilo";

export const metadata: Metadata = { title: "Conversación" };

export default async function HiloPage({ params }: PageProps<"/colegio/[slug]/mensajes/[id]">) {
  const { slug, id } = await params;
  const ctx = await requireTenantContext(slug, ["apoderado", "profesor", "direccion"]);
  requireFeature(ctx, "mensajes");
  await requireConsentimiento(ctx);
  const hilo = await obtenerHilo(ctx, id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link href="/mensajes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-acento">
        <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden /> Mensajes
      </Link>
      <h1 className="text-xl font-bold">{hilo.etiqueta}</h1>
      {!hilo.puedeEscribir && (
        <Alerta tipo="info">
          <Eye className="mr-1 inline h-4 w-4" aria-hidden /> Estás leyendo como Dirección. No puedes escribir en esta conversación y tu lectura queda registrada.
        </Alerta>
      )}
      <Hilo inicial={hilo} />
    </div>
  );
}
