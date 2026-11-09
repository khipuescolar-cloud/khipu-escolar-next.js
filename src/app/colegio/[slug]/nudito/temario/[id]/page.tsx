import Link from "next/link";
import { CircleCheck, Clock3, MessageSquare, Search } from "lucide-react";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { FormAccion } from "@/components/FormAccion";
import { PestanasNudito } from "@/components/nudito/PestanasNudito";
import { temasDe } from "@/lib/nudito/catalogo";
import type { AreaNudito } from "@/lib/nudito/contratos";
import { detalleTemario, estadoTemario, nombreTemaTemario } from "@/lib/server/plan-anual/temario";
import { requireTenantContext } from "@/lib/server/tenant";
import { temarioAccion } from "../actions";

export const metadata = { title: "Temario de Nudito" };

const POR_PAGINA = 20;
const NIVEL = { primaria: "Primaria", secundaria: "Secundaria" } as const;

export default async function TemarioDetalle({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ q?: string; competencia?: string; pagina?: string }>;
}) {
  const { slug, id } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion"]);
  const { plan, temas, comentarios, docentes } = await detalleTemario(ctx, id);
  const editar = ctx.rol === "profesor";
  const accion = (tipo: string) => temarioAccion.bind(null, slug, id, tipo);

  // Catálogo del grado y área, con búsqueda, filtro por competencia y paginación.
  const catalogo = temasDe(plan.area as AreaNudito, plan.nivel as "primaria" | "secundaria", plan.grado);
  const competencias = [...new Set(catalogo.map((t) => t.competenciaCneb))].sort((a, b) => a - b);
  const q = (sp.q ?? "").trim().toLocaleLowerCase("es-PE");
  const filtrados = catalogo.filter((t) => {
    const texto = [t.nombre, t.subtema, t.descripcionCorta, ...t.palabrasClave].filter(Boolean).join(" ").toLocaleLowerCase("es-PE");
    return (!q || texto.includes(q)) && (!sp.competencia || t.competenciaCneb === Number(sp.competencia));
  });
  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const pagina = Math.min(paginas, Math.max(1, Number(sp.pagina) || 1));
  const ruta = (p: number) => `?q=${encodeURIComponent(sp.q ?? "")}&competencia=${encodeURIComponent(sp.competencia ?? "")}&pagina=${p}`;
  const enTemario = new Set(temas.map((t) => t.temaClave));

  const fecha = (d: Date) =>
    new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: ctx.tenant.zonaHoraria }).format(d);
  const habilitado = plan.estado === "publicado";
  const estado = estadoTemario(temas.length, docentes, habilitado);
  const yaAcepte = docentes.some((d) => d.membershipId === ctx.membership.id && d.acepto);
  const alumnosConAnterior = !habilitado && plan.versionPublicada > 0;
  const anterior =
    temas.length === 0 && editar
      ? await ctx.db.planAnual.findFirst({
          where: { anio: plan.anio - 1, nivel: plan.nivel, grado: plan.grado, area: plan.area },
          select: { id: true },
        })
      : null;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <EncabezadoPagina
        titulo={`Temario de ${plan.nombreCurso}`}
        descripcion={`${NIVEL[plan.nivel as keyof typeof NIVEL] ?? plan.nivel} · ${plan.grado}.° grado · ${plan.anio}`}
        seccion="academico"
      />
      <PestanasNudito activa="temario" />

      {/* Estado y aceptación: la acción principal va arriba. */}
      <section aria-labelledby="titulo-aceptacion" className="rounded-lg border border-borde-sutil bg-superficie-elevada p-4">
        <h2 id="titulo-aceptacion" className="flex items-center gap-2 text-lg font-semibold">
          {habilitado ? <CircleCheck className="size-5 shrink-0" strokeWidth={2} aria-hidden /> : <Clock3 className="size-5 shrink-0" strokeWidth={2} aria-hidden />}
          {estado}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {habilitado
            ? "Los alumnos ya practican estos temas en Nudito. Si cambias algo, todos deberán aceptar de nuevo."
            : alumnosConAnterior
              ? "Hay cambios sin aceptar. Mientras tanto, los alumnos siguen con el temario aceptado anterior."
              : "Nudito se habilita para los alumnos cuando todos los profesores del grado aceptan."}
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {docentes.map((d) => (
            <li key={d.membershipId} className="flex items-center gap-2 text-sm">
              {d.acepto ? <CircleCheck className="size-4 shrink-0" strokeWidth={2} aria-hidden /> : <Clock3 className="size-4 shrink-0" strokeWidth={2} aria-hidden />}
              {d.nombre} · {d.acepto ? "Aceptó" : "Falta aceptar"}
            </li>
          ))}
        </ul>
        {editar && !yaAcepte && (
          <div className="mt-4">
            <FormAccion accion={accion("aceptar")} etiqueta="Acepto este temario" disabled={!temas.length} />
          </div>
        )}
      </section>

      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        {/* Temas elegidos */}
        <section aria-labelledby="titulo-elegidos" className="flex min-w-0 flex-col gap-3 rounded-lg border border-borde-sutil p-4">
          <h2 id="titulo-elegidos" className="text-lg font-semibold">
            Temas elegidos <span className="text-sm font-normal text-muted-foreground">({temas.length})</span>
          </h2>
          {anterior && <FormAccion accion={accion("copiar")} etiqueta="Copiar del año anterior" variante="secundario" />}
          {!temas.length && <p className="text-sm text-muted-foreground">Todavía no hay temas. Elígelos del catálogo.</p>}
          <ol className="flex flex-col gap-2">
            {temas.map((t, i) => {
              const notas = comentarios.filter((c) => c.temaClave === t.temaClave);
              const nombre = nombreTemaTemario(t.temaClave);
              return (
                <li key={t.id} className="min-w-0 rounded-md border border-borde-sutil p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 font-medium">
                      {i + 1}. {nombre}
                    </p>
                    {editar && (
                      <div className="flex flex-wrap gap-1">
                        {i > 0 && (
                          <FormAccion accion={accion("mover")} etiqueta="Subir" variante="fantasma">
                            <input type="hidden" name="clave" value={t.temaClave} />
                            <input type="hidden" name="direccion" value="arriba" />
                          </FormAccion>
                        )}
                        {i < temas.length - 1 && (
                          <FormAccion accion={accion("mover")} etiqueta="Bajar" variante="fantasma">
                            <input type="hidden" name="clave" value={t.temaClave} />
                            <input type="hidden" name="direccion" value="abajo" />
                          </FormAccion>
                        )}
                        <FormAccion accion={accion("quitar")} etiqueta="Quitar" variante="secundario">
                          <input type="hidden" name="clave" value={t.temaClave} />
                        </FormAccion>
                      </div>
                    )}
                  </div>
                  {(editar || notas.length > 0) && (
                    <details className="mt-2 text-sm">
                      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-muted-foreground">
                        <MessageSquare className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                        Comentarios ({notas.length})
                      </summary>
                      <div className="flex flex-col gap-2 pt-2">
                        {notas.map((c) => (
                          <div key={c.id} className="rounded-md bg-superficie-2 p-2">
                            <p className="text-xs text-muted-foreground">
                              {c.autor.user.nombres} {c.autor.user.apellidos} · {fecha(c.createdAt)}
                            </p>
                            <p className="whitespace-pre-line">{c.contenido}</p>
                          </div>
                        ))}
                        {editar && (
                          <FormAccion accion={accion("comentar")} etiqueta="Comentar" variante="secundario" className="grid gap-2">
                            <input type="hidden" name="clave" value={t.temaClave} />
                            <textarea
                              name="contenido"
                              required
                              maxLength={3000}
                              aria-label={`Comentario sobre ${nombre}`}
                              className="min-h-20 w-full rounded-md border border-borde-sutil bg-background p-2"
                            />
                          </FormAccion>
                        )}
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {/* Catálogo del grado */}
        <section aria-labelledby="titulo-catalogo" className="min-w-0 rounded-lg border border-borde-sutil p-4">
          <h2 id="titulo-catalogo" className="text-lg font-semibold">Catálogo de Nudito</h2>
          <form method="get" className="mt-3 flex flex-wrap items-end gap-2">
            <label className="grid min-w-0 flex-1 gap-1 text-sm">
              Buscar
              <input name="q" defaultValue={sp.q} className="h-11 min-w-0 rounded-md border border-borde-sutil bg-background px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              Competencia
              <select name="competencia" defaultValue={sp.competencia ?? ""} className="h-11 rounded-md border border-borde-sutil bg-background px-2">
                <option value="">Todas</option>
                {competencias.map((c) => (
                  <option key={c} value={c}>Competencia {c}</option>
                ))}
              </select>
            </label>
            <button className="flex h-11 items-center gap-1 rounded-md border border-borde-sutil px-3">
              <Search className="size-4" strokeWidth={2} aria-hidden />
              Buscar
            </button>
          </form>
          <p className="my-3 text-sm text-muted-foreground">
            {filtrados.length} temas · Página {pagina} de {paginas}
          </p>
          <FormAccion accion={accion("agregar")} etiqueta="Agregar seleccionados" disabled={!editar} className="grid gap-2">
            <ul className="divide-y divide-borde-sutil">
              {filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map((t) => {
                const incluido = enTemario.has(t.clave);
                return (
                  <li key={t.clave} className="py-3">
                    <label className="flex min-w-0 items-start gap-2">
                      <input
                        type="checkbox"
                        name="claves"
                        value={t.clave}
                        disabled={!editar || incluido}
                        defaultChecked={incluido}
                        className="mt-1 size-5 shrink-0"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">{t.nombre}</span>
                        <span className="text-sm text-muted-foreground">
                          Competencia {t.competenciaCneb}
                          {incluido ? " · Ya está en el temario" : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </FormAccion>
          <div className="mt-3 flex gap-4">
            {pagina > 1 && <Link href={ruta(pagina - 1)} className="enlace">Anterior</Link>}
            {pagina < paginas && <Link href={ruta(pagina + 1)} className="enlace">Siguiente</Link>}
          </div>
        </section>
      </div>
    </div>
  );
}
