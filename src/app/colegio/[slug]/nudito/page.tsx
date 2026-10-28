import { MessageCircleHeart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { NuditoMascota } from "@/components/nudito/NuditoMascota";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NavegacionPildoras } from "@/components/academico/NavegacionPildoras";
import { alumnosVisibles } from "@/lib/server/notas";
import { leerAcciones } from "@/lib/server/nudito/acciones";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Nudito" };

const FORMATO = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", dateStyle: "medium", timeStyle: "short" });

/** Filtro «Sin hijo»: conversaciones generales (horario, reglamento…) que no hablaron de un hijo. */
const SIN_HIJO = "general";

export default async function NuditoPage({ params, searchParams }: PageProps<"/colegio/[slug]/nudito">) {
  const { slug } = await params;
  const sp = await searchParams;
  // Solo el apoderado: el alumno con cuenta propia no usa Nudito (protección de menores, specs/13).
  const ctx = await requireTenantContext(slug, ["apoderado"]);
  requireFeature(ctx, "nudito");

  // Historial agrupado por hijo (`NuditoConversacion.alumnoId`): el apoderado repasa lo que preguntó de cada uno.
  const hijos = await alumnosVisibles(ctx);
  const pedido = Array.isArray(sp.hijo) ? sp.hijo[0] : sp.hijo;
  const filtro = pedido === SIN_HIJO ? SIN_HIJO : hijos.find((h) => h.id === pedido)?.id;

  const conversaciones = await ctx.db.nuditoConversacion.findMany({
    where: {
      membershipId: ctx.membership.id,
      ...(filtro === SIN_HIJO ? { alumnoId: null } : filtro ? { alumnoId: filtro } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { mensajes: { orderBy: { createdAt: "asc" } }, alumno: { select: { nombres: true } } },
  });

  return (
    <div className="max-w-3xl">
      <EncabezadoPagina
        titulo="Nudito"
        descripcion="Aquí puedes repasar tus conversaciones con Nudito. Para preguntarle algo nuevo, usa la burbuja de abajo a la derecha."
        acciones={<NuditoMascota tamano={56} estado="reposo" titulo="Nudito" />}
      />

      {hijos.length > 0 && (
        <div className="mb-4">
          <NavegacionPildoras
            etiqueta="Conversaciones por hijo"
            items={[
              { href: "/nudito", texto: "Todas", activo: !filtro },
              ...hijos.map((h) => ({ href: `/nudito?hijo=${h.id}`, texto: h.nombres.split(" ")[0], activo: filtro === h.id })),
              { href: `/nudito?hijo=${SIN_HIJO}`, texto: "Generales", activo: filtro === SIN_HIJO },
            ]}
          />
        </div>
      )}

      {conversaciones.length === 0 ? (
        <EstadoVacio
          icono={MessageCircleHeart}
          titulo={filtro ? "No hay conversaciones con este filtro" : "Todavía no has conversado con Nudito"}
          descripcion={filtro ? "Prueba con «Todas» o pregúntale algo nuevo desde la burbuja." : "Abre la burbuja y pregúntale por las tareas de tu hijo."}
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {conversaciones.map((c) => (
            <li key={c.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-titulo-2">
                    {FORMATO.format(c.createdAt)}
                    {c.alumno && <Badge variant="secondary">{c.alumno.nombres.split(" ")[0]}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="flex flex-col gap-3 font-nudito text-voz-nudito">
                    {c.mensajes.map((m) => (
                      <li key={m.id} className={`flex max-w-[85%] flex-col gap-2 ${m.autor === "usuario" ? "self-end" : "self-start"}`}>
                        <p className={`whitespace-pre-line px-3.5 py-2.5 ${m.autor === "usuario" ? "rounded-lg rounded-br-sm bg-primary text-primary-foreground" : "rounded-lg rounded-bl-sm bg-muted text-foreground"}`}>
                          <span className="sr-only">{m.autor === "usuario" ? "Tú: " : "Nudito: "}</span>
                          {m.cuerpo}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {leerAcciones(m.acciones).filter((a) => a.tipo !== "elegir_hijo").map((a) => (
                            <Link key={a.etiqueta} href={a.valor} className="inline-flex min-h-10 items-center rounded-pildora bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground outline-none transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50">
                              {a.etiqueta}
                            </Link>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
