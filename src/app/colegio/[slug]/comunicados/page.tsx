import { Megaphone, Pencil, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { CLASE_CAMPO, Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { listarComunicados, salonesParaPublicar } from "@/lib/server/comunicados";
import { requireConsentimiento } from "@/lib/server/consentimiento";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { borrarComunicadoAction, editarComunicadoAction, publicarComunicadoAction } from "./actions";

export const metadata: Metadata = { title: "Comunicados" };

const fecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Lima" });

export default async function ComunicadosPage({ params, searchParams }: PageProps<"/colegio/[slug]/comunicados">) {
  const { slug } = await params;
  const { ok, error } = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion", "profesor", "apoderado", "administrativo"]);
  requireFeature(ctx, "comunicados");
  await requireConsentimiento(ctx);
  const [comunicados, salones] = await Promise.all([listarComunicados(ctx), salonesParaPublicar(ctx)]);
  const puedePublicar = ctx.rol === "direccion" || ctx.rol === "profesor";

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Megaphone className="h-6 w-6 text-acento" strokeWidth={2} aria-hidden /> Comunicados
      </h1>
      <Flash ok={ok} error={error} />

      {puedePublicar && (
        <Tarjeta>
          <h2 className="mb-3 text-lg font-semibold">Publicar un comunicado</h2>
          <form action={publicarComunicadoAction} className="flex flex-col gap-3">
            <Selector etiqueta="Para quién" name="salonId" defaultValue={ctx.rol === "direccion" ? "" : undefined} required={ctx.rol === "profesor"}>
              {ctx.rol === "direccion" && <option value="">Todo el colegio</option>}
              {salones.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </Selector>
            <Campo etiqueta="Título" name="titulo" maxLength={120} required />
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Mensaje</span>
              <textarea name="cuerpo" rows={5} maxLength={5000} required className={CLASE_CAMPO} />
            </label>
            <Boton type="submit" className="self-start">Publicar y avisar</Boton>
          </form>
        </Tarjeta>
      )}

      {comunicados.length === 0 ? (
        <Tarjeta className="text-center text-pizarra">Todavía no hay comunicados.</Tarjeta>
      ) : (
        <ul className="flex flex-col gap-4">
          {comunicados.map((c) => (
            <li key={c.id}>
              <Tarjeta className="flex flex-col gap-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold">{c.titulo}</h2>
                  <span className="rounded-pildora bg-superficie-2 px-2 py-0.5 text-xs text-pizarra">{c.salon ?? "Todo el colegio"}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{c.cuerpo}</p>
                <p className="text-xs text-pizarra">{c.autor} · {fecha.format(c.publicadoAt)}</p>
                {c.editable && (
                  <details className="mt-1 rounded-md border border-arena p-3">
                    <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-acento">
                      <Pencil className="h-4 w-4" strokeWidth={2} aria-hidden /> Editar o borrar (primeras 24 h)
                    </summary>
                    <form action={editarComunicadoAction} className="mt-3 flex flex-col gap-3">
                      <input type="hidden" name="id" value={c.id} />
                      <Campo etiqueta="Título" name="titulo" defaultValue={c.titulo} maxLength={120} required />
                      <textarea name="cuerpo" aria-label="Mensaje" rows={4} maxLength={5000} defaultValue={c.cuerpo} required className={CLASE_CAMPO} />
                      <Boton type="submit" variante="secundario" className="self-start">Guardar cambios</Boton>
                    </form>
                    <form action={borrarComunicadoAction} className="mt-2">
                      <input type="hidden" name="id" value={c.id} />
                      <Boton type="submit" variante="peligro"><Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden /> Borrar</Boton>
                    </form>
                  </details>
                )}
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
