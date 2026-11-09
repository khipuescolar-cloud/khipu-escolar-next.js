import { LockKeyhole, MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireConsentimiento } from "@/lib/server/consentimiento";
import { listarConversaciones } from "@/lib/server/mensajes";
import { requireFeature } from "@/lib/server/plan";
import { requireAlumnoVisible, requireTenantContext } from "@/lib/server/tenant";
import { ListaConversaciones } from "./ListaConversaciones";

export const metadata: Metadata = { title: "Mensajes" };
export default async function MensajesPage({ params, searchParams }: PageProps<"/colegio/[slug]/mensajes">) {
  const { slug } = await params;
  const { alumno } = await searchParams;
  const ctx = await requireTenantContext(slug, ["apoderado", "profesor", "direccion"]);
  requireFeature(ctx, "mensajes");
  await requireConsentimiento(ctx);
  const alumnoId = Array.isArray(alumno) ? alumno[0] : alumno;
  if (alumnoId && ctx.rol !== "direccion") { await requireAlumnoVisible(ctx, alumnoId); redirect("/mensajes/nuevo?alumno=" + encodeURIComponent(alumnoId)); }
  const conversaciones = await listarConversaciones(ctx);
  return <div className="flex h-[calc(100dvh-7rem)] min-h-[28rem] overflow-hidden rounded-lg border border-border bg-card md:h-[calc(100dvh-8rem)]">
    <ListaConversaciones filas={conversaciones} puedeCrear={ctx.rol !== "direccion"} />
    <section className="hidden min-w-0 flex-1 flex-col items-center justify-center bg-muted/40 px-6 text-center md:flex" aria-label="Sin conversación elegida">
      <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-card text-primary"><MessagesSquare className="size-10" strokeWidth={2} aria-hidden /></div>
      <h2 className="font-heading text-2xl font-semibold">Khipu Mensajes</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{ctx.rol === "apoderado" ? "Escribe al tutor/a de tu hijo sin compartir tu teléfono" : ctx.rol === "profesor" ? "Conversa con las familias de tu salón de tutoría" : "Consulta las conversaciones del colegio"}</p>
      <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><LockKeyhole className="size-4" aria-hidden /> Tus datos de contacto no se comparten</p>
    </section>
  </div>;
}
