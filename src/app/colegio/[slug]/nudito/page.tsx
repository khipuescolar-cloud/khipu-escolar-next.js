import type { Metadata } from "next";
import Link from "next/link";
import { NuditoMascota } from "@/components/nudito/NuditoMascota";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { leerAcciones } from "@/lib/server/nudito/acciones";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Nudito" };

const FORMATO = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", dateStyle: "medium", timeStyle: "short" });

export default async function NuditoPage({ params }: PageProps<"/colegio/[slug]/nudito">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["apoderado"]);
  requireFeature(ctx, "nudito");

  const conversaciones = await ctx.db.nuditoConversacion.findMany({
    where: { membershipId: ctx.membership.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { mensajes: { orderBy: { createdAt: "asc" } }, alumno: { select: { nombres: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <NuditoMascota tamano={48} />
        <div>
          <h1 className="text-2xl font-bold">Nudito</h1>
          <p className="text-sm text-pizarra">Aquí puedes repasar tus conversaciones con Nudito. Para preguntarle algo nuevo, usa la burbuja de abajo a la derecha.</p>
        </div>
      </div>

      {conversaciones.length === 0 ? (
        <Tarjeta>
          <p className="text-sm text-pizarra">Todavía no has conversado con Nudito. Abre la burbuja y pregúntale por las tareas de tu hijo.</p>
        </Tarjeta>
      ) : (
        <ul className="flex flex-col gap-4">
          {conversaciones.map((c) => (
            <li key={c.id}>
              <Tarjeta className="flex flex-col gap-3">
                <h2 className="text-base font-semibold">
                  {FORMATO.format(c.createdAt)}
                  {c.alumno ? ` · ${c.alumno.nombres.split(" ")[0]}` : ""}
                </h2>
                <ol className="flex flex-col gap-2 font-nudito text-sm">
                  {c.mensajes.map((m) => (
                    <li key={m.id} className={`flex max-w-[85%] flex-col gap-2 ${m.autor === "usuario" ? "self-end" : "self-start"}`}>
                      <p className={`whitespace-pre-line rounded-lg px-3 py-2 ${m.autor === "usuario" ? "bg-acento text-sobre-acento" : "bg-superficie-2"}`}>
                        <span className="sr-only">{m.autor === "usuario" ? "Tú: " : "Nudito: "}</span>
                        {m.cuerpo}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {leerAcciones(m.acciones).filter((a) => a.tipo !== "elegir_hijo").map((a) => (
                          <Link key={a.etiqueta} href={a.valor} className="rounded-pildora bg-acento px-3 py-1.5 text-sm font-semibold text-sobre-acento hover:opacity-90">
                            {a.etiqueta}
                          </Link>
                        ))}
                      </div>
                    </li>
                  ))}
                </ol>
              </Tarjeta>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
