import { CircleCheck, Clock3, MessageSquare } from "lucide-react";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { FormAccion } from "@/components/FormAccion";
import { PestanasNudito } from "@/components/nudito/PestanasNudito";
import { temaTienePractica } from "@/lib/nudito/conocimiento/servidor";
import { catalogoDelCurso, estadosEditoriales } from "@/lib/server/plan-anual/catalogo-curso";
import { CatalogoTemario } from "./CatalogoTemario";
import { CATALOGO_CNEB } from "@/lib/cneb/catalogo";

import { detalleTemario, estadoTemario, nombreTemaTemario } from "@/lib/server/plan-anual/temario";
import { requireTenantContext } from "@/lib/server/tenant";
import { temarioAccion } from "../actions";

export const metadata = { title: "Temario de Nudito" };

const NIVEL = { primaria: "Primaria", secundaria: "Secundaria" } as const;

export default async function TemarioDetalle({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion"]);
  const { plan, temas, comentarios, docentes } = await detalleTemario(ctx, id);
  const editar = ctx.rol === "profesor";
  const accion = (tipo: string) => temarioAccion.bind(null, slug, id, tipo);

  const catalogo = await catalogoDelCurso(ctx.db, plan);
  const estados = await estadosEditoriales(ctx.db, catalogo.map(t => t.clave));
  const borradores = catalogo.filter(t => estados.get(t.clave) !== "revisado").map(t => t.clave);
  const sinPractica = (await Promise.all(catalogo.map(async t => ({ clave: t.clave, lista: await temaTienePractica(t.clave) })))).filter(t => !t.lista).map(t => t.clave);
  const nombres = await Promise.all(temas.map(t => nombreTemaTemario(t.temaClave)));
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
              const nombre = nombres[i];
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

        <CatalogoTemario temas={catalogo} competencias={Object.fromEntries(CATALOGO_CNEB.flatMap(a => a.competencias.map(c => [c.numero, c.nombre])))} elegidos={temas.map(t => t.temaClave)} editar={editar} borradores={borradores} sinPractica={sinPractica} accion={accion("agregar")} />
      </div>
    </div>
  );
}
