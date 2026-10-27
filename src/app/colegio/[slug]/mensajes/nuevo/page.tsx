import { UserRound } from "lucide-react";
import type { Metadata } from "next";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Notificar } from "@/components/shell/Notificar";
import { Boton } from "@/components/ui/Boton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { requireConsentimiento } from "@/lib/server/consentimiento";
import { destinatariosPosibles } from "@/lib/server/mensajes";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { abrirConversacionAction } from "../actions";
import { iniciales } from "../ListaConversaciones";

export const metadata: Metadata = { title: "Nuevo mensaje" };

export default async function NuevoMensajePage({ params, searchParams }: PageProps<"/colegio/[slug]/mensajes/nuevo">) {
  const { slug } = await params;
  const { alumno, ok, error } = await searchParams;
  const ctx = await requireTenantContext(slug, ["apoderado", "profesor"]);
  requireFeature(ctx, "mensajes");
  await requireConsentimiento(ctx);
  const alumnoId = Array.isArray(alumno) ? alumno[0] : alumno;
  const posibles = (await destinatariosPosibles(ctx)).filter((p) => !alumnoId || p.alumnoId === alumnoId);

  return (
    <div className="max-w-2xl">
      <Notificar ok={Array.isArray(ok) ? ok[0] : ok} error={Array.isArray(error) ? error[0] : error} />
      <EncabezadoPagina
        titulo={ctx.rol === "apoderado" ? "¿A quién quieres escribir?" : "¿A qué familia quieres escribir?"}
        descripcion="Elige a la persona y empieza la conversación. No se comparten teléfonos ni correos."
      />
      {posibles.length === 0 ? (
        <EstadoVacio icono={UserRound} titulo="Todavía no hay a quién escribir" descripcion="Cuando el colegio te asigne un profesor o una familia, aparecerá aquí." />
      ) : (
        <ul className="flex flex-col gap-3">
          {posibles.map((p) => (
            <li key={`${p.alumnoId}-${p.profesorId}-${p.apoderadoId}`}>
              <form action={abrirConversacionAction} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs">
                <input type="hidden" name="alumnoId" value={p.alumnoId} />
                <input type="hidden" name="contraparteId" value={ctx.rol === "apoderado" ? p.profesorId : p.apoderadoId} />
                <Avatar size="lg">
                  <AvatarFallback className="bg-maiz text-sm font-semibold text-indigo">{iniciales(p.etiqueta)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 text-sm font-medium">{p.etiqueta}</span>
                <Boton type="submit" variante="secundario">Escribir</Boton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
