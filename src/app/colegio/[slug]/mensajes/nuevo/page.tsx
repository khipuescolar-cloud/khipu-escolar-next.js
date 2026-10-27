import type { Metadata } from "next";
import { Boton } from "@/components/ui/Boton";
import { Flash } from "@/components/ui/Flash";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { requireConsentimiento } from "@/lib/server/consentimiento";
import { destinatariosPosibles } from "@/lib/server/mensajes";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { abrirConversacionAction } from "../actions";

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
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold">{ctx.rol === "apoderado" ? "¿A quién quieres escribir?" : "¿A qué familia quieres escribir?"}</h1>
      <Flash ok={ok} error={error} />
      {posibles.length === 0 ? (
        <Tarjeta className="text-pizarra">No hay a quién escribir todavía.</Tarjeta>
      ) : (
        <ul className="flex flex-col gap-2">
          {posibles.map((p) => (
            <li key={`${p.alumnoId}-${p.profesorId}-${p.apoderadoId}`}>
              <form action={abrirConversacionAction} className="flex items-center justify-between gap-3 rounded-lg border border-arena bg-superficie p-3">
                <input type="hidden" name="alumnoId" value={p.alumnoId} />
                <input type="hidden" name="contraparteId" value={ctx.rol === "apoderado" ? p.profesorId : p.apoderadoId} />
                <span className="min-w-0 text-sm">{p.etiqueta}</span>
                <Boton type="submit" variante="secundario">Escribir</Boton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
