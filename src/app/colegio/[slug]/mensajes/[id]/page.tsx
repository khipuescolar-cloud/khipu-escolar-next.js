import type { Metadata } from "next";
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
  const hilo = await obtenerHilo(ctx, id);
  const conversaciones = await listarConversaciones(ctx);
  return <div className="flex h-[calc(100dvh-7rem)] min-h-[28rem] overflow-hidden rounded-lg border border-border bg-card md:h-[calc(100dvh-8rem)]">
    <div className="hidden md:flex"><ListaConversaciones filas={conversaciones} activa={id} puedeCrear={ctx.rol !== "direccion"} /></div>
    <Hilo inicial={hilo} soloDireccion={ctx.rol === "direccion"} />
  </div>;
}
