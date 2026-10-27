import { MessageSquarePlus, MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
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
  // Enlaces «Hablar con la tutora» (Nudito, asistencia): `?alumno=` abre el nuevo mensaje sobre ese hijo.
  const alumnoId = Array.isArray(alumno) ? alumno[0] : alumno;
  if (alumnoId && ctx.rol !== "direccion") {
    await requireAlumnoVisible(ctx, alumnoId);
    redirect(`/mensajes/nuevo?alumno=${encodeURIComponent(alumnoId)}`);
  }
  const conversaciones = await listarConversaciones(ctx);
  const puedeEscribir = ctx.rol !== "direccion";

  const nuevo = (
    <Link href="/mensajes/nuevo" className={buttonVariants()}>
      <MessageSquarePlus strokeWidth={2} aria-hidden /> Nuevo mensaje
    </Link>
  );

  return (
    <div>
      <EncabezadoPagina
        titulo="Mensajes"
        descripcion={ctx.rol === "direccion" ? "Solo lectura: cada vez que abres un chat queda registrado." : "Hablas con el colegio sin compartir tu teléfono."}
        acciones={puedeEscribir ? nuevo : undefined}
      />

      {conversaciones.length === 0 ? (
        <EstadoVacio
          icono={MessagesSquare}
          titulo="Aún no hay conversaciones"
          descripcion={puedeEscribir ? "Cuando quieras hablar con el colegio, empieza un mensaje nuevo." : "Cuando familias y profesores conversen, las verás aquí."}
          accion={puedeEscribir ? nuevo : undefined}
        />
      ) : (
        <div className="lg:grid lg:grid-cols-[22rem_1fr] lg:gap-6">
          <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
            <ListaConversaciones filas={conversaciones} />
          </div>
          <div className="hidden lg:block">
            <EstadoVacio icono={MessagesSquare} titulo="Elige una conversación" descripcion="Selecciona una a la izquierda para leerla y responder." />
          </div>
        </div>
      )}
    </div>
  );
}
